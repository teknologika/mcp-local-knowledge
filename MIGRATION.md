# Migration Guide: mcp-codebase-search → mcp-local-knowledge

This guide helps you migrate from `@teknologika/mcp-codebase-search` (v0.x) to `@teknologika/mcp-local-knowledge` (v1.0+).

## Overview

Version 1.0 represents a major refactoring that transforms the package from a code-focused semantic search tool into a general-purpose document knowledge base system. The core architecture remains the same (local-first, MCP integration, LanceDB), but the focus shifts from code files to documents.

## Breaking Changes

### 1. Package Name Change

**Old:** `@teknologika/mcp-codebase-search`  
**New:** `@teknologika/mcp-local-knowledge`

### 2. Command Names

| Old Command | New Command |
|-------------|-------------|
| `mcp-codebase-search` | `mcp-local-knowledge` |
| `mcp-codebase-ingest` | `mcp-knowledge-ingest` |
| `mcp-codebase-manager` | `mcp-knowledge-manager` |

### 3. MCP Tool Names

| Old Tool | New Tool |
|----------|----------|
| `list_codebases` | `list_knowledgebases` |
| `search_codebases` | `search_knowledgebases` |
| `get_codebase_stats` | `get_knowledgebase_stats` |
| `open_codebase_manager` | `open_knowledgebase_manager` |

### 4. Tool Parameters

**Search Tool:**
- Removed: `language` parameter
- Added: `documentType` parameter (pdf, docx, pptx, xlsx, html, markdown, text, audio)
- Renamed: `codebaseName` → `knowledgebaseName`

**Stats Tool:**
- Response now includes `documentTypes` instead of `languages`
- Response includes `documentCount` instead of `fileCount`

### 5. Data Directory

**Old:** `~/.codebase-memory/`  
**New:** `~/.knowledge-base/`

**Subdirectories:**
- `~/.knowledge-base/lancedb/` - Vector database
- `~/.knowledge-base/models/` - Embedding models
- `~/.knowledge-base/temp/` - Temporary files (auto-cleaned)

### 6. Configuration File

**Old Location:** `~/.codebase-memory/config.json`  
**New Location:** `~/.knowledge-base/config.json`

**New Configuration Options:**
```json
{
  "document": {
    "conversionTimeout": 30000,
    "maxTokens": 512,
    "chunkSize": 1000,
    "chunkOverlap": 200
  },
  "ingestion": {
    "maxFileSize": 10485760
  }
}
```

### 7. Supported File Types

**Removed:**
- Code-specific file extensions (`.ts`, `.js`, `.py`, `.java`, `.cs`)
- Tree-sitter parsing
- Language detection
- Test/library file classification for code

**Added:**
- Document formats: PDF, DOCX, PPTX, XLSX, HTML, Markdown, text
- Audio transcription: MP3, WAV, M4A, FLAC
- Docling-based document conversion
- OCR support for scanned PDFs

### 8. Dependencies

**Removed:**
- `tree-sitter` and language grammar packages

**Added:**
- `docling-sdk` (npm package)
- Python 3.10+ requirement
- Python `docling` package requirement

### 9. LanceDB Schema Changes

**Table Naming:**
- Old: `codebase_{name}_{version}`
- New: `kb_{name}_{version}`

**Field Changes:**
- Removed: `language`, `startLine`, `endLine`, `isLibraryFile`
- Added: `documentType`, `pageNumber`, `headingPath`
- Renamed: `isTestFile` → `isTest`

### 10. Chunk Types

**Old (Code):** `function`, `class`, `method`, `interface`, `property`, `field`  
**New (Document):** `paragraph`, `section`, `table`, `heading`, `list`, `code`

## Migration Steps

### Step 1: Backup Your Data

Before migrating, back up your existing data:

