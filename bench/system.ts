import {createQuery} from '../index'

export default class BenchSystem {
    query: ReturnType<typeof createQuery>

    constructor(world) {
        const {component0, component1, component2} = world.components
        this.query = createQuery(world, [component0, component1, component2])
    }

    run(world) {
        const {component0, component1, component2} = world.components
        const [entities] = this.query.run()

        for (let index = 0; index < entities.length; index += 1) {
            const entity = entities[index]
            component0.value[entity] += 1
            component1.value[entity] += 1
            component2.value[entity] += 1
        }
    }
}
