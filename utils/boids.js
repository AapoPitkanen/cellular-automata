import { add, divide, subtract, norm, chain, multiply } from 'mathjs'

function radiansToDegrees(radians) {
  const divisor = 2 * Math.PI
  const numerator = radians > 0 ? radians : 2 * Math.PI + radians
  return (numerator * 360) / divisor
}

function seek({ target, position, velocity, maxSpeed, maxForce }) {
  const desired = subtract(target, position)
  const normalized = divide(desired, norm(desired))
  const maximized = multiply(normalized, maxSpeed)
  const steer = subtract(maximized, velocity)
  const limited = getLimitedVector(steer, maxForce)
  return limited
}

function getCohesionVector({ currentBoid, boids, maxSpeed, maxForce }) {
  const neighborDistance = 200
  const currentPosition = [currentBoid.x, currentBoid.y]
  const { velocity } = currentBoid
  let perceivedCentre = [0, 0]
  let count = 0
  for (const boid of boids) {
    const distance = getDistance(currentBoid, boid)
    if (distance > 0 && distance < neighborDistance) {
      const position = [boid.x, boid.y]
      perceivedCentre = add(perceivedCentre, position)
      count++
    }
  }

  if (count > 0) {
    perceivedCentre = divide(perceivedCentre, count)
    const target = perceivedCentre
    const position = currentPosition
    return seek({ target, position, velocity, maxSpeed, maxForce })
  }
  return [0, 0]
}

function getSeparationVector({ currentBoid, boids, maxSpeed, maxForce }) {
  const { velocity } = currentBoid
  const separation = 35
  let steer = [0, 0]
  let count = 0
  for (const boid of boids) {
    const distance = getDistance(currentBoid, boid)
    if (distance > 0 && distance < separation) {
      let diff = subtract([currentBoid.x, currentBoid.y], [boid.x, boid.y])
      diff = divide(diff, norm(diff))
      diff = divide(diff, distance)
      steer = add(steer, diff)
      count++
    }
  }

  if (count > 0) {
    steer = divide(steer, count)
  }

  if (norm(steer) > 0) {
    steer = divide(steer, norm(steer))
    steer = multiply(steer, maxSpeed)
    steer = subtract(steer, velocity)
    steer = getLimitedVector(steer, maxForce)
  }

  return steer
}

function getAlignmentVector({ currentBoid, boids, maxSpeed, maxForce }) {
  const neighborDistance = 200
  let count = 0
  const currentVelocity = currentBoid.velocity
  let averageVelocity = [0, 0]
  for (const boid of boids) {
    const { velocity } = boid
    const distance = getDistance(currentBoid, boid)
    if (distance > 0 && distance < neighborDistance) {
      averageVelocity = add(averageVelocity, velocity)
      count++
    }
  }
  if (norm(averageVelocity) > 0) {
    averageVelocity = divide(averageVelocity, count)
    const normalized = divide(averageVelocity, norm(averageVelocity))
    const maximized = multiply(normalized, maxSpeed)
    const steer = subtract(maximized, currentVelocity)
    const limited = getLimitedVector(steer, maxForce)
    return limited
  }
  return averageVelocity
}

function getLimitedVector(vector, limit) {
  if (norm(vector) > limit) {
    return chain(vector).divide(norm(vector)).multiply(limit).done()
  }
  return vector
}

function getDistance(p1, p2) {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
}

function getCoordinatesWithWrapping({ x, y, endX, endY, margin }) {
  let [wrappedX, wrappedY] = [x, y]

  if (wrappedX < -margin) {
    wrappedX = endX + margin
  }

  if (wrappedY < -margin) {
    wrappedY = endY + margin
  }

  if (wrappedX > endX + margin) {
    wrappedX = -margin
  }

  if (wrappedY > endY + margin) {
    wrappedY = -margin
  }

  return [wrappedX, wrappedY]
}

function getUpdatedBoids({
  maxSpeed,
  maxForce,
  boidsChunk,
  allBoids,
  endX,
  endY,
  margin
}) {
  const updatedBoids = boidsChunk
    .map((boid) => {
      const { x, y, velocity, acceleration } = boid
      const currentPosition = [x, y]
      const alignmentVector = getAlignmentVector({
        currentBoid: boid,
        boids: allBoids,
        maxSpeed,
        maxForce
      })
      const cohesionVector = getCohesionVector({
        currentBoid: boid,
        boids: allBoids,
        maxSpeed,
        maxForce
      })
      const separationVector = multiply(
        getSeparationVector({
          currentBoid: boid,
          boids: allBoids,
          maxSpeed,
          maxForce
        }),
        2.5
      )
      const updatedAcceleration = chain(acceleration)
        .add(separationVector)
        .add(alignmentVector)
        .add(cohesionVector)
        .done()
      let updatedVelocity = add(velocity, updatedAcceleration)
      if (norm(updatedVelocity) === 0) {
        updatedVelocity = add(updatedVelocity, [
          Math.random() * 100,
          Math.random() * 100
        ])
      }
      const limitedVelocity = getLimitedVector(updatedVelocity, maxSpeed)
      const [directionX, directionY] = limitedVelocity
      const [nextX, nextY] = add(currentPosition, limitedVelocity)
      const directionRadians = Math.atan2(directionY, directionX)
      const directionDegrees = radiansToDegrees(directionRadians)
      const targetRotation = directionDegrees + 90

      const [wrappedX, wrappedY] = getCoordinatesWithWrapping({
        x: nextX,
        y: nextY,
        endX,
        endY,
        margin
      })

      return {
        ...boid,
        x: wrappedX,
        y: wrappedY,
        velocity: limitedVelocity,
        rotation: targetRotation
      }
    })
    .reduce((boids, boid) => {
      const { name } = boid
      boids[name] = boid
      return boids
    }, {})

  return updatedBoids
}

export { getUpdatedBoids }
