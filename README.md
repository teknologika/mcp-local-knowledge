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
- 🧠 **Smart Chunking**: Structure-aware chunking preserves document hierarchy
- 🖥️ **Web Management UI**: Manage knowledge bases through a web interface
- ⚡ **Performance Optimized**: Sub-500ms search responses with intelligent caching
- 🎯 **Smart Filtering**: Filter by document type, exclude test files
- 📊 **Detailed Statistics**: Track chunk counts, file counts, and document type distribution
- 🔄 **Gitignore Support**: Respects .gitignore patterns during ingestion


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
Processing documents: [████████████████████] 100% (200/200)
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

Opens `http://localhost:8008` in your default browser with a visual interface for:
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
- ❌ Files larger than 10MB (configurable via `maxFileSize`)
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

Lists all indexed codebases with metadata.

**Input:** None

**Output:**
```json
{
  "codebases": [
    {
      "name": "my-project",
      "path": "/path/to/project",
      "chunkCount": 5678,
      "fileCount": 1100,
      "lastIngestion": "2024-01-15T10:30:00Z",
      "languages": ["typescript", "python", "java"]
    }
  ]
}
```

##### 2. `search_codebases`

Performs semantic search across indexed codebases.

**Input:**
```json
{
  "query": "authentication function",
  "codebaseName": "my-project",  // Optional
  "language": "typescript",       // Optional
  "maxResults": 25                // Optional (default: 50)
}
```

**Output:**
```json
{
  "results": [
    {
      "filePath": "src/auth/authenticate.ts",
      "startLine": 15,
      "endLine": 45,
      "language": "typescript",
      "chunkType": "function",
      "content": "export async function authenticate(credentials: Credentials) { ... }",
      "similarityScore": 0.92,
      "codebaseName": "my-project"
    }
  ],
  "totalResults": 1,
  "queryTime": 45
}
```

##### 3. `get_codebase_stats`

Retrieves detailed statistics for a specific codebase.

**Input:**
```json
{
  "name": "my-project"
}
```

**Output:**
```json
{
  "name": "my-project",
  "path": "/path/to/project",
  "chunkCount": 5678,
  "fileCount": 1100,
  "lastIngestion": "2024-01-15T10:30:00Z",
  "languages": [
    { "language": "typescript", "fileCount": 800, "chunkCount": 3200 },
    { "language": "python", "fileCount": 200, "chunkCount": 1500 }
  ],
  "chunkTypes": [
    { "type": "function", "count": 2500 },
    { "type": "class", "count": 1200 },
    { "type": "method", "count": 1978 }
  ],
  "sizeBytes": 2500000
}
```

##### 4. `open_codebase_manager`

Opens the web-based Manager UI in the default browser. Automatically launches the server if it's not already running.

**Input:** None

**Output:**
```json
{
  "success": true,
  "url": "http://localhost:8008",
  "serverStarted": true,
  "message": "Manager UI opened in browser. Server was started."
}
```

**Note:** The tool checks if the Manager server is running on the configured port. If not, it launches the server in the background before opening the browser.

### Manager UI

The Manager UI provides a web-based interface for managing indexed codebases.

#### Starting the Manager

```bash
mcp-codebase-manager
```

This will:
1. Start a Fastify server on port 8008 (configurable)
2. Automatically open `http://localhost:8008` in your default browser
3. Display all indexed codebases with statistics

#### Features

**Search Tab:**
- Semantic search across all codebases
- Filter by codebase and max results
- Exclude test files checkbox
- Exclude library files checkbox
- Collapsible results with color-coded confidence scores:
  - 🟢 Green (0.80-1.00): Excellent match
  - 🟡 Yellow (0.60-0.79): Good match
  - 🔵 Blue (0.00-0.59): Lower match

**Manage Codebases Tab:**
- View all indexed codebases
- See chunk counts, file counts, and last indexed date
- Add new codebases with real-time progress tracking
- Rename codebases
- Remove codebases
- Gitignore filtering checkbox (checked by default)

**Manager Controls:**
- Quit Manager button with confirmation dialog (stops server and closes browser tab)


## Configuration

The system can be configured using a JSON configuration file. The default location is `~/.codebase-memory/config.json`.

### Configuration File Example

