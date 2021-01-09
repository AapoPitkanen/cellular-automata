<template lang="pug">
  v-row(no-gutters)
    v-col(ref="konvaControls").konva-controls.d-flex
      v-btn(@click="handleStartBoidsClick" color="primary").mr-4
        v-icon mdi-play
      v-btn(@click="handleStopBoidsClick" color="primary")
        v-icon mdi-stop
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
import { getUpdatedBoids, generateRandomPoints } from '../utils/boids'

const boidsCount = 1000
let konvaAnimation = null

const frame = []
let frameStart = null
let frameEnd = null

const frameTimes = []

export default {
  data() {
    return {
      searchDistance: 50,
      separation: 10,
      maxSpeed: 3.0,
      maxForce: 0.015,
      mouse: {
        x: 0,
        y: 0
      },
      configKonva: {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      },
      margin: 10,
      boids: Object.freeze(
        Array.from({ length: boidsCount }).map((_, idx) => ({
          name: `boid-${idx}`,
          acceleration: vec2.fromValues(0, 0),
          velocity: vec2.fromValues(0, 0),
          rotation: Math.random() * 360,
          targetRotation: vec2.fromValues(0, 0),
          targetPosition: vec2.fromValues(0, 0),
          scaleY: 1.33,
          x: 0,
          y: 0,
          sides: 3,
          radius: 3,
          fill: '#00d29b'
        }))
      )
    }
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

        if (frame.length === boidsCount) {
          frameEnd = performance.now()
          frameTimes.push(frameEnd - frameStart)
        }
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
      const averageFrameTime =
        frameTimes.reduce((acc, cur) => acc + cur, 0) / (frameTimes.length - 1)
      const str = `%c Average frametime with ${this.workers.length} workers and ${boidsCount} boids: ${averageFrameTime} ms.`
      const fps = `%c Average framerate: ${1000 / averageFrameTime} fps`
      console.log(str, 'color: green; font-size: 16px')
      console.log(fps, 'color: blue; font-size: 16px')
    },
    handleWindowResize: debounce(function () {
      const konvaContainer = this.$refs.konvaContainer
      if (konvaContainer) {
        const availableWidth = this.$refs.konvaContainer.clientWidth
        this.configKonva.width = availableWidth
      }
    }, 100),
    updateBoids(boids) {
      const chunkLength = Math.ceil(boids.length / (this.workers.length + 1))
      const firstChunkPayload = {
        maxSpeed: this.maxSpeed,
        maxForce: this.maxForce,
        separation: this.separation,
        boidsChunk: boids.slice(0, chunkLength),
        boids,
        searchDistance: this.searchDistance,
        endX: this.configKonva.width,
        endY: this.configKonva.height,
        margin: this.margin
      }
      const firstUpdatedBoids = getUpdatedBoids(firstChunkPayload)
      frame.push(...firstUpdatedBoids)
      frameStart = performance.now()
      for (let i = 0; i < this.workers.length; ++i) {
        const boidsChunk = boids.slice(
          (i + 1) * chunkLength,
          (i + 1) * chunkLength + chunkLength
        )
        const payload = {
          maxSpeed: this.maxSpeed,
          maxForce: this.maxForce,
          separation: this.separation,
          boidsChunk,
          boids,
          searchDistance: this.searchDistance,
          endX: this.configKonva.width,
          endY: this.configKonva.height,
          margin: this.margin,
          index: i
        }
        this.workers[i].postMessage(payload)
      }
    }
  }
}
</script>

<style lang="sass" scoped></style>
