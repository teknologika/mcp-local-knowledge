# Document Management Feature - Backport Guide

This guide documents all changes needed to add document viewing and deletion functionality to an MCP knowledge base server.

## Overview

This feature adds the ability to:
1. View all documents in a knowledge base (inline expansion in table)
2. Delete individual documents with all their chunks
3. See document metadata (chunk count, type, size, date)
4. Get immediate UI feedback with animations

## Architecture

### Backend Components
1. **Type Definitions** - `DocumentInfo` interface
2. **Service Methods** - `listDocuments()` and `deleteDocument()`
3. **MCP Integration** - `list_documents` tool (read-only)
4. **REST API** - GET/DELETE endpoints for Manager UI
5. **Cache Invalidation** - Clear search cache after deletion

### Frontend Components
1. **Inline Expansion** - Click KB name to expand/collapse documents
2. **Document List** - Shows all documents with metadata
3. **Delete Button** - Per-document deletion with confirmation
4. **Animations** - Smooth fade-out and toast notifications

## Step-by-Step Implementation

### Phase 1: Type Definitions

**File**: `src/shared/types/index.ts`

Add the `DocumentInfo` interface:

```typescript
export interface DocumentInfo {
  filePath: string;
  documentType: DocumentType;
  chunkCount: number;
  lastIngestion: string;
  sizeBytes: number;
}
```


### Phase 2: Service Layer Methods

**File**: `src/domains/knowledgebase/knowledgebase.service.ts`

#### Method 1: `listDocuments()`

Add this method to list all documents in a knowledge base:

```typescript
/**
 * List all unique documents in a knowledge base
 * @param knowledgeBaseName - Name of the knowledge base
 * @returns Array of document metadata
 */
async listDocuments(knowledgeBaseName: string): Promise<DocumentInfo[]> {
  try {
    logger.debug('Listing documents', { knowledgeBaseName });

    const table = await this.lanceClient.getOrCreateTable(knowledgeBaseName);
    if (!table) {
      throw new KnowledgeBaseError(`Knowledge base '${knowledgeBaseName}' not found`);
    }

    // Query all rows and aggregate by filePath
    const rows = await table.query().toArray();

    const documentsMap = new Map<string, DocumentInfo>();

    for (const row of rows) {
      // Skip placeholder chunks
      if (row.filePath === '__PLACEHOLDER__' || row.content === '__PLACEHOLDER__') {
        continue;
      }

      const filePath = row.filePath || '';
      if (!filePath) continue;

      if (!documentsMap.has(filePath)) {
        documentsMap.set(filePath, {
          filePath,
          documentType: row.documentType || 'text',
          chunkCount: 0,
          lastIngestion: row.ingestionTimestamp || '',
          sizeBytes: 0,
        });
      }

      const doc = documentsMap.get(filePath)!;
      doc.chunkCount++;
      doc.sizeBytes += (row.content || '').length;

      // Update to latest ingestion timestamp
      if (row.ingestionTimestamp && row.ingestionTimestamp > doc.lastIngestion) {
        doc.lastIngestion = row.ingestionTimestamp;
      }
    }

    const documents = Array.from(documentsMap.values());

    logger.debug('Documents listed successfully', {
      knowledgeBaseName,
      documentCount: documents.length,
    });

    return documents;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      'Failed to list documents',
      error instanceof Error ? error : new Error(errorMessage),
      { knowledgeBaseName }
    );
    throw new KnowledgeBaseError(
      `Failed to list documents in knowledge base '${knowledgeBaseName}': ${errorMessage}`,
      error
    );
  }
}
```


#### Method 2: `deleteDocument()`

Add this method to delete a document and all its chunks:

