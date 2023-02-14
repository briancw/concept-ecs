import {createWorld, createComponent, createEntity, addComponent, removeComponent, removeEntity, createQuery} from './index'

const maxEntityCount = 1_000_000
const world = createWorld(maxEntityCount)
const Position = createComponent(world, {value: Float32Array})
const Velocity = createComponent(world, {value: Float32Array})
const Foo = createComponent(world, {value: Float32Array})
const query = createQuery(world, [Position, Velocity], [Foo])

setInterval(() => {
    const newEntCount = 100_000

    // Create Ents
    const createStart = performance.now()
    for (let index = 0; index < newEntCount; index += 1) {
        const entId = createEntity(world)
        addComponent(world, Position, entId)
        addComponent(world, Velocity, entId)
    }
    const createTime = performance.now() - createStart

    // Query
    const queryStart = performance.now()
    const [ents, newEnts] = query.run({entry: true})
    const queryTime = performance.now() - queryStart

    for (let index = 0; index < newEnts.length; index += 1) {
        const entityId = newEnts[index]
        Velocity.value[entityId] = 1
    }

    // Iterate
    const iterationStart = performance.now()
    for (let index = 0; index < ents.length; index += 1) {
        const entId = ents[index]
        Position.value[entId] += Velocity.value[entId]
    }
    const iterationTime = performance.now() - iterationStart

    // Remove
    const removeStart = performance.now()
    for (let index = 0; index < newEntCount; index += 1) {
        removeComponent(world, Position, index)
        removeComponent(world, Velocity, index)
        removeEntity(world, index)
    }
    const removeTime = performance.now() - removeStart

    // const fullTime = createTime + queryTime + iterationTime + removeTime
    // const fullTimePer = fullTime / newEntCount
    const createTimePerEnt = createTime / newEntCount
    const iterationPerEnt = iterationTime / newEntCount
    const removeTimePerEnt = removeTime / newEntCount

    console.log('ent count:', newEntCount.toLocaleString('en-US'))
    // console.log('max ent:', (world.lastEntityId[0] - 1).toLocaleString('en-US'))
    console.log('create time:', (createTime).toFixed(2) + 'ms')
    console.log('remove time:', (removeTime).toFixed(2) + 'ms')
    console.log('iteration time:', (iterationTime).toFixed(2) + 'ms')
    console.log('query time:', (queryTime).toFixed(2) + 'ms')
    // console.log('full time:', (fullTime).toFixed(2) + 'ms')

    console.log('create time per:', (createTimePerEnt * 1000 * 1000).toFixed(2) + 'ns')
    console.log('remove time per:', (removeTimePerEnt * 1000 * 1000).toFixed(2) + 'ns')
    console.log('query time per:', (queryTime / newEntCount * 1000 * 1000).toFixed(2) + 'ns')
    console.log('iteration time per:', (iterationPerEnt * 1000 * 1000).toFixed(2) + 'ns')
    // console.log('full time per:', (fullTimePer * 1000 * 1000).toFixed(2) + 'ns')
    console.log('----')
}, 1000)

