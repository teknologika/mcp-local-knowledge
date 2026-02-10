# LanceDB Migration - Current Status

## Summary
Migrating from ChromaDB (server-based) to LanceDB (file-based) for truly local-first operation.

## Completed ✅
1. **Package Dependencies**
   - Removed: `chromadb@1.8.0`
   - Added: `vectordb@0.4.0`

2. **Infrastructure Layer**
   - Created: `src/infrastructure/lancedb/lancedb.client.ts`
   - Created: `src/infrastructure/lancedb/index.ts`
   - LanceDB wrapper with similar API to ChromaDB wrapper

3. **Type Definitions**
   - Updated: `src/shared/types/index.ts` (chromadb → lancedb in Config)
   - Updated: `src/shared/config/config.ts` (DEFAULT_CONFIG and schema)

4. **Entry Points - Partial**
   - Updated: `src/bin/mcp-server.ts` (imports and initialization)
   - Remaining: `src/bin/ingest.ts`, `src/bin/manager.ts`

## Remaining Work 🔧

### Critical - Service Layer Rewrites
These need API adaptations because LanceDB works differently:

1. **src/domains/codebase/codebase.service.ts**
   - Replace ChromaDB collection API with LanceDB table API
   - Update: `listCodebases()`, `getCodebaseStats()`, `renameCodebase()`, `deleteCodebase()`, `deleteChunkSet()`

2. **src/domains/search/search.service.ts**
   - Replace ChromaDB query API with LanceDB search API
   - Update vector search implementation
   - LanceDB uses `.search()` instead of `.query()`

3. **src/domains/ingestion/ingestion.service.ts**
   - Replace ChromaDB add/upsert with LanceDB add
   - Update chunk storage logic
   - LanceDB stores data as rows with vector column

### Entry Points
4. **src/bin/ingest.ts**
   - Update ChromaDBClientWrapper → LanceDBClientWrapper
   - Update initialization

5. **src/bin/manager.ts**
   - Update ChromaDBClientWrapper → LanceDBClientWrapper
   - Update initialization

### Testing
6. **Update all test files**
   - `src/domains/codebase/__tests__/codebase.service.test.ts`
   - `src/domains/search/__tests__/search.service.test.ts`
   - `src/domains/ingestion/__tests__/performance.test.ts`
   - `src/__tests__/integration-mocked.test.ts`

### Cleanup
7. **Remove old ChromaDB code**
   - Delete: `src/infrastructure/chromadb/` directory
   - Update: `src/infrastructure/chromadb/index.ts` (currently points to lancedb)

### Documentation
8. **Update documentation**
   - README.md - Remove server requirements
   - CONFIG.md - Update config examples
   - .env.example - Update paths

## Key API Differences

### ChromaDB vs LanceDB

| Operation | ChromaDB | LanceDB |
|-----------|----------|---------|
| Connect | `new ChromaClient({path})` | `await connect(path)` |
| Collection/Table | `getCollection()` | `openTable()` |
| Add data | `collection.add({ids, documents, embeddings, metadatas})` | `table.add([{id, vector, ...fields}])` |
| Search | `collection.query({queryEmbeddings, nResults})` | `table.search(vector).limit(n).execute()` |
| Delete | `collection.delete({where})` | `table.delete(filter)` |
| Metadata | Separate `metadatas` array | Regular columns in table |

## Next Steps

1. Install dependencies: `npm install`
2. Rewrite the 3 service files (codebase, search, ingestion)
3. Update remaining entry points
4. Update tests
5. Build and test: `npm run build && npm test`
6. Clean up old ChromaDB code
7. Update documentation

## Estimated Effort
- Service rewrites: ~2-3 hours (complex API changes)
- Entry points: ~30 minutes
- Tests: ~1 hour
- Documentation: ~30 minutes
- **Total: ~4-5 hours of focused work**

## Benefits of LanceDB
✅ No server required - truly local-first
✅ File-based storage - easy backup/sync
✅ Fast columnar format (Apache Arrow)
✅ Native JavaScript support
✅ Smaller dependency footprint
