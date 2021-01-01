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
        nuxt
    v-footer
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
          icon: 'mdi-apps',
          title: 'Welcome',
          to: '/'
        },
        {
          icon: 'mdi-chart-bubble',
          title: 'Inspire',
          to: '/inspire'
        }
      ],
      miniVariant: true,
      right: true,
      rightDrawer: false
    }
  },
  mounted() {
    console.log('default layout mounted')
  }
}
</script>
