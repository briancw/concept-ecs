/* eslint-disable jsdoc/require-jsdoc */
// TODO use better name. (entId)
// TODO make component map cross threadable
// TODO set max ent count once on world rather than multiple times (probably)
export function createWorld() {
    const entIdMemory = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT)
    const componentIdMemory = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT)
    const lastEntId = new Uint32Array(entIdMemory)
    lastEntId[0] = 1 // Start entities at one to avoid confusion in queries
    return {
        entIdMemory,
        lastEntId,
        componentIdMemory,
        lastComponentId: new Uint32Array(componentIdMemory),
        componentMap: new Uint32Array(10_000_000), // TODO magic number
        deletedEntities: new Uint32Array(10_000_000), // TODO magic number
        deletedEntitiesIndex: new Uint32Array(1),
    }
}

export function createEntity(world) {
    // TODO entity reuse is currently LILO. FIFO might be better for cache locality, but might not be worth the complexity and performance of implementing.
    if (world.deletedEntitiesIndex[0]) {
        const id: number = world.deletedEntities[world.deletedEntitiesIndex[0] - 1]
        world.deletedEntities[world.deletedEntitiesIndex[0]] = 0 // TODO won't be necessary after making a typed array helper lib
        world.deletedEntitiesIndex[0] -= 1
        return id
    }
    const id: number = world.lastEntId[0]
    world.lastEntId[0] += 1
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

// TODO some validation on type
// TODO instantiation of array could probably be done cleaner
export function createComponent(world, type, count) {
    const componentId: number = world.lastComponentId[0]
    world.lastComponentId[0] += 1
    const byteSize = type.BYTES_PER_ELEMENT * count
    const componentMemory = new SharedArrayBuffer(byteSize)
    const componentData = new type(componentMemory)
    return {
        componentId,
        componentMemory,
        componentData,
    }
}

export function addComponent(world, component, entId) {
    if ((world.componentMap[entId] & (1 << component.componentId)) !== 0) {
        throw new Error('entity already has this component')
    }

    // Add component to componentMap for this entity
    world.componentMap[entId] |= (1 << component.componentId)
}

export function removeComponent(world, component, entId) {
    if ((world.componentMap[entId] & (1 << component.componentId)) === 0) {
        throw new Error('entity does not have this component')
    }

    // Remove this component from the component map
    world.componentMap[entId] &= ~(1 << component.componentId)
}

export function hasComponent(world, component, entId) {
    return (world.componentMap[entId] & (1 << component.componentId)) !== 0
}

// TODO count can be automatically determined off of components
export function createQuery(components, count) {
    const entitiesMemory = new SharedArrayBuffer(count * Uint32Array.BYTES_PER_ELEMENT)
    const entities = new Uint32Array(entitiesMemory)
    const lastIndex = new Uint32Array(1)

    // Create a bitmask for the query
    let mask = 0
    for (let index = 0; index < components.length; index += 1) {
        const {componentId} = components[index]
        mask |= (1 << componentId)
    }

    const getEnts = function(world) {
        // TODO caching
        this.lastIndex[0] = 0
        for (let entIndex = 0; entIndex < world.lastEntId[0]; entIndex += 1) {
            if ((world.componentMap[entIndex] & this.mask) === this.mask) {
                this.entities[this.lastIndex[0]] = entIndex
                this.lastIndex[0] += 1
            }
        }
    }

    return {
        components,
        lastIndex,
        entitiesMemory,
        entities,
        mask,
        getEnts,
    }
}