```json
{
  "lancedb": {
    "persistPath": "~/.codebase-memory/lancedb"
  },
  "embedding": {
    "modelName": "Xenova/all-MiniLM-L6-v2",
    "cachePath": "~/.codebase-memory/models"
  },
  "server": {
    "port": 8008,
    "host": "localhost",
    "sessionSecret": "change-me-in-production"
  },
  "mcp": {
    "transport": "stdio"
  },
  "ingestion": {
    "batchSize": 100,
    "maxFileSize": 1048576
  },
  "search": {
    "defaultMaxResults": 50,
    "cacheTimeoutSeconds": 60
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
| `persistPath` | Directory for LanceDB storage | `~/.codebase-memory/lancedb` |

#### Embedding Settings

| Option | Description | Default |
|--------|-------------|---------|
| `modelName` | Hugging Face model for embeddings | `Xenova/all-MiniLM-L6-v2` |
| `cachePath` | Directory for model cache | `~/.codebase-memory/models` |

#### Server Settings

| Option | Description | Default |
|--------|-------------|---------|
| `port` | Port for Manager UI server | `8008` |
| `host` | Host for Manager UI server | `localhost` |
| `sessionSecret` | Secret for session cookies | Auto-generated |

#### Ingestion Settings

| Option | Description | Default |
|--------|-------------|---------|
| `batchSize` | Chunks per batch during ingestion | `100` |
| `maxFileSize` | Maximum file size in bytes | `1048576` (1MB) |

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
mcp-codebase-ingest --config ./my-config.json --path ./code --name my-code

# For MCP server (via environment variable)
CONFIG_PATH=./my-config.json mcp-codebase-search
```

## MCP Client Configuration

### Claude Desktop

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Linux:** `~/.config/Claude/claude_desktop_config.json`

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

### Other MCP Clients

For other MCP-compatible clients, use the stdio transport:

```json
{
  "mcpServers": {
    "codebase-search": {
      "command": "mcp-codebase-search",
      "args": [],
      "env": {
        "CONFIG_PATH": "~/.codebase-memory/config.json",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Verifying Configuration

After configuring your MCP client:

1. Restart the client application
2. Check that the `codebase-search` server appears in the MCP server list
3. Try using the `list_codebases` tool to verify connectivity

## Supported Languages

The system uses Tree-sitter for AST-aware code parsing. Currently supported languages:

| Language | Extensions | Chunk Types |
|----------|-----------|-------------|
| **C#** | `.cs` | class, method, property, interface |
| **Java** | `.java` | class, method, field, interface |
| **JavaScript** | `.js`, `.jsx` | function, class, method |
| **TypeScript** | `.ts`, `.tsx` | function, class, method, interface |
| **Python** | `.py` | function, class, method |

### What Gets Extracted?

For each supported language, the system extracts:

- **Functions**: Top-level and nested functions
- **Classes**: Class declarations with their context
- **Methods**: Class methods and instance methods
- **Interfaces**: Interface definitions (TypeScript, C#, Java)
- **Properties**: Class properties (C#)
- **Fields**: Class fields (Java)

### File Classification

The system automatically classifies files during ingestion:

**Test Files** (tagged with `isTestFile: true`):
- Files ending in `.test.ts`, `.spec.ts`, `_test.py`, etc.
- Files in `__tests__/`, `test/`, `tests/`, `spec/` directories

**Library Files** (tagged with `isLibraryFile: true`):
- Files in `node_modules/`, `vendor/`, `dist/`, `build/`, `venv/`, etc.

These tags enable filtering in search results.


## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Entry Points                             │
├──────────────┬──────────────────┬──────────────────────────┤
│  MCP Server  │  Ingestion CLI   │     Manager UI           │
│  (stdio)     │  (command-line)  │  (web interface)         │
└──────┬───────┴────────┬─────────┴──────────┬───────────────┘
       │                │                    │
       │                │                    │
┌──────▼────────────────▼────────────────────▼───────────────┐
│                   Core Services                             │
├─────────────┬──────────────┬──────────────┬────────────────┤
│  Codebase   │    Search    │  Ingestion   │   Embedding    │
│  Service    │   Service    │   Service    │    Service     │
└──────┬──────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │             │              │                │
       │             │              │                │
┌──────▼─────────────▼──────────────▼────────────────▼───────┐
│                   Storage & External                        │
├──────────────┬──────────────────┬─────────────────────────┤
│   LanceDB    │  Tree-sitter     │  Hugging Face           │
│ (Vector DB)  │  (Code Parsing)  │  (Embeddings)           │
└──────────────┴──────────────────┴─────────────────────────┘
```

### Component Responsibilities

**MCP Server** (`mcp-codebase-search`)
- Exposes tools via Model Context Protocol
- Validates inputs and outputs
- Handles stdio communication

**Ingestion CLI** (`mcp-codebase-ingest`)
- Scans directories recursively
- Respects .gitignore patterns
- Parses code with Tree-sitter
- Classifies test and library files
- Generates embeddings
- Stores chunks in LanceDB

**Manager UI** (`mcp-codebase-manager`)
- Fastify web server with SSR
- Real-time ingestion progress via SSE
- Search interface with filters
- Codebase management

**Core Services**
- **Codebase Service**: CRUD operations for codebases
- **Search Service**: Semantic search with filtering and caching
- **Ingestion Service**: Orchestrates indexing pipeline
- **Embedding Service**: Generates vector embeddings locally

### Data Flow

#### Ingestion Flow

