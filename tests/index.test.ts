import {createWorld, createComponent, createEntity, addComponent, createQuery} from '../index'

const maxEntCount = 100
const world = createWorld()
const Position = createComponent(world, 'f32', maxEntCount)
const Velocity = createComponent(world, 'f32', maxEntCount)
const Foo = createComponent(world, 'f32', maxEntCount)
const query = createQuery([Position, Velocity], maxEntCount)
const queries = [query]

test('create a world', () => {
    expect(world).toBeDefined()
    expect(world).toMatchObject({})
})

test('create a component', () => {
    expect(Position.componentData).toBeInstanceOf(Float32Array)
    expect(Position.componentData.length).toBe(maxEntCount)
})

test('create 5 entities matching the query', () => {
    const entCount = 5
    for (let index = 0; index < entCount; index += 1) {
        const entId = createEntity(world)
        addComponent(world, Position, entId, queries, true)
        addComponent(world, Velocity, entId, queries)

        // Set component velocity to 1
        Velocity.componentData[entId] = 1

        // Expect this ent to exist in the query
        // const ents = world.queries[query].getEnts()
        const ents = query.entities
        expect(ents).toContain(entId)
    }

    // Expect there to be as many ents in the query as created
    // const ents = world.queries[query].getEnts()
    // expect(ents.length).toBe(entCount)
    expect(query.lastIndex).toBe(entCount)
})

test('create 5 entities matching the query plus more components', () => {
    const entCount = 5
    for (let index = 0; index < entCount; index += 1) {
        const entId = createEntity(world)
        addComponent(world, Position, entId, queries)
        addComponent(world, Velocity, entId, queries)
        addComponent(world, Foo, entId, queries)

        // Set component velocity to 1
        Velocity.componentData[entId] = 1

        // Expect this ent to exist in the query
        const ents = query.entities
        expect(ents).toContain(entId)
    }

    // Expect there to be as many ents in the query as created
    expect(query.lastIndex).toBe(entCount * 2) // TODO this isn't great
})

test('create 5 ents not matching the query', () => {
    const entCount = 5
    for (let index = 0; index < entCount; index += 1) {
        const entId = createEntity(world)
        addComponent(world, Position, entId, queries)

        // Expect this ent to not exist in the query
        // const ents = world.queries[query].getEnts()
        const ents = query.entities
        expect(ents).not.toContain(entId)
    }
})

test('update component values from a query', () => {
    // const ents = world.queries[query].getEnts()
    const ents = query.entities
    for (let index = 0; index < query.lastIndex; index += 1) {
        const entId = ents[index]
        Position.componentData[entId] += Velocity.componentData[entId]
        expect(Position.componentData[entId]).toBe(1)
    }

    for (let index = 0; index < query.lastIndex; index += 1) {
        const entId = ents[index]
        Position.componentData[entId] += Velocity.componentData[entId]
        expect(Position.componentData[entId]).toBe(2)
    }
})

test('should throw if adding the same component to the same entity more than once', () => {
    const ent = createEntity(world)
    expect(() => {
        addComponent(world, Position, ent, queries)
        addComponent(world, Position, ent, queries)
    }).toThrow()
})

// test('add more components than allocated', () => {
//     for (let i = 0; i < maxEntCount; i += 1) {
//         const ent = createEntity(world)
//         addComponent(world, Position, ent)
//     }
// })
