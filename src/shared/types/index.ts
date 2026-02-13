/**
 * Shared type definitions for the knowledge base MCP server
 */

/**
 * Log levels for structured logging
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Document types supported by the knowledge base
 */
export type DocumentType = "pdf" | "docx" | "pptx" | "xlsx" | "html" | "markdown" | "text" | "audio";

/**
 * Chunk types for document content classification
 */
export type ChunkType = "paragraph" | "section" | "table" | "heading" | "list" | "code";

/**
 * Configuration interface for the entire system
 */
export interface Config {
  lancedb: {
    persistPath: string;
  };
  embedding: {
    modelName: string;
    cachePath: string;
  };
  server: {
    port: number;
    host: string;
    sessionSecret?: string;
  };
  mcp: {
    transport: "stdio";
  };
  ingestion: {
    batchSize: number;
    maxFileSize: number;
  };
  search: {
    defaultMaxResults: number;
    cacheTimeoutSeconds: number;
  };
  document: {
    conversionTimeout: number;
    maxTokens: number;
    chunkSize: number;
    chunkOverlap: number;
  };
  logging: {
    level: LogLevel;
  };
  schemaVersion: string;
}

/**
 * Chunk metadata for document chunks
 */
export interface ChunkMetadata {
  chunkType: ChunkType;
  hasContext: boolean;
  headingPath?: string[];
  pageNumber?: number;
}

/**
 * Code chunk with metadata
 */
export interface Chunk {
  content: string;
  startLine: number;
  endLine: number;
  chunkType: ChunkType;
  filePath: string;
  documentType?: DocumentType;
  tokenCount?: number;
  headingPath?: string[];
  pageNumber?: number;
}

/**
 * Knowledge base metadata
 */
export interface KnowledgeBaseMetadata {
  name: string;
  path: string;
  chunkCount: number;
  fileCount: number;
  lastIngestion: string; // ISO 8601 timestamp
}

/**
 * Search result metadata
 */
export interface SearchResultMetadata {
  filePath: string;
  documentType: DocumentType;
  chunkType: ChunkType;
  chunkIndex: number;
  isTest: boolean;
  pageNumber?: number;
  headingPath?: string[];
}

/**
 * Search result
 */
export interface SearchResult {
  content: string;
  score: number;
  metadata: SearchResultMetadata;
}

/**
 * Search parameters
 */
export interface SearchParams {
  query: string;
  knowledgeBaseName?: string;
  maxResults?: number;
  excludeTests?: boolean;
  documentType?: DocumentType;
}

/**
 * Search results
 */
export interface SearchResults {
  results: SearchResult[];
  totalResults: number;
  queryTime: number;
}

/**
 * Chunk type statistics
 */
export interface ChunkTypeStats {
  type: string;
  count: number;
}

/**
 * Detailed knowledge base statistics
 */
export interface KnowledgeBaseStats {
  name: string;
  path: string;
  chunkCount: number;
  fileCount: number;
  lastIngestion: string;
  chunkTypes: ChunkTypeStats[];
  sizeBytes: number;
}

/**
 * Ingestion parameters
 */
export interface IngestionParams {
  path: string;
  name: string;
  config: Config;
  respectGitignore?: boolean;
}

/**
 * Ingestion statistics
 */
export interface IngestionStats {
  totalFiles: number;
  supportedFiles: number;
  unsupportedFiles: Map<string, number>;
  chunksCreated: number;
  durationMs: number;
}

/**
 * Document information in a knowledge base
 */
export interface DocumentInfo {
  filePath: string;
  documentType: DocumentType;
  chunkCount: number;
  lastIngestion: string;
  sizeBytes: number;
}
