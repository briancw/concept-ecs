import {createWorld, createComponent, createEntity, createQuery, addComponent} from './index'

const setupStart = performance.now()
const maxEntCount = 2_000_000
const entCount = 1_000_000
// const entCount = 100_000
const world = createWorld()
const Position = createComponent(world, 'f32', maxEntCount)
const Velocity = createComponent(world, 'f32', maxEntCount)
const positionVelocityQuery = createQuery(world, [Position, Velocity], maxEntCount)

// ents with just position
for (let index = 0; index < 500; index += 1) {
    const ent = createEntity(world)
    addComponent(world, Position, ent)
}

// ents with position and velocity
for (let index = 0; index < entCount; index += 1) {
    const ent = createEntity(world)
    addComponent(world, Position, ent)
    addComponent(world, Velocity, ent)
    Velocity.componentData[ent] = 1
}
const setupTime = performance.now() - setupStart
const setupPerEnt = setupTime / entCount
console.log('start time:', setupTime.toFixed(2) + 'ms')
console.log('setup per ent:', (setupPerEnt * 1000 * 1000).toFixed(2) + 'ns')

// Query and Create
setInterval(() => {
    const itterationStart = performance.now()
    // const queryStart = performance.now()
    const ents = world.queries[positionVelocityQuery].getEnts()
    // const queryTime = performance.now() - queryStart

    for (let index = 0; index < ents.length; index += 1) {
        const entId = ents[index]
        Position.componentData[entId] += Velocity.componentData[entId]
    }

    // Create 1000 new ents
    for (let index = 0; index < 1000; index += 1) {
        const entId = createEntity(world)
        addComponent(world, Position, entId)
        addComponent(world, Velocity, entId)
    }

    const itterationTime = performance.now() - itterationStart
    const perEnt = itterationTime / ents.length

    // console.log('query time:', (queryTime * 1000 * 1000).toLocaleString('en-US') + 'ns')
    console.log('per ent:', (perEnt * 1000 * 1000).toFixed(2) + 'ns')
    console.log('iteration time:', (itterationTime).toFixed(2) + 'ms')
    // console.log('avg time:', (avgTime * 1000 * 1000).toFixed(2) + 'ns')
}, 1000)

// Query Iteration
// setInterval(() => {
//     const itterationStart = performance.now()
//     // const queryStart = performance.now()
//     const ents = world.queries[positionVelocityQuery].getEnts()
//     // const queryTime = performance.now() - queryStart

//     for (let index = 0; index < ents.length; index += 1) {
//         const entId = ents[index]
//         Position.componentData[entId] += Velocity.componentData[entId]
//     }

//     const itterationTime = performance.now() - itterationStart
//     const perEnt = itterationTime / entCount

//     // console.log('query time:', (queryTime * 1000 * 1000).toLocaleString('en-US') + 'ns')
//     // console.log('per ent:', (perEnt * 1000 * 1000).toFixed(2) + 'ns')
//     console.log('iteration time:', (itterationTime).toFixed(2) + 'ms')
//     // console.log('avg time:', (avgTime * 1000 * 1000).toFixed(2) + 'ns')
// }, 1000)

// Raw Component Iteration
// setInterval(() => {
//     const itterationStart = performance.now()
//     for (let index = 0; index < entCount; index += 1) {
//         Position.componentData[index] += Velocity.componentData[index]
//     }

//     const itterationTime = performance.now() - itterationStart
//     const perEnt = itterationTime / entCount
//     // console.log('per ent:', (perEnt * 1000 * 1000).toFixed(2) + 'ns')
//     console.log('iteration time:', (itterationTime).toFixed(2) + 'ms')
//     // console.log('avg time:', (avgTime * 1000 * 1000).toFixed(2) + 'ns')
// }, 1000)

// Creation time testing
// setInterval(() => {
//     const entRoundCount = 10_000
//     const createStart = performance.now()
//     for (let index = 0; index < entRoundCount; index += 1) {
//         const ent = createEntity(world)
//         addComponent(world, Position, ent)
//         addComponent(world, Velocity, ent)
//         // addComponent(world, Foo, ent)
//     }
//     const createTime = performance.now() - createStart
//     const timePerEnt = createTime / entRoundCount
//     // console.log('create time:', (createTime * 1000 * 1000).toFixed(2) + 'ns')
//     console.log('create time:', (createTime * 1000).toFixed(2) + 'us')
//     console.log('time per ent:', (timePerEnt * 1000 * 1000).toFixed(2) + 'ns')
// }, 1000)
