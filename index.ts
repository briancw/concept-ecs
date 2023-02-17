/* eslint-disable unicorn/no-new-array */
/* eslint-disable unicorn/prefer-math-trunc */

const itemsPerMap = 4
/**
 * Create a world object to store world state
 *
 * @param maxEntityCount - The maximum number of entities that can exist in the world
 * @returns              A world object to store all world state
 */
export const createWorld = (maxEntityCount = 1_000_000) => {
    const maxComponents = 128
    const entityIdMemory = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT)
    const deletedEntitiesIndexMemory = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT)
    const componentIdMemory = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT)
    const componentMapMemory = new SharedArrayBuffer(Uint16Array.BYTES_PER_ELEMENT * maxEntityCount * (maxComponents / 16))
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
        componentMap: new Uint16Array(componentMapMemory),
        deletedEntities: new Uint32Array(deletedEntitiesMemory),
        deletedEntitiesIndex: new Uint32Array(deletedEntitiesIndexMemory),
        maxEntityCount,
    }
}
type World = ReturnType<typeof createWorld>

/**
 * @param   world - ECS world object
 * @returns       - entityId
 */
export const createEntity = (world: World) => {
    if (world.deletedEntitiesIndex[0]) {
        const id: number = world.deletedEntities[world.deletedEntitiesIndex[0] - 1]
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
export const removeEntity = (world: World, entityId: number) => {
    // Check if this entity has any components
    if (world.componentMap[entityId * itemsPerMap] !== 0) {
        throw new Error('entity has components')
    }
    world.deletedEntities[world.deletedEntitiesIndex[0]] = entityId
    world.deletedEntitiesIndex[0] += 1
}

type TypedArrayConstructor = Int8ArrayConstructor | Uint8ArrayConstructor | Uint8ClampedArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Float32ArrayConstructor | Float64ArrayConstructor
type Component = {
    componentId: number,
    componentMemory?: SharedArrayBuffer,
    [key: string]: any
}
/**
 * @param   world  - ECS world object
 * @param   schema - Component Schema
 * @returns        - An ECS component
 */
export const createComponent = (world, schema?) => {
    // Get a component ID from the world
    const componentId: number = world.lastComponentId[0]
    world.lastComponentId[0] += 1
    const component: Component = {
        componentId,
    }

    // If this component does not have a schema, it is a tag component
    if (schema) {
        // Check if all schema values are typed arrays
        Object.values(schema).forEach((schemaValue) => {
            if (Object.getPrototypeOf(schemaValue).name !== 'TypedArray') {
                throw new Error('Component is not a typed array')
            }
        })

        // Calculate how many bytes each entity will need
        let bytesPerEntity = 0
        Object.values(schema).forEach((TypedArray: TypedArrayConstructor) => {
            bytesPerEntity += TypedArray.BYTES_PER_ELEMENT
        })
        const componentMemory = new SharedArrayBuffer(bytesPerEntity * world.maxEntityCount)
        component.componentMemory = componentMemory

        // Create a new typed array for each key in the component schema
        let offset = 0
        Object.entries(schema).forEach(([key, TypedArray]: [string, TypedArrayConstructor]) => {
            component[key] = new TypedArray(componentMemory, offset, world.maxEntityCount)
            offset += TypedArray.BYTES_PER_ELEMENT * world.maxEntityCount
        })
    }

    return component
}
// type Component = ReturnType<typeof createComponent>

/**
 * @param world     - ECS world object
 * @param component - An ECS component
 * @param entityId  - Entitiy ID of the entitity to add this component to
 */
export const addComponent = (world: World, component: Component, entityId: number) => {
    if (hasComponent(world, component, entityId)) {
        throw new Error('entity already has this component')
    }

    if (~~(component.componentId / 16) >= itemsPerMap) {
        throw new Error('too many components')
    }

    // Add component to componentMap for this entity
    const mapIndex = (entityId * itemsPerMap) + ~~(component.componentId / 16)
    world.componentMap[mapIndex] |= (1 << component.componentId % 16)
}

/**
 * @param world     - ECS world object
 * @param component - An ECS component
 * @param entityId  - Entitiy ID of the entitity to add this component to
 */
export const removeComponent = (world: World, component: Component, entityId: number) => {
    if (!hasComponent(world, component, entityId)) {
        throw new Error('entity does not have this component')
    }

    // Remove this component from the component map
    const mapIndex = (entityId * itemsPerMap) + ~~(component.componentId / 16)
    world.componentMap[mapIndex] &= ~(1 << component.componentId % 16)
}

/**
 * @param   world     - ECS world object
 * @param   component - An ECS component
 * @param   entityId  - Entitiy ID of the entitity to add this component to
 * @returns           - Whether this entity has this component
 */

export const hasComponent = (world: World, component: Component, entityId: number) => {
    const mapIndex = (entityId * itemsPerMap) + ~~(component.componentId / 16)
    return (world.componentMap[mapIndex] & (1 << component.componentId % 16)) !== 0
}

/**
 * Return a query object for finding entities that match a list of components
 * @param   world         - The world object to search for entities in
 * @param   components    - The components that an entity must have to match the query
 * @param   notComponents - Optional. Components that will exclude an entity from the query
 * @returns               - A Query object with a `run` method that can be used to execute the query and retrieve matching entities
 */
export const createQuery = (world: World, components: Component[], notComponents: Component[] = []) =>
    new class Query {
        #entitiesMap = new Uint8Array(world.maxEntityCount)
        #results = new Uint32Array(world.maxEntityCount)
        #entryResults = new Uint32Array(world.maxEntityCount)

        #masks = new Array(itemsPerMap).fill(0)
        #notMasks = new Array(itemsPerMap).fill(0)

        constructor() {
            // Create masks
            for (let index = 0; index < components.length; index += 1) {
                const component = components[index]
                const mapIndex = Math.trunc(component.componentId / 16)
                this.#masks[mapIndex] |= (1 << component.componentId % 16)
            }

            // Create not masks
            for (let index = 0; index < notComponents.length; index += 1) {
                const component = notComponents[index]
                const mapIndex = Math.trunc(component.componentId / 16)
                this.#notMasks[mapIndex] |= (1 << component.componentId % 16)
            }
        }

        run({entry = false} = {}) {
            let resultsIndex = 0
            let entryResults = 0
            // Iterate through all entities in the world
            for (let entityIndex = 0; entityIndex < world.lastEntityId[0]; entityIndex += 1) {
                // TODO this is extremely performant, and just as clunky
                // Continue if this ent has components in the not list
                if (
                    (world.componentMap[entityIndex * itemsPerMap] & this.#notMasks[0]) !== 0
                    || (world.componentMap[(entityIndex * itemsPerMap) + 1] & this.#notMasks[1]) !== 0
                    || (world.componentMap[(entityIndex * itemsPerMap) + 2] & this.#notMasks[2]) !== 0
                    || (world.componentMap[(entityIndex * itemsPerMap) + 3] & this.#notMasks[3]) !== 0
                ) {
                    if (entry) {
                        this.#entitiesMap[entityIndex] = 0
                    }
                    continue
                }

                // If this entity has all the components in the query
                if (
                    ((world.componentMap[entityIndex * itemsPerMap] & this.#masks[0]) === this.#masks[0])
                    && ((world.componentMap[(entityIndex * itemsPerMap) + 1] & this.#masks[1]) === this.#masks[1])
                    && ((world.componentMap[(entityIndex * itemsPerMap) + 2] & this.#masks[2]) === this.#masks[2])
                    && ((world.componentMap[(entityIndex * itemsPerMap) + 3] & this.#masks[3]) === this.#masks[3])
                ) {
                    this.#results[resultsIndex] = entityIndex
                    resultsIndex += 1
                    if (entry && this.#entitiesMap[entityIndex] === 0) {
                        this.#entryResults[entryResults] = entityIndex
                        entryResults += 1
                        this.#entitiesMap[entityIndex] = 1
                    }
                }
                else if (entry) {
                    this.#entitiesMap[entityIndex] = 0
                }
            }

            return [
                this.#results.subarray(0, resultsIndex),
                this.#entryResults.subarray(0, entryResults),
            ]
        }
    }()
