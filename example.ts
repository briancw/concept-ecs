import {createWorld, createComponent, createEntity, createQuery, addComponent} from './index'

const maxEntCount = 1000

const world = createWorld()
const Position = createComponent(world, 'f32', maxEntCount)
const Velocity = createComponent(world, 'f32', maxEntCount)
const positionVelocityQuery = createQuery(world, [Position, Velocity], maxEntCount)

// create 10 ents with just position
for (let index = 0; index < 10; index += 1) {
    const ent = createEntity(world)
    addComponent(world, Position, ent)
}

const entCount = 10
// create ents with position and velocity
for (let index = 0; index < entCount; index += 1) {
    const ent = createEntity(world)
    addComponent(world, Position, ent)
    addComponent(world, Velocity, ent)
    Velocity.componentData[ent] = 1
}

setInterval(() => {
    // Query for all ents with Position and Velocity
    const ents = world.queries[positionVelocityQuery].getEnts()

    // Add Velocity to Position on all ents matching the query
    for (let index = 0; index < ents.length; index += 1) {
        const entId = ents[index]
        Position.componentData[entId] += Velocity.componentData[entId]
    }

    console.log(Position.componentData)
}, 1000)
