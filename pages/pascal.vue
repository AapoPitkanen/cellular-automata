<template lang="pug">
  v-row.justify-center
    v-col(cols=12)
      v-row.justify-center
        v-col(cols=12 sm=6 md=4 lg=2)
          v-text-field(
            outlined
            hide-details
            dense
            v-model="numberOfRows")
    v-col(cols="auto")
      v-fade-transition(group)
        v-row(v-for="(row, rowIndex) in pascalRows" :key="rowIndex").justify-center
          v-col(v-for="(column, columnIndex) in row" cols="auto" :key="`${rowIndex}-${columnIndex}`").pascal-column
            .text-caption.grey--text {{ column }}
</template>

<script>
export default {
  data() {
    return {
      numberOfRows: ''
    }
  },
  computed: {
    pascalRows() {
      const casted = Number(this.numberOfRows)
      return casted ? this.createPascalRows(casted) : []
    }
  },
  methods: {
    createPascalRows(rows) {
      const scaffold = Array.from({ length: rows + 1 }).map((_, idx) => idx)
      return scaffold.map(this.createPascalRow)
    },
    createPascalRow(row) {
      const half = Array.from({ length: Math.ceil((row + 1) / 2) }).map(
        (_, index) => index + 1
      )
      half.forEach(
        (column, idx) =>
          (half[idx] =
            idx === 0
              ? column
              : Math.round(
                  half[idx - 1] * this.calculatePascalFraction(row, column - 1)
                ))
      )
      const rest =
        row % 2 === 0 ? half.slice(0, -1).reverse() : [...half].reverse()
      return [...half, ...rest]
    },
    calculatePascalFraction(row, column) {
      const numerator = row + 1 - column
      return numerator / column
    }
  }
}
</script>

<style lang="sass" scoped>
.pascal
  &-column
    min-width: 64px
    display: flex
    justify-content: center
</style>
