# Proof of Concept ECS
An attempt at making an ECS that allows for simple multithreading in Javascript.


## Simple Example
```javascript
import {createWorld, createComponent, createEntity, addComponent, createQuery, removeComponent, removeEntity} from 'concept-ecs'

const maxEntityCount = 1_000_000

// The world object stores all state required by the ECS
const world = createWorld(maxEntityCount)

// Components are based on Typed Arrays. The createComponent function takes a schema of TypedArray constructors
const Position = createComponent(world, {x: Float32Array, y: Float32Array})
const Velocity = createComponent(world, {value: Float32Array})

// Entities are indexes which are used to store data in any component
const entityId = createEntity(world)
addComponent(world, Position, entityId)
addComponent(world, Velocity, entityId)
Velocity.value[entityId] = 2

// Queries will find all entities with specified components
const query = createQuery(world, [Position, Velocity])

// Systems can be simple functions which iterate over query results
function system() {
    const entities = query.run()
    for (let index = 0; index < entities.length; index += 1) {
        const entityId = entities[index]
        Position.x[entityId] += Velocity.value[entityId]
        console.log(Position.x[entityId])
    }
}

system()

// All components must be removed from an entity before the entity can be removed
removeComponent(world, Position, entityId)
removeComponent(world, Velocity, entityId)

// Entity ID's that are removed are placed on a stack and will be resused first before new entity ID's are issued
removeEntity(world, entityId)
```

## How does it work
This ECS implementation utilizes typed arrays based on SharedArrayBuffers which can be shared between threads for simple multi-threading. All state is stored on either the World object, components, or query objects. The world object contains a map object of what components each entity has. Queries are run by doing a simple binary comparison on this map, which makes them quite fast.

## Why use this library
This implementation is the only one that I'm aware of that stores all required state in SharedArrayBuffers which makes it the only available JS ECS which can be multithreaded. Because all state is confined to the world object, it also makes this library easy to use, reason about, and incorporate into projects. The use of typed arrays also makes the performance quite good. Its also only 200 lines of code, which makes it easy to understand or modify for your own needs.

## What isn't included
This library only provides the Entities, Components, and Systems. It does not have any glue code for managing threading, serialization, networking, or anything else. I believe those are functions better served by an engine.