```
Source Code → File Scanner → Tree-sitter Parser → Chunks
                                                      ↓
                                            File Classifier
                                                      ↓
LanceDB ← Embeddings ← Embedding Service ← Tagged Chunks
```

#### Search Flow

```
Query → Embedding Service → Vector
                              ↓
                         LanceDB Search
                              ↓
                         Apply Filters (tests, libraries)
                              ↓
                         Ranked Results → Format → Response
```

### Storage Schema

**LanceDB Tables:**
- Table naming: `codebase_{name}_{schemaVersion}`
- Example: `codebase_my-project_1_0_0`

**Row Structure:**
```json
{
  "id": "my-project_2024-01-15T10:30:00Z_0",
  "vector": [0.1, 0.2, ...],
  "content": "export async function authenticate(...) { ... }",
  "filePath": "src/auth.ts",
  "startLine": 15,
  "endLine": 45,
  "language": "typescript",
  "chunkType": "function",
  "isTestFile": false,
  "isLibraryFile": false,
  "ingestionTimestamp": "2024-01-15T10:30:00Z",
  "_codebaseName": "my-project",
  "_path": "/path/to/project",
  "_lastIngestion": "2024-01-15T10:30:00Z"
}
```

## Troubleshooting

### Common Issues

#### 1. "Command not found: mcp-codebase-search"

**Problem:** The package is not installed globally or not in PATH.

**Solution:**
```bash
# Reinstall globally
npm install -g @teknologika/mcp-codebase-search

# Or use npx
npx mcp-codebase-search
```

#### 2. "Failed to initialize LanceDB"

**Problem:** LanceDB persistence directory is not writable or corrupted.

**Solution:**
```bash
# Check permissions
ls -la ~/.codebase-memory/lancedb

# Reset LanceDB (WARNING: deletes all data)
rm -rf ~/.codebase-memory/lancedb

# Re-ingest codebases
mcp-codebase-ingest --path ./my-project --name my-project
```

#### 3. "Embedding model download failed"

**Problem:** Network issues or insufficient disk space.

**Solution:**
```bash
# Check disk space
df -h ~/.codebase-memory

# Clear model cache and retry
rm -rf ~/.codebase-memory/models

# Run ingestion again (will re-download)
mcp-codebase-ingest --path ./my-project --name my-project
```

#### 4. "Search returns no results"

**Problem:** Codebase not indexed or query too specific.

**Solution:**
```bash
# Verify codebase is indexed
mcp-codebase-manager
# Check the UI for your codebase

# Try broader queries
# Instead of: "validateEmailAddress"
# Try: "email validation function"
```

#### 5. "Manager UI won't open"

**Problem:** Port 8008 is already in use.

**Solution:**
```bash
# Check what's using port 8008
lsof -i :8008

# Kill the process or use a different port
# Edit ~/.codebase-memory/config.json
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
mcp-codebase-search

# Verify configuration path
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Check logs for errors
```

### Docling-Specific Issues

#### 7. "Docling not found" or "docling-sdk is not installed"

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
mcp-codebase-ingest --path ./docs --name my-docs
```

**Process documents in smaller batches:**
```bash
# Instead of ingesting entire directory at once
# Process subdirectories separately
mcp-codebase-ingest --path ./docs/section1 --name my-docs
mcp-codebase-ingest --path ./docs/section2 --name my-docs
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
top -pid $(pgrep -f mcp-codebase-ingest)

# Linux
htop -p $(pgrep -f mcp-codebase-ingest)

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
│   ├── codebase/          # Codebase CRUD operations
│   ├── search/            # Semantic search functionality
│   ├── ingestion/         # File scanning and indexing
│   ├── embedding/         # Embedding generation
│   └── parsing/           # Tree-sitter code parsing
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
npm install -g ./teknologika-mcp-codebase-search-0.1.0.tgz

# Test commands
mcp-codebase-search --version
mcp-codebase-ingest --help
mcp-codebase-manager
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

- 🌐 **Language support**: Add more Tree-sitter grammars
- ⚡ **Performance**: Optimize search and ingestion
- 🎨 **UI improvements**: Enhance the Manager UI
- 📚 **Documentation**: Improve guides and examples
- 🧪 **Testing**: Increase test coverage
- 🐛 **Bug fixes**: Fix reported issues
- 🔍 **Search improvements**: Better ranking algorithms
- 🏷️ **File classification**: More patterns for test/library detection

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

- **Max file size**: 1MB default (configurable)
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
- [Tree-sitter](https://tree-sitter.github.io/) - Code parsing
- [Hugging Face](https://huggingface.co/) - Embedding models
- [Fastify](https://www.fastify.io/) - Web framework

---

**Questions or Issues?** Open an issue on [GitHub](https://github.com/teknologika/mcp-codebase-search/issues)

**Need Help?** Check the [Troubleshooting](#troubleshooting) section above