```bash
# Backup LanceDB data
cp -r ~/.codebase-memory/lancedb ~/.codebase-memory/lancedb.backup

# Backup configuration
cp ~/.codebase-memory/config.json ~/.codebase-memory/config.json.backup

# Backup embedding models (optional, can be re-downloaded)
cp -r ~/.codebase-memory/models ~/.codebase-memory/models.backup
```

### Step 2: Uninstall Old Package

```bash
# Uninstall globally
npm uninstall -g @teknologika/mcp-codebase-search

# Or if installed locally
npm uninstall @teknologika/mcp-codebase-search
```

### Step 3: Install Python Dependencies

The new version requires Python 3.10+ and Docling:

```bash
# Verify Python version
python --version  # Should be 3.10 or higher

# Install Docling
pip install docling

# Verify installation
python -c "import docling; print('Docling installed successfully')"
```

**Troubleshooting Python Installation:**

See the [README Troubleshooting section](README.md#docling-specific-issues) for detailed Python and Docling installation help for your platform.

### Step 4: Install New Package

```bash
# Install globally (recommended)
npm install -g @teknologika/mcp-local-knowledge

# Verify installation
mcp-local-knowledge --version
mcp-knowledge-ingest --help
```

### Step 5: Update MCP Client Configuration

Update your MCP client configuration file:

**Claude Desktop:**

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**Linux:** `~/.config/Claude/claude_desktop_config.json`

**Old Configuration:**
```json
{
  "mcpServers": {
    "codebase-search": {
      "command": "mcp-codebase-search",
      "args": []
    }
  }
}
```

**New Configuration:**
```json
{
  "mcpServers": {
    "local-knowledge": {
      "command": "mcp-local-knowledge",
      "args": []
    }
  }
}
```

**Important:** Restart your MCP client (Claude Desktop, etc.) after updating the configuration.

### Step 6: Migrate Configuration File

If you have a custom configuration file:

```bash
# Copy old config to new location
cp ~/.codebase-memory/config.json ~/.knowledge-base/config.json

# Edit the new config file
nano ~/.knowledge-base/config.json
```

Update paths in the configuration:

```json
{
  "lancedb": {
    "persistPath": "~/.knowledge-base/lancedb"
  },
  "embedding": {
    "cachePath": "~/.knowledge-base/models"
  },
  "ingestion": {
    "maxFileSize": 10485760
  },
  "document": {
    "conversionTimeout": 30000,
    "maxTokens": 512,
    "chunkSize": 1000,
    "chunkOverlap": 200
  }
}
```

### Step 7: Data Migration Options

You have two options for migrating your data:

#### Option A: Fresh Start (Recommended)

Start fresh with document ingestion. This is recommended because:
- The schema has changed significantly
- Code files are no longer the focus
- You'll get better results with document-optimized chunking

```bash
# Re-ingest your documents
mcp-knowledge-ingest --path ~/Documents/my-docs --name my-docs
```

#### Option B: Manual Data Migration

If you want to preserve existing data, you'll need to manually migrate LanceDB tables:

**Warning:** This is complex and may not work well due to schema differences.

```bash
# Copy LanceDB data to new location
cp -r ~/.codebase-memory/lancedb ~/.knowledge-base/lancedb

# Rename tables (requires custom script)
# Old: codebase_my-project_1_0_0
# New: kb_my-project_1_0_0
```

**Schema Migration Script:**

You'll need to write a custom script to:
1. Read old table data
2. Transform field names (`language` → `documentType`, etc.)
3. Remove obsolete fields (`startLine`, `endLine`, `isLibraryFile`)
4. Add new fields (`pageNumber`, `headingPath`)
5. Write to new table format

**We recommend Option A (fresh start) instead.**

### Step 8: Re-index Your Content

For document-focused use cases, re-index your content:

```bash
# Index document directories
mcp-knowledge-ingest --path ~/Documents/reports --name reports
mcp-knowledge-ingest --path ~/Documents/presentations --name presentations
mcp-knowledge-ingest --path ~/Documents/research --name research

# Check the Manager UI
mcp-knowledge-manager
```

### Step 9: Update Scripts and Automation

If you have scripts or automation that use the old commands:

**Old:**
```bash
mcp-codebase-ingest --path ./src --name my-project
```

**New:**
```bash
mcp-knowledge-ingest --path ./documents --name my-docs
```

### Step 10: Verify Migration

Test the new installation:

```bash
# 1. Start the Manager UI
mcp-knowledge-manager

# 2. Verify knowledge bases are listed
# 3. Try searching in the UI
# 4. Test MCP tools in your AI assistant

# 5. Test CLI ingestion
mcp-knowledge-ingest --path ~/Documents/test --name test-kb
```

## Rollback Instructions

If you need to rollback to the old version:

### Step 1: Uninstall New Package

```bash
npm uninstall -g @teknologika/mcp-local-knowledge
```

### Step 2: Reinstall Old Package

```bash
npm install -g @teknologika/mcp-codebase-search@0.1.0
```

### Step 3: Restore Configuration

```bash
# Restore old config
cp ~/.codebase-memory/config.json.backup ~/.codebase-memory/config.json

# Restore old MCP client config
# Edit your MCP client config file and change back to:
{
  "mcpServers": {
    "codebase-search": {
      "command": "mcp-codebase-search",
      "args": []
    }
  }
}
```

### Step 4: Restore Data (if needed)

```bash
# Restore LanceDB backup
rm -rf ~/.codebase-memory/lancedb
cp -r ~/.codebase-memory/lancedb.backup ~/.codebase-memory/lancedb
```

### Step 5: Restart MCP Client

Restart your MCP client (Claude Desktop, etc.) to use the old version.

## Frequently Asked Questions

### Q: Can I use both versions simultaneously?

No. The packages conflict because they use the same MCP server name and data directories. You must choose one version.

### Q: Will my old code indexes work with the new version?

No. The schema has changed significantly. You'll need to re-index your content. However, the new version is optimized for documents, not code.

### Q: Can I still index code files?

Yes, but they'll be treated as text documents without AST-aware parsing. For code-specific use cases, consider staying on v0.x or using a dedicated code search tool.

### Q: Do I need to keep Python installed?

Yes. The new version requires Python 3.10+ and the Docling package for document conversion. This is a permanent requirement.

### Q: What if Docling installation fails?

See the comprehensive [Docling troubleshooting section](README.md#docling-specific-issues) in the README for platform-specific installation help.

### Q: Can I migrate incrementally?

No. This is an all-or-nothing migration due to the package name change and schema differences.

### Q: What happens to my embedding models?

Embedding models are compatible between versions. You can copy them from `~/.codebase-memory/models/` to `~/.knowledge-base/models/` to avoid re-downloading.

```bash
cp -r ~/.codebase-memory/models ~/.knowledge-base/models
```

### Q: How long does re-indexing take?

Document conversion is slower than code parsing due to OCR and format conversion. Expect:
- Small documents (<1MB): 1-5 seconds each
- Large documents (1-10MB): 5-30 seconds each
- Scanned PDFs: 10-60 seconds each (OCR)

### Q: Can I use the old data directory?

No. The new version uses `~/.knowledge-base/` by default. You can configure a custom path, but the schema is incompatible.

## Support

If you encounter issues during migration:

1. **Check the README**: Comprehensive troubleshooting section
2. **GitHub Issues**: [Report migration issues](https://github.com/teknologika/mcp-local-knowledge/issues)
3. **Rollback**: Use the rollback instructions above if needed

## Summary Checklist

- [ ] Backup existing data
- [ ] Uninstall old package
- [ ] Install Python 3.10+ and Docling
- [ ] Install new package
- [ ] Update MCP client configuration
- [ ] Migrate or create new configuration file
- [ ] Re-index content (recommended)
- [ ] Update scripts and automation
- [ ] Test new installation
- [ ] Verify MCP tools work in AI assistant

---

**Migration completed?** Welcome to mcp-local-knowledge! Check out the [README](README.md) for full documentation.
