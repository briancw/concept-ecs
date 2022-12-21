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
    const entIdMemory = new SharedArrayBuffer(32)
    const world = {
        entIdMemory,
        lastEntId: new Uint32Array(entIdMemory),
        queries: [],
    }
    return world
}

export function createEntity(world) {
    const id: number = world.lastEntId[0]
    world.lastEntId[0] += 1
    return id
}

export function createComponent(world, type, count) {
    const byteSize = typeMap[type].BYTES_PER_ELEMENT * count
    const componentMemory = new SharedArrayBuffer(byteSize)
    const componentData = new typeMap[type](componentMemory)
    const entMapMemory = new SharedArrayBuffer(Uint8Array.BYTES_PER_ELEMENT * count)
    const entMap = new Uint8Array(entMapMemory)
    return {
        componentMemory,
        componentData,
        entMap,
    }
}

export function addComponent(world, component, entId) {
    if (hasComponent(component, entId)) {
        throw new Error('This component has already been added')
    }
    component.entMap[entId] = 1

    for (let index = 0; index < world.queries.length; index += 1) {
        const query = world.queries[index]
        // If this component exists in a query and
        // If this ent has all the components of the query
        if (query.components.includes(component) && hasAllComponents(query.components, entId)) {
            query.internalEntityArray[query.lastIndex] = entId
            query.lastIndex += 1
            query.updated[0] = true
        }
    }
}

export function hasComponent(component, entId) {
    return component.entMap[entId] === 1
}

function hasAllComponents(components, entId) {
    let hasAll = true
    for (let index = 0; index < components.length; index += 1) {
        const component = components[index]
        if (!component.entMap[entId]) {
            hasAll = false
        }
    }
    return hasAll
}

export function createQuery(world, components, count) {
    const internalEntityMemory = new SharedArrayBuffer(count * Uint32Array.BYTES_PER_ELEMENT)
    const updateMemory = new SharedArrayBuffer(8)

    const query = {
        components,
        lastIndex: 0,
        internalEntityMemory,
        internalEntityArray: new Uint32Array(internalEntityMemory),
        ents: new Uint32Array(0),
        updateMemory,
        updated: new Uint8Array(updateMemory),
        getEnts() {
            if (this.updated[0]) {
                // console.log('query updated, refresh ent cache')
                this.updated[0] = false
                this.ents = this.internalEntityArray.slice(0, this.lastIndex)
            }
            return this.ents
        },
    }
    const queryIndex = world.queries.push(query) - 1 // TODO this rubs me the wrong way
    return queryIndex
}

