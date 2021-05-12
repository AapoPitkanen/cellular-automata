<template lang="pug">
  v-app(dark)
    v-navigation-drawer(v-model="drawer"
      mini-variant
      clipped
      fixed
      floating
      app)
      v-list
        v-list-item(
          v-for="(item, i) in items"
          :key="i"
          :to="item.to"
          router
          exact)
          v-list-item-action
            v-icon {{ item.icon }}
          v-list-item-content
            v-list-item-title(v-text="item.title")
    v-app-bar(:clipped-left="clipped" fixed app)
    v-main.grey.darken-4
      v-container(fluid).px-4
        v-fade-transition
          nuxt
</template>

<script>
export default {
  data() {
    return {
      clipped: true,
      drawer: true,
      fixed: true,
      items: [
        {
          icon: 'mdi-view-dashboard',
          title: 'Dashboard',
          to: '/'
        },
        {
          icon: 'mdi-triangle-outline',
          title: 'Boids',
          to: '/boids'
        },
        {
          icon: 'mdi-apps',
          title: "Conway's Game of Life",
          to: '/conway'
        },
        {
          icon: 'mdi-dots-triangle',
          title: "Pascal's triangle",
          to: '/pascal'
        }
      ],
      miniVariant: true,
      right: true,
      rightDrawer: false
    }
  }
}
</script>
