<template lang="pug">
  v-row(no-gutters)
    v-col(cols=12)
      v-row(v-for="[week, config] in Object.entries(weeks)" :key="week")
        v-col(cols=12 sm=4)
          v-row
            v-col
          v-row
            v-col
              .total-container
                v-text-field(
                  :value="config.limit"
                  @input="handleWeekLimitInput($event, week)"
                  outlined
                )
        v-col(cols=12 sm=8)
          v-row(:style="{ transform: `scaleX(${config.limit / maxWeekLimit})` }").grey.bar-container
            v-col(
              v-for="([agent, limit], index) in Object.entries(config.agents)"
              :key="`${week}-${agent}`"
              :class="colorClasses[index]"
              :style="getStyleForBar({ week, agent, limit, index })"
              ).bar
          v-row
            v-col(
              v-for="[agent, limit] in Object.entries(config.agents)"
              :key="`${week}-${agent}-input`"
            )
              v-text-field(
                :value="limit"
                @input="handleAgentLimitInput($event, week, agent)"
                outlined
              )
        v-col(cols=12)
          v-row
            v-col(cols=12 sm=4)
              v-card
                v-card-title.orange.darken-2 Title
                v-card-text.pt-4 Placeholder
                v-card-actions
                  v-spacer
                  v-btn(dark text @click="isContentVisible = !isContentVisible") Click
            v-col(cols=12 sm=4)
              v-expand-transition
                v-card(v-show="isContentVisible")
                  v-card-title.blue.darken-2 Yay
                  v-card-text.pt-4 Stuff
                  v-card-actions
                    v-btn(dark text) Lorem
                    v-spacer
                    v-btn(dark text) Ipsum
            v-col(cols=12 sm=4)
              v-slide-x-transition
                v-card(v-show="!isContentVisible")
                  v-card-title.green.darken-2 Yay
                  v-card-text.pt-4 Stuff
                  v-card-actions
                    v-btn(dark text) Lorem
                    v-spacer
                    v-btn(dark text) Ipsum
</template>

<script>
import { debounce } from 'lodash'

export default {
  data() {
    return {
      colorClasses: ['primary', 'secondary', 'info', 'warning', 'error'],
      weeks: {
        1: {
          limit: 300,
          agents: {
            agent1: 100,
            agent2: 100,
            agent3: 100
          }
        },
        2: {
          limit: 400,
          agents: {
            agent1: 100,
            agent2: 100,
            agent3: 100,
            agent4: 100
          }
        },
        3: {
          limit: 300,
          agents: {
            agent1: 100,
            agent2: 100,
            agent3: 100
          }
        },
        4: {
          limit: 500,
          agents: {
            agent1: 100,
            agent2: 100,
            agent3: 100,
            agent4: 100,
            agent5: 100
          }
        },
        5: {
          limit: 300,
          agents: {
            agent1: 100,
            agent2: 100,
            agent3: 100
          }
        },
        6: {
          limit: 400,
          agents: {
            agent1: 100,
            agent2: 100,
            agent3: 100,
            agent4: 100
          }
        }
      },
      isContentVisible: false
    }
  },
  computed: {
    maxWeekLimit() {
      const allLimits = Object.values(this.weeks).map(({ limit }) => limit)
      return Math.max(...allLimits)
    }
  },
  methods: {
    getStyleForBar({ week, agent, limit, index }) {
      const casted = Number(limit)
      const agentsForWeek = this.weeks[week].agents
      const numberOfAgentsInWeek = Object.keys(agentsForWeek).length
      const scaleDivisor = this.weeks[week].limit / numberOfAgentsInWeek
      if (casted) {
        const scaleFactor = casted / scaleDivisor
        const translateAmount = this.getTranslateAmountForBar({
          agentsForWeek,
          scaleDivisor,
          index
        })
        const style = {
          transform: `translateX(${-(
            translateAmount * 100
          )}%) scaleX(${scaleFactor})`
        }
        return style
      } else {
        return {}
      }
    },
    getTranslateAmountForBar({ agentsForWeek, scaleDivisor, index }) {
      if (index === 0) {
        return 0
      }

      const remainingAgentLimits = Object.values(agentsForWeek).slice(0, index)
      return remainingAgentLimits.reduce(
        (total, limit) => total + (scaleDivisor - limit) / scaleDivisor,
        0
      )
    },
    handleWeekLimitInput: debounce(function (limit, week) {
      this.$set(this.weeks[week], 'limit', limit)
    }, 150),
    handleAgentLimitInput: debounce(function (limit, week, agent) {
      this.$set(this.weeks[week].agents, agent, limit)
    }, 150)
  }
}
</script>

<style lang="sass" scoped>
.total-container
  max-width: 8rem
.bar,
.bar-container
  transform-origin: left
  transition: transform 900ms ease
</style>
