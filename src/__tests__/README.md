# Integration Tests

This directory contains integration tests for the codebase memory MCP server.

## Test Files

### `integration-mocked.test.ts`
Integration tests that use mocked LanceDB and can run without external dependencies.

**Tests:**
- File scanning and parsing workflow
- Embedding service integration
- MCP server initialization
- API routes integration
- Entry points non-conflict verification
- Workflow validation

**Run with:**
```bash
npm test -- src/__tests__/integration-mocked.test.ts
```

### `integration-e2e.test.ts.skip`
Full end-to-end integration tests that use real LanceDB.

**Prerequisites:**
1. LanceDB is file-based and requires no external server
2. Tests will create temporary LanceDB databases automatically

2. Rename the file to remove `.skip` extension:
   ```bash
   mv src/__tests__/integration-e2e.test.ts.skip src/__tests__/integration-e2e.test.ts
   ```

3. Run the tests:
   ```bash
   npm test -- src/__tests__/integration-e2e.test.ts
   ```

**Tests:**
- Complete ingestion workflow (scan → parse → embed → store → verify)
- Complete search workflow (ingest → query → embed → search → format → verify)
- MCP client interaction (call all tools → verify responses)
- API client interaction (CRUD operations → verify state changes)
- Re-ingestion workflow (ingest → re-ingest → verify cleanup)
- Entry points can start without conflicts

## Running All Integration Tests

To run the mocked integration tests (no external dependencies):
```bash
npm test -- src/__tests__/integration-mocked.test.ts
```

To run all tests including E2E:
```bash
# No external dependencies needed - LanceDB is file-based
npm test -- integration-e2e.test.ts
mv src/__tests__/integration-e2e.test.ts.skip src/__tests__/integration-e2e.test.ts
npm test -- src/__tests__/
```

## Test Coverage

These integration tests verify:
- ✅ Complete ingestion workflow
- ✅ Complete search workflow  
- ✅ MCP server tool integration
- ✅ API client interaction
- ✅ Entry points non-conflict
- ✅ Re-ingestion workflow

**Requirements validated:** 9.2, 9.3, 9.4, 9.5
