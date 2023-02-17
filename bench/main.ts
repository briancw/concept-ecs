import {createWorld, createComponent, createEntity, addComponent} from '../index'

const world = createWorld()
world.components = {}
world.components.component0 = createComponent(world, {value: Float32Array})
world.components.component1 = createComponent(world, {value: Float32Array})
world.components.component2 = createComponent(world, {value: Float32Array})
world.components.component3 = createComponent(world, {value: Float32Array})
world.components.component4 = createComponent(world, {value: Float32Array})
world.components.component5 = createComponent(world, {value: Float32Array})

const entityCount = 10_000
for (let index = 0; index < entityCount; index += 1) {
    const entity = createEntity(world)
    addComponent(world, world.components.component0, entity)
    addComponent(world, world.components.component1, entity)
    addComponent(world, world.components.component2, entity)
}

import BenchSystem from './system'
const systems = [
    new BenchSystem(world),
]

const gameLoop = () => {
    const startTime = performance.now()
    systems.forEach((system) => {
        system.run(world)
    })
    const endTime = performance.now()
    console.log('time:', (endTime - startTime).toFixed(2) + 'ms')
}

setInterval(gameLoop, 1000)
