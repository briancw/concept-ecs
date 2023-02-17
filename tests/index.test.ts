import {createWorld, createComponent, createEntity, removeEntity, addComponent, removeComponent, createQuery, hasComponent} from '../index'

const maxEntityCount = 100
const world = createWorld(maxEntityCount)
const Position = createComponent(world, {value: Float32Array})
const Velocity = createComponent(world, {value: Float32Array})
const Foo = createComponent(world, {value: Float32Array})
const Bar = createComponent(world, {value: Float32Array})
const Tag = createComponent(world)
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
    const entityCount = 5
    for (let index = 0; index < entityCount; index += 1) {
        const entityId = createEntity(world)
        addComponent(world, Position, entityId)
        addComponent(world, Velocity, entityId)

        // Set component velocity to 1
        Velocity.value[entityId] = 1

        // Expect this ent to exist in the query
        const [entities] = query.run()
        expect(entities).toContain(entityId)
    }

    // Expect there to be as many ents in the query as created
    const [entities] = query.run()
    expect(entities.length).toBe(entityCount)
})

test('create 5 entities matching the query plus more components', () => {
    const entityCount = 5
    for (let index = 0; index < entityCount; index += 1) {
        const entityId = createEntity(world)
        addComponent(world, Position, entityId)
        addComponent(world, Velocity, entityId)
        addComponent(world, Foo, entityId)

        // Set component velocity to 1
        Velocity.value[entityId] = 1

        // Expect this ent to exist in the query
        const [entities] = query.run()
        expect(entities).toContain(entityId)
    }

    // Expect there to be as many ents in the query as created
    const [entities] = query.run()
    expect(entities.length).toBe(entityCount * 2) // TODO this isn't great
})

test('create 5 entities not matching the query based on a NOT condition', () => {
    const entityCount = 5
    for (let index = 0; index < entityCount; index += 1) {
        const entityId = createEntity(world)
        addComponent(world, Position, entityId)
        addComponent(world, Velocity, entityId)
        addComponent(world, Bar, entityId)

        const [entities] = query.run()
        expect(entities).not.toContain(entityId)
    }
})

test('create 5 ents not matching the query', () => {
    const entityCount = 5
    for (let index = 0; index < entityCount; index += 1) {
        const entityId = createEntity(world)
        addComponent(world, Position, entityId)

        // Expect this ent to not exist in the query
        const [entities] = query.run()
        expect(entities).not.toContain(entityId)
    }
})

test('update component values from a query', () => {
    const [entities] = query.run()
    for (let index = 0; index < entities.length; index += 1) {
        const entityId = entities[index]
        Position.value[entityId] += Velocity.value[entityId]
        expect(Position.value[entityId]).toBe(1)
    }

    for (let index = 0; index < entities.length; index += 1) {
        const entityId = entities[index]
        Position.value[entityId] += Velocity.value[entityId]
        expect(Position.value[entityId]).toBe(2)
    }
})

test('remove components from entities', () => {
    const [entities] = query.run()
    const randomIndex = Math.floor(Math.random() * entities.length)
    const entityId = entities[randomIndex]
    removeComponent(world, Position, entityId)
    removeComponent(world, Velocity, entityId)

    const entities2 = query.run()
    expect(entities2).not.toContain(entityId)
})

test('remove entities', () => {
    const entityId = createEntity(world)
    removeEntity(world, entityId)

    expect(world.deletedEntities).toContain(entityId)
})

test('id re-use', () => {
    const entityId = createEntity(world)
    removeEntity(world, entityId)
    const newEntityId = createEntity(world)
    expect(newEntityId).toBe(entityId)
})

test('create entities matching an entry query', () => {
    for (let index = 0; index < 5; index += 1) {
        const entityId = createEntity(world)
        addComponent(world, Position, entityId)
        addComponent(world, Velocity, entityId)

        const [, newEntities] = query.run({entry: true})
        expect(newEntities).toContain(entityId)
    }

    const [, newEntities2] = query.run()
    expect(newEntities2.length).toBe(0)
})

test('create entities matching an entry query by removing and re-adding components', () => {
    const entityId = createEntity(world)
    addComponent(world, Position, entityId)
    addComponent(world, Velocity, entityId)

    const [, newEntities] = query.run({entry: true})
    expect(newEntities).toContain(entityId)

    removeComponent(world, Position, entityId)
    removeComponent(world, Velocity, entityId)
    query.run({entry: true})

    addComponent(world, Position, entityId)
    addComponent(world, Velocity, entityId)

    const [, newEntities2] = query.run({entry: true})
    expect(newEntities2).toContain(entityId)
})

test('check if an entity has a component', () => {
    const entityId = createEntity(world)
    addComponent(world, Position, entityId)

    expect(hasComponent(world, Position, entityId)).toBe(true)
    expect(hasComponent(world, Velocity, entityId)).toBe(false)
})

test('should throw if creating a component with a non typed array', () => {
    expect(() => {
        createComponent(world, {
            x: Number,
        })
    }).toThrow()
})

test('should throw if adding the same component to the same entity more than once', () => {
    const entity = createEntity(world)
    expect(() => {
        addComponent(world, Position, entity)
        addComponent(world, Position, entity)
    }).toThrow()
})

test('should throw if removing a component that an entity does not have', () => {
    const entity = createEntity(world)
    expect(() => {
        removeComponent(world, Position, entity)
    }).toThrow()
})

test('should throw if removing entities with existing components', () => {
    const entityId = createEntity(world)
    addComponent(world, Position, entityId)
    expect(() => {
        removeEntity(world, entityId)
    }).toThrow()
})

test('create as many components as supported', () => {
    const entity = createEntity(world)

    while (world.lastComponentId[0] < 64) {
        const component = createComponent(world, {value: Uint8Array})
        addComponent(world, component, entity)
        expect(hasComponent(world, component, entity)).toBe(true)
    }
})

// Bit of a bodge since we depend on the component cound from the test before
test('create more components than supported', () => {
    expect(() => {
        const component = createComponent(world, {value: Uint8Array})
        const entity = createEntity(world)
        addComponent(world, component, entity)
    }).toThrow()
})

// TODO test if an ent does not have a component
