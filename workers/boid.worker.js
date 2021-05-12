import { getUpdatedBoids } from '../utils/boids'

self.addEventListener('message', ({ data }) => {
  const updatedBoids = getUpdatedBoids(data)
  self.postMessage({ updatedBoids })
})
