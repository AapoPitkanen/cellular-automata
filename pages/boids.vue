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
          v-regular-polygon(v-for="[name, config] in Object.entries(boids)" :config="config" :key="name" :ref="name")
</template>

<script>
import { debounce } from 'lodash'
import Konva from 'konva'
/* eslint-disable import/default */
import BoidWorker from '../workers/boid.worker'
/* eslint-enable import/default */
import { getUpdatedBoids } from '../utils/boids'

const boidsCount = 120
const workerCount = window.navigator.hardwareConcurrency - 1

const workers = Array.from({ length: workerCount }).map(() => new BoidWorker())
let konvaAnimation = null

let frame = {}

export default {
  data() {
    return {
      maxSpeed: 2.25,
      maxForce: 0.03,
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
      boidInterval: null,
      boids: Object.freeze(
        Array.from({ length: boidsCount })
          .map((_, idx) => ({
            acceleration: [0, 0],
            velocity: [0, 0],
            rotation: 0,
            targetRotation: 0,
            scaleY: 1.33,
            x: 0,
            y: 0,
            sides: 3,
            radius: 8,
            fill: '#00d29b'
          }))
          .reduce((boids, boid, idx) => {
            const name = `boid-${idx}`
            boids[name] = {
              ...boid,
              name
            }
            return boids
          }, {})
      )
    }
  },
  mounted() {
    for (const worker of workers) {
      worker.onmessage = ({ data }) => {
        const { updatedBoids } = data
        frame = {
          ...frame,
          ...updatedBoids
        }
      }
    }
    this.$nextTick(() => {
      const availableWidth = this.$refs.konvaContainer.clientWidth
      const controlsHeight = this.$refs.konvaControls.clientHeight
      const windowHeight = window.innerHeight
      const canvasHeight = windowHeight - controlsHeight - 96
      this.configKonva.width = availableWidth
      this.configKonva.height = canvasHeight
      const [boidRef] = this.$refs['boid-0']
      const boidNode = boidRef.getNode()

      for (const boid of Object.values(this.boids)) {
        const { name } = boid
        const [boidRef] = this.$refs[name]
        const node = boidRef.getNode()
        const [x, y] = [
          Math.floor(Math.random() * availableWidth + 200),
          Math.floor(Math.random() * canvasHeight + 100)
        ]
        this.boids[name].x = x
        this.boids[name].y = y
        node.position({ x, y })
      }

      const animation = new Konva.Animation(({ frameRate }) => {
        const updatedBoidsCount = Object.keys(frame).length
        if (updatedBoidsCount < boidsCount) {
          return false
        }

        for (const boid of Object.values(frame)) {
          const { x, y, rotation } = boid
          const { name } = boid
          const [boidRef] = this.$refs[name]
          const node = boidRef.getNode()
          node.rotation(rotation)
          node.position({ x, y })
        }

        this.boids = Object.freeze(frame)
        frame = {}
        this.updateBoids()
      }, boidNode.getLayer())
      konvaAnimation = animation
    })

    window.addEventListener('resize', this.handleWindowResize)
  },
  beforeDestroy() {
    clearInterval(this.boidInterval)
    this.boidInterval = null
    window.removeEventListener('resize', this.handleWindowResize)
  },
  methods: {
    handleStartBoidsClick() {
      this.updateBoids()
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
    updateBoids() {
      const boids = Object.values(this.boids)
      const chunkLength = Math.ceil(boids.length / (workers.length + 1))
      const firstChunkPayload = {
        maxSpeed: this.maxSpeed,
        maxForce: this.maxForce,
        boidsChunk: boids.slice(0, chunkLength),
        allBoids: boids,
        endX: this.configKonva.width,
        endY: this.configKonva.height,
        margin: this.margin
      }
      const firstUpdatedBoids = getUpdatedBoids(firstChunkPayload)
      frame = {
        ...frame,
        ...firstUpdatedBoids
      }
      for (let i = 0; i < workers.length; ++i) {
        const boidsChunk = boids.slice(
          (i + 1) * chunkLength,
          (i + 1) * chunkLength + chunkLength
        )
        const payload = {
          maxSpeed: this.maxSpeed,
          maxForce: this.maxForce,
          boidsChunk,
          allBoids: boids,
          endX: this.configKonva.width,
          endY: this.configKonva.height,
          margin: this.margin,
          index: i
        }
        workers[i].postMessage(payload)
      }
    }
  }
}
</script>

<style lang="sass" scoped></style>
