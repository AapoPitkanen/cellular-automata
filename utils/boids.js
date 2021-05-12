// import { add, divide, subtract, norm, chain, multiply } from 'mathjs'
import { vec2 } from 'gl-matrix'
import KDBush from 'kdbush'

function radiansToDegrees(radians) {
  const divisor = 2 * Math.PI
  const numerator = radians > 0 ? radians : 2 * Math.PI + radians
  return (numerator * 360) / divisor
}

function seek({ target, position, velocity, maxSpeed, maxForce }) {
  const steer = vec2.fromValues(0, 0)
  vec2.subtract(steer, target, position)
  vec2.normalize(steer, steer)
  vec2.scale(steer, steer, maxSpeed)
  vec2.subtract(steer, steer, velocity)

  if (vec2.length(steer) > maxForce) {
    vec2.normalize(steer, steer)
    vec2.scale(steer, steer, maxForce)
  }
  return steer
}

function getCohesionVector({ boid, neighbors, maxSpeed, maxForce }) {
  const perceivedCenter = vec2.fromValues(0, 0)
  const { x, y, velocity } = boid
  for (const neighbor of neighbors) {
    const position = [neighbor.x, neighbor.y]
    vec2.add(perceivedCenter, perceivedCenter, position)
  }

  if (neighbors.length > 0) {
    vec2.scale(perceivedCenter, perceivedCenter, 1 / neighbors.length)
    const position = [x, y]
    return seek({
      target: perceivedCenter,
      position,
      velocity,
      maxSpeed,
      maxForce
    })
  }
  return perceivedCenter
}

function getSeparationVector({ boid, neighbors, maxSpeed, maxForce }) {
  const { velocity } = boid
  const steer = vec2.fromValues(0, 0)
  const diff = vec2.fromValues(0, 0)
  for (const neighbor of neighbors) {
    vec2.subtract(diff, [boid.x, boid.y], [neighbor.x, neighbor.y])
    vec2.normalize(diff, diff)
    vec2.add(steer, steer, diff)
  }

  if (neighbors.length > 0) {
    vec2.scale(steer, steer, 1 / neighbors.length)
  }

  if (vec2.length(steer) > 0) {
    vec2.normalize(steer, steer)
    vec2.scale(steer, steer, maxSpeed)
    vec2.subtract(steer, steer, velocity)
    if (vec2.length(steer) > maxForce) {
      vec2.normalize(steer, steer)
      vec2.scale(steer, steer, maxForce)
    }
    return steer
  }

  vec2.zero(steer)
  return steer
}

function getAlignmentVector({ boid, neighbors, maxSpeed, maxForce }) {
  const { velocity } = boid
  const steer = vec2.fromValues(0, 0)
  for (const neighbor of neighbors) {
    const { velocity } = neighbor
    vec2.add(steer, steer, velocity)
  }
  if (vec2.length(steer) > 0) {
    vec2.scale(steer, steer, 1 / neighbors.length)
    vec2.normalize(steer, steer)
    vec2.scale(steer, steer, maxSpeed)
    vec2.subtract(steer, steer, velocity)
    if (vec2.length(steer) > maxForce) {
      vec2.normalize(steer, steer)
      vec2.scale(steer, steer, maxForce)
    }
  }
  return steer
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
  separation,
  boidsChunk,
  searchDistance,
  boids,
  endX,
  endY,
  margin,
  cohesionMultiplier,
  alignmentMultiplier,
  separationMultiplier
}) {
  const kdTree = new KDBush(
    boids,
    (p) => p.x,
    (p) => p.y,
    64,
    Float32Array
  )
  const updatedBoids = boidsChunk.map((boid) => {
    const { x, y, velocity, acceleration, targetRotation } = boid
    const currentPosition = [x, y]
    const alignCohesionIndexes = kdTree.within(x, y, searchDistance)
    const neighbors = alignCohesionIndexes
      .map((idx) => boids[idx])
      .filter((neighbor) => neighbor.name !== boid.name)
    const separationIndexes = kdTree.within(x, y, separation)
    const sepNeighbors = separationIndexes
      .map((idx) => boids[idx])
      .filter((neighbor) => neighbor.name !== boid.name)
    const alignmentVector = getAlignmentVector({
      boid,
      neighbors,
      maxSpeed,
      maxForce
    })
    const cohesionVector = getCohesionVector({
      boid,
      neighbors,
      maxSpeed,
      maxForce
    })
    const separationVector = getSeparationVector({
      boid,
      neighbors: sepNeighbors,
      maxSpeed,
      maxForce
    })
    vec2.scale(separationVector, separationVector, separationMultiplier)
    vec2.scale(alignmentVector, alignmentVector, alignmentMultiplier)
    vec2.scale(cohesionVector, cohesionVector, cohesionMultiplier)
    vec2.add(acceleration, acceleration, separationVector)
    vec2.add(acceleration, acceleration, alignmentVector)
    vec2.add(acceleration, acceleration, cohesionVector)

    vec2.add(velocity, velocity, acceleration)

    if (vec2.length(velocity) > maxSpeed) {
      vec2.normalize(velocity, velocity)
      vec2.scale(velocity, velocity, maxSpeed)
    }

    vec2.lerp(targetRotation, targetRotation, velocity, 0.1)
    const [directionX, directionY] = targetRotation
    const [nextX, nextY] = vec2.add(currentPosition, currentPosition, velocity)

    const directionRadians = Math.atan2(directionY, directionX)
    const directionDegrees = radiansToDegrees(directionRadians)
    const rotationAmount = directionDegrees + 90

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
      acceleration: vec2.zero(acceleration),
      velocity,
      rotation: rotationAmount,
      targetRotation
    }
  })
  return updatedBoids
}

function generateRandomPoints(count, maxX, maxY) {
  const points = []
  for (let i = 0; i < count; ++i) {
    while (true) {
      const x = Math.floor(Math.random() * maxX)
      const y = Math.floor(Math.random() * maxY)
      const point = `${x}/${y}`
      if (!points.includes(point)) {
        points.push(point)
        break
      }
    }
  }
  return points.map((point) => point.split('/').map(Number))
}

export { getUpdatedBoids, generateRandomPoints, radiansToDegrees }
