<template lang="pug">
  v-row
    v-col(cols=12)
      v-row
        v-col(cols="auto")
          v-btn(@click="handleStepBackwardClick" :disabled="currentDay === 0 || !!lifeInterval")
            v-icon mdi-step-backward
        v-col(cols="auto")
          v-btn(@click="handleStopPlaybackClick" v-if="!!lifeInterval")
            v-icon mdi-stop
          v-btn(@click="handleStartPlaybackClick" v-else)
            v-icon mdi-play
        v-col(cols="auto")
          v-btn(@click="handleStepForwardClick" :disabled="!!lifeInterval")
            v-icon mdi-step-forward
        v-col(cols="auto")
          v-btn(@click="handleResetClick" :disabled="!!lifeInterval")
            v-icon mdi-restore
        v-col(cols="auto")
          .text-button Day {{ currentDay }}
        v-col(cols="auto")
          .text-button Population {{ currentPopulation }}
      v-row(no-gutters)
        v-col(cols=12 ref="konvaContainer").konva-container
          v-stage(:config="configKonva" @dragend="handleStageDragEnd" @click="handleStageClick")
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
      lifeInterval: null,
      currentDay: 0,
      rows: 24,
      columns: 24,
      cellStates: [new Set()],
      rectWidth: 16,
      rectHeight: 16,
      margin: 2560,
      configKonva: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        draggable: true
      },
      cellColor: 'rgba(0, 143, 17, 0.5)',
      gridColor: '#999'
    }
  },
  computed: {
    currentCellState() {
      return this.cellStates[this.currentDay]
    },
    currentPopulation() {
      return this.currentCellState.size
    },
    cells() {
      const cellKeys = [...this.currentCellState.values()]
      return cellKeys.map((cellKey) => {
        const [x, y] = cellKey
          .split('/')
          .map((str) => Number(str) * this.rectWidth)
        return {
          x,
          y,
          width: this.rectWidth,
          height: this.rectHeight,
          fill: this.cellColor
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
          stroke: this.gridColor,
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
          stroke: this.gridColor,
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
      this.cellStates = this.cellStates.slice(0, this.currentDay + 1)
      this.lifeInterval = setInterval(() => {
        this.updateCells()
        this.currentDay += 1
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
      const updatedCurrentCellState = new Set(this.currentCellState)
      if (this.currentCellState.has(cellKey)) {
        updatedCurrentCellState.delete(cellKey)
      } else {
        updatedCurrentCellState.add(cellKey)
      }
      this.$set(this.cellStates, this.currentDay, updatedCurrentCellState)
    },
    handleStepBackwardClick() {
      this.currentDay -= 1
    },
    handleStepForwardClick() {
      this.updateCells()
      this.currentDay += 1
    },
    handleResetClick() {
      this.currentDay = 0
      this.cellStates = [new Set()]
    },
    updateCells() {
      const newCellState = new Set()
      let deadCells = new Set()
      for (const cellKey of this.currentCellState) {
        const surroundingCellKeys = this.getSurroundingCellKeys(cellKey)
        deadCells = new Set([...deadCells, ...surroundingCellKeys])
        const aliveNeighborCount = this.getAliveNeighborCount(
          surroundingCellKeys
        )
        if (aliveNeighborCount >= 2 && aliveNeighborCount <= 3) {
          newCellState.add(cellKey)
        }
      }

      for (const cellKey of deadCells) {
        const surroundingCellKeys = this.getSurroundingCellKeys(cellKey)
        const aliveNeighborCount = this.getAliveNeighborCount(
          surroundingCellKeys
        )
        if (aliveNeighborCount === 3 && !newCellState.has(cellKey)) {
          newCellState.add(cellKey)
        }
      }
      this.cellStates.push(newCellState)
    },
    getSurroundingCellKeys(cellKey) {
      const [cellX, cellY] = cellKey.split('/').map(Number)
      const cellKeys = new Set()
      for (let x = -1; x < 2; ++x) {
        for (let y = -1; y < 2; ++y) {
          const nextCellX = cellX + x
          const nextCellY = cellY + y
          const isCenter = x === 0 && y === 0
          if (!isCenter) {
            const cellKey = `${nextCellX}/${nextCellY}`
            cellKeys.add(cellKey)
          }
        }
      }
      return cellKeys
    },
    getAliveNeighborCount(cellKeys) {
      const cellKeyList = [...cellKeys]
      const aliveCells = cellKeyList.filter((cellKey) =>
        this.currentCellState.has(cellKey)
      )
      return aliveCells.length
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
</style>
