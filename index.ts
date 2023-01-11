/* eslint-disable jsdoc/require-jsdoc */
const typeMap = {
    int8: Int8Array,
    uint8: Uint8Array,
    uint8c: Uint8ClampedArray,
    int16: Int16Array,
    uint16: Uint16Array,
    int32: Int32Array,
    uint32: Uint32Array,
    f32: Float32Array,
    f64: Float64Array,
    bint64: BigInt64Array,
    buint64: BigUint64Array,
}

export function createWorld() {
    const entIdMemory = new SharedArrayBuffer(32) // TODO magic number
    const componentIdMemory = new SharedArrayBuffer(32) // TODO magic number
    return {
        entIdMemory,
        lastEntId: new Uint32Array(entIdMemory),
        componentIdMemory,
        lastComponentId: new Uint32Array(componentIdMemory),
        componentMap: new Uint32Array(1_000_000), // TODO magic number
    }
}

export function createEntity(world) {
    const id: number = world.lastEntId[0]
    world.lastEntId[0] += 1
    return id
}

export function createComponent(world, type, count) {
    const componentId: number = world.lastComponentId[0]
    world.lastComponentId[0] += 1
    const byteSize = typeMap[type].BYTES_PER_ELEMENT * count
    const componentMemory = new SharedArrayBuffer(byteSize)
    const componentData = new typeMap[type](componentMemory)
    return {
        componentId,
        componentMemory,
        componentData,
    }
}

export function addComponent(world, component, entId, queries, skipQuery = false) {
    // TODO check if ent already has component
    if ((world.componentMap[entId] & (1 << component.componentId)) !== 0) {
        throw new Error('entity already has this component')
    }

    // Add component to componentMap for this entity
    world.componentMap[entId] |= (1 << component.componentId)

    if (!skipQuery) {
        // Check if this entity now belongs to any queries
        for (let index = 0; index < queries.length; index += 1) {
            const query = queries[index]
            // If this component exists on the query (prevents adding the same ent multiple times)
            if (query.mask & (1 << component.componentId)) {
                // eslint-disable-next-line unicorn/no-lonely-if
                if ((world.componentMap[entId] & query.mask) === query.mask) {
                    query.entities[query.lastIndex] = entId
                    query.lastIndex += 1
                }
            }
        }
    }
}

// TODO count can be automatically determined off of components
export function createQuery(components, count) {
    const entitiesMemory = new SharedArrayBuffer(count * Uint32Array.BYTES_PER_ELEMENT)
    const entities = new Uint32Array(entitiesMemory)

    // Create a bitmask for the query
    let mask = 0
    for (let index = 0; index < components.length; index += 1) {
        const {componentId} = components[index]
        mask |= (1 << componentId)
    }

    return {
        components,
        lastIndex: 0,
        entitiesMemory,
        entities,
        mask,
    }
}
