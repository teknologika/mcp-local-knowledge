# Product Overview

**Package Name**: `@teknologika/mcp-local-knowledge`  
**Version**: 1.0.0  
**Status**: Production Ready

An MCP (Model Context Protocol) server that provides local-first semantic search capabilities for document collections.

## Purpose

This package implements an MCP server that enables AI assistants to search and analyze document collections efficiently. It provides tools for semantic search, document discovery, and knowledge retrieval through the Model Context Protocol, with all processing happening locally without cloud dependencies.

## Key Features

### Core Capabilities
- **Local-First Architecture**: All operations run locally without external API calls
- **Semantic Search**: Find information by meaning using vector embeddings, not just keywords
- **Docling Integration**: Powerful document conversion with OCR support for scanned PDFs
- **Structure-Aware Chunking**: HybridChunker preserves document hierarchy for better context
- **MCP Integration**: Seamless integration with MCP-compatible AI assistants (Claude Desktop, etc.)

### Multi-Format Support
- PDF (`.pdf`) - with OCR for scanned documents
- Word (`.docx`, `.doc`)
- PowerPoint (`.pptx`, `.ppt`)
- Excel (`.xlsx`, `.xls`)
- HTML (`.html`, `.htm`)
- Markdown (`.md`, `.markdown`)
- Text (`.txt`)
- Audio (`.mp3`, `.wav`, `.m4a`, `.flac`) - with Whisper ASR transcription

### Smart Filtering
- **Test Document Detection**: Automatically identifies and tags test documents
- **Gitignore Support**: Respects .gitignore patterns during ingestion
- **Search Filters**: Filter by document type, exclude test documents

### User Interfaces
- **MCP Server**: stdio-based server for AI assistant integration
- **CLI Tool**: Command-line interface for document ingestion
- **Web UI**: Browser-based management interface with:
  - Real-time ingestion progress tracking
  - Interactive search with filters
  - Knowledge base management (add, rename, remove)
  - File upload with drag-and-drop
  - Statistics and metadata visualization

### Performance
- Sub-500ms search responses with intelligent caching
- Batch processing for efficient ingestion
- Optimized vector similarity search
- Memory-efficient streaming for large document collections

### Developer Experience
- Simple installation via npm
- Python 3.10+ and Docling required
- Comprehensive documentation
- TypeScript throughout with strict typing

## Technology Stack

- **Vector Database**: LanceDB (local, file-based)
- **Embeddings**: Hugging Face Transformers (local model)
- **Document Conversion**: Docling (via docling-sdk)
- **Web Framework**: Fastify (Manager UI)
- **Language**: TypeScript (Node.js 23+)
- **Protocol**: Model Context Protocol (MCP)
