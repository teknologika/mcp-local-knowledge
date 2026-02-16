# @teknologika/mcp-local-knowledge

> A local-first semantic search system for documents using the Model Context Protocol (MCP)

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D23.0.0-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Configuration](#configuration)
- [MCP Client Configuration](#mcp-client-configuration)
- [Supported Document Formats](#supported-document-formats)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Overview

The Local Knowledge MCP Server enables AI assistants to search and retrieve information from your document collections using semantic search. It supports PDFs, Word documents, presentations, spreadsheets, and more—all processed locally without cloud dependencies.

### Why Use This?

- **Find Information Fast**: AI assistants can search across all your documents semantically
- **Privacy-First**: All processing happens locally—your documents never leave your machine
- **Multi-Format Support**: PDFs, DOCX, PPTX, XLSX, HTML, Markdown, text files, and audio
- **Smart Chunking**: Structure-aware document chunking preserves context and meaning
- **Fast & Efficient**: Optimized for quick search responses with intelligent caching
- **Easy Integration**: Works seamlessly with Claude Desktop and other MCP clients

## Features

- 🔒 **Local-First**: All operations run locally without external API calls
- 🔍 **Semantic Search**: Find information by meaning, not just keywords
- 📄 **Multi-Format Support**: PDF, DOCX, PPTX, XLSX, HTML, Markdown, text, audio
- 🤖 **MCP Integration**: Seamless integration with MCP-compatible AI assistants (Claude Desktop, etc.)
- 🧠 **Smart Chunking**: Structure-aware document chunking preserves context and hierarchy
- 📝 **Docling Integration**: Powerful document conversion with OCR support for scanned PDFs
- 🖥️ **Web Management UI**: Manage knowledge bases through a browser interface
- ⚡ **Performance Optimized**: Sub-500ms search responses with intelligent caching
- 🎯 **Smart Filtering**: Filter by document type, exclude test documents
- 📊 **Detailed Statistics**: Track chunk counts, document counts, and format distribution
- 🔄 **Gitignore Support**: Respects .gitignore patterns during ingestion
- 🎤 **Audio Transcription**: Automatic transcription of audio files using Whisper ASR


## Installation

### Global Installation (Recommended)

```bash
npm install -g @teknologika/mcp-local-knowledge
```

This makes three commands available globally:
- `mcp-local-knowledge` - MCP server for AI assistants
- `mcp-knowledge-ingest` - CLI for indexing documents
- `mcp-knowledge-manager` - Web UI for management

### Local Installation

```bash
npm install @teknologika/mcp-local-knowledge
```

Then use with `npx`:
```bash
npx mcp-knowledge-ingest --path ./my-documents --name my-documents
npx mcp-local-knowledge
npx mcp-knowledge-manager
```

### Requirements

- **Node.js**: 23.0.0 or higher
- **npm**: 10.0.0 or higher
- **Python**: 3.10 or higher (for document conversion)
- **Disk Space**: ~500MB for embedding models (downloaded on first use)

### Python Dependencies

This package uses [Docling](https://github.com/DS4SD/docling) for document conversion (PDF, DOCX, PPTX, XLSX, HTML, and more). You need to install Docling separately:

```bash
pip install docling
```

**What is Docling?**

Docling is a powerful document conversion library that transforms various document formats into markdown while preserving structure, tables, and formatting. It includes OCR support for scanned PDFs and handles complex document layouts intelligently.

**Verifying Installation:**

After installing, verify Docling is available:

```bash
python -c "import docling; print('Docling installed successfully')"
```

**Learn More:**
- [Docling Documentation](https://github.com/DS4SD/docling)
- [Docling PyPI Package](https://pypi.org/project/docling/)

## Quick Start

### 1. Index Your First Knowledge Base

```bash
mcp-knowledge-ingest --path ./my-documents --name my-documents
```

**Example Output:**
```
Ingesting knowledge base: my-documents
Path: /Users/dev/documents/my-documents
Supported formats: PDF, DOCX, PPTX, XLSX, HTML, Markdown, Text, Audio

Scanning directory: [████████████████████] 100% (234/234)
Converting documents: [████████████████████] 100% (200/200)
Chunking documents: [████████████████████] 100% (200/200)
Generating embeddings: [████████████████████] 100% (1,234/1,234)
Storing chunks: [████████████████████] 100% (1,234/1,234)

✓ Ingestion completed successfully!

Statistics:
  Total files scanned: 234
  Supported files: 200
  Unsupported files: 34
  Chunks created: 1,234
  Duration: 45.2s

Document types:
  pdf: 450 chunks (50 files)
  docx: 380 chunks (40 files)
  markdown: 280 chunks (80 files)
  text: 124 chunks (30 files)
```

### 2. Configure Your MCP Client

#### For Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

### 3. Start Using in Your AI Assistant

Once configured, your AI assistant can use these tools:

- **list_knowledgebases**: See all indexed knowledge bases
- **search_knowledgebases**: Search for information semantically
- **get_knowledgebase_stats**: View detailed statistics
- **open_knowledgebase_manager**: Launch and open the Manager UI in your browser

### 4. (Optional) Explore the Manager UI

```bash
mcp-knowledge-manager
```

Opens `http://localhost:8009` in your default browser with a visual interface for:
- Searching documents with filters
- Managing indexed knowledge bases
- Viewing statistics and metadata
- Adding new knowledge bases with real-time progress


## Usage

### Ingestion CLI

The `mcp-knowledge-ingest` command indexes documents for semantic search.

#### Basic Usage

```bash
mcp-knowledge-ingest --path <directory> --name <knowledge-base-name>
```

#### Options

| Option | Description | Required | Example |
|--------|-------------|----------|---------|
| `-p, --path` | Path to document directory | Yes | `--path ./my-documents` |
| `-n, --name` | Unique name for the knowledge base | Yes | `--name my-documents` |
| `-c, --config` | Path to configuration file | No | `--config ./config.json` |
| `--no-gitignore` | Disable .gitignore filtering | No | `--no-gitignore` |

#### Examples

**Index a document folder:**
```bash
mcp-knowledge-ingest --path ~/Documents/work --name work-docs
```

**Index with custom config:**
```bash
mcp-knowledge-ingest --path ./reports --name quarterly-reports --config ./custom-config.json
```

**Index without gitignore filtering:**
```bash
mcp-knowledge-ingest --path ./my-documents --name my-documents --no-gitignore
```

**Re-index an existing knowledge base:**
```bash
# Simply run the same command again - old data is automatically replaced
mcp-knowledge-ingest --path ~/Documents/work --name work-docs
```

#### What Gets Indexed?

- ✅ All files with supported extensions (`.pdf`, `.docx`, `.pptx`, `.xlsx`, `.html`, `.md`, `.txt`, `.mp3`, `.wav`, `.m4a`, `.flac`)
- ✅ Files in nested subdirectories (recursive scanning)
- ✅ Semantic document chunks (paragraphs, sections, tables, headings)
- ✅ Metadata tags (document type, page numbers, heading hierarchy)
- ❌ Files larger than 50MB (configurable via `maxFileSize`)
- ❌ Files in `.gitignore` (by default, use `--no-gitignore` to include)
- ❌ Binary files and unsupported formats
- ❌ Hidden directories (starting with `.`)

### MCP Server

The MCP server exposes tools for AI assistants to search and explore knowledge bases.

#### Starting the Server

```bash
mcp-local-knowledge
```

The server runs in stdio mode and communicates with MCP clients via standard input/output.

#### Available Tools

##### 1. `list_knowledgebases`

Lists all indexed knowledge bases with metadata.

**Input:** None

**Output:**
```json
{
  "knowledgebases": [
    {
      "name": "my-documents",
      "path": "/path/to/documents",
      "chunkCount": 5678,
      "documentCount": 450,
      "lastIngestion": "2024-01-15T10:30:00Z",
      "documentTypes": ["pdf", "docx", "markdown", "text"]
    }
  ]
}
```

##### 2. `search_knowledgebases`

Performs semantic search across indexed knowledge bases.

**Input:**
```json
{
  "query": "project timeline and milestones",
  "knowledgebaseName": "my-documents",  // Optional
  "documentType": "pdf",                 // Optional
  "maxResults": 25                       // Optional (default: 50)
}
```

**Output:**
```json
{
  "results": [
    {
      "filePath": "reports/Q4-2024-Report.pdf",
      "content": "Project Timeline: The Q4 milestones include...",
      "documentType": "pdf",
      "chunkType": "section",
      "pageNumber": 5,
      "headingPath": ["Executive Summary", "Project Timeline"],
      "similarityScore": 0.92,
      "knowledgebaseName": "my-documents"
    }
  ],
  "totalResults": 1,
  "queryTime": 45
}
```

##### 3. `get_knowledgebase_stats`

Retrieves detailed statistics for a specific knowledge base.

**Input:**
```json
{
  "name": "my-documents"
}
```

**Output:**
```json
{
  "name": "my-documents",
  "path": "/path/to/documents",
  "chunkCount": 5678,
  "documentCount": 450,
  "lastIngestion": "2024-01-15T10:30:00Z",
  "documentTypes": [
    { "type": "pdf", "documentCount": 200, "chunkCount": 3200 },
    { "type": "docx", "documentCount": 150, "chunkCount": 1500 },
    { "type": "markdown", "documentCount": 100, "chunkCount": 978 }
  ],
  "chunkTypes": [
    { "type": "paragraph", "count": 2500 },
    { "type": "section", "count": 1200 },
    { "type": "table", "count": 978 }
  ],
  "sizeBytes": 2500000
}
```

##### 4. `open_knowledgebase_manager`

Opens the web-based Manager UI in the default browser. Automatically launches the server if it's not already running.

**Input:** None

**Output:**
```json
{
  "success": true,
  "url": "http://localhost:8009",
  "serverStarted": true,
  "message": "Manager UI opened in browser. Server was started."
}
```

**Note:** The tool checks if the Manager server is running on the configured port. If not, it launches the server in the background before opening the browser.

### Manager UI

The Manager UI provides a web-based interface for managing indexed knowledge bases.

#### Starting the Manager

```bash
mcp-knowledge-manager
```

This will:
1. Start a Fastify server on port 8009 (configurable)
2. Automatically open `http://localhost:8009` in your default browser
3. Display all indexed knowledge bases with statistics

#### Features

**Search Tab:**
- Semantic search across all knowledge bases
- Filter by knowledge base and max results
- Filter by document type (PDF, DOCX, etc.)
- Exclude test documents checkbox
- Collapsible results with color-coded confidence scores:
  - 🟢 Green (0.80-1.00): Excellent match
  - 🟡 Yellow (0.60-0.79): Good match
  - 🔵 Blue (0.00-0.59): Lower match

**Manage Knowledge Bases Tab:**
- View all indexed knowledge bases
- See chunk counts, document counts, and last indexed date
- Add new knowledge bases with real-time progress tracking
- Rename knowledge bases
- Remove knowledge bases
- Gitignore filtering checkbox (checked by default)

**Ingest Tab:**
- Drag-and-drop file upload
- Folder selection and upload
- Real-time progress tracking for each file
- Support for all document formats

**Manager Controls:**
- Quit Manager button with confirmation dialog (stops server and closes browser tab)


## Configuration

The system can be configured using a JSON configuration file. The default location is `~/.knowledge-base/config.json`.

### Automatic Setup

On first run, the system automatically:
- Creates the `~/.knowledge-base/` directory structure
- Generates a default `config.json` file with sensible defaults
- Creates subdirectories for:
  - `lancedb/` - Vector database storage
  - `models/` - Embedding model cache
  - `tmp/` - Temporary file uploads

No manual setup is required - just run any command and the system will initialize itself.

### Configuration File Example

```json
{
  "lancedb": {
    "persistPath": "~/.knowledge-base/lancedb"
  },
  "embedding": {
    "modelName": "Xenova/all-MiniLM-L6-v2",
    "cachePath": "~/.knowledge-base/models"
  },
  "server": {
    "port": 8009,
    "host": "localhost",
    "sessionSecret": "change-me-in-production"
  },
  "mcp": {
    "transport": "stdio"
  },
  "ingestion": {
    "batchSize": 100,
    "maxFileSize": 52428800
  },
  "search": {
    "defaultMaxResults": 50,
    "cacheTimeoutSeconds": 60
  },
  "document": {
    "conversionTimeout": 30000,
    "maxTokens": 512,
    "chunkSize": 1000,
    "chunkOverlap": 200
  },
  "logging": {
    "level": "info"
  },
  "schemaVersion": "1.0.0"
}
```

### Configuration Options

#### LanceDB Settings

| Option | Description | Default |
|--------|-------------|---------|
| `persistPath` | Directory for LanceDB storage | `~/.knowledge-base/lancedb` |

#### Embedding Settings

| Option | Description | Default |
|--------|-------------|---------|
| `modelName` | Hugging Face model for embeddings | `Xenova/all-MiniLM-L6-v2` |
| `cachePath` | Directory for model cache | `~/.knowledge-base/models` |

#### Server Settings

| Option | Description | Default |
|--------|-------------|---------|
| `port` | Port for Manager UI server | `8009` |
| `host` | Host for Manager UI server | `localhost` |
| `sessionSecret` | Secret for session cookies | Auto-generated |

#### Ingestion Settings

| Option | Description | Default |
|--------|-------------|---------|
| `batchSize` | Documents per batch during ingestion | `100` |
| `maxFileSize` | Maximum file size in bytes | `52428800` (50MB) |

#### Document Settings

| Option | Description | Default |
|--------|-------------|---------|
| `conversionTimeout` | Document conversion timeout (ms) | `30000` (30s) |
| `maxTokens` | Maximum tokens per chunk | `512` |
| `chunkSize` | Fallback chunk size (characters) | `1000` |
| `chunkOverlap` | Fallback chunk overlap (characters) | `200` |

#### Search Settings

| Option | Description | Default |
|--------|-------------|---------|
| `defaultMaxResults` | Default maximum search results | `50` |
| `cacheTimeoutSeconds` | Search result cache timeout | `60` |

#### Logging Settings

| Option | Description | Default | Options |
|--------|-------------|---------|---------|
| `level` | Log level | `info` | `debug`, `info`, `warn`, `error` |

### Custom Configuration

To use a custom configuration file:

```bash
# For ingestion
mcp-knowledge-ingest --config ./my-config.json --path ./documents --name my-docs

# For MCP server (via environment variable)
CONFIG_PATH=./my-config.json mcp-local-knowledge
```

## MCP Client Configuration

### Claude Desktop

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Linux:** `~/.config/Claude/claude_desktop_config.json`

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

### Using Codex MCP CLI

If you have [Codex](https://github.com/wong2/codex) installed, you can add the server with a single command:

```bash
codex mcp add local-knowledge \
  --env CONFIG_PATH=~/.knowledge-base/config.json \
  --env LOG_LEVEL=info \
  -- mcp-local-knowledge
```

This automatically configures the MCP server in your client without manual JSON editing.

### Other MCP Clients

For other MCP-compatible clients, use the stdio transport:

```json
{
  "mcpServers": {
    "local-knowledge": {
      "command": "mcp-local-knowledge",
      "args": [],
      "env": {
        "CONFIG_PATH": "~/.knowledge-base/config.json",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Verifying Configuration

After configuring your MCP client:

1. Restart the client application
2. Check that the `local-knowledge` server appears in the MCP server list
3. Try using the `list_knowledgebases` tool to verify connectivity

## Supported Document Formats

The system uses [Docling](https://github.com/DS4SD/docling) for document conversion and processing. All documents are converted to markdown with structure preservation.

| Format | Extensions | Features |
|--------|-----------|----------|
| **PDF** | `.pdf` | OCR support for scanned documents, table extraction, image detection |
| **Word** | `.docx`, `.doc` | Formatting preservation, table extraction, heading hierarchy |
| **PowerPoint** | `.pptx`, `.ppt` | Slide content extraction, speaker notes, embedded text |
| **Excel** | `.xlsx`, `.xls` | Table data extraction, sheet names, cell formatting |
| **HTML** | `.html`, `.htm` | Structure preservation, semantic elements, link extraction |
| **Markdown** | `.md`, `.markdown` | Native processing, heading hierarchy, code blocks |
| **Text** | `.txt` | Plain text processing, paragraph detection |
| **Audio** | `.mp3`, `.wav`, `.m4a`, `.flac` | Automatic transcription using Whisper ASR |

### What Gets Extracted?

For each document, the system extracts:

- **Content**: Full text content converted to markdown
- **Structure**: Headings, sections, paragraphs, lists
- **Tables**: Tabular data with formatting
- **Metadata**: Title, page count, word count, format, images, tables
- **Context**: Heading hierarchy for each chunk
- **Page Numbers**: For paginated documents (PDF, DOCX, PPTX)

### Document Chunking

Documents are split into semantic chunks using Docling's HybridChunker:

- **Structure-Aware**: Respects document hierarchy (headings, sections)
- **Token-Aware**: Configurable max tokens per chunk (default: 512)
- **Context-Preserved**: Includes heading path for each chunk
- **Type-Tagged**: Each chunk labeled as paragraph, section, table, heading, list, or code

### File Classification

The system automatically classifies files during ingestion:

**Test Documents** (tagged with `isTest: true`):
- Files with "test" or "spec" in the path
- Files in `test/`, `tests/`, `spec/` directories

These tags enable filtering in search results.


## Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────┐
│                     Entry Points                           │
├──────────────┬──────────────────┬──────────────────────────┤
│  MCP Server  │  Ingestion CLI   │     Manager UI           │
│  (stdio)     │  (command-line)  │  (web interface)         │
└──────┬───────┴────────┬─────────┴──────────┬───────────────┘
       │                │                    │
       │                │                    │
┌──────▼────────────────▼────────────────────▼───────────────┐
│                   Core Services                            │
├─────────────┬──────────────┬──────────────┬────────────────┤
│ Knowledge   │    Search    │  Ingestion   │   Embedding    │
│   Base      │   Service    │   Service    │    Service     │
│  Service    │              │              │                │
└──────┬──────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │             │              │                │
       │             │              │                │
┌──────▼─────────────▼──────────────▼────────────────▼───────┐
│                   Storage & External                       │
├──────────────┬──────────────────┬─────────────────────────┤
│   LanceDB    │  Docling SDK     │  Hugging Face           │
│ (Vector DB)  │  (Doc Convert)   │  (Embeddings)           │
└──────────────┴──────────────────┴─────────────────────────┘
```

### Component Responsibilities

**MCP Server** (`mcp-local-knowledge`)
- Exposes tools via Model Context Protocol
- Validates inputs and outputs
- Handles stdio communication

**Ingestion CLI** (`mcp-knowledge-ingest`)
- Scans directories recursively
- Respects .gitignore patterns
- Converts documents with Docling
- Chunks documents with HybridChunker
- Classifies test documents
- Generates embeddings
- Stores chunks in LanceDB

**Manager UI** (`mcp-knowledge-manager`)
- Fastify web server with SSR
- Real-time ingestion progress via SSE
- Search interface with filters
- Knowledge base management
- File upload with drag-and-drop

**Core Services**
- **Knowledge Base Service**: CRUD operations for knowledge bases
- **Search Service**: Semantic search with filtering and caching
- **Ingestion Service**: Orchestrates document processing pipeline
- **Embedding Service**: Generates vector embeddings locally
- **Document Converter**: Converts documents to markdown via Docling
- **Document Chunker**: Splits documents into semantic chunks

### Data Flow

#### Ingestion Flow

```
Documents → File Scanner → Document Converter (Docling) → Markdown
                                                              ↓
                                                    Document Chunker
                                                              ↓
LanceDB ← Embeddings ← Embedding Service ← Tagged Chunks
```

#### Search Flow

```
Query → Embedding Service → Vector
                              ↓
                         LanceDB Search
                              ↓
                         Apply Filters (document type, tests)
                              ↓
                         Ranked Results → Format → Response
```

### Storage Schema

**LanceDB Tables:**
- Table naming: `kb_{name}_{schemaVersion}`
- Example: `kb_my-documents_1_0_0`

**Row Structure:**
```json
{
  "id": "my-documents_2024-01-15T10:30:00Z_0",
  "vector": [0.1, 0.2, ...],
  "content": "Project Timeline: The Q4 milestones include...",
  "filePath": "reports/Q4-2024-Report.pdf",
  "documentType": "pdf",
  "chunkType": "section",
  "chunkIndex": 5,
  "pageNumber": 5,
  "headingPath": ["Executive Summary", "Project Timeline"],
  "isTest": false,
  "ingestionTimestamp": "2024-01-15T10:30:00Z",
  "_knowledgebaseName": "my-documents",
  "_path": "/path/to/documents",
  "_lastIngestion": "2024-01-15T10:30:00Z"
}
```

## Troubleshooting

### Common Issues

#### 1. "Command not found: mcp-local-knowledge"

**Problem:** The package is not installed globally or not in PATH.

**Solution:**
```bash
# Reinstall globally
npm install -g @teknologika/mcp-local-knowledge

# Or use npx
npx mcp-local-knowledge
```

#### 2. "Failed to initialize LanceDB"

**Problem:** LanceDB persistence directory is not writable or corrupted.

**Solution:**
```bash
# Check permissions
ls -la ~/.knowledge-base/lancedb

# Reset LanceDB (WARNING: deletes all data)
rm -rf ~/.knowledge-base/lancedb

# Re-ingest knowledge bases
mcp-knowledge-ingest --path ./my-documents --name my-documents
```

#### 3. "Embedding model download failed"

**Problem:** Network issues or insufficient disk space.

**Solution:**
```bash
# Check disk space
df -h ~/.knowledge-base

# Clear model cache and retry
rm -rf ~/.knowledge-base/models

# Run ingestion again (will re-download)
mcp-knowledge-ingest --path ./my-documents --name my-documents
```

#### 4. "Search returns no results"

**Problem:** Knowledge base not indexed or query too specific.

**Solution:**
```bash
# Verify knowledge base is indexed
mcp-knowledge-manager
# Check the UI for your knowledge base

# Try broader queries
# Instead of: "Q4 2024 financial projections table"
# Try: "financial projections" or "quarterly report"
```

#### 5. "Manager UI won't open"

**Problem:** Port 8009 is already in use.

**Solution:**
```bash
# Check what's using port 8009
lsof -i :8009

# Kill the process or use a different port
# Edit ~/.knowledge-base/config.json
{
  "server": {
    "port": 8009
  }
}
```

#### 6. "MCP client can't connect to server"

**Problem:** Configuration issue or server not starting.

**Solution:**
```bash
# Test server manually
mcp-local-knowledge

# Verify configuration path
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Check logs for errors
```

#### 7. "Knowledge base not found" after ingestion

**Problem:** Knowledge base name contains special characters that were sanitized.

**Explanation:** Knowledge base names are sanitized to ensure compatibility with the database. Special characters (spaces, hyphens, etc.) are replaced with underscores.

**Examples:**
- `Cloud Forge PRFAQ` → `Cloud_Forge_PRFAQ`
- `my-project-docs` → `my_project_docs`
- `Q1 2024 Reports` → `Q1_2024_Reports`

**Solution:**
```bash
# Check what name was actually created
mcp-knowledge-manager
# Or use the debug script
node scripts/debug-kb.js

# Use the sanitized name when searching
# If you ingested with: --name "Cloud Forge PRFAQ"
# Use in MCP: Cloud_Forge_PRFAQ
```

**Note:** The CLI now displays the sanitized name during ingestion if it differs from your input.

### Docling-Specific Issues

#### 8. "Docling not found" or "docling-sdk is not installed"

**Problem:** Python Docling is not installed or not in PATH.

**Solution:**
```bash
# Verify Python is installed (3.10+ required)
python --version

# Install Docling
pip install docling

# Verify installation
python -c "import docling; print('Docling installed successfully')"

# If using a virtual environment, activate it first
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows
pip install docling
```

**Alternative Solution (if pip fails):**
```bash
# Try with pip3
pip3 install docling

# Or use python -m pip
python -m pip install docling

# For user-level install (no sudo required)
pip install --user docling
```

#### 8. Python Version Issues

**Problem:** Docling requires Python 3.10 or higher, but an older version is installed.

**Solution:**

**macOS (using Homebrew):**
```bash
# Install Python 3.11
brew install python@3.11

# Verify version
python3.11 --version

# Install Docling with specific Python version
python3.11 -m pip install docling
```

**Ubuntu/Debian:**
```bash
# Add deadsnakes PPA for newer Python versions
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update

# Install Python 3.11
sudo apt install python3.11 python3.11-pip

# Install Docling
python3.11 -m pip install docling
```

**Windows:**
```powershell
# Download Python 3.11+ from python.org
# https://www.python.org/downloads/

# After installation, verify
python --version

# Install Docling
pip install docling
```

**Using pyenv (all platforms):**
```bash
# Install pyenv (see https://github.com/pyenv/pyenv)
curl https://pyenv.run | bash

# Install Python 3.11
pyenv install 3.11.7
pyenv global 3.11.7

# Verify
python --version

# Install Docling
pip install docling
```

#### 9. Docling Installation Fails on macOS

**Problem:** Installation fails with compiler errors or missing dependencies.

**Solution:**
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install required system dependencies via Homebrew
brew install cmake pkg-config

# Try installing Docling again
pip install docling

# If still failing, try with verbose output to see the error
pip install -v docling
```

**Common macOS-specific issues:**
```bash
# If you see "error: command 'clang' failed"
# Install or update Xcode Command Line Tools
sudo rm -rf /Library/Developer/CommandLineTools
xcode-select --install

# If you see "fatal error: 'Python.h' file not found"
# Install Python development headers
brew reinstall python@3.11
```

#### 10. Docling Installation Fails on Linux

**Problem:** Missing system dependencies or compiler errors.

**Solution:**

**Ubuntu/Debian:**
```bash
# Install build essentials and Python development headers
sudo apt update
sudo apt install build-essential python3-dev python3-pip

# Install additional dependencies
sudo apt install libpoppler-cpp-dev pkg-config

# Try installing Docling again
pip install docling
```

**Fedora/RHEL/CentOS:**
```bash
# Install development tools
sudo dnf groupinstall "Development Tools"
sudo dnf install python3-devel

# Install additional dependencies
sudo dnf install poppler-cpp-devel

# Try installing Docling again
pip install docling
```

**Arch Linux:**
```bash
# Install base development packages
sudo pacman -S base-devel python-pip

# Install additional dependencies
sudo pacman -S poppler

# Try installing Docling again
pip install docling
```

#### 11. Docling Installation Fails on Windows

**Problem:** Missing Visual C++ build tools or compilation errors.

**Solution:**
```powershell
# Install Microsoft C++ Build Tools
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
# During installation, select "Desktop development with C++"

# After installation, restart your terminal and try again
pip install docling

# Alternative: Use pre-built wheels if available
pip install --only-binary :all: docling
```

**If using Windows Subsystem for Linux (WSL):**
```bash
# Follow the Linux instructions above
# WSL provides a better environment for Python packages with native dependencies
```

#### 12. Document Conversion Fails

**Problem:** Docling fails to convert a specific document.

**Solution:**
```bash
# Check if the document is corrupted
# Try opening it in its native application first

# Check file permissions
ls -l /path/to/document.pdf

# Try converting manually to see the error
python -c "from docling.document_converter import DocumentConverter; \
           converter = DocumentConverter(); \
           result = converter.convert('/path/to/document.pdf'); \
           print(result)"

# Check Docling logs for detailed error messages
# Logs are typically in the system temp directory
```

**Common conversion issues:**

**Encrypted PDFs:**
```bash
# Docling cannot process password-protected PDFs
# Remove password protection first using tools like:
# - qpdf: qpdf --decrypt input.pdf output.pdf
# - pdftk: pdftk input.pdf output output.pdf
```

**Scanned PDFs (images):**
```bash
# Docling uses OCR for scanned PDFs
# Ensure tesseract is installed for better OCR results
brew install tesseract       # macOS
sudo apt install tesseract-ocr  # Ubuntu/Debian
```

**Corrupted documents:**
```bash
# Try repairing the document first
# For PDFs: use tools like pdftk or ghostscript
gs -o repaired.pdf -sDEVICE=pdfwrite -dPDFSETTINGS=/prepress input.pdf
```

#### 13. Document Conversion Timeout

**Problem:** Large documents take too long to convert and timeout after 30 seconds.

**Solution:**

**Increase timeout in configuration:**
```json
{
  "document": {
    "conversionTimeout": 60000
  }
}
```

**Or split large documents:**
```bash
# For PDFs, split into smaller chunks
# Using pdftk
pdftk large.pdf burst output page_%04d.pdf

# Using ghostscript
gs -sDEVICE=pdfwrite -dNOPAUSE -dBATCH -dSAFER \
   -dFirstPage=1 -dLastPage=50 \
   -sOutputFile=part1.pdf large.pdf
```

**Optimize document before conversion:**
```bash
# Compress PDF to reduce size
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
   -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH \
   -sOutputFile=compressed.pdf input.pdf
```

#### 14. Performance Issues with Large Documents

**Problem:** Document processing is very slow or uses excessive memory.

**Solution:**

**Adjust batch size for ingestion:**
```json
{
  "ingestion": {
    "batchSize": 50
  }
}
```

**Increase Node.js memory limit:**
```bash
# Set max memory to 4GB
export NODE_OPTIONS="--max-old-space-size=4096"

# Then run ingestion
mcp-knowledge-ingest --path ./docs --name my-docs
```

**Process documents in smaller batches:**
```bash
# Instead of ingesting entire directory at once
# Process subdirectories separately
mcp-knowledge-ingest --path ./docs/section1 --name my-docs
mcp-knowledge-ingest --path ./docs/section2 --name my-docs
```

**Optimize document files:**
```bash
# Reduce PDF file sizes
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
   -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH \
   -sOutputFile=optimized.pdf input.pdf

# Convert DOCX to PDF for better processing
# Use LibreOffice in headless mode
libreoffice --headless --convert-to pdf document.docx
```

**Monitor resource usage:**
```bash
# Check memory usage during ingestion
# macOS
top -pid $(pgrep -f mcp-knowledge-ingest)

# Linux
htop -p $(pgrep -f mcp-knowledge-ingest)

# Windows
# Use Task Manager or Resource Monitor
```

#### 15. Audio Transcription Issues

**Problem:** Audio files fail to transcribe or produce poor results.

**Solution:**

**Ensure audio format is supported:**
```bash
# Supported formats: MP3, WAV, M4A, FLAC
# Convert unsupported formats using ffmpeg
ffmpeg -i input.ogg -acodec libmp3lame output.mp3
```

**Improve transcription quality:**
```bash
# Convert to WAV with optimal settings for speech recognition
ffmpeg -i input.mp3 -ar 16000 -ac 1 -c:a pcm_s16le output.wav

# Reduce background noise (requires sox)
sox input.wav output.wav noisered noise-profile.txt 0.21
```

**Check Whisper model installation:**
```bash
# Docling uses Whisper for audio transcription
# Verify it's installed
python -c "import whisper; print('Whisper available')"

# If not installed
pip install openai-whisper
```

#### 16. Docling CLI Not Found in PATH

**Problem:** System can't find the Docling CLI executable.

**Solution:**
```bash
# Find where pip installed Docling
pip show docling | grep Location

# Add Python scripts directory to PATH
# macOS/Linux (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.local/bin:$PATH"

# Windows (add to System Environment Variables)
# Add: C:\Users\YourUsername\AppData\Local\Programs\Python\Python311\Scripts

# Verify Docling is accessible
which docling  # macOS/Linux
where docling  # Windows
```

**Alternative: Use Python module directly:**
```bash
# Instead of calling 'docling' command
# Use Python module invocation
python -m docling.cli convert document.pdf
```

### Performance Tips

1. **Increase batch size** for faster ingestion (if you have sufficient RAM):
   ```json
   {
     "ingestion": {
       "batchSize": 200
     }
   }
   ```

2. **Adjust cache timeout** for frequently repeated queries:
   ```json
   {
     "search": {
       "cacheTimeoutSeconds": 120
     }
   }
   ```

3. **Use SSD storage** for LanceDB persistence directory

4. **Exclude unnecessary files** using .gitignore patterns


## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/teknologika/mcp-codebase-search.git
cd mcp-codebase-search

# Install dependencies
npm install

# Build the project
npm run build
```

### Scripts

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Security audit
npm run security

# Clean build artifacts
npm run clean

# Type check without building
npm run typecheck
```

### Project Structure

```
src/
├── bin/                    # Entry points (mcp-server, ingest, manager)
├── domains/                # Domain-specific business logic
│   ├── knowledgebase/     # Knowledge base CRUD operations
│   ├── search/            # Semantic search functionality
│   ├── ingestion/         # File scanning and indexing
│   ├── embedding/         # Embedding generation
│   └── document/          # Document conversion and chunking
├── infrastructure/         # External integrations
│   ├── lancedb/           # LanceDB client wrapper
│   ├── mcp/               # MCP server implementation
│   └── fastify/           # Fastify server and routes
├── shared/                 # Shared utilities
│   ├── config/            # Configuration management
│   ├── logging/           # Structured logging with Pino
│   ├── types/             # Shared TypeScript types
│   └── utils/             # Utility functions
└── ui/                     # Web interface
    └── manager/           # Single-page management UI
```

### Testing

The project uses **Vitest** for testing with both unit tests and property-based tests.

**Test Coverage Requirements:**
- Minimum 80% statement coverage
- Minimum 80% branch coverage
- 90%+ coverage for critical paths

**Run specific tests:**
```bash
# Test a specific file
npm test -- src/domains/search/search.service.test.ts

# Test with coverage
npm run test:coverage

# Watch mode for TDD
npm run test:watch
```

### Building and Packaging

```bash
# Clean and build
npm run clean && npm run build

# Create npm package
npm pack

# Install package globally for testing
npm install -g ./teknologika-mcp-local-knowledge-1.0.0.tgz

# Test commands
mcp-local-knowledge --version
mcp-knowledge-ingest --help
mcp-knowledge-manager
```

## Contributing

We welcome contributions! Here's how you can help:

### Reporting Issues

1. **Search existing issues** to avoid duplicates
2. **Provide details**:
   - Node.js version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages and logs

### Submitting Pull Requests

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make your changes**:
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation
4. **Run tests**: `npm test`
5. **Run linter**: `npm run lint`
6. **Commit with clear messages**: `git commit -m "feat: add new feature"`
7. **Push to your fork**: `git push origin feature/my-feature`
8. **Open a pull request**

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Follow existing patterns
- **Naming**: Use descriptive names (camelCase for variables, PascalCase for classes)
- **Comments**: Document complex logic and public APIs
- **Tests**: Write both unit tests and property-based tests

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Build/tooling changes

### Areas for Contribution

- 📄 **Document format support**: Add more format handlers
- ⚡ **Performance**: Optimize search and ingestion
- 🎨 **UI improvements**: Enhance the Manager UI
- 📚 **Documentation**: Improve guides and examples
- 🧪 **Testing**: Increase test coverage
- 🐛 **Bug fixes**: Fix reported issues
- 🔍 **Search improvements**: Better ranking algorithms
- 🏷️ **Document classification**: More patterns for test document detection
- 🎤 **Audio processing**: Improve transcription quality
- 📊 **Analytics**: Add usage statistics and insights

## Security

### Local-First Architecture

- ✅ **No external API calls**: All processing happens locally
- ✅ **No telemetry**: No usage data is collected or transmitted
- ✅ **No cloud dependencies**: Embeddings generated locally with Hugging Face Transformers

### File System Security

- **Path validation**: All file paths are validated to prevent directory traversal
- **Permission checks**: Respects file system permissions
- **Gitignore support**: Automatically skips files in `.gitignore`

### Input Validation

- **Schema validation**: All inputs validated with Zod schemas
- **Type checking**: Strict TypeScript types throughout
- **Sanitization**: User inputs sanitized before processing

### Resource Limits

- **Max file size**: 50MB default (configurable)
- **Max results**: 200 maximum per search
- **Batch size limits**: Prevents memory exhaustion

### Network Security

- **Localhost only**: Manager UI binds to localhost by default
- **Security headers**: Helmet.js for HTTP security headers
- **Session management**: Secure session cookies

### Recommendations

1. **Do not expose Manager UI to public networks**
2. **Keep the package updated** for security patches
3. **Run regular security audits**: `npm audit`
4. **Use strong file system permissions**
5. **Back up data regularly** before major updates

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

**Teknologika**

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [LanceDB](https://lancedb.com/) - Vector database
- [Docling](https://github.com/DS4SD/docling) - Document conversion
- [Hugging Face](https://huggingface.co/) - Embedding models
- [Fastify](https://www.fastify.io/) - Web framework

---

**Questions or Issues?** Open an issue on [GitHub](https://github.com/teknologika/mcp-local-knowledge/issues)

**Need Help?** Check the [Troubleshooting](#troubleshooting) section above
