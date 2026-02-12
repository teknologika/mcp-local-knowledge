# Tasks: Refactor to mcp-local-knowledge

## Phase 1: Project Rename & Cleanup

### 1.1 Update Package Configuration
- [x] 1.1.1 Update package.json name to @teknologika/mcp-local-knowledge
- [x] 1.1.2 Update package.json description for document focus
- [x] 1.1.3 Update bin commands (mcp-local-knowledge, mcp-knowledge-ingest, mcp-knowledge-manager)
- [x] 1.1.4 Update package.json keywords (remove code-specific, add document-specific)
- [x] 1.1.5 Update repository URLs in package.json
- [x] 1.1.6 Update .gitignore to use .knowledge-base/ instead of .codebase-memory/

### 1.2 Remove Code-Specific Domains
- [x] 1.2.1 Delete src/domains/parsing/ directory
- [x] 1.2.2 Remove tree-sitter dependencies from package.json
- [x] 1.2.3 Remove language detection utilities
- [x] 1.2.4 Remove code file classification logic

### 1.3 Rename Core Domain
- [x] 1.3.1 Rename src/domains/codebase/ to src/domains/knowledgebase/
- [x] 1.3.2 Update all imports throughout the project
- [x] 1.3.3 Rename types: Codebase → KnowledgeBase, CodebaseMetadata → KnowledgeBaseMetadata, CodebaseStats → KnowledgeBaseStats
- [x] 1.3.4 Update service methods and variable names
- [x] 1.3.5 Update test files

### 1.4 Update Configuration System
- [x] 1.4.1 Update src/shared/config/config.ts default paths from .codebase-memory to .knowledge-base
- [x] 1.4.2 Update configuration schema
- [x] 1.4.3 Update validation messages
- [x] 1.4.4 Update .env.example with new paths

### 1.5 Update Shared Types
- [x] 1.5.1 Remove Language type from src/shared/types/index.ts
- [x] 1.5.2 Remove code-specific ChunkType values
- [x] 1.5.3 Add DocumentType type (pdf, docx, pptx, xlsx, html, markdown, text, audio)
- [x] 1.5.4 Add document-specific ChunkType values (paragraph, section, table, heading)
- [x] 1.5.5 Update SearchResult interface
- [x] 1.5.6 Update ChunkMetadata interface

## Phase 2: docling-sdk Integration

### 2.1 Add docling-sdk Dependency
- [x] 2.1.1 Add docling-sdk to package.json dependencies
- [x] 2.1.2 Run npm install to install docling-sdk
- [x] 2.1.3 Verify docling-sdk installation

### 2.2 Create Docling Installation Check Script
- [x] 2.2.1 Create scripts/check-docling.js
- [x] 2.2.2 Implement check for Python Docling CLI availability
- [x] 2.2.3 Add helpful error messages with installation instructions
- [x] 2.2.4 Add package.json postinstall script to run check
- [x] 2.2.5 Test check script on systems with/without Docling

### 2.3 Update Documentation for Docling Setup
- [x] 2.3.1 Add Docling installation instructions to README.md
- [x] 2.3.2 Document "pip install docling" requirement
- [x] 2.3.3 Add troubleshooting section for Docling issues
- [x] 2.3.4 Update .env.example with Docling-related notes

## Phase 3: Document Processing Services

### 3.1 Create Document Domain Structure
- [x] 3.1.1 Create src/domains/document/ directory
- [x] 3.1.2 Create document.types.ts with DocumentConversionResult interface
- [x] 3.1.3 Add DocumentMetadata interface
- [x] 3.1.4 Add DocumentChunk interface
- [x] 3.1.5 Create index.ts barrel file

### 3.2 Implement Document Converter Service
- [x] 3.2.1 Create document-converter.service.ts
- [x] 3.2.2 Initialize Docling client from docling-sdk in CLI mode
- [x] 3.2.3 Implement document type detection by extension
- [x] 3.2.4 Implement convertDocument() using docling-sdk client.convert()
- [x] 3.2.5 Support all document formats (PDF, DOCX, PPTX, XLSX, HTML, MD, TXT)
- [x] 3.2.6 Add audio file support (MP3, WAV, M4A, FLAC)
- [x] 3.2.7 Extract and normalize metadata from Docling result
- [x] 3.2.8 Add timeout handling (30s default)
- [x] 3.2.9 Implement fallback to simple text extraction on conversion failure
- [x] 3.2.10 Add progress reporting for long conversions
- [x] 3.2.11 Handle conversion errors with descriptive messages

