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
import { add, divide, subtract, norm, chain } from 'mathjs'

// function clamp(val, min, max) {
//   return Math.max(min, Math.min(max, val))
// }

export default {
  data() {
    return {
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
      boidInterval: null,
      boids: Array.from({ length: 2 })
        .map((_, idx) => ({
          acceleration: 0,
          velocity: [0, 0],
          rotation: 0,
          scaleY: 1.33,
          maxSpeed: 2,
          maxForce: 0.03,
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
    this.$nextTick(() => {
      const availableWidth = this.$refs.konvaContainer.clientWidth
      const windowHeight = window.innerHeight
      const canvasHeight = Math.floor(windowHeight * (2 / 3))
      this.configKonva.width = availableWidth
      this.configKonva.height = canvasHeight
      this.mouse.x = Math.floor(availableWidth / 2)
      this.mouse.y = Math.floor(canvasHeight / 2)

      for (const boid of Object.values(this.boids)) {
        const { name } = boid
        const [boidRef] = this.$refs[name]
        const node = boidRef.getNode()
        const [x, y] = [
          Math.floor(Math.random() * availableWidth),
          Math.floor(Math.random() * canvasHeight)
        ]
        this.boids[name].x = x
        this.boids[name].y = y
        node.position({ x, y })
        const animation = new Konva.Animation(({ timeDiff }) => {
          const { x, y, rotation } = boid

          node.rotation(rotation)
          node.position({ x, y })
        }, node.getLayer())
        animation.start()
      }

      this.boidInterval = setInterval(() => this.updateBoids(), 1000 / 120)
    })

    window.addEventListener('resize', this.handleWindowResize)
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
      for (const [name, boid] of Object.entries(this.boids)) {
        const { x, y, velocity } = boid
        const currentPosition = [x, y]
        const alignmentVector = this.getAlignmentVector(boid)
        const cohesionVector = this.getCohesionVector(boid)
        const separationVector = this.getSeparationVector(boid)
        const newVelocity = chain(velocity)
          .add(alignmentVector)
          .add(cohesionVector)
          .add(separationVector)
          .done()
        const limited = this.getLimitedVelocityVector(newVelocity)
        let [nextX, nextY] = add(currentPosition, limited)
        const radians = Math.atan2(limited[1], limited[0])

        if (nextX < 0) {
          nextX += 3
        }

        if (nextX > this.configKonva.width) {
          nextX -= 3
        }

        if (nextY < 0) {
          nextY += 3
        }

        if (nextY > this.configKonva.height) {
          nextY -= 3
        }

        this.boids[name].velocity = limited
        this.boids[name].x = nextX
        this.boids[name].y = nextY
        this.boids[name].rotation = this.radToDegree(radians) + 90
      }
    },
    getCohesionVector(currentBoid) {
      const currentPosition = [currentBoid.x, currentBoid.y]
      let perceivedCentre = [0, 0]
      const boids = Object.values(this.boids)
      for (const boid of boids) {
        if (boid.name !== currentBoid.name) {
          const position = [boid.x, boid.y]
          perceivedCentre = add(perceivedCentre, position)
        }
      }

      perceivedCentre = divide(perceivedCentre, boids.length - 1)
      return divide(subtract(perceivedCentre, currentPosition), 100)
    },
    getSeparationVector(currentBoid) {
      const targetDistance = 40
      const currentPosition = [currentBoid.x, currentBoid.y]
      let separationVector = [0, 0]
      const entries = Object.entries(this.boids)
      for (const [name, boid] of entries) {
        if (name !== currentBoid.name) {
          const position = [boid.x, boid.y]
          const distance = this.getDistance(currentBoid, boid)
          if (distance > 0 && distance < targetDistance) {
            const difference = subtract(currentPosition, position)
            const normalized = divide(difference, norm(difference))
            const weightedByDistance = divide(normalized, distance)
            separationVector = add(separationVector, weightedByDistance)
          }
        }
      }
      separationVector = divide(separationVector, entries.length - 1)

      if (norm(separationVector) > 0) {
        separationVector = divide(separationVector, norm(separationVector))
      }

      return separationVector
    },
    getAlignmentVector(currentBoid) {
      // const neighborDistance = 100
      const currentVelocity = currentBoid.velocity
      let averageVelocity = [0, 0]
      const entries = Object.entries(this.boids)
      for (const [name, boid] of entries) {
        if (name !== currentBoid.name) {
          const { velocity } = boid
          averageVelocity = add(averageVelocity, velocity)
        }
      }
      averageVelocity = divide(averageVelocity, entries.length - 1)
      return divide(subtract(averageVelocity, currentVelocity), 8)
    },
    getLimitedVelocityVector(velocity) {
      const limit = 3
      if (norm(velocity) > limit) {
        return chain(velocity).divide(norm(velocity)).multiply(limit).done()
      }
      return velocity
    },
    getDistance(p1, p2) {
      return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
    }
  }
}
</script>

<style lang="sass" scoped></style>
