import {createWorld, createComponent, createEntity, removeEntity, addComponent, removeComponent, query, hasComponent} from '../index'

const maxEntityCount = 100
const world = createWorld(maxEntityCount)
const Position: any = createComponent(world, {value: Float32Array})
const Velocity: any = createComponent(world, {value: Float32Array})
const Foo: any = createComponent(world, {value: Float32Array})
const Bar: any = createComponent(world, {value: Float32Array})

test('create a world', () => {
    expect(world).toBeDefined()
    expect(world).toMatchObject({})
})

test('create a component', () => {
    expect(Position.value).toBeInstanceOf(Float32Array)
    expect(Position.value.length).toBe(maxEntityCount)
})

test('create 5 entities matching the query', () => {
    const entCount = 5
    for (let index = 0; index < entCount; index += 1) {
        const entId = createEntity(world)
        addComponent(world, Position, entId)
        addComponent(world, Velocity, entId)

        // Set component velocity to 1
        Velocity.value[entId] = 1

        // Expect this ent to exist in the query
        const ents = query(world, [Position, Velocity], [Bar])
        expect(ents).toContain(entId)
    }

    // Expect there to be as many ents in the query as created
    const ents = query(world, [Position, Velocity], [Bar])
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
        const ents = query(world, [Position, Velocity], [Bar])
        expect(ents).toContain(entId)
    }

    // Expect there to be as many ents in the query as created
    const ents = query(world, [Position, Velocity], [Bar])
    expect(ents.length).toBe(entCount * 2) // TODO this isn't great
})

test('create 5 entities not matching the query based on a NOT condition', () => {
    const entCount = 5
    for (let index = 0; index < entCount; index += 1) {
        const entId = createEntity(world)
        addComponent(world, Position, entId)
        addComponent(world, Velocity, entId)
        addComponent(world, Bar, entId)

        const ents = query(world, [Position, Velocity], [Bar])
        expect(ents).not.toContain(entId)
    }
})

test('create 5 ents not matching the query', () => {
    const entCount = 5
    for (let index = 0; index < entCount; index += 1) {
        const entId = createEntity(world)
        addComponent(world, Position, entId)

        // Expect this ent to not exist in the query
        const ents = query(world, [Position, Velocity], [Bar])
        expect(ents).not.toContain(entId)
    }
})

test('update component values from a query', () => {
    const ents = query(world, [Position, Velocity], [Bar])
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
    const ents = query(world, [Position, Velocity], [Bar])
    const randomIndex = Math.floor(Math.random() * ents.length)
    const entId = ents[randomIndex]
    removeComponent(world, Position, entId)
    removeComponent(world, Velocity, entId)

    const ents2 = query(world, [Position, Velocity], [Bar])
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

test('check if an entity has a component', () => {
    const entId = createEntity(world)
    addComponent(world, Position, entId)

    expect(hasComponent(world, Position, entId)).toBe(true)
    expect(hasComponent(world, Velocity, entId)).toBe(false)
})

test('should throw if creating a component with a non typed array', () => {
    expect(() => {
        createComponent(world, Array)
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