### 3.3 Implement Document Chunker Service
- [x] 3.3.1 Create document-chunker.service.ts
- [x] 3.3.2 Initialize Docling client from docling-sdk
- [x] 3.3.3 Implement chunkDocument() using docling-sdk client.chunk()
- [x] 3.3.4 Configure HybridChunker: max_tokens=512, chunker_type='hybrid'
- [x] 3.3.5 Extract chunk metadata (type, token count, heading path)
- [x] 3.3.6 Implement fallback to simple text chunking (chunk_size=1000, overlap=200)
- [x] 3.3.7 Add contextualization (heading hierarchy) from Docling metadata
- [x] 3.3.8 Handle chunking errors gracefully with fallback

### 3.4 Add Document Service Tests
- [x] 3.4.1 Test document type detection
- [x] 3.4.2 Test PDF conversion with docling-sdk
- [x] 3.4.3 Test DOCX conversion
- [x] 3.4.4 Test PPTX conversion
- [x] 3.4.5 Test XLSX conversion
- [x] 3.4.6 Test HTML conversion
- [x] 3.4.7 Test Markdown conversion
- [x] 3.4.8 Test text file conversion
- [x] 3.4.9 Test audio transcription
- [x] 3.4.10 Test HybridChunker integration via docling-sdk
- [x] 3.4.11 Test fallback chunking when HybridChunker fails
- [x] 3.4.12 Test metadata extraction
- [x] 3.4.13 Test timeout handling
- [x] 3.4.14 Test error handling with descriptive messages

## Phase 4: Update Ingestion Pipeline

### 4.1 Update File Scanner
- [x] 4.1.1 Update src/domains/ingestion/file-scanner.service.ts with document patterns
- [x] 4.1.2 Remove code file patterns
- [x] 4.1.3 Add DOCUMENT_EXTENSIONS constant (.pdf, .docx, .pptx, .xlsx, .html, .md, .txt, .mp3, .wav, .m4a, .flac)
- [x] 4.1.4 Update file classification for documents
- [x] 4.1.5 Add document type detection by extension

### 4.2 Update Ingestion Service
- [x] 4.2.1 Remove tree-sitter parsing logic from ingestion.service.ts
- [x] 4.2.2 Add DocumentConverterService integration
- [x] 4.2.3 Add DocumentChunkerService integration
- [x] 4.2.4 Update progress reporting for documents
- [x] 4.2.5 Add document type to chunk metadata
- [x] 4.2.6 Use fallback chunking if HybridChunker fails
- [x] 4.2.7 Update batch processing for documents
- [ ] 4.2.7 Update batch processing for documents
- [x] 4.2.8 Add conversion timeout handling
- [x] 4.2.9 Add retry logic for conversions (not chunking)

### 4.3 Update File Classification
- [x] 4.3.1 Update src/shared/utils/file-classification.ts for documents
- [x] 4.3.2 Remove code-specific classification
- [x] 4.3.3 Add document type classification
- [x] 4.3.4 Keep test file detection for markdown
- [x] 4.3.5 Remove library file detection

### 4.4 Update Ingestion Tests
- [x] 4.4.1 Test document file scanning
- [x] 4.4.2 Test document conversion integration
- [x] 4.4.3 Test chunking integration
- [x] 4.4.4 Test error handling
- [x] 4.4.5 Test progress reporting
- [x] 4.4.6 Test batch processing

## Phase 5: Update MCP Server

### 5.1 Update Tool Schemas
- [x] 5.1.1 Rename list_codebases → list_knowledgebases in tool-schemas.ts
- [x] 5.1.2 Rename search_codebases → search_knowledgebases
- [x] 5.1.3 Rename get_codebase_stats → get_knowledgebase_stats
- [x] 5.1.4 Rename open_codebase_manager → open_knowledgebase_manager
- [x] 5.1.5 Replace codebaseName with knowledgebaseName in input schemas
- [x] 5.1.6 Replace language filter with documentType filter
- [x] 5.1.7 Update descriptions and examples
- [x] 5.1.8 Replace language field with documentType in output schemas
- [x] 5.1.9 Update chunkType values for documents
- [x] 5.1.10 Add document-specific metadata fields

