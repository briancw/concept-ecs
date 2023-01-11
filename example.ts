import {createWorld, createComponent, createEntity, createQuery, addComponent} from '.'
// import Worker from 'web-worker'

const maxEntCount = 1_000_000
const world = createWorld()
const Position = createComponent(world, 'f32', maxEntCount)
const Velocity = createComponent(world, 'f32', maxEntCount)
const positionVelocityQuery = createQuery([Position, Velocity], maxEntCount)
const queries = [positionVelocityQuery]

// const workerUrl = new URL('thread-boogaloo.ts', import.meta.url).href
// const worker = new Worker(workerUrl, {type: 'module'})

// worker.postMessage({
//     components: [Position, Velocity],
//     world,
//     queries,
// })

const initialEntCount = 50_000
// Create ents with position and velocity
for (let index = 0; index < initialEntCount; index += 1) {
    const ent = createEntity(world)
    addComponent(world, Position, ent, queries, true)
    addComponent(world, Velocity, ent, queries)
    Velocity.componentData[ent] = 1
}

setInterval(() => {
    const createStart = performance.now()
    const newEntCount = 50_000
    for (let index = 0; index < newEntCount; index += 1) {
        const ent = createEntity(world)
        addComponent(world, Position, ent, queries, true)
        addComponent(world, Velocity, ent, queries)
        Velocity.componentData[ent] = 1
    }
    const createTime = performance.now() - createStart
    const createTimePerEnt = createTime / newEntCount

    const iterationStart = performance.now()
    for (let index = 0; index < positionVelocityQuery.lastIndex; index += 1) {
        const entId = positionVelocityQuery.entities[index]
        Position.componentData[entId] += Velocity.componentData[entId]
    }
    const iterationTime = performance.now() - iterationStart
    const iterationPerEnt = iterationTime / positionVelocityQuery.lastIndex
    console.log('create time:', (createTime).toFixed(2) + 'ms')
    console.log('iteration time:', (iterationTime).toFixed(2) + 'ms', 'ents:', positionVelocityQuery.lastIndex.toLocaleString('en-US'))
    console.log('create time per:', (createTimePerEnt * 1000 * 1000).toFixed(2) + 'ns')
    console.log('iteration time per:', (iterationPerEnt * 1000 * 1000).toFixed(2) + 'ns')
    console.log('----')
}, 1000)

