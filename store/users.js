export const namespaced = true

export const state = () => ({
  users: []
})

export const mutations = {
  setUsers(state, users) {
    state.users = users
  }
}

export const actions = {
  setUsers({ commit }, users) {
    commit('setUsers', users)
  }
}
