# Docling Integration Fix - Complete

## Summary

Successfully fixed the docling integration by switching from docling-sdk CLI client to direct docling CLI execution. The fix includes:

1. Added `--image-export-mode placeholder` parameter to prevent base64-encoded images from bloating markdown output
2. Replaced docling-sdk CLI client with direct `spawn()` execution of docling CLI
3. Properly reads generated markdown and JSON files from disk after conversion

## Root Cause

The docling-sdk v2.0.4 CLI client has a fundamental limitation: it does not return `md_content` in the result object despite documentation stating it should. The SDK's CLI client:
- Only returns `result.document.filename` (just the original filename)
- Does not populate `md_content`, `json_content`, or other content fields
- Does not properly configure the output directory for file generation

## Solution

Bypassed the docling-sdk CLI client entirely and implemented direct CLI execution:

```typescript
// Direct CLI execution with spawn()
const child = spawn('docling', [
  '--ocr',
  '--image-export-mode', 'placeholder',
  filePath,
  '--to', 'md',
  '--to', 'json',
  '--output', outputDir,
], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

// Read generated files from disk
const markdown = await readFile(join(outputDir, `${basename}.md`), 'utf-8');
const jsonContent = JSON.parse(await readFile(join(outputDir, `${basename}.json`), 'utf-8'));
```

## Changes Made

### 1. Updated Document Converter Service

**File**: `src/domains/document/document-converter.service.ts`

- Removed docling-sdk import and client initialization
- Added direct CLI execution using `spawn()` from `node:child_process`
- Implemented timeout handling with proper process cleanup
- Added file reading logic to retrieve generated markdown and JSON files
- Maintained all existing functionality (text file direct reading, error handling, etc.)

### 2. Created New Test Suite

**File**: `src/domains/document/__tests__/document-converter-cli.test.ts`

- Comprehensive tests for direct CLI implementation
- Mocked `spawn()` and file system operations
- Tests for successful conversion, error handling, timeouts
- Tests for text file direct reading (markdown, text, HTML)
- Tests for document type detection and word counting

All 13 tests passing ✅

## Impact

### Before
- PDF with images: **3.7MB** markdown file (with base64 images)
- SDK CLI client: **No content returned** (only filename)
- Conversion: **Failed** (couldn't retrieve markdown)

### After
- Same PDF: **128KB** markdown file (97% reduction!)
- Direct CLI: **Content successfully retrieved**
- Conversion: **Working perfectly** (130KB, 15,011 words)

## Testing

```bash
# Unit tests
npm test -- document-converter-cli.test.ts
✓ 13 tests passing

# Integration test
node test-docling-fix.js
✅ SUCCESS: Markdown content retrieved!
   - Markdown length: 130,629 characters
   - Word count: 15,011
   - Duration: 23,795ms
```

## Files Modified

- `src/domains/document/document-converter.service.ts` - Replaced SDK client with direct CLI
- `src/domains/document/__tests__/document-converter-cli.test.ts` - New test suite (13 tests)
- `test-docling-fix.js` - Integration test script

## Benefits

1. **Reliable**: Direct CLI execution works consistently
2. **Simple**: No SDK abstraction layer to debug
3. **Efficient**: 97% file size reduction with placeholder mode
4. **Maintainable**: Clear, straightforward implementation
5. **Tested**: Comprehensive test coverage

## Conclusion

The docling integration is now fully functional. The direct CLI approach:
- ✅ Successfully converts PDFs with OCR support
- ✅ Uses `--image-export-mode placeholder` to prevent bloat
- ✅ Retrieves markdown and JSON content from disk
- ✅ Handles timeouts and errors gracefully
- ✅ Maintains backward compatibility for text files
- ✅ Has comprehensive test coverage

The 97% file size reduction and successful content retrieval demonstrate that the fix is working as intended.
