import { getUpdatedBoids } from '../utils/boids'

self.addEventListener('message', ({ data }) => {
  const { maxSpeed, maxForce, boidsChunk, allBoids, endX, endY, margin } = data
  console.log(
    'worker received boids',
    boidsChunk.map(({ name }) => name)
  )
  const updatedBoids = getUpdatedBoids({
    maxSpeed,
    maxForce,
    boidsChunk,
    allBoids,
    endX,
    endY,
    margin
  })

  self.postMessage({ updatedBoids })
})