### 5.2 Update MCP Server Implementation
- [x] 5.2.1 Update tool handlers in mcp-server.ts
- [x] 5.2.2 Update error messages
- [x] 5.2.3 Update logging
- [x] 5.2.4 Update tool descriptions for AI assistants

### 5.3 Update MCP Tests
- [x] 5.3.1 Update tool schema tests
- [x] 5.3.2 Update integration tests
- [x] 5.3.3 Test renamed tools
- [x] 5.3.4 Test new schemas

## Phase 6: Update Search Service

### 6.1 Update Search Service
- [x] 6.1.1 Replace language filter with documentType filter in search.service.ts
- [x] 6.1.2 Update result formatting
- [x] 6.1.3 Update metadata handling
- [x] 6.1.4 Keep semantic search logic unchanged
- [x] 6.1.5 Keep filtering logic for test files

### 6.2 Update Search Tests
- [x] 6.2.1 Test document type filtering
- [x] 6.2.2 Test search with new metadata
- [x] 6.2.3 Test result formatting

## Phase 7: Update CLI Tools

### 7.1 Update Ingest CLI
- [x] 7.1.1 Update command name in src/bin/ingest.ts
- [x] 7.1.2 Update help text
- [x] 7.1.3 Update descriptions and examples
- [x] 7.1.4 Update progress messages
- [x] 7.1.5 Update error messages
- [x] 7.1.6 Add document format information to output

### 7.2 Update Manager CLI
- [x] 7.2.1 Update command name in src/bin/manager.ts
- [x] 7.2.2 Update help text
- [x] 7.2.3 Update descriptions

### 7.3 Update MCP Server CLI
- [x] 7.3.1 Update command name in src/bin/mcp-server.ts
- [x] 7.3.2 Update help text
- [x] 7.3.3 Update descriptions

## Phase 8: Enhance Manager UI

### 8.1 Update UI Templates
- [x] 8.1.1 Update title and branding in layout.hbs
- [x] 8.1.2 Replace "Codebase" with "Knowledge Base" in layout.hbs
- [x] 8.1.3 Update tab labels in index.hbs
- [x] 8.1.4 Update search interface in index.hbs
- [x] 8.1.5 Update manage interface in index.hbs
- [x] 8.1.6 Add file upload section in index.hbs

### 8.2 Add File Upload UI
- [x] 8.2.1 Create drag-and-drop zone for files
- [x] 8.2.2 Add file input for single file selection
- [x] 8.2.3 Add folder input for folder selection
- [x] 8.2.4 Add file list with remove buttons
- [x] 8.2.5 Add upload progress indicators
- [x] 8.2.6 Add success/error messages
- [x] 8.2.7 Add file type validation (client-side)
- [x] 8.2.8 Add file size warnings
- [x] 8.2.9 Add upload queue management

### 8.3 Update Manager Routes
- [x] 8.3.1 Add /api/upload/file endpoint in manager-routes.ts
- [x] 8.3.2 Add /api/upload/folder endpoint
- [x] 8.3.3 Add /api/upload/progress/:uploadId endpoint (SSE)
- [x] 8.3.4 Handle file uploads with multipart/form-data
- [x] 8.3.5 Process uploaded files
- [x] 8.3.6 Return progress updates
- [x] 8.3.7 Add file validation (server-side)
- [x] 8.3.8 Add temporary file cleanup
- [x] 8.3.9 Add upload session management

### 8.4 Update Manager JavaScript
- [x] 8.4.1 Add drag-and-drop handlers in manager.js
- [x] 8.4.2 Add file input handlers
- [x] 8.4.3 Add folder input handlers
- [x] 8.4.4 Add upload queue management
- [x] 8.4.5 Add progress tracking
- [x] 8.4.6 Add SSE connection for progress
- [x] 8.4.7 Update search to use new API
- [x] 8.4.8 Update manage to use new API

### 8.5 Update Manager CSS
- [x] 8.5.1 Style drag-and-drop zone in manager.css
- [x] 8.5.2 Style file upload UI
- [x] 8.5.3 Style progress indicators
- [x] 8.5.4 Update branding colors if needed

### 8.6 Update Manager Tests
- [x] 8.6.1 Test file upload endpoint
- [x] 8.6.2 Test folder upload endpoint
- [x] 8.6.3 Test progress tracking
- [x] 8.6.4 Test file validation
- [x] 8.6.5 Test error handling

