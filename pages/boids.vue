<template lang="pug">
  v-row(no-gutters)
    v-col(ref="konvaControls").konva-controls.d-flex.py-4
      v-btn(@click="handleStartBoidsClick").mr-4
        v-icon mdi-play
      v-btn(@click="handleStopBoidsClick")
        v-icon mdi-stop
      v-slider(v-model="maxSpeed" min=0 max=5 step=0.01 label="Speed" thumb-label)
      v-slider(v-model="maxForce" min=0 max=0.1 step=0.01 label="Force" thumb-label)
      v-slider(v-model="cohesionMultiplier" min=0 max=3 step=0.01 label="Cohesion" thumb-label)
      v-slider(v-model="alignmentMultiplier" min=0 max=3 step=0.01 label="Alignment" thumb-label)
      v-slider(v-model="separationMultiplier" min=0 max=3 step=0.01 label="Separation" thumb-label)
    v-col(cols=12 ref="konvaContainer").konva-container
      v-stage(:config="configKonva" ref="stage")
        v-layer
          v-regular-polygon(v-for="boid in boids" :config="boid" :key="boid.name" :ref="boid.name")
</template>

<script>
import { debounce } from 'lodash'
import Konva from 'konva'
/* eslint-disable import/default */
import { vec2 } from 'gl-matrix'
import BoidWorker from '../workers/boid.worker'
/* eslint-enable import/default */
import {
  getUpdatedBoids,
  generateRandomPoints,
  radiansToDegrees
} from '../utils/boids'

const boidsCount = 1000
let konvaAnimation = null

const frame = []

export default {
  data() {
    return {
      searchDistance: 50,
      separation: 15,
      cohesionMultiplier: 1,
      alignmentMultiplier: 1,
      separationMultiplier: 1,
      maxSpeed: 2.25,
      maxForce: 0.03,
      configKonva: {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      },
      margin: 10,
      boids: []
    }
  },
  created() {
    this.boids = Object.freeze(
      Array.from({ length: boidsCount }).map((_, idx) => {
        const startVelocity = vec2.fromValues(
          Math.random() * this.maxSpeed - this.maxSpeed / 2,
          Math.random() * this.maxSpeed - this.maxSpeed / 2
        )
        const directionRadians = Math.atan2(startVelocity[1], startVelocity[0])
        const directionDegrees = radiansToDegrees(directionRadians)
        const rotationAmount = directionDegrees + 90
        return {
          name: `boid-${idx}`,
          acceleration: vec2.fromValues(0, 0),
          velocity: startVelocity,
          rotation: rotationAmount,
          targetRotation: vec2.fromValues(0, 0),
          scaleY: 1.33,
          x: 0,
          y: 0,
          sides: 3,
          radius: 4,
          fill: '#00d29b'
        }
      })
    )
  },
  mounted() {
    // const workerCount = window.navigator.hardwareConcurrency - 1
    const workerCount = 2

    const workers = Array.from({ length: workerCount }).map(
      () => new BoidWorker()
    )
    this.workers = workers
    for (const worker of this.workers) {
      worker.onmessage = ({ data }) => {
        const { updatedBoids } = data
        frame.push(...updatedBoids)
      }
    }
    this.$nextTick(() => {
      const canvasWidth = this.$refs.konvaContainer.clientWidth
      const controlsHeight = this.$refs.konvaControls.clientHeight
      const windowHeight = window.innerHeight
      const canvasHeight = windowHeight - controlsHeight - 96
      this.configKonva.width = canvasWidth
      this.configKonva.height = canvasHeight
      const points = generateRandomPoints(boidsCount, canvasWidth, canvasHeight)
      const [boidRef] = this.$refs['boid-0']
      const boidNode = boidRef.getNode()

      this.boids.forEach((boid, idx) => {
        const { name } = boid
        const [boidRef] = this.$refs[name]
        const node = boidRef.getNode()
        const [x, y] = points[idx]
        boid.x = x
        boid.y = y
        node.position({ x, y })
      })

      const animation = new Konva.Animation(({ frameRate }) => {
        const updatedBoidsCount = frame.length
        if (updatedBoidsCount < boidsCount) {
          return false
        }

        for (const boid of frame) {
          const { x, y, rotation, name } = boid
          const [boidRef] = this.$refs[name]
          const node = boidRef.getNode()
          node.rotation(rotation)
          node.position({ x, y })
        }

        const frameCopy = frame.slice()
        requestAnimationFrame(() => this.updateBoids(frameCopy))
        frame.length = 0
      }, boidNode.getLayer())
      konvaAnimation = animation
    })

    window.addEventListener('resize', this.handleWindowResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleWindowResize)
  },
  methods: {
    handleStartBoidsClick() {
      requestAnimationFrame(() => this.updateBoids(this.boids))
      konvaAnimation.start()
    },
    handleStopBoidsClick() {
      konvaAnimation.stop()
    },
    handleWindowResize: debounce(function () {
      const konvaContainer = this.$refs.konvaContainer
      if (konvaContainer) {
        const availableWidth = this.$refs.konvaContainer.clientWidth
        this.configKonva.width = availableWidth
      }
    }, 100),
    updateBoids(boids) {
      const {
        maxSpeed,
        maxForce,
        separation,
        searchDistance,
        configKonva: { width, height },
        margin,
        cohesionMultiplier,
        alignmentMultiplier,
        separationMultiplier
      } = this
      const chunkLength = Math.ceil(boids.length / (this.workers.length + 1))
      const firstChunkPayload = {
        maxSpeed,
        maxForce,
        separation,
        boidsChunk: boids.slice(0, chunkLength),
        boids,
        searchDistance,
        endX: width,
        endY: height,
        margin,
        cohesionMultiplier,
        alignmentMultiplier,
        separationMultiplier
      }
      const firstUpdatedBoids = getUpdatedBoids(firstChunkPayload)
      frame.push(...firstUpdatedBoids)
      for (let i = 0; i < this.workers.length; ++i) {
        const boidsChunk = boids.slice(
          (i + 1) * chunkLength,
          (i + 1) * chunkLength + chunkLength
        )
        const payload = {
          maxSpeed,
          maxForce,
          separation,
          boidsChunk,
          boids,
          searchDistance,
          endX: width,
          endY: height,
          margin,
          cohesionMultiplier,
          alignmentMultiplier,
          separationMultiplier
        }
        this.workers[i].postMessage(payload)
      }
    }
  }
}
</script>

<style lang="sass" scoped></style>
