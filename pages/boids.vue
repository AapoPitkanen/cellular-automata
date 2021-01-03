<template lang="pug">
  v-row(no-gutters)
    v-col(cols=12 ref="konvaContainer").konva-container
      v-stage(:config="configKonva" ref="stage" @mousemove="handleStageMouseMove")
        v-layer
          v-regular-polygon(v-for="[name, config] in Object.entries(boids)" :config="config" :key="name" :ref="name")
</template>

<script>
import { debounce } from 'lodash'
import Konva from 'konva'
import { add, divide, subtract, norm, chain, multiply } from 'mathjs'
import BoidWorker from '../workers/boid.worker'
import { getUpdatedBoids } from '../utils/boids'
// function clamp(val, min, max) {
//   return Math.max(min, Math.min(max, val))
// }

const boidsCount = 20
const workerCount = 1

const workers = Array.from({ length: workerCount }).map(() => new BoidWorker())

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
      boids: Array.from({ length: boidsCount })
        .map((_, idx) => ({
          acceleration: [0, 0],
          velocity: [0, 0],
          rotation: 0,
          targetRotation: 0,
          scaleY: 1.33,
          x: 0,
          y: 0,
          sides: 3,
          radius: 10,
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
    }
  },
  mounted() {
    for (const worker of workers) {
      worker.onmessage = ({ data }) => {
        const { updatedBoids } = data
        this.boids = {
          ...this.boids,
          ...updatedBoids
        }
      }
    }
    this.$nextTick(() => {
      const availableWidth = this.$refs.konvaContainer.clientWidth
      const windowHeight = window.innerHeight
      const canvasHeight = windowHeight
      this.configKonva.width = availableWidth
      this.configKonva.height = canvasHeight
      this.mouse.x = Math.floor(availableWidth / 2)
      this.mouse.y = Math.floor(canvasHeight / 2)
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

      const animation = new Konva.Animation(({ time }) => {
        this.updateBoids()
        for (const boid of Object.values(this.boids)) {
          const { x, y, rotation } = boid
          const { name } = boid
          const [boidRef] = this.$refs[name]
          const node = boidRef.getNode()
          node.rotation(rotation)
          node.position({ x, y })
        }
      }, boidNode.getLayer())
      animation.start()
    })

    window.addEventListener('resize', this.handleWindowResize)
    // this.boidInterval = setInterval(() => this.updateBoids(), 1000 / 120)
  },
  beforeDestroy() {
    clearInterval(this.boidInterval)
    this.boidInterval = null
    window.removeEventListener('resize', this.handleWindowResize)
  },
  methods: {
    handleWindowResize: debounce(function () {
      const konvaContainer = this.$refs.konvaContainer
      if (konvaContainer) {
        const availableWidth = this.$refs.konvaContainer.clientWidth
        this.configKonva.width = availableWidth
      }
    }, 100),
    radToDegree(rad) {
      return ((rad > 0 ? rad : 2 * Math.PI + rad) * 360) / (2 * Math.PI)
    },
    handleStageMouseMove({ currentTarget }) {
      const { x, y } = currentTarget.getPointerPosition()
      this.mouse.x = x
      this.mouse.y = y
    },
    updateBoids() {
      const payload = {
        maxSpeed: this.maxSpeed,
        maxForce: this.maxForce,
        boidsChunk: Object.values(this.boids),
        allBoids: Object.values(this.boids),
        endX: this.configKonva.width,
        endY: this.configKonva.height,
        margin: this.margin
      }
      const updatedBoids = getUpdatedBoids(payload)
      this.boids = {
        ...this.boids,
        ...updatedBoids
      }
      // const boids = Object.values(this.boids)
      // const chunkLength = Math.floor(boids.length / workers.length)
      // for (let i = 0; i < workers.length; ++i) {
      //   const boidsChunk = boids.slice(
      //     i * chunkLength,
      //     i * chunkLength + chunkLength
      //   )
      //   const payload = {
      //     maxSpeed: this.maxSpeed,
      //     maxForce: this.maxForce,
      //     boidsChunk,
      //     allBoids: boids,
      //     endX: this.configKonva.width,
      //     endY: this.configKonva.height,
      //     margin: this.margin
      //   }
      //   console.log(
      //     'sending to worker',
      //     i,
      //     'boids',
      //     boidsChunk.map(({ name }) => name)
      //   )
      //   workers[i].postMessage(payload)
      // }
    },
    seek(target, position, velocity) {
      const desired = subtract(target, position)
      const normalized = divide(desired, norm(desired))
      const maximized = multiply(normalized, this.maxSpeed)
      const steer = subtract(maximized, velocity)
      const limited = this.getLimitedVector(steer, this.maxForce)
      return limited
    },
    getCohesionVector(currentBoid) {
      const neighborDistance = 200
      const currentPosition = [currentBoid.x, currentBoid.y]
      const { velocity } = currentBoid
      let perceivedCentre = [0, 0]
      let count = 0
      const boids = Object.values(this.boids)
      for (const boid of boids) {
        const distance = this.getDistance(currentBoid, boid)
        if (distance > 0 && distance < neighborDistance) {
          const position = [boid.x, boid.y]
          perceivedCentre = add(perceivedCentre, position)
          count++
        }
      }

      if (count > 0) {
        perceivedCentre = divide(perceivedCentre, count)
        return this.seek(perceivedCentre, currentPosition, velocity)
      }
      return [0, 0]
    },
    getSeparationVector(currentBoid) {
      const { velocity } = currentBoid
      const separation = 35
      let steer = [0, 0]
      let count = 0
      const boids = Object.values(this.boids)
      for (const boid of boids) {
        const distance = this.getDistance(currentBoid, boid)
        if (distance > 0 && distance < separation) {
          let diff = subtract([currentBoid.x, currentBoid.y], [boid.x, boid.y])
          diff = divide(diff, norm(diff))
          diff = divide(diff, distance)
          steer = add(steer, diff)
          count++
        }
      }

      if (count > 0) {
        steer = divide(steer, count)
      }

      if (norm(steer) > 0) {
        steer = divide(steer, norm(steer))
        steer = multiply(steer, this.maxSpeed)
        steer = subtract(steer, velocity)
        steer = this.getLimitedVector(steer, this.maxForce)
      }

      return steer
    },
    getAlignmentVector(currentBoid) {
      const neighborDistance = 200
      let count = 0
      const currentVelocity = currentBoid.velocity
      let averageVelocity = [0, 0]
      const boids = Object.values(this.boids)
      for (const boid of boids) {
        const { velocity } = boid
        const distance = this.getDistance(currentBoid, boid)
        if (distance > 0 && distance < neighborDistance) {
          averageVelocity = add(averageVelocity, velocity)
          count++
        }
      }
      if (norm(averageVelocity) > 0) {
        averageVelocity = divide(averageVelocity, count)
        const normalized = divide(averageVelocity, norm(averageVelocity))
        const maximized = multiply(normalized, this.maxSpeed)
        const steer = subtract(maximized, currentVelocity)
        const limited = this.getLimitedVector(steer, this.maxForce)
        return limited
      }
      return averageVelocity
    },
    getLimitedVelocityVector(velocity) {
      if (norm(velocity) > this.maxSpeed) {
        return chain(velocity)
          .divide(norm(velocity))
          .multiply(this.maxSpeed)
          .done()
      }
      return velocity
    },
    getLimitedVector(vector, limit) {
      if (norm(vector) > limit) {
        return chain(vector).divide(norm(vector)).multiply(limit).done()
      }
      return vector
    },
    getDistance(p1, p2) {
      return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
    }
  }
}
</script>

<style lang="sass" scoped></style>
