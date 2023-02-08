type world = {
    entityIdMemory: SharedArrayBuffer,
    deletedEntitiesIndexMemory: SharedArrayBuffer,
    componentIdMemory: SharedArrayBuffer,
    componentMapMemory: SharedArrayBuffer,
    deletedEntitiesMemory: SharedArrayBuffer,
    lastEntityId: Uint32Array,
    lastComponentId: Uint32Array,
    componentMap: Uint32Array,
    deletedEntities: Uint32Array,
    deletedEntitiesIndex: Uint32Array,
    maxEntityCount: number,
}

/**
 * Create a world object to store world state
 *
 * @param maxEntityCount - The maximum number of entities that can exist in the world
 * @returns              A world object to store all world state
 */
export const createWorld = (maxEntityCount = 1_000_000) => {
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
        // Single thread only data
        queries: {},
    }
}

/**
 * @param   world - ECS world object
 * @returns       - entityId
 */
export const createEntity = (world: world) => {
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

/**
 * @param world    - ECS world object
 * @param entityId - The entitiyId to remove
 */
export const removeEntity = (world, entityId) => {
    // Check if this entity has any components
    if (world.componentMap[entityId] !== 0) {
        throw new Error('entity has components')
    }
    world.deletedEntities[world.deletedEntitiesIndex[0]] = entityId
    world.deletedEntitiesIndex[0] += 1
}

// TODO Type checking here needs some work
// Zod seems like a good way to get automatic typing out and validation
// type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array
type TypedArrayConstructor = Int8ArrayConstructor | Uint8ArrayConstructor | Uint8ClampedArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Float32ArrayConstructor | Float64ArrayConstructor
type component = {
    componentId: number,
    componentMemory: SharedArrayBuffer,
    // TODO add types for component data (or let zod do it maybe)
}
// TODO Validate schema
/**
 * @param   world  - ECS world object
 * @param   schema - Component Schema
 * @returns        - An ECS component
 */
export const createComponent = (world, schema): component => {
    // Add this component to the world data
    const componentId: number = world.lastComponentId[0]
    world.lastComponentId[0] += 1

    let bytesPerEntity = 0
    let offset = 0
    Object.values(schema).forEach((TypedArray: TypedArrayConstructor) => {
        bytesPerEntity += TypedArray.BYTES_PER_ELEMENT
    })
    const componentMemory = new SharedArrayBuffer(bytesPerEntity * world.maxEntityCount)
    const component: component = {
        componentId,
        componentMemory,
    }
    Object.entries(schema).forEach(([key, TypedArray] : [string, TypedArrayConstructor]) => {
        component[key] = new TypedArray(componentMemory, offset, world.maxEntityCount)
        offset += TypedArray.BYTES_PER_ELEMENT * world.maxEntityCount
    })
    component.componentId = componentId
    component.componentMemory = componentMemory

    return component
}

/**
 * @param world     - ECS world object
 * @param component - An ECS component
 * @param entityId  - Entitiy ID of the entitity to add this component to
 */
export const addComponent = (world, component, entityId) => {
    if ((world.componentMap[entityId] & (1 << component.componentId)) !== 0) {
        throw new Error('entity already has this component')
    }

    // Add component to componentMap for this entity
    world.componentMap[entityId] |= (1 << component.componentId)
}

/**
 * @param world     - ECS world object
 * @param component - An ECS component
 * @param entityId  - Entitiy ID of the entitity to add this component to
 */
export const removeComponent = (world, component, entityId) => {
    if ((world.componentMap[entityId] & (1 << component.componentId)) === 0) {
        throw new Error('entity does not have this component')
    }

    // Remove this component from the component map
    world.componentMap[entityId] &= ~(1 << component.componentId)
}

/**
 * @param   world     - ECS world object
 * @param   component - An ECS component
 * @param   entityId  - Entitiy ID of the entitity to add this component to
 * @returns           - Whether this entity has this component
 */
// eslint-disable-next-line arrow-body-style
export const hasComponent = (world, component, entityId) => {
    return (world.componentMap[entityId] & (1 << component.componentId)) !== 0
}

/**
 * @param   world         - An ECS World
 * @param   components    - List of components to include
 * @param   notComponents - List of components to exclude
 * @returns               - A list of entities that match the query
 */
export const query = (world, components, notComponents = []) => {
    // Create a bitmask for all the components to find
    let mask = 0
    for (let index = 0; index < components.length; index += 1) {
        const {componentId} = components[index]
        mask |= (1 << componentId)
    }

    // Create a bitmask for all the components to exclude
    let notMask = 0
    for (let index = 0; index < notComponents.length; index += 1) {
        const {componentId} = notComponents[index]
        notMask |= (1 << componentId)
    }

    // Check if this query has been run before, and if not create a new array for it
    const queryKey = String(mask) + String(notMask)
    if (!world.queries[queryKey]) {
        world.queries[queryKey] = new Uint32Array(world.maxEntityCount)
    }

    // Find all entities that match the query from the world componentMap
    let queryIndex = 0
    for (let entIndex = 0; entIndex < world.lastEntityId[0]; entIndex += 1) {
        // Continue if this ent has components in the not list
        if ((world.componentMap[entIndex] & notMask) !== 0) {
            continue
        }
        // If this entity has all of the components in the query
        if ((world.componentMap[entIndex] & mask) === mask) {
            world.queries[queryKey][queryIndex] = entIndex
            queryIndex += 1
        }
    }

    return world.queries[queryKey].subarray(0, queryIndex)
}
