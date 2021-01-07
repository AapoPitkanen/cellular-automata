import { getUpdatedBoids } from '../utils/boids'

self.addEventListener('message', ({ data }) => {
  const {
    maxSpeed,
    maxForce,
    separation,
    boidsChunk,
    searchDistance,
    boids,
    endX,
    endY,
    margin,
    index
  } = data
  const updatedBoids = getUpdatedBoids({
    maxSpeed,
    maxForce,
    separation,
    boidsChunk,
    searchDistance,
    boids,
    endX,
    endY,
    margin
  })
  self.postMessage({ updatedBoids, index })
})
