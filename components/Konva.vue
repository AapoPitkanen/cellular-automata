<template lang="pug">
  v-row(no-gutters)
    v-col(cols=12 ref="konvaContainer").konva-container
      v-stage(:config="configKonva" @dragend="handleStageDragEnd")
        v-layer
          v-rect(v-for="(cell, index) in cells" :config="cell" :key="`cell-${index}`")
        v-layer
          v-line(v-for="(line, index) in lines" :config="line" :key="`line-${index}`")

</template>

<script>
import { debounce } from 'lodash'

export default {
  data() {
    return {
      rectWidth: 32,
      rectHeight: 32,
      margin: 640,
      configKonva: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        draggable: true
      }
    }
  },
  computed: {
    cells() {
      return [
        {
          x: 0,
          y: 0,
          width: this.rectWidth,
          height: this.rectHeight,
          fill: 'rgba(0, 143, 17, 0.5)'
        }
      ]
    },
    lines() {
      const startX =
        Math.floor((-this.margin - this.configKonva.x) / this.rectWidth) *
        this.rectWidth
      const endX =
        Math.floor(
          (this.configKonva.width +
            this.margin +
            Math.abs(this.configKonva.x)) /
            this.rectWidth
        ) * this.rectWidth

      const startY =
        Math.floor((-this.margin - this.configKonva.y) / this.rectHeight) *
        this.rectHeight
      const endY =
        Math.floor(
          (this.configKonva.height +
            this.margin +
            Math.abs(this.configKonva.y)) /
            this.rectHeight
        ) * this.rectHeight
      const lines = []
      for (let x = startX; x < endX; x += this.rectWidth) {
        lines.push({
          points: [
            x,
            -this.margin - Math.abs(this.configKonva.y),
            x,
            this.configKonva.height + this.margin + Math.abs(this.configKonva.y)
          ],
          stroke: '#ebebeb',
          strokeWidth: 1
        })
      }
      for (let y = startY; y < endY; y += this.rectHeight) {
        lines.push({
          points: [
            -this.margin - Math.abs(this.configKonva.x),
            y,
            this.configKonva.width + this.margin + Math.abs(this.configKonva.x),
            y
          ],
          stroke: '#ebebeb',
          strokeWidth: 1
        })
      }
      return lines
    }
  },
  mounted() {
    this.$nextTick(() => {
      const availableWidth = this.$refs.konvaContainer.clientWidth
      const windowHeight = window.innerHeight
      const canvasWidth =
        Math.floor(availableWidth / this.rectWidth) * this.rectWidth
      const canvasHeight =
        Math.floor(Math.floor((windowHeight * 2) / 3) / this.rectHeight) *
        this.rectHeight
      this.configKonva.width = canvasWidth
      this.configKonva.height = canvasHeight
    })
    window.addEventListener('resize', this.handleWindowResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleWindowResize)
  },
  methods: {
    handleWindowResize: debounce(function () {
      const konvaContainer = this.$refs.konvaContainer
      if (konvaContainer) {
        const availableWidth = konvaContainer.clientWidth
        const canvasWidth =
          Math.floor(availableWidth / this.rectWidth) * this.rectWidth
        this.configKonva.width = canvasWidth
      }
    }, 100),
    handleStageDragEnd(e) {
      const { currentTarget } = e
      const position = currentTarget.position()
      const { x, y } = position
      console.log(e)
      this.configKonva.x = x
      this.configKonva.y = y
    }
  }
}
</script>

<style lang="sass" scoped></style>