## Phase 9: Update Documentation

### 9.1 Update README.md
- [x] 9.1.1 Update title and description
- [x] 9.1.2 Update feature list (remove code, add documents)
- [x] 9.1.3 Update installation instructions
- [x] 9.1.4 Update quick start guide
- [x] 9.1.5 Update usage examples
- [x] 9.1.6 Update MCP client configuration
- [x] 9.1.7 Remove "Supported Languages" section
- [x] 9.1.8 Add "Supported Document Formats" section
- [x] 9.1.9 Update architecture diagrams
- [x] 9.1.10 Update troubleshooting section
- [x] 9.1.11 Update all command examples

### 9.2 Update Configuration Documentation
- [x] 9.2.1 Document new default paths
- [x] 9.2.2 Document Python requirements
- [x] 9.2.3 Document Docling configuration
- [x] 9.2.4 Add migration guide for existing users

### 9.3 Create Migration Guide
- [x] 9.3.1 Create MIGRATION.md
- [x] 9.3.2 Explain breaking changes
- [x] 9.3.3 Provide migration steps
- [x] 9.3.4 Document data migration
- [x] 9.3.5 Provide rollback instructions

### 9.4 Update Product Documentation
- [x] 9.4.1 Rename product/Codebase-Memory-MCP-PRD.md to Knowledge-Base-MCP-PRD.md
- [x] 9.4.2 Update content in PRD
- [x] 9.4.3 Update steering files in .kiro/steering/
- [x] 9.4.4 Update any other documentation files

## Phase 10: Testing & Quality Assurance

### 10.1 Unit Tests
- [~] 10.1.1 Run all unit tests: npm test
- [~] 10.1.2 Achieve 80%+ coverage
- [~] 10.1.3 Fix any failing tests
- [~] 10.1.4 Add missing tests

### 10.2 Integration Tests
- [~] 10.2.1 Test end-to-end document ingestion
- [~] 10.2.2 Test search across different document types
- [~] 10.2.3 Test MCP tool integration
- [~] 10.2.4 Test Manager UI workflows
- [~] 10.2.5 Test Python bridge reliability

### 10.3 Manual Testing
- [~] 10.3.1 Test PDF file ingestion
- [~] 10.3.2 Test DOCX file ingestion
- [~] 10.3.3 Test PPTX file ingestion
- [~] 10.3.4 Test XLSX file ingestion
- [~] 10.3.5 Test HTML file ingestion
- [~] 10.3.6 Test Markdown file ingestion
- [~] 10.3.7 Test text file ingestion
- [~] 10.3.8 Test audio file ingestion (MP3, WAV)
- [~] 10.3.9 Test search functionality
- [~] 10.3.10 Test Manager UI search tab
- [~] 10.3.11 Test Manager UI manage tab
- [~] 10.3.12 Test Manager UI ingest tab with drag-and-drop
- [~] 10.3.13 Test file upload
- [~] 10.3.14 Test folder upload
- [~] 10.3.15 Test MCP tools in Claude Desktop
- [~] 10.3.16 Test error scenarios
- [~] 10.3.17 Test performance with large documents

### 10.4 Performance Testing
- [~] 10.4.1 Benchmark document conversion speed
- [~] 10.4.2 Benchmark search performance
- [~] 10.4.3 Test with large knowledge bases (1000+ documents)
- [~] 10.4.4 Test memory usage
- [~] 10.4.5 Optimize bottlenecks

## Phase 11: Deployment Preparation

### 11.1 Version Update
- [~] 11.1.1 Update version in package.json to 1.0.0
- [~] 11.1.2 Update CHANGELOG.md with breaking changes
- [~] 11.1.3 Tag release in git

### 11.2 Build & Package
- [~] 11.2.1 Run npm run clean
- [~] 11.2.2 Run npm run build
- [~] 11.2.3 Test built package locally
- [~] 11.2.4 Run npm pack and test installation

### 11.3 Pre-publish Checklist
- [~] 11.4.1 Verify all tests passing
- [~] 11.4.2 Verify documentation complete
- [~] 11.4.3 Verify migration guide ready
- [~] 11.4.4 Verify Python dependencies documented
- [~] 11.4.5 Verify examples tested
- [~] 11.4.6 Run security audit: npm audit
