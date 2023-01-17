import {createWorld, createComponent, createEntity, createQuery, addComponent, removeComponent, removeEntity, runQuery} from './index'

const maxEntityCount = 10_000_000
const world = createWorld(maxEntityCount)
const Position = createComponent(world, Float32Array)
const Velocity = createComponent(world, Float32Array)
const Foo = createComponent(world, Float32Array)
const positionVelocityQuery = createQuery(world, [Position, Velocity], [Foo])

setInterval(() => {
    const newEntCount = 100_000

    // Create Ents
    const createStart = performance.now()
    for (let index = 0; index < newEntCount; index += 1) {
        const entId = createEntity(world)
        addComponent(world, Position, entId)
        addComponent(world, Velocity, entId)
        Velocity.componentData[entId] = 1
    }
    const createTime = performance.now() - createStart

    // Query
    // positionVelocityQuery.entities.fill(0)
    const queryStart = performance.now()
    runQuery(world, positionVelocityQuery)
    // console.log(positionVelocityQuery.entities)
    const queryTime = performance.now() - queryStart

    // Iterate
    const iterationStart = performance.now()
    for (let index = 0; index < positionVelocityQuery.lastIndex[0]; index += 1) {
        const entId = positionVelocityQuery.entities[index]
        Position.componentData[entId] += Velocity.componentData[entId]
    }
    const iterationTime = performance.now() - iterationStart

    // Remove
    const removeStart = performance.now()
    for (let index = 0; index < newEntCount; index += 1) {
        const entId = positionVelocityQuery.entities[index]
        removeComponent(world, Position, entId)
        removeComponent(world, Velocity, entId)
        removeEntity(world, entId)
    }
    const removeTime = performance.now() - removeStart
    // console.log(world.deletedEntities)

    const fullTime = queryTime + iterationTime
    const fullTimePer = fullTime / newEntCount
    const createTimePerEnt = createTime / newEntCount
    const iterationPerEnt = iterationTime / newEntCount
    const removeTimePerEnt = removeTime / newEntCount

    console.log('ent count:', newEntCount.toLocaleString('en-US'))
    console.log('max ent:', (world.lastEntityId[0] - 1).toLocaleString('en-US'))
    console.log('create time:', (createTime).toFixed(2) + 'ms')
    console.log('remove time:', (removeTime).toFixed(2) + 'ms')
    console.log('iteration time:', (iterationTime).toFixed(2) + 'ms')
    console.log('query time:', (queryTime).toFixed(2) + 'ms')
    console.log('full time', (fullTime).toFixed(2) + 'ms')

    console.log('create time per:', (createTimePerEnt * 1000 * 1000).toFixed(2) + 'ns')
    console.log('remove time per:', (removeTimePerEnt * 1000 * 1000).toFixed(2) + 'ns')
    console.log('iteration time per:', (iterationPerEnt * 1000 * 1000).toFixed(2) + 'ns')
    console.log('full time per:', (fullTimePer * 1000 * 1000).toFixed(2) + 'ns')
    console.log('----')
}, 1000)

