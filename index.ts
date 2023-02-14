
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

// Holy types batman
/**
 * @param   world  - ECS world object
 * @param   schema - Component Schema
 * @returns        - An ECS component
 */
type TypedArrayConstructor = Int8ArrayConstructor | Uint8ArrayConstructor | Uint8ClampedArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Float32ArrayConstructor | Float64ArrayConstructor
type ComponentBase = {componentId: number, componentMemory: SharedArrayBuffer}

export const createComponent = <T extends { [key: string]: new(buffer: ArrayBufferLike, offset: number, length: number) => any }>(world, schema: T): { [K in keyof T]: InstanceType<T[K]> } & ComponentBase => {
    // Create the component object
    const component = {} as { [K in keyof T]: InstanceType<T[K]> } & ComponentBase

    // Check if all schema values are typed arrays
    Object.values(schema).forEach((schemaValue) => {
        if (Object.getPrototypeOf(schemaValue).name !== 'TypedArray') {
            throw new Error('Component is not a typed array')
        }
    })

    // Get a component ID from the world
    const componentId: number = world.lastComponentId[0]
    world.lastComponentId[0] += 1
    component.componentId = componentId

    // Calculate how many bytes each entity will need
    let bytesPerEntity = 0
    Object.values(schema).forEach((TypedArray: TypedArrayConstructor) => {
        bytesPerEntity += TypedArray.BYTES_PER_ELEMENT
    })
    const componentMemory = new SharedArrayBuffer(bytesPerEntity * world.maxEntityCount)
    component.componentMemory = componentMemory

    // Create a new typed array for each key in the component schema\
    let offset = 0
    Object.entries(schema).forEach(([key, TypedArray]: [string, any]) => {
        component[key as keyof T] = new TypedArray(componentMemory, offset, world.maxEntityCount)
        offset += TypedArray.BYTES_PER_ELEMENT * world.maxEntityCount
    })

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
 * Return a query object for finding entities that match a list of components
 * @param   world         - The world object to search for entities in
 * @param   components    - The components that an entity must have to match the query
 * @param   notComponents - Optional. Components that will exclude an entity from the query
 * @returns               - A Query object with a `run` method that can be used to execute the query and retrieve matching entities
 */
export const createQuery = (world, components, notComponents = []) =>
    new class Query {
        #mask = components.reduce((mask, {componentId}) => mask | (1 << componentId), 0)
        #notMask = notComponents.reduce((mask, {componentId}) => mask | (1 << componentId), 0)
        #results = new Uint32Array(world.maxEntityCount)

        run() {
            let resultsIndex = 0
            // Iterate through all entities in the world
            for (let entityIndex = 0; entityIndex < world.lastEntityId[0]; entityIndex += 1) {
                // Continue if this ent has components in the not list
                if ((world.componentMap[entityIndex] & this.#notMask) !== 0) {
                    continue
                }
                // If this entity has all the components in the query
                if ((world.componentMap[entityIndex] & this.#mask) === this.#mask) {
                    this.#results[resultsIndex] = entityIndex
                    resultsIndex += 1
                }
            }
            return this.#results.subarray(0, resultsIndex)
        }
    }()

/**
 * Return a query object for finding entities that newly match a list of components
 * @param   world         - The world object to search for entities in
 * @param   components    - The components that an entity must have to match the query
 * @param   notComponents - Optional. Components that will exclude an entity from the query
 * @returns               - A Query object with a `run` method that can be used to execute the query and retrieve matching entities
 */
export const createEntryQuery = (world, components, notComponents = []) =>
    new class EntryQuery {
        #mask = components.reduce((mask, {componentId}) => mask | (1 << componentId), 0)
        #notMask = notComponents.reduce((mask, {componentId}) => mask | (1 << componentId), 0)
        #entitiesMap = new Uint8Array(world.maxEntityCount)
        #results = new Uint32Array(world.maxEntityCount) // Re-use an array for results to save a little performance

        run() {
            let resultsIndex = 0
            // Find all entities that match the query from the world's componentMap
            for (let entityIndex = 0; entityIndex < world.lastEntityId[0]; entityIndex += 1) {
                // If this ent has components in the not list
                if ((world.componentMap[entityIndex] & this.#notMask) !== 0) {
                    this.#entitiesMap[entityIndex] = 0
                    continue
                }
                // If this entity has all of the components in the query
                if ((world.componentMap[entityIndex] & this.#mask) === this.#mask) {
                    // If this entity was not in the query before, add it to the temp array
                    if (!this.#entitiesMap[entityIndex]) {
                        // Add this entitiy to the results
                        this.#results[resultsIndex] = entityIndex
                        resultsIndex += 1
                        // Add this entitiy to the map of entities which match the query
                        this.#entitiesMap[entityIndex] = 1
                    }
                }
                else {
                    // Remove this entity from the query
                    this.#entitiesMap[entityIndex] = 0
                }
            }
            return this.#results.subarray(0, resultsIndex)
        }
    }()