```typescript
/**
 * Delete all chunks for a specific document from a knowledge base
 * @param knowledgeBaseName - Name of the knowledge base
 * @param filePath - Relative path to the document to remove
 * @returns Number of chunks deleted
 */
async deleteDocument(knowledgeBaseName: string, filePath: string): Promise<number> {
  try {
    logger.debug('Deleting document', { knowledgeBaseName, filePath });

    // Validate inputs
    if (!filePath || filePath.trim() === '') {
      throw new KnowledgeBaseError('File path cannot be empty');
    }

    // Security: Prevent path traversal
    if (filePath.includes('..') || filePath.startsWith('/')) {
      throw new KnowledgeBaseError('Invalid file path: path traversal not allowed');
    }

    const table = await this.lanceClient.getOrCreateTable(knowledgeBaseName);
    if (!table) {
      throw new KnowledgeBaseError(`Knowledge base '${knowledgeBaseName}' not found`);
    }

    // Debug: Log a sample row to see the actual field structure
    try {
      const sampleRows = await table.query().limit(1).toArray();
      if (sampleRows.length > 0) {
        logger.debug('Sample row fields', {
          knowledgeBaseName,
          fields: Object.keys(sampleRows[0]),
          sampleFilePath: sampleRows[0].filePath,
        });
      }
    } catch (debugError) {
      logger.warn('Could not fetch sample row for debugging', { error: debugError });
    }

    // Count chunks before deletion
    const beforeCount = await table.countRows();

    // Escape single quotes in filePath for SQL filter
    const escapedFilePath = filePath.replace(/'/g, "''");

    // Delete chunks matching filePath
    // CRITICAL: Use backticks for field names with mixed case in LanceDB
    await table.delete(`\`filePath\` = '${escapedFilePath}'`);

    // Count chunks after deletion
    const afterCount = await table.countRows();
    const deletedCount = beforeCount - afterCount;

    logger.info('Document deleted', {
      knowledgeBaseName,
      filePath,
      chunksDeleted: deletedCount,
    });

    return deletedCount;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      'Failed to delete document',
      error instanceof Error ? error : new Error(errorMessage),
      { knowledgeBaseName, filePath }
    );
    throw new KnowledgeBaseError(
      `Failed to delete document '${filePath}' from knowledge base '${knowledgeBaseName}': ${errorMessage}`,
      error
    );
  }
}
```

**IMPORTANT NOTES:**
- Use **backticks** (\`) around `filePath` in the SQL query for LanceDB case-sensitivity
- Escape single quotes in the filePath value to prevent SQL injection
- Validate input to prevent path traversal attacks
- Count rows before/after to calculate deleted chunks


#### Fix Placeholder Counting

Update `listKnowledgeBases()` and `getKnowledgeBaseStats()` to exclude placeholder chunks:

**In `listKnowledgeBases()`:**
```typescript
for (const row of allRows) {
  // Skip placeholder chunks when counting
  if (row.filePath === '__PLACEHOLDER__' || row.content === '__PLACEHOLDER__') {
    continue;
  }
  
  chunkCount++;
  if (row.filePath) {
    uniqueFiles.add(row.filePath);
  }
}
```

**In `getKnowledgeBaseStats()`:**
```typescript
let actualChunkCount = 0;

for (const row of rows) {
  // Skip placeholder chunks
  if (row.filePath === '__PLACEHOLDER__' || row.content === '__PLACEHOLDER__') {
    continue;
  }

  actualChunkCount++;
  // ... rest of the loop
}

// Use actualChunkCount instead of rows.length
const stats: KnowledgeBaseStats = {
  // ...
  chunkCount: actualChunkCount,
  // ...
};
```

### Phase 3: MCP Integration (Optional - Read-Only)

**File**: `src/infrastructure/mcp/tool-schemas.ts`

Add the list documents schema:

```typescript
export const LIST_DOCUMENTS_SCHEMA: ToolSchema = {
  name: 'list_documents',
  description: 'List all documents in a knowledge base with metadata including chunk count, document type, size, and last ingestion timestamp',
  inputSchema: {
    type: 'object',
    properties: {
      knowledgebaseName: {
        type: 'string',
        description: 'Name of the knowledge base to list documents from',
      },
    },
    required: ['knowledgebaseName'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      documents: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            filePath: { type: 'string' },
            documentType: { type: 'string' },
            chunkCount: { type: 'number' },
            lastIngestion: { type: 'string' },
            sizeBytes: { type: 'number' },
          },
        },
      },
      knowledgebaseName: { type: 'string' },
      totalDocuments: { type: 'number' },
    },
  },
};
```

Add to `ALL_TOOL_SCHEMAS`:
```typescript
export const ALL_TOOL_SCHEMAS: ToolSchema[] = [
  // ... existing schemas
  LIST_DOCUMENTS_SCHEMA,
];
```


**File**: `src/infrastructure/mcp/mcp-server.ts`

Add the handler function:

```typescript
/**
 * Handle list_documents tool call
 */
