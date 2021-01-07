<template lang="pug">
  v-row(no-gutters)
    v-col(cols=12)
      v-row
        v-col(cols="auto")
          v-btn(@click="handleStepBackwardClick" :disabled="selectedDay === 0")
            v-icon mdi-step-backward
        v-col(cols="auto")
          v-btn(@click="handleStopPlaybackClick" v-if="lifeInterval")
            v-icon mdi-stop
          v-btn(@click="handleStartPlaybackClick" v-else)
            v-icon mdi-play
        v-col(cols="auto")
          v-btn
            v-icon mdi-pause
        v-col(cols="auto")
          v-btn(@click="handleStepForwardClick")
            v-icon mdi-step-forward
      v-row
        v-col(cols=12 ref="konvaContainer").konva-container
          v-stage(:config="configKonva" @dragend="handleStageDragEnd" @click="handleStageClick")
            v-layer
              v-rect(v-for="(cell, index) in cells" :config="cell" :key="`cell-${index}`")
            v-layer
              v-line(v-for="(line, index) in lines" :config="line" :key="`line-${index}`")
      //- v-row
      //-   v-col(cols=12).conway-grid
      //-     v-row(v-for="(count, row) in rows" no-gutters :key="`row-${row}`").conway-grid-row
      //-       .d-flex.flex-grow-1(v-for="(count, column) in columns" :key="`cell-${column}-${row}`" @click="handleCellClick(column, row)" :class="{ 'alive': currentCellState[`${column}-${row}`] }").conway-cell
</template>

<script>
import { debounce, omit } from 'lodash'

export default {
  data() {
    return {
      lifeInterval: null,
      day: 0,
      selectedDay: 0,
      rows: 24,
      columns: 24,
      seed: {},
      history: [],
      rectWidth: 16,
      rectHeight: 16,
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
    cellStates() {
      return [this.seed, ...this.history]
    },
    currentCellState() {
      return this.cellStates[this.selectedDay]
    },
    cells() {
      const cellKeys = Object.keys(this.currentCellState).filter(
        (key) => this.currentCellState[key]
      )
      return cellKeys.map((cellKey) => {
        const [x, y] = cellKey
          .split('/')
          .map((str) => Number(str) * this.rectWidth)
        return {
          x,
          y,
          width: this.rectWidth,
          height: this.rectHeight,
          fill: 'rgba(0, 143, 17, 0.5)'
        }
      })
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
          stroke: '#999',
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
          stroke: '#999',
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
    clearInterval(this.lifeInterval)
    window.removeEventListener('resize', this.handleWindowResize)
  },
  methods: {
    handleStopPlaybackClick() {
      clearInterval(this.lifeInterval)
      this.lifeInterval = null
    },
    handleStartPlaybackClick() {
      this.day = this.cellStates.length - 1
      this.selectedDay = this.cellStates.length - 1
      this.lifeInterval = setInterval(() => {
        this.updateCells()
        this.day += 1
        this.selectedDay += 1
      }, 1000 / 15)
    },
    handleStageClick({ currentTarget }) {
      const { x, y } = currentTarget.getPointerPosition()
      const { x: stageX, y: stageY } = currentTarget.position()
      const relativeX = x - stageX
      const relativeY = y - stageY
      const cellX = Math.floor(relativeX / this.rectWidth)
      const cellY = Math.floor(relativeY / this.rectHeight)
      const cellKey = `${cellX}/${cellY}`
      const updatedSeed = this.seed[cellKey]
        ? omit(this.seed, [cellKey])
        : {
            ...this.seed,
            [cellKey]: true
          }
      this.seed = updatedSeed
    },
    handleStepBackwardClick() {
      this.selectedDay -= 1
    },
    handleStepForwardClick() {
      this.updateCells()
      this.day += 1
      this.selectedDay += 1
    },
    updateCells() {
      const newCellState = {}
      const oldAliveCells = Object.keys(this.currentCellState).filter(
        (cellKey) => this.currentCellState[cellKey]
      )
      let deadCells = {}
      oldAliveCells.forEach((cellKey) => {
        const surroundingCellKeys = this.getSurroundingCellKeys(cellKey)
        deadCells = {
          ...deadCells,
          ...surroundingCellKeys
        }
        const aliveNeighborCount = this.getAliveNeighborCount(
          surroundingCellKeys
        )
        newCellState[cellKey] =
          aliveNeighborCount >= 2 && aliveNeighborCount <= 3
      })
      const deadCellKeys = Object.keys(deadCells)
      deadCellKeys.forEach((cellKey) => {
        const surroundingCellKeys = this.getSurroundingCellKeys(cellKey)
        const aliveNeighborCount = this.getAliveNeighborCount(
          surroundingCellKeys
        )
        if (aliveNeighborCount === 3 && newCellState[cellKey] === undefined) {
          newCellState[cellKey] = true
        }
      })
      this.history.push(newCellState)
    },
    getSurroundingCellKeys(cellKey) {
      const [cellX, cellY] = cellKey.split('/').map(Number)
      const cellKeys = {}
      for (let x = -1; x < 2; ++x) {
        for (let y = -1; y < 2; ++y) {
          const nextCellX = cellX + x
          const nextCellY = cellY + y
          const isCenter = x === 0 && y === 0
          if (!isCenter) {
            const cellKey = `${nextCellX}/${nextCellY}`
            cellKeys[cellKey] = true
          }
        }
      }
      return cellKeys
    },
    getAliveNeighborCount(cellKeys) {
      const cellKeyList = Object.keys(cellKeys)
      const aliveCells = cellKeyList.map((cellKey) => {
        return this.currentCellState[cellKey]
      })
      const count = aliveCells.filter(Boolean).length
      return count
    },
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
      this.configKonva.x = x
      this.configKonva.y = y
    }
  }
}
</script>

<style lang="sass" scoped>
.absolute
  position: absolute
.conway-grid
  .conway-grid-row
    .conway-cell
      position: relative
      &.alive
        background-color: rgba(0, 143, 17, 0.4)
      border: 1px solid #008F11
      max-width: 48px
      &:nth-child(even)
        border-right: 0
        border-left: 0
      &:last-child
        border-right: 1px solid #008F11
      &::before
        content: ''
        padding-bottom: 100%
        display: block
    &:nth-child(even)
      .conway-cell
        border-bottom: 0
        border-top: 0
    &:last-child
      .conway-cell
        border-bottom: 1px solid #008F11
</style>
