# Single File Ingestion Analysis

## Current State

The ingestion CLI (`src/bin/ingest.ts`) currently only supports directory ingestion:
- Uses `--path <directory>` parameter
- Calls `ingestionService.ingestCodebase()` which expects a directory
- File scanner (`FileScannerService`) recursively scans directories

## Good News

The `IngestionService` already has an `ingestFiles()` method that handles individual files! This method:
- Takes an array of file paths
- Processes each file individually
- Converts, chunks, and embeds each file
- Returns statistics about processed files

## Required Changes

### 1. CLI Entry Point (`src/bin/ingest.ts`)

**Current:**
```typescript
.requiredOption('-p, --path <directory>', 'Path to document directory')
```

**Proposed:**
```typescript
.requiredOption('-p, --path <path>', 'Path to document directory or file')
```

**Logic Changes:**
```typescript
// After resolving path, check if it's a file or directory
const stats = await fs.stat(knowledgeBasePath);

if (stats.isFile()) {
  // Single file ingestion
  const result = await ingestionService.ingestFiles({
    files: [knowledgeBasePath],
    knowledgeBaseName: options.name,
    config,
  });
  
  // Format stats to match directory ingestion format
  const formattedStats = {
    totalFiles: 1,
    supportedFiles: result.filesProcessed,
    unsupportedFiles: result.errors.length,
    chunksCreated: result.chunksCreated,
    durationMs: endTime - startTime,
    unsupportedFiles: new Map(),
  };
} else if (stats.isDirectory()) {
  // Existing directory ingestion logic
  const stats = await ingestionService.ingestCodebase(...);
}
```

### 2. File Scanner Service (Optional Enhancement)

Add a new method to handle single files:

```typescript
/**
 * Scan a single file
 * 
 * @param filePath - Path to the file
 * @param options - Scanning options
 * @returns Scanned file info and statistics
 */
async scanFile(
  filePath: string,
  options: ScanOptions = {}
): Promise<{ files: ScannedFile[]; statistics: ScanStatistics }> {
  const { maxFileSize = 50 * 1024 * 1024 } = options;
  
  const statistics: ScanStatistics = {
    totalFiles: 1,
    supportedFiles: 0,
    unsupportedFiles: 0,
    unsupportedByExtension: new Map(),
    skippedHidden: 0,
    skippedByGitignore: 0,
  };

  // Check file exists and get stats
  const stats = await fs.stat(filePath);
  
  if (!stats.isFile()) {
    throw new Error(`Path is not a file: ${filePath}`);
  }
  
  if (stats.size > maxFileSize) {
    throw new Error(`File too large: ${stats.size} bytes (max: ${maxFileSize})`);
  }

  // Get file info
  const ext = path.extname(filePath).toLowerCase();
  const supported = DOCUMENT_EXTENSIONS.has(ext);
  const documentType = supported ? this.detectDocumentType(ext) : undefined;
  const fileName = path.basename(filePath);
  const isTest = this.isTestFile(fileName);

  if (supported) {
    statistics.supportedFiles = 1;
  } else {
    statistics.unsupportedFiles = 1;
    const extKey = ext || '(no extension)';
    statistics.unsupportedByExtension.set(extKey, 1);
  }

  const files: ScannedFile[] = [{
    path: filePath,
    relativePath: fileName,
    extension: ext,
    supported,
    documentType,
    isTest,
  }];

  return { files, statistics };
}
```

## Implementation Approach

### Minimal Change (Recommended)
Only modify `src/bin/ingest.ts`:
1. Check if path is file or directory using `fs.stat()`
2. If file: call `ingestFiles()` method (already exists)
3. If directory: call `ingestCodebase()` method (existing behavior)
4. Update help text to indicate both files and directories are supported

**Pros:**
- Minimal code changes
- Reuses existing `ingestFiles()` method
- No changes to core services
- Quick to implement and test

**Cons:**
- File ingestion bypasses file scanner statistics
- No gitignore checking for single files (probably not needed)

### Complete Implementation
Modify both CLI and file scanner:
1. Add `scanFile()` method to `FileScannerService`
2. Update CLI to detect file vs directory
3. Use appropriate method based on path type
4. Consistent statistics reporting

**Pros:**
- Consistent architecture
- Better statistics tracking
- Proper file validation
- Extensible for future features

**Cons:**
- More code changes
- More testing required

## Recommendation

**Go with Minimal Change approach:**

The `ingestFiles()` method already exists and handles everything needed for single file ingestion. We just need to:
1. Detect if the path is a file
2. Call the appropriate method
3. Format the output consistently

This gives us single file support with minimal risk and maximum code reuse.

## Example Usage After Implementation

```bash
# Ingest a single file
node dist/bin/ingest.js --name default --path Vets-main-regulations.pdf

# Ingest a directory (existing behavior)
node dist/bin/ingest.js --name default --path ./documents

# Ingest multiple files (future enhancement)
node dist/bin/ingest.js --name default --path file1.pdf --path file2.docx
```

## Testing Checklist

After implementation:
- [ ] Test single PDF file ingestion
- [ ] Test single DOCX file ingestion
- [ ] Test single Markdown file ingestion
- [ ] Test unsupported file type (should error gracefully)
- [ ] Test non-existent file (should error)
- [ ] Test directory ingestion (ensure existing behavior works)
- [ ] Verify statistics output is consistent
- [ ] Check that chunks are stored correctly
- [ ] Test search after single file ingestion
