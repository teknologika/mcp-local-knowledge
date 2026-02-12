# Local Knowledge MCP Server

## Problem Statement

People using LLM assistants waste time searching through document collections because they lack semantic search capabilities, so they manually grep through files, miss relevant information, and spend excessive time locating specific content. The cost compounds quickly because knowledge remains siloed, context is lost, and teams repeatedly ask the same questions that are already answered in existing documentation.

## Evidence

Observation: Semantic search over document collections materially improves information retrieval compared to keyword-based search, especially when users are asking conceptual questions or looking for related information across multiple documents. Assumption: developers and knowledge workers prefer local-first indexing for privacy and speed, especially when indexing proprietary or sensitive documents; needs validation through adoption metrics. Observation: Structure-aware document chunking (preserving headings, sections, tables) improves retrieval relevance compared to naive fixed-size chunking.

## Proposed Solution

We will build a fully local document knowledge base system packaged as an npm TypeScript project that exposes an MCP server for discovery and retrieval, a local ingestion CLI for indexing, and a lightweight management UI served by a Fastify web server. Documents are converted to markdown using Docling (supporting PDF, DOCX, PPTX, XLSX, HTML, Markdown, text, and audio), chunked using structure-aware strategies that preserve document hierarchy, embedded locally using `@huggingface/transformers`, and stored in a locally running LanceDB instance with metadata that preserves provenance. The operational model is intentionally simple: no file watching, no incremental updates, and no partial refresh; we re-ingest the target directory when the user wants the index updated, using out of the box defaults for model choice and configuration.

## Key Hypothesis

We believe fast, local, structure-aware document search and retrieval via MCP tools will reduce time spent searching for information and improve knowledge discovery for users working with document collections. We'll know we're right when users report they can locate relevant information within seconds rather than minutes of manual searching, and when semantic search surfaces related content they wouldn't have found through keyword search alone.

## What We're NOT Building

- Incremental indexing, file watchers, or update-on-change workflows, because the first release must be operationally simple and deterministic.
- Remote collaboration features such as shared indexes, hosted storage, or multi-user auth, because this must run fully locally on a user workstation.
- Real-time document editing or annotation, because the focus is on search and retrieval, not document management.
- Cloud-based processing or external API dependencies, because all operations must work offline.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Time-to-relevant-information | Median under 30 seconds | Instrumented search events (query to result selection) plus user self-report sampling |
| Search success rate | >80% of searches return relevant results | User feedback on search results plus manual evaluation of sample queries |
| Adoption rate | 50+ active users within 8 weeks | Installation metrics and active usage tracking |

---

## Users & Context

**Primary User**
- **Who**: A developer, researcher, or knowledge worker using an LLM assistant who needs high-confidence discovery over document collections, including technical documentation, reports, presentations, and research papers.
- **Current behavior**: They rely on file system search, grep, and manual browsing, often missing relevant information or spending excessive time locating specific content.
- **Trigger**: The moment they need to find information like "what were the Q4 project milestones?", "where is the API authentication documented?", or "what did the research say about X?"
- **Success state**: They can list available knowledge bases, search semantically across documents, view relevant chunks with context (headings, page numbers), and refresh the index by re-ingesting when needed, all without leaving local workflows.

**Job to Be Done**
When I need to find information in my document collection, I want the assistant to reliably surface the most relevant content with context, so I can quickly locate what I need without manual searching or missing related information.

**Non-Users**
Teams that require a managed cloud service, real-time collaboration, or hosted analytics are not the target because the product is explicitly local-first and offline-capable.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | MCP server exposing `list_knowledgebases`, `search_knowledgebases`, `get_knowledgebase_stats`, `open_knowledgebase_manager` | This is the assistant integration contract and primary value surface. |
| Must | Ingestion CLI that recursively ingests a directory into a named knowledge base | Without ingestion there is no data, and CLI enables workflow automation. |
| Must | Local persistence in LanceDB for vectors and metadata | Required store for chunk vectors, provenance metadata, and similarity retrieval. |
| Must | Local embeddings using `@huggingface/transformers` with out of the box defaults | Required to satisfy local-only constraints without early tuning work. |
| Must | Document format support for PDF, DOCX, PPTX, XLSX, HTML, Markdown, text, and audio | This is the minimum supported set and must be first-class. |
| Must | Docling integration for document conversion with OCR support | Provides robust document-to-markdown conversion with structure preservation. |
| Must | Structure-aware chunking using HybridChunker | Preserves document hierarchy and improves retrieval relevance. |
| Must | Fastify server hosting a management UI and local HTTP API | Keeps the stack single-runtime and provides an operational control surface. |
| Must | File upload via drag-and-drop in Manager UI | Enables easy document ingestion without CLI. |
| Should | Admin operations for rename and delete of knowledge bases | Makes the store operable and supports lifecycle management. |
| Should | Audio transcription using Whisper ASR | Enables indexing of audio content (meetings, podcasts, lectures). |
| Won't | File watchers and incremental update flows | Explicitly deferred because the update model is re-ingestion. |
| Won't | Real-time collaboration or shared indexes | Out of scope for local-first architecture. |

### MVP Scope

The MVP is a local-first pipeline that indexes documents into LanceDB with stable chunk IDs, file provenance, and embeddings; exposes MCP tools for listing, searching, and stats; and provides a Fastify-hosted management UI for the same operations plus file upload. Document format support includes PDF, DOCX, PPTX, XLSX, HTML, Markdown, text, and audio files. Conversion uses Docling with OCR support for scanned PDFs. Chunking uses HybridChunker to preserve document structure.

### User Flow

