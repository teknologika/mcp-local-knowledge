# Document Removal Feature - Implementation Analysis

## Current State

### Data Schema
Each chunk stored in LanceDB has the following structure:
```typescript
{
  id: string,                    // Format: `${knowledgeBaseName}_${timestamp}_${index}`
  vector: number[],              // 384-dimensional embedding
  content: string,               // Chunk text content
  filePath: string,              // Original file path (e.g., "docs/README.md")
  startLine: number,             // Starting line in document
  endLine: number,               // Ending line in document
  chunkType: ChunkType,          // 'paragraph', 'section', 'table', etc.
  documentType: DocumentType,    // 'pdf', 'docx', 'markdown', 'text', etc.
  tokenCount: number,            // Estimated token count
  headingPath: string[],         // Heading hierarchy
  pageNumber: number,            // Page number (for PDFs)
  ingestionTimestamp: string,    // ISO 8601 timestamp
  _knowledgeBaseName: string,    // Knowledge base name
  _path: string,                 // Knowledge base path
  _lastIngestion: string         // Last ingestion timestamp
}
```

### Key Identifier
- **filePath** is the primary identifier for documents
- Multiple chunks can have the same filePath (one document = many chunks)
- filePath is relative to the knowledge base root

## Required Changes

### 1. Backend Service Layer

#### A. KnowledgeBaseService (New Method)
**File**: `src/domains/knowledgebase/knowledgebase.service.ts`

```typescript
/**
 * Delete all chunks for a specific document from a knowledge base
 * @param knowledgeBaseName - Name of the knowledge base
 * @param filePath - Relative path to the document to remove
 * @returns Number of chunks deleted
 */
async deleteDocument(
  knowledgeBaseName: string, 
  filePath: string
): Promise<number> {
  // 1. Get the table
  const table = await this.lanceClient.getOrCreateTable(knowledgeBaseName);
  if (!table) {
    throw new KnowledgeBaseError(`Knowledge base '${knowledgeBaseName}' not found`);
  }

  // 2. Count chunks before deletion
  const beforeCount = await table.countRows();

  // 3. Delete chunks matching filePath
  await table.delete(`filePath = '${filePath}'`);

  // 4. Count chunks after deletion
  const afterCount = await table.countRows();
  const deletedCount = beforeCount - afterCount;

  // 5. Clear search cache (important!)
  // Need to inject SearchService or emit event

  logger.info('Document deleted', {
    knowledgeBaseName,
    filePath,
    chunksDeleted: deletedCount
  });

  return deletedCount;
}

/**
 * List all unique documents in a knowledge base
 * @param knowledgeBaseName - Name of the knowledge base
 * @returns Array of document metadata
 */
async listDocuments(knowledgeBaseName: string): Promise<DocumentInfo[]> {
  const table = await this.lanceClient.getOrCreateTable(knowledgeBaseName);
  if (!table) {
    throw new KnowledgeBaseError(`Knowledge base '${knowledgeBaseName}' not found`);
  }

  // Query all rows and aggregate by filePath
  const rows = await table.query().toArray();
  
  const documentsMap = new Map<string, DocumentInfo>();
  
  for (const row of rows) {
    if (row.filePath === '__PLACEHOLDER__') continue;
    
    const filePath = row.filePath;
    if (!documentsMap.has(filePath)) {
      documentsMap.set(filePath, {
        filePath,
        documentType: row.documentType,
        chunkCount: 0,
        lastIngestion: row.ingestionTimestamp,
        sizeBytes: 0
      });
    }
    
    const doc = documentsMap.get(filePath)!;
    doc.chunkCount++;
    doc.sizeBytes += (row.content || '').length;
  }
  
  return Array.from(documentsMap.values());
}
```

#### B. New Type Definitions
**File**: `src/shared/types/index.ts`

```typescript
/**
 * Document information in a knowledge base
 */
export interface DocumentInfo {
  filePath: string;
  documentType: DocumentType;
  chunkCount: number;
  lastIngestion: string;
  sizeBytes: number;
}
```

### 2. MCP Server Integration

#### A. New MCP Tool
**File**: `src/infrastructure/mcp/tool-schemas.ts`

