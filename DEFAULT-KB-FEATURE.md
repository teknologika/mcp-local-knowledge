# Default Knowledge Base Feature

## Overview
Automatically creates a "default" knowledge base on first run of both the Manager UI and MCP server.

## Implementation

### Changes Made

1. **Manager Entry Point** (`src/bin/manager.ts`)
   - Added check for "default" knowledge base after service initialization
   - Creates "default" KB if it doesn't exist
   - Logs creation status (info level)
   - Non-blocking: startup continues even if creation fails

2. **MCP Server Entry Point** (`src/bin/mcp-server.ts`)
   - Added check for "default" knowledge base after service initialization
   - Creates "default" KB if it doesn't exist
   - Silent: no logging (MCP stdio mode requirement)
   - Non-blocking: startup continues even if creation fails

### Behavior

- On first run, a knowledge base named "default" is automatically created
- The default KB is empty (contains only a placeholder chunk)
- Users can immediately start ingesting documents without manual KB creation
- If "default" already exists, no action is taken
- Failure to create "default" does not prevent server startup

### User Experience

**Before:**
1. Start manager/MCP server
2. Manually create a knowledge base
3. Ingest documents

**After:**
1. Start manager/MCP server (default KB created automatically)
2. Ingest documents directly

### Technical Details

**Creation Logic:**
```typescript
const knowledgeBases = await knowledgeBaseService.listKnowledgeBases();
const hasDefault = knowledgeBases.some(kb => kb.name === 'default');

if (!hasDefault) {
  await knowledgeBaseService.createKnowledgeBase('default');
}
```

**Timing:**
- Runs after all services are initialized
- Runs before server starts listening
- Non-blocking error handling

**Safety:**
- Uses existing `createKnowledgeBase()` method (tested)
- Wrapped in try-catch to prevent startup failures
- Idempotent: safe to run multiple times

## Testing

To verify the feature works:

1. Delete existing knowledge bases:
   ```bash
   rm -rf .knowledge-base/
   ```

2. Start the manager:
   ```bash
   npm run manager
   ```

3. Check the UI - "default" should appear in the knowledge base list

4. Check logs for:
   - "Checking for default knowledge base"
   - "Creating default knowledge base"
   - "Default knowledge base created successfully"

## Future Enhancements

Potential improvements:
- Make default KB name configurable via environment variable
- Pre-populate with sample documents
- Add welcome message or documentation link
- Create multiple default KBs for different use cases
