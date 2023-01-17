/* eslint-disable jsdoc/require-jsdoc */
// TODO use better name. (entId)
export function createWorld(maxEntityCount = 1_000_000) {
    const entityIdMemory = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT)
    const deletedEntitiesIndexMemory = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT)
    const componentIdMemory = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT)
    const componentMapMemory = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * maxEntityCount)
    const deletedEntitiesMemory = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * maxEntityCount)

    return {
        // Array buffers for sharing world data across threads
        entityIdMemory,
        deletedEntitiesIndexMemory,
        componentIdMemory,
        componentMapMemory,
        deletedEntitiesMemory,
        // World Data
        lastEntityId: new Uint32Array(entityIdMemory),
        lastComponentId: new Uint32Array(componentIdMemory),
        componentMap: new Uint32Array(componentMapMemory),
        deletedEntities: new Uint32Array(deletedEntitiesMemory),
        deletedEntitiesIndex: new Uint32Array(deletedEntitiesIndexMemory),
        maxEntityCount,
    }
}

export function createEntity(world) {
    if (world.deletedEntitiesIndex[0]) {
        const id: number = world.deletedEntities[world.deletedEntitiesIndex[0] - 1]
        // world.deletedEntities[world.deletedEntitiesIndex[0]] = 0 // Helps for debugging, but isn't strictly necessary
        world.deletedEntitiesIndex[0] -= 1
        return id
    }
    const id: number = world.lastEntityId[0]
    world.lastEntityId[0] += 1
    return id
}

export function removeEntity(world, entityId) {
    // Check if this entity has any components
    if (world.componentMap[entityId] !== 0) {
        throw new Error('entity has components')
    }
    world.deletedEntities[world.deletedEntitiesIndex[0]] = entityId
    world.deletedEntitiesIndex[0] += 1
}

export function createComponent(world, TypedArrayConstructor) {
    if (Object.getPrototypeOf(TypedArrayConstructor).name !== 'TypedArray') {
        throw new Error('Component is not a typed array')
    }

    // Add this component to the world data
    const componentId: number = world.lastComponentId[0]
    world.lastComponentId[0] += 1

    const byteSize = TypedArrayConstructor.BYTES_PER_ELEMENT * world.maxEntityCount
    const componentMemory = new SharedArrayBuffer(byteSize)
    const componentData = new TypedArrayConstructor(componentMemory)
    return {
        componentId,
        componentMemory,
        componentData,
    }
}

export function addComponent(world, component, entityId) {
    if ((world.componentMap[entityId] & (1 << component.componentId)) !== 0) {
        throw new Error('entity already has this component')
    }

    // Add component to componentMap for this entity
    world.componentMap[entityId] |= (1 << component.componentId)
}

export function removeComponent(world, component, entityId) {
    if ((world.componentMap[entityId] & (1 << component.componentId)) === 0) {
        throw new Error('entity does not have this component')
    }

    // Remove this component from the component map
    world.componentMap[entityId] &= ~(1 << component.componentId)
}

export function hasComponent(world, component, entityId) {
    return (world.componentMap[entityId] & (1 << component.componentId)) !== 0
}

export function createQuery(world, components, notComponents) {
    const entitiesMemory = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * world.maxEntityCount)
    const entities = new Uint32Array(entitiesMemory)
    const lastIndex = new Uint32Array(1) // TODO does this need to be a typed array if queries are create on each thread?

    // Create a bitmask for the query
    let mask = 0
    for (let index = 0; index < components.length; index += 1) {
        const {componentId} = components[index]
        mask |= (1 << componentId)
    }

    let notMask = 0
    for (let index = 0; index < notComponents.length; index += 1) {
        const {componentId} = notComponents[index]
        notMask |= (1 << componentId)
    }

    return {
        components,
        lastIndex,
        entitiesMemory,
        entities,
        mask,
        notMask,
    }
}

// Feature: Allow inclusive and exclusive queries
export function runQuery(world, query) {
    // Reset the entitiy count
    query.lastIndex[0] = 0

    // Find all entities that match the query from the world componentMap
    for (let entIndex = 0; entIndex < world.lastEntityId[0]; entIndex += 1) {
        // Continue if this ent has components in the not list
        if ((world.componentMap[entIndex] & query.notMask) !== 0) {
            continue
        }
        // If this entity has all of the components in the query
        if ((world.componentMap[entIndex] & query.mask) === query.mask) {
            query.entities[query.lastIndex[0]] = entIndex
            query.lastIndex[0] += 1
        }
    }
}
