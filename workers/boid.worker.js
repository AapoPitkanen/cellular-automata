import { getUpdatedBoids } from '../utils/boids'

self.addEventListener('message', ({ data }) => {
  const {
    maxSpeed,
    maxForce,
    boidsChunk,
    allBoids,
    endX,
    endY,
    margin,
    index
  } = data
  const updatedBoids = getUpdatedBoids({
    maxSpeed,
    maxForce,
    boidsChunk,
    allBoids,
    endX,
    endY,
    margin
  })
  self.postMessage({ updatedBoids, index })
})
