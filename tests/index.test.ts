import {createWorld, createComponent, createEntity, removeEntity, addComponent, removeComponent, createQuery, hasComponent} from '../index'

const maxEntityCount = 100
const world = createWorld(maxEntityCount)
const Position: any = createComponent(world, {value: Float32Array})
const Velocity: any = createComponent(world, {value: Float32Array})
const Foo: any = createComponent(world, {value: Float32Array})
const Bar: any = createComponent(world, {value: Float32Array})
const Tag: any = createComponent(world)
const query = createQuery(world, [Position, Velocity], [Bar])

test('create a world', () => {
    expect(world).toBeDefined()
    // expect(world).toMatchObject({
    //     lastEntityId: new Uint32Array(1),
    // })
})

test('create a component with data', () => {
    expect(Position.value).toBeInstanceOf(Float32Array)
    expect(Position.value.length).toBe(maxEntityCount)
})

test('create a tag component', () => {
    expect(Tag).toHaveProperty('componentId')
})

test('create 5 entities matching a query', () => {
    const entCount = 5
    for (let index = 0; index < entCount; index += 1) {
        const entId = createEntity(world)
        addComponent(world, Position, entId)
        addComponent(world, Velocity, entId)

        // Set component velocity to 1
        Velocity.value[entId] = 1

        // Expect this ent to exist in the query
        const [ents] = query.run()
        expect(ents).toContain(entId)
    }

    // Expect there to be as many ents in the query as created
    const [ents] = query.run()
    expect(ents.length).toBe(entCount)
})

test('create 5 entities matching the query plus more components', () => {
    const entCount = 5
    for (let index = 0; index < entCount; index += 1) {
        const entId = createEntity(world)
        addComponent(world, Position, entId)
        addComponent(world, Velocity, entId)
        addComponent(world, Foo, entId)

        // Set component velocity to 1
        Velocity.value[entId] = 1

        // Expect this ent to exist in the query
        const [ents] = query.run()
        expect(ents).toContain(entId)
    }

    // Expect there to be as many ents in the query as created
    const [ents] = query.run()
    expect(ents.length).toBe(entCount * 2) // TODO this isn't great
})

test('create 5 entities not matching the query based on a NOT condition', () => {
    const entCount = 5
    for (let index = 0; index < entCount; index += 1) {
        const entId = createEntity(world)
        addComponent(world, Position, entId)
        addComponent(world, Velocity, entId)
        addComponent(world, Bar, entId)

        const [ents] = query.run()
        expect(ents).not.toContain(entId)
    }
})

test('create 5 ents not matching the query', () => {
    const entCount = 5
    for (let index = 0; index < entCount; index += 1) {
        const entId = createEntity(world)
        addComponent(world, Position, entId)

        // Expect this ent to not exist in the query
        const [ents] = query.run()
        expect(ents).not.toContain(entId)
    }
})

test('update component values from a query', () => {
    const [ents] = query.run()
    for (let index = 0; index < ents.length; index += 1) {
        const entId = ents[index]
        Position.value[entId] += Velocity.value[entId]
        expect(Position.value[entId]).toBe(1)
    }

    for (let index = 0; index < ents.length; index += 1) {
        const entId = ents[index]
        Position.value[entId] += Velocity.value[entId]
        expect(Position.value[entId]).toBe(2)
    }
})

test('remove components from entities', () => {
    const [ents] = query.run()
    const randomIndex = Math.floor(Math.random() * ents.length)
    const entId = ents[randomIndex]
    removeComponent(world, Position, entId)
    removeComponent(world, Velocity, entId)

    const ents2 = query.run()
    expect(ents2).not.toContain(entId)
})

test('remove entities', () => {
    const entId = createEntity(world)
    removeEntity(world, entId)

    expect(world.deletedEntities).toContain(entId)
})

test('id re-use', () => {
    const entId = createEntity(world)
    removeEntity(world, entId)
    const newEntId = createEntity(world)
    expect(newEntId).toBe(entId)
})

test('create entities matching an entry query', () => {
    for (let index = 0; index < 5; index += 1) {
        const entId = createEntity(world)
        addComponent(world, Position, entId)
        addComponent(world, Velocity, entId)

        const [, newEnts] = query.run({entry: true})
        expect(newEnts).toContain(entId)
    }

    const [, newEnts2] = query.run()
    expect(newEnts2.length).toBe(0)
})

test('create entities matching an entry query by removing and re-adding components', () => {
    const entId = createEntity(world)
    addComponent(world, Position, entId)
    addComponent(world, Velocity, entId)

    const [, newEnts] = query.run({entry: true})
    expect(newEnts).toContain(entId)

    removeComponent(world, Position, entId)
    removeComponent(world, Velocity, entId)
    query.run({entry: true})

    addComponent(world, Position, entId)
    addComponent(world, Velocity, entId)
    const [, newEnts2] = query.run({entry: true})
    console.log(newEnts2)
    expect(newEnts2).toContain(entId)
})

test('check if an entity has a component', () => {
    const entId = createEntity(world)
    addComponent(world, Position, entId)

    expect(hasComponent(world, Position, entId)).toBe(true)
    expect(hasComponent(world, Velocity, entId)).toBe(false)
})

test('should throw if creating a component with a non typed array', () => {
    expect(() => {
        createComponent(world, {
            x: Number,
        })
    }).toThrow()
})

test('should throw if adding the same component to the same entity more than once', () => {
    const ent = createEntity(world)
    expect(() => {
        addComponent(world, Position, ent)
        addComponent(world, Position, ent)
    }).toThrow()
})

test('should throw if removing a component that an entity does not have', () => {
    const ent = createEntity(world)
    expect(() => {
        removeComponent(world, Position, ent)
    }).toThrow()
})

test('should throw if removing entities with existing components', () => {
    const entId = createEntity(world)
    addComponent(world, Position, entId)
    expect(() => {
        removeEntity(world, entId)
    }).toThrow()
})

// TODO test if an ent has a component

// TODO test if an ent does not have a component

// TODO add more than 32 components to an entity
// test('add more components than allocated', () => {
//     for (let i = 0; i < maxEntCount; i += 1) {
//         const ent = createEntity(world)
//         addComponent(world, Position, ent)
//     }
// })
