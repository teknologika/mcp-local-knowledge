import type { ChunkType } from '../../shared/types/index.js';

/**
 * Result of document conversion operation
 */
export interface DocumentConversionResult {
  markdown: string;
  metadata: DocumentMetadata;
  doclingDocument?: any; // For HybridChunker
}

/**
 * Metadata extracted from document conversion
 */
export interface DocumentMetadata {
  title: string;
  format: string;
  pageCount?: number;
  wordCount: number;
  hasImages: boolean;
  hasTables: boolean;
  conversionDuration?: number;
}

/**
 * A chunk of document content with metadata
 */
export interface DocumentChunk {
  content: string;
  index: number;
  tokenCount: number;
  metadata: ChunkMetadata;
}

/**
 * Metadata for a document chunk
 */
export interface ChunkMetadata {
  chunkType: ChunkType;
  hasContext: boolean;
  headingPath?: string[];
  pageNumber?: number;
}

/**
 * Options for document chunking
 */
export interface ChunkingOptions {
  maxTokens?: number;        // Default: 512
  chunkSize?: number;        // Fallback: 1000
  chunkOverlap?: number;     // Fallback: 200
  mergePeers?: boolean;      // Default: true
}
