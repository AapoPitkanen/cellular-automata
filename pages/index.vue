<template lang="pug">
  v-row.justify-center
    v-col(cols=12 md=4 lg=3 xl=2 v-for="route in routes" :key="route.to")
      v-card(:to="route.to")
        v-card-title.justify-center.pb-0
          v-icon(size=72 color="grey lighten-1") {{ route.icon }}
        v-card-text.d-flex.justify-center.pb-2
          .text-button {{ route.label }}
</template>

<script>
export default {
  data() {
    return {
      routes: [
        {
          to: 'boids',
          icon: 'mdi-triangle-outline',
          label: 'Boids'
        },
        {
          to: 'conway',
          icon: 'mdi-apps',
          label: "Conway's Game of Life"
        },
        {
          to: 'pascal',
          icon: 'mdi-dots-triangle',
          label: "Pascal's triangle"
        }
      ]
    }
  }
}
</script>
