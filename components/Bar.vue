<template lang="pug">
    v-card
      v-card-title.purple.white--text Hello mister
      v-card-text
        .d-flex.box
  </template>

<script>
export default {
  data() {
    return {
      isVisible: false
    }
  },
  methods: {
    setIsVisible(isVisible) {
      this.isVisible = isVisible
    }
  }
}
</script>

<style lang="sass" scoped>
.box
  max-width: 10rem
</style>
