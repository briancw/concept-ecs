# Proof of Concept ECS
An attempt at making an ECS that allows for simple multithreading in Javascript.

### Example
See [example.ts](./example.ts) for a basic rundown of how to create entities, components, queries, etc.

### How
In order to enable multi-threading, this implementation uses Typed Arrays which use SharedArrayBuffers for both component storage and query results. Most importantly, queries are defined statically, and are updated any time a component is added to an entity. It might be better to call queries in this implementation something different, as nothing like a search is ever run.

### What isn't implemented
- Almost any error handling
- Component/Entity removal
- String storage
- Automatic memory management
- Methods to ease setting up queries across threads (please stand by)
- Internal documentation (jsdoc, types)
- External documentation