```typescript
export const DELETE_DOCUMENT_TOOL = {
  name: 'delete_document',
  description: 'Delete a specific document from a knowledge base',
  inputSchema: {
    type: 'object',
    properties: {
      knowledgeBaseName: {
        type: 'string',
        description: 'Name of the knowledge base'
      },
      filePath: {
        type: 'string',
        description: 'Relative path to the document to delete'
      }
    },
    required: ['knowledgeBaseName', 'filePath']
  }
};

export const LIST_DOCUMENTS_TOOL = {
  name: 'list_documents',
  description: 'List all documents in a knowledge base',
  inputSchema: {
    type: 'object',
    properties: {
      knowledgeBaseName: {
        type: 'string',
        description: 'Name of the knowledge base'
      }
    },
    required: ['knowledgeBaseName']
  }
};
```

#### B. Tool Handlers
**File**: `src/infrastructure/mcp/mcp-server.ts`

Add handlers for the new tools in the request handler switch statement.

### 3. Manager UI Integration

#### A. Backend API Routes
**File**: `src/infrastructure/fastify/manager-routes.ts`

```typescript
// GET /api/knowledgebases/:name/documents
// List all documents in a knowledge base
fastify.get<{
  Params: { name: string };
}>('/api/knowledgebases/:name/documents', async (request, reply) => {
  const { name } = request.params;
  
  try {
    const documents = await knowledgeBaseService.listDocuments(name);
    return { documents };
  } catch (error) {
    logger.error('Failed to list documents', error);
    return reply.status(500).send({
      error: 'Failed to list documents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/knowledgebases/:name/documents
// Delete a specific document
fastify.delete<{
  Params: { name: string };
  Body: { filePath: string };
}>('/api/knowledgebases/:name/documents', async (request, reply) => {
  const { name } = request.params;
  const { filePath } = request.body;
  
  if (!filePath) {
    return reply.status(400).send({
      error: 'Missing filePath in request body'
    });
  }
  
  try {
    const deletedCount = await knowledgeBaseService.deleteDocument(name, filePath);
    
    // Clear search cache
    searchService.clearCache();
    
    return {
      success: true,
      deletedChunks: deletedCount,
      filePath
    };
  } catch (error) {
    logger.error('Failed to delete document', error);
    return reply.status(500).send({
      error: 'Failed to delete document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

#### B. Frontend UI Updates
**File**: `src/ui/manager/static/manager.js`

Add new UI components:
1. **Document List View** - Show all documents in selected knowledge base
2. **Delete Button** - Per-document delete action
3. **Confirmation Dialog** - Confirm before deletion
4. **Refresh After Delete** - Update stats and document list

**File**: `src/ui/manager/templates/index.hbs`

Add HTML for document management section.

### 4. Search Cache Invalidation

**Critical**: When a document is deleted, the search cache must be cleared to prevent stale results.

**Options**:
1. **Direct injection**: Inject SearchService into KnowledgeBaseService
2. **Event emitter**: Use EventEmitter pattern for loose coupling
3. **Cache clear endpoint**: Call searchService.clearCache() from route handler

**Recommended**: Option 3 (call from route handler) - simplest and most explicit.

## Implementation Steps

### Phase 1: Backend Core (Priority: High)
1. Add `DocumentInfo` type to `src/shared/types/index.ts`
2. Implement `deleteDocument()` in `KnowledgeBaseService`
3. Implement `listDocuments()` in `KnowledgeBaseService`
4. Add unit tests for both methods

### Phase 2: MCP Integration (Priority: High)
1. Add tool schemas to `tool-schemas.ts`
2. Add tool handlers to `mcp-server.ts`
3. Add integration tests

### Phase 3: Manager UI API (Priority: Medium)
1. Add GET `/api/knowledgebases/:name/documents` route
2. Add DELETE `/api/knowledgebases/:name/documents` route
3. Add route tests

### Phase 4: Manager UI Frontend (Priority: Medium)
1. Add document list component
2. Add delete button with confirmation
3. Wire up API calls
4. Update stats after deletion

### Phase 5: Documentation (Priority: Low)
1. Update README with new MCP tools
2. Update API documentation
3. Add usage examples

## Edge Cases & Considerations

### 1. Concurrent Modifications
- **Issue**: User deletes document while another user is ingesting
- **Solution**: LanceDB handles this at the table level; last write wins

### 2. Partial Deletions
- **Issue**: What if delete fails mid-operation?
- **Solution**: LanceDB delete is atomic; either all matching rows deleted or none

### 3. Empty Knowledge Base
- **Issue**: Deleting last document leaves empty table
- **Solution**: Keep placeholder chunk (already exists in current implementation)

### 4. File Path Escaping
- **Issue**: Special characters in filePath (quotes, backslashes)
- **Solution**: Use parameterized queries or proper escaping in LanceDB filter

### 5. Search Cache Staleness
- **Issue**: Cached search results may include deleted documents
- **Solution**: Clear cache on deletion (implemented in route handler)

### 6. Statistics Update
- **Issue**: Knowledge base stats become stale after deletion
- **Solution**: Stats are computed on-demand from table, so automatically updated

## Testing Requirements

### Unit Tests
- `deleteDocument()` with valid filePath
- `deleteDocument()` with non-existent filePath
- `deleteDocument()` with non-existent knowledge base
- `listDocuments()` with multiple documents
- `listDocuments()` with empty knowledge base
- `listDocuments()` with placeholder only

### Integration Tests
- Delete document via MCP tool
- Delete document via Manager UI API
- Verify search results exclude deleted document
- Verify stats update after deletion

### E2E Tests
- Full workflow: ingest → list → delete → verify gone
- Delete multiple documents sequentially
- Delete document and re-ingest same file

## Performance Considerations

### Delete Operation
- **LanceDB delete**: O(n) where n = total rows (must scan to find matches)
- **Optimization**: LanceDB uses columnar storage, so filePath column scan is fast
- **Expected**: <100ms for knowledge bases with <100k chunks

### List Documents Operation
- **Current**: O(n) - must scan all rows to aggregate by filePath
- **Optimization**: Could add index on filePath (LanceDB feature)
- **Expected**: <500ms for knowledge bases with <100k chunks

## Alternative Approaches Considered

### 1. Soft Delete (Rejected)
- Add `deleted: boolean` field
- Filter out deleted documents in queries
- **Pros**: Can undo deletion
- **Cons**: Wastes storage, complicates queries, slower searches

### 2. Document-Level Tables (Rejected)
- One table per document
- **Pros**: Fast deletion (drop table)
- **Cons**: Too many tables, complex management, poor for search

### 3. Batch Delete API (Future Enhancement)
- Delete multiple documents in one call
- **Pros**: More efficient for bulk operations
- **Cons**: More complex API, can implement later if needed

## Security Considerations

1. **Path Traversal**: Validate filePath doesn't contain `..` or absolute paths
2. **Authorization**: Ensure user has permission to delete from knowledge base
3. **Audit Logging**: Log all deletion operations with user info
4. **Rate Limiting**: Prevent abuse of delete endpoint

## Rollout Plan

### Stage 1: Backend Only (Week 1)
- Implement core service methods
- Add MCP tools
- Deploy to staging
- Test via MCP client

### Stage 2: Manager UI (Week 2)
- Add API routes
- Implement frontend UI
- Deploy to staging
- User acceptance testing

### Stage 3: Production (Week 3)
- Deploy to production
- Monitor for issues
- Gather user feedback

## Success Metrics

- Delete operation completes in <1 second for typical knowledge bases
- Zero data corruption incidents
- Search cache properly invalidated (no stale results)
- User satisfaction with UI workflow

## Open Questions

1. Should we support regex patterns for filePath (delete multiple files)?
2. Should we add "undo" functionality (requires soft delete)?
3. Should we batch delete operations for performance?
4. Should we add document-level metadata (upload date, uploader, etc.)?

## Conclusion

The document removal feature is straightforward to implement given the current architecture. The main work involves:
1. Adding delete/list methods to KnowledgeBaseService
2. Exposing via MCP tools and Manager UI API
3. Building UI components for document management

The implementation is low-risk as LanceDB handles the complexity of row deletion, and the existing architecture already tracks documents via filePath.