async function handleListDocuments(args: unknown): Promise<ToolResponse> {
  const validatedArgs = validateToolArgs(LIST_DOCUMENTS_SCHEMA, args);
  const { knowledgebaseName } = validatedArgs;

  try {
    const documents = await knowledgeBaseService.listDocuments(knowledgebaseName);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              documents,
              knowledgebaseName,
              totalDocuments: documents.length,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to list documents: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

Add to the tool routing switch:

```typescript
switch (name) {
  // ... existing cases
  case 'list_documents':
    return await handleListDocuments(args);
  // ... rest of cases
}
```

**NOTE**: We intentionally do NOT add a `delete_document` MCP tool for safety. Document deletion should only be available through the Manager UI with proper confirmation dialogs.

### Phase 4: REST API Routes

**File**: `src/infrastructure/fastify/manager-routes.ts`

Add these two endpoints before the existing `/api/upload/file` route:

```typescript
/**
 * GET /api/knowledgebases/:name/documents
 * List all documents in a knowledge base
 */
fastify.get<{ Params: { name: string } }>(
  '/api/knowledgebases/:name/documents',
  async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) => {
    const { name } = request.params;
    
    try {
      logger.info('GET /api/knowledgebases/:name/documents', { name });
      
      const documents = await knowledgeBaseService.listDocuments(name);
      
      return reply.send({
        documents,
        knowledgeBaseName: name,
        totalDocuments: documents.length
      });
    } catch (error) {
      logger.error('Failed to list documents', error instanceof Error ? error : new Error(String(error)), { name });
      return reply.status(500).send({
        error: `Failed to list documents: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
);

/**
 * DELETE /api/knowledgebases/:name/documents
 * Delete a specific document from a knowledge base
 */
fastify.delete<{ Params: { name: string }; Body: { filePath: string } }>(
  '/api/knowledgebases/:name/documents',
  async (request: FastifyRequest<{ Params: { name: string }; Body: { filePath: string } }>, reply: FastifyReply) => {
    const { name } = request.params;
    const { filePath } = request.body;
    
    try {
      logger.info('DELETE /api/knowledgebases/:name/documents', { name, filePath });
      
      if (!filePath) {
        return reply.status(400).send({
          error: 'File path is required'
        });
      }
      
      const deletedCount = await knowledgeBaseService.deleteDocument(name, filePath);
      
      // Clear search cache after deletion
      searchService.clearCache();
      
      logger.info('Document deleted successfully', { name, filePath, deletedCount });
      
      return reply.send({
        success: true,
        deletedChunks: deletedCount,
        filePath,
        knowledgeBaseName: name
      });
    } catch (error) {
      logger.error('Failed to delete document', error instanceof Error ? error : new Error(String(error)), { name, filePath });
      return reply.status(500).send({
        error: `Failed to delete document: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
);
```

**CRITICAL**: Always clear the search cache after deletion to ensure search results are accurate.


### Phase 5: Frontend HTML Template

**File**: `src/ui/manager/templates/index.hbs`

Replace the knowledge bases table rows with this expandable structure:

```handlebars
{{#each knowledgeBases}}
<tr class="kb-row" data-kb-name="{{name}}">
    <td>
        <button type="button" onclick="toggleDocuments(event, '{{name}}')" style="background: none; border: none; padding: 0; color: var(--accent); font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
            <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; transition: transform 0.2s;">
                <polyline points="9 18 15 12 9 6"/>
            </svg>
            {{displayName name}}
        </button>
    </td>
    <td><span class="badge badge-blue">{{chunkCount}}</span></td>
    <td><span class="badge badge-green">{{fileCount}}</span></td>
    <td style="font-size: 0.875rem; color: var(--text-secondary);">{{daysSince lastIngestion}}</td>
    <td>
        <div style="position: relative;">
            <button type="button" class="btn btn-ghost btn-sm" onclick="toggleActionsMenu(event, '{{name}}')" style="padding: 0.25rem 0.5rem;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                    <circle cx="12" cy="12" r="1"/>
                    <circle cx="12" cy="5" r="1"/>
                    <circle cx="12" cy="19" r="1"/>
                </svg>
            </button>
            <div id="actions-menu-{{name}}" class="actions-menu" style="display: none;">
                <button type="button" onclick="showRenameModal('{{name}}'); closeActionsMenu('{{name}}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Rename
                </button>
                <button type="button" onclick="confirmRemove('{{name}}', '{{displayName name}}'); closeActionsMenu('{{name}}')" style="color: var(--danger);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Remove
                </button>
            </div>
        </div>
    </td>
</tr>
<tr id="documents-row-{{name}}" class="documents-row" style="display: none;">
    <td colspan="5" style="padding: 0; background: var(--bg-surface);">
        <div class="documents-container">
            <div class="documents-loading" id="documents-loading-{{name}}" style="display: none; text-align: center; padding: 2rem; color: var(--text-secondary);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px; margin: 0 auto 0.5rem; animation: spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10"/>
                </svg>
                <p style="font-size: 0.875rem;">Loading documents...</p>
            </div>
            <div id="documents-list-{{name}}" class="documents-list">
                <!-- Documents will be loaded here -->
            </div>
        </div>
    </td>
</tr>
{{/each}}
```

**Key Changes:**
- Knowledge base name is now a button with expand icon
- Added hidden documents row below each KB row
- Documents row contains loading indicator and documents list container
- No "View Documents" in actions menu - click name to expand


### Phase 6: Frontend JavaScript

**File**: `src/ui/manager/static/manager.js`

Add these functions at the end of the file (before the closing):

```javascript
// ===== Document Management Functionality =====

/**
 * Toggle documents list for a knowledge base (inline expansion)
 */
async function toggleDocuments(event, knowledgeBaseName) {
    event.preventDefault();
    event.stopPropagation();
    
    // Use data attribute for more reliable selection
    const kbRow = document.querySelector(`tr.kb-row[data-kb-name="${knowledgeBaseName}"]`);
    if (!kbRow) {
        console.error('Knowledge base row not found:', knowledgeBaseName);
        return;
    }
    
    // Get the next sibling row (documents row)
    const documentsRow = kbRow.nextElementSibling;
    if (!documentsRow || !documentsRow.classList.contains('documents-row')) {
        console.error('Documents row not found for:', knowledgeBaseName);
        return;
    }
    
    const documentsList = documentsRow.querySelector('.documents-list');
    const documentsLoading = documentsRow.querySelector('.documents-loading');
    const expandIcon = kbRow.querySelector('.expand-icon');
    
    if (!documentsList || !documentsLoading || !expandIcon) {
        console.error('Documents elements not found');
        return;
    }
    
    // Toggle visibility
    const isExpanded = documentsRow.style.display === 'table-row';
    
    if (isExpanded) {
        // Collapse
        documentsRow.style.display = 'none';
        expandIcon.style.transform = 'rotate(0deg)';
    } else {
        // Expand
        documentsRow.style.display = 'table-row';
        expandIcon.style.transform = 'rotate(90deg)';
        
        // Load documents if not already loaded
        if (documentsList.innerHTML.trim() === '' || documentsList.innerHTML.includes('<!-- Documents will be loaded here -->')) {
            documentsLoading.style.display = 'block';
            documentsList.innerHTML = '';
            
            try {
                const response = await fetch(`/api/knowledgebases/${encodeURIComponent(knowledgeBaseName)}/documents`);
                
                if (!response.ok) {
                    throw new Error('Failed to load documents');
                }
                
                const data = await response.json();
                
                documentsLoading.style.display = 'none';
                
                if (data.documents.length === 0) {
                    documentsList.innerHTML = '<div class="empty-state" style="padding: 2rem; text-align: center;"><p style="color: var(--text-secondary);">No documents found</p></div>';
                    return;
                }
                
                // Build documents list
                documentsList.innerHTML = data.documents.map(doc => {
                    const ext = '.' + doc.filePath.split('.').pop().toLowerCase();
                    const iconClass = getFileIconClass(ext);
                    const sizeStr = formatFileSize(doc.sizeBytes);
                    const date = new Date(doc.lastIngestion);
                    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                    
                    return `
                        <div class="document-item">
                            <div class="document-item-info">
                                <div class="file-item-icon ${iconClass}">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                        <polyline points="14 2 14 8 20 8"/>
                                    </svg>
                                </div>
                                <div class="document-item-details">
                                    <div class="document-item-name" title="${doc.filePath}">${doc.filePath}</div>
                                    <div class="document-item-meta">
                                        <span class="badge badge-blue">${doc.chunkCount} chunks</span>
                                        <span class="badge badge-green">${doc.documentType}</span>
                                        <span style="font-size: 0.75rem; color: var(--text-secondary);">${sizeStr}</span>
                                        <span style="font-size: 0.75rem; color: var(--text-secondary);">${dateStr}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="document-item-actions">
                                <button type="button" class="btn btn-ghost btn-sm" onclick="confirmDeleteDocument('${knowledgeBaseName}', '${doc.filePath.replace(/'/g, "\\'")}', this)" title="Delete document">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                        <polyline points="3 6 5 6 21 6"/>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
                
            } catch (error) {
                console.error('Error loading documents:', error);
                documentsLoading.style.display = 'none';
                documentsList.innerHTML = '<div class="empty-state" style="padding: 2rem; text-align: center;"><p style="color: var(--danger);">Error loading documents</p></div>';
            }
        }
    }
}

/**
 * Confirm and delete document
 */
async function confirmDeleteDocument(knowledgeBaseName, filePath, buttonElement) {
    if (!confirm(`Delete "${filePath}"?\n\nThis will remove all chunks from the knowledge base. This cannot be undone.`)) {
        return;
    }
    
    // Get the document item element
    const documentItem = buttonElement.closest('.document-item');
    
    // Disable button
    buttonElement.disabled = true;
    buttonElement.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10"/></svg>';
    
    try {
        const response = await fetch(`/api/knowledgebases/${encodeURIComponent(knowledgeBaseName)}/documents`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filePath })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete document');
        }
        
        const result = await response.json();
        
        // Remove the document item from the DOM with animation
        if (documentItem) {
            documentItem.style.opacity = '0';
            documentItem.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                documentItem.remove();
                
                // Check if there are any documents left
                const kbRow = document.querySelector(`tr.kb-row[data-kb-name="${knowledgeBaseName}"]`);
                if (kbRow) {
                    const documentsRow = kbRow.nextElementSibling;
                    if (documentsRow) {
                        const documentsList = documentsRow.querySelector('.documents-list');
                        if (documentsList && documentsList.children.length === 0) {
                            documentsList.innerHTML = '<div class="empty-state" style="padding: 2rem; text-align: center;"><p style="color: var(--text-secondary);">No documents found</p></div>';
                        }
                    }
                }
            }, 300);
        }
        
        // Show success message briefly
        const tempMessage = document.createElement('div');
        tempMessage.style.cssText = 'position: fixed; top: 20px; right: 20px; background: rgba(34, 197, 94, 0.9); color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; animation: slideIn 0.3s ease;';
        tempMessage.textContent = `Deleted "${filePath}" (${result.deletedChunks} chunks removed)`;
        document.body.appendChild(tempMessage);
        
        setTimeout(() => {
            tempMessage.style.opacity = '0';
            tempMessage.style.transition = 'opacity 0.3s ease';
            setTimeout(() => tempMessage.remove(), 300);
        }, 3000);
        
        // Reload page after delay to update stats in the table
        setTimeout(() => {
            window.location.href = '/?tab=manage';
        }, 3500);
        
    } catch (error) {
        console.error('Failed to delete document:', error);
        alert(`Failed to delete document: ${error.message}`);
        
        // Re-enable button
        buttonElement.disabled = false;
        buttonElement.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
        `;
    }
}
```

**Key Features:**
- Uses `nextElementSibling` for reliable row selection
- Loads documents on first expansion (cached after)
- Smooth animations for expand/collapse and delete
- Toast notification instead of alert
- Immediate DOM update before page reload


### Phase 7: Frontend CSS Styles

**File**: `src/ui/manager/static/manager.css`

Add these styles at the end of the file:

```css
/* ===== Document Management ===== */

/* Knowledge Base Row */
.kb-row .expand-icon {
    transition: transform 0.2s ease;
}

/* Documents Row (expanded inline) */
.documents-row {
    background: var(--bg-surface);
}

.documents-container {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-color);
}

.documents-list {
    background: var(--bg-primary);
    border-radius: 8px;
    border: 1px solid var(--border-color);
    overflow: hidden;
}

/* Document Item */
.document-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    transition: var(--transition);
}

.document-item:last-child {
    border-bottom: none;
}

.document-item:hover {
    background: var(--bg-surface);
}

.document-item-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
}

.document-item-details {
    flex: 1;
    min-width: 0;
}

.document-item-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 0.25rem;
}

.document-item-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.document-item-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
}

/* Spin animation for loading indicators */
@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

/* Slide in animation for notifications */
@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
```

**Note**: These styles assume you already have file-item-icon styles defined. If not, add them from the existing upload functionality.


## Common Issues and Solutions

### Issue 1: LanceDB Field Name Case Sensitivity

**Problem**: Delete query fails with "No field named filepath" error.

**Solution**: Use backticks around field names with mixed case:
```typescript
await table.delete(`\`filePath\` = '${escapedFilePath}'`);
```

**Why**: LanceDB stores fields with their original case. When querying, you must use backticks for case-sensitive field names.

### Issue 2: Placeholder Chunks Showing in Count

**Problem**: Knowledge base shows 1 chunk when empty.

**Solution**: Filter out placeholder chunks in all counting logic:
```typescript
if (row.filePath === '__PLACEHOLDER__' || row.content === '__PLACEHOLDER__') {
  continue;
}
```

### Issue 3: Documents Not Loading

**Problem**: Clicking KB name doesn't show documents.

**Solution**: Check browser console for errors. Common causes:
- API endpoint not registered
- CORS issues (shouldn't happen with same-origin)
- JavaScript syntax errors

### Issue 4: Delete Doesn't Remove from UI

**Problem**: Document still visible after deletion.

**Solution**: Ensure the `confirmDeleteDocument` function:
1. Removes the DOM element immediately
2. Shows empty state if no documents left
3. Reloads page to update stats

### Issue 5: SQL Injection Vulnerability

**Problem**: User-provided filePath could contain SQL injection.

**Solution**: Always escape single quotes:
```typescript
const escapedFilePath = filePath.replace(/'/g, "''");
```

## Testing Checklist

After implementing, test these scenarios:

- [ ] Click KB name to expand documents list
- [ ] Click again to collapse
- [ ] Verify document metadata displays correctly
- [ ] Delete a document and verify immediate UI update
- [ ] Verify chunk count updates after deletion
- [ ] Delete last document and verify empty state
- [ ] Test with documents containing special characters in filename
- [ ] Test with documents containing single quotes in filename
- [ ] Verify MCP `list_documents` tool works (if implemented)
- [ ] Verify search cache is cleared after deletion
- [ ] Test with empty knowledge base (placeholder only)
- [ ] Verify placeholder doesn't show in document list

## Performance Considerations

1. **Document List Caching**: Documents are loaded once per expansion and cached in the DOM
2. **Lazy Loading**: Documents only load when expanded, not on page load
3. **Batch Operations**: Consider adding batch delete if needed
4. **Large Document Lists**: For KBs with 100+ documents, consider pagination

## Security Considerations

1. **Path Traversal Prevention**: Reject paths with `..` or starting with `/`
2. **SQL Injection Prevention**: Escape single quotes in filePath
3. **Input Validation**: Validate filePath is non-empty
4. **Authorization**: Ensure only authorized users can delete (add if needed)
5. **Audit Logging**: Consider logging deletions for audit trail

## Future Enhancements

1. **Batch Delete**: Select multiple documents and delete at once
2. **Document Search**: Filter documents by name or type
3. **Sort Options**: Sort by name, size, date, chunk count
4. **Document Details**: Click document to see chunk list
5. **Undo Delete**: Soft delete with recovery option
6. **Export Document**: Download original or chunks as JSON

## Summary

This feature adds comprehensive document management to your MCP knowledge base server:

- **Backend**: Type-safe service methods with security validation
- **MCP**: Read-only list tool for AI assistants
- **REST API**: Full CRUD endpoints for Manager UI
- **Frontend**: Smooth inline expansion with animations
- **UX**: Immediate feedback, toast notifications, empty states

The implementation is production-ready with proper error handling, security measures, and user feedback.