A user runs the ingestion CLI to index a document directory into a named knowledge base, then uses the manager UI to confirm document counts and chunk counts. They can also drag-and-drop files into the UI for quick ingestion. They then use an MCP-capable assistant to call `list_knowledgebases` and `search_knowledgebases` to retrieve relevant chunks with file paths, document types, page numbers, and heading context. When documents change, the user re-runs ingestion for that knowledge base to refresh the index.

---

## Technical Approach

**Feasibility**: HIGH

**Architecture Notes**
- A single npm package provides three entry points: an MCP server binary, an ingestion CLI binary, and a Fastify server binary that hosts the management UI and exposes a local HTTP API.
- The system stores chunk embeddings plus metadata in LanceDB, where metadata includes knowledge base name, file path, document type, chunk type, page number, heading path, file hash, modified time, and last indexed time.
- Document conversion uses docling-sdk (TypeScript wrapper for Python Docling) with CLI mode for full feature support including OCR.
- Chunking uses Docling's HybridChunker for structure-aware, token-aware chunking with fallback to simple text chunking if HybridChunker fails.
- Embeddings are generated locally via `@huggingface/transformers` using out of the box defaults (Xenova/all-MiniLM-L6-v2), with caching to avoid repeated compute.
- The Fastify API and MCP tools provide identical search behavior, filters, ranking, and provenance formatting across surfaces.
- Manager UI supports file upload via drag-and-drop with real-time progress tracking via Server-Sent Events.

**Technical Risks**

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Docling installation complexity across platforms | M | Provide comprehensive installation documentation with platform-specific troubleshooting, detect Docling availability at runtime with clear error messages. |
| Document conversion performance varies by file type and size | M | Set reasonable timeouts (30s default), provide progress feedback, support batch processing, document expected performance. |
| Large PDF files with OCR are slow to process | M | Document performance expectations, provide configuration for timeout and batch size, suggest pre-processing for very large files. |
| Python dependency adds installation friction | M | Clear documentation of Python 3.10+ requirement, automated checks during installation, comprehensive troubleshooting guide. |
| Re-ingestion is slow for large document collections | M | Support filtering (path include/exclude), batch processing, persist file hashes to skip unchanged files. |
| Index drift after file renames or deletes | M | Detect deletes during re-ingest and reconcile by removing stale chunks for missing files. |
| LanceDB schema evolution breaks older stores | M | Version metadata schema and introduce explicit migrations when changes are required. |

**Dependencies**
- **Node.js**: 23.0.0+ (native TypeScript support)
- **Python**: 3.10+ (required for Docling)
- **Python Packages**: docling (document conversion)
- **npm Packages**: docling-sdk, @huggingface/transformers, @lancedb/lancedb, fastify

---

## Implementation Phases

### Phase 1: Core Infrastructure (Completed)
- LanceDB integration
- Local embeddings with Hugging Face Transformers
- Configuration management
- Logging infrastructure

### Phase 2: Document Processing (Completed)
- Docling SDK integration
- Document converter service
- Document chunker service with HybridChunker
- Support for PDF, DOCX, PPTX, XLSX, HTML, Markdown, text
- Audio transcription support

### Phase 3: Ingestion Pipeline (Completed)
- File scanner with document type detection
- Batch processing
- Progress tracking
- Error handling and resilience

### Phase 4: Search & Retrieval (Completed)
- Semantic search service
- Filtering by document type
- Result ranking and formatting
- Search caching

### Phase 5: MCP Integration (Completed)
- MCP server implementation
- Tool definitions and handlers
- Input validation
- Error handling

### Phase 6: Manager UI (Completed)
- Fastify server setup
- Search interface with filters
- Knowledge base management
- File upload with drag-and-drop
- Real-time progress tracking via SSE

### Phase 7: Testing & Quality (Completed)
- Unit tests for all services
- Property-based tests
- Integration tests
- Manual testing across document formats

### Phase 8: Documentation (Completed)
- README with comprehensive guides
- Migration guide from v0.x
- Troubleshooting documentation
- API documentation

### Phase 9: Release Preparation (In Progress)
- Version bump to 1.0.0
- Final testing
- Package publishing
- Announcement

---

## Open Questions

1. **Model Selection**: Should we support alternative embedding models beyond the default? → Defer to post-1.0 based on user feedback.
2. **Incremental Updates**: Should we add file watching for automatic re-indexing? → Defer to post-1.0 to keep operational model simple.
3. **Cloud Sync**: Should we support optional cloud backup/sync? → No, conflicts with local-first architecture.
4. **Collaboration**: Should we support shared indexes? → No, out of scope for local-first design.

---

## Success Criteria for Launch

- [ ] All Phase 1-8 tasks completed
- [ ] 80%+ test coverage achieved
- [ ] Documentation complete and reviewed
- [ ] Migration guide tested with real users
- [ ] Performance benchmarks meet targets (<500ms search, <30s conversion)
- [ ] Installation tested on macOS, Linux, Windows
- [ ] Python/Docling installation documented for all platforms
- [ ] MCP integration tested with Claude Desktop
- [ ] Manager UI tested in Chrome, Firefox, Safari

---

## Post-Launch Roadmap

### v1.1 - Enhanced Search
- Hybrid search (semantic + keyword)
- Search result highlighting
- Search history
- Saved searches

### v1.2 - Advanced Features
- Custom embedding models
- Configurable chunking strategies
- Document metadata extraction
- Tag-based organization

### v1.3 - Performance & Scale
- Incremental indexing (optional)
- Parallel document processing
- Index compression
- Performance monitoring

### Future Considerations
- Browser extension for web page capture
- Integration with note-taking apps
- Export/import of knowledge bases
- Advanced analytics and insights
