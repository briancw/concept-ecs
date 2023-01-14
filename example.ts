import {createWorld, createComponent, createEntity, createQuery, addComponent, removeComponent} from '.'

const maxEntCount = 10_000_000
const world = createWorld()
const Position = createComponent(world, 'f32', maxEntCount)
const Velocity = createComponent(world, 'f32', maxEntCount)
const positionVelocityQuery = createQuery([Position, Velocity], maxEntCount)
const queries = [positionVelocityQuery]

setInterval(() => {
    const newEntCount = 100_000

    // Create Ents
    const createStart = performance.now()
    for (let index = 0; index < newEntCount; index += 1) {
        const entId = createEntity(world)
        addComponent(world, Position, entId, queries, true)
        addComponent(world, Velocity, entId, queries)
        Velocity.componentData[entId] = 1
    }
    const createTime = performance.now() - createStart

    // Iterate
    const iterationStart = performance.now()
    for (let index = 0; index < positionVelocityQuery.lastIndex; index += 1) {
        const entId = positionVelocityQuery.entities[index]
        Position.componentData[entId] += Velocity.componentData[entId]
    }
    const iterationTime = performance.now() - iterationStart

    // Remove
    const removeStart = performance.now()
    for (let index = 0; index < newEntCount; index += 1) {
        const entId = positionVelocityQuery.entities[0]
        removeComponent(world, Position, entId, queries)
        removeComponent(world, Velocity, entId, queries)
    }
    const removeTime = performance.now() - removeStart

    const createTimePerEnt = createTime / newEntCount
    const iterationPerEnt = iterationTime / newEntCount
    const removeTimePerEnt = removeTime / newEntCount

    console.log('ent count:', newEntCount.toLocaleString('en-US'))
    console.log('create time:', (createTime).toFixed(2) + 'ms')
    console.log('remove time:', (removeTime).toFixed(2) + 'ms')
    console.log('iteration time:', (iterationTime).toFixed(2) + 'ms')

    console.log('create time per:', (createTimePerEnt * 1000 * 1000).toFixed(2) + 'ns')
    console.log('remove time per:', (removeTimePerEnt * 1000 * 1000).toFixed(2) + 'ns')
    console.log('iteration time per:', (iterationPerEnt * 1000 * 1000).toFixed(2) + 'ns')
    console.log('----')
}, 1000)

