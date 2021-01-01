export const state = () => ({
  isIE11: false
})

export const mutations = {
  setIsIE11(state, isIE11) {
    state.isIE11 = isIE11
  }
}

export const actions = {
  setIsIE11({ commit }, isIE11) {
    commit('setISIE11', isIE11)
  }
}
