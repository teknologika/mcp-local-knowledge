import { Docling } from 'docling-sdk';
import type { DocumentChunk, ChunkingOptions, ChunkMetadata } from './document.types.js';
import type { ChunkType } from '../../shared/types/index.js';
import { createLogger } from '../../shared/logging/index.js';

const logger = createLogger('info').child('DocumentChunkerService');

/**
 * Service for chunking documents using HybridChunker with fallback
 */
export class DocumentChunkerService {
  private docling: Docling;

  constructor(options: { outputDir?: string } = {}) {
    this.docling = new Docling({
      cli: {
        outputDir: options.outputDir || './temp',
      },
    });
  }

  /**
   * Chunk a document using HybridChunker with fallback to simple chunking
   */
  async chunkDocument(
    content: string,
    options: ChunkingOptions = {}
  ): Promise<DocumentChunk[]> {
    const maxTokens = options.maxTokens || 512;
    const chunkSize = options.chunkSize || 1000;
    const chunkOverlap = options.chunkOverlap || 200;

    logger.info({ maxTokens, contentLength: content.length }, 'Starting document chunking');

    try {
      // Try HybridChunker first
      const result = await this.docling.chunk(content, {
        max_tokens: maxTokens,
        chunker_type: 'hybrid',
        merge_peers: options.mergePeers !== false,
      });

      const chunks = this.processHybridChunks(result.chunks || []);
      logger.info({ chunkCount: chunks.length }, 'HybridChunker completed successfully');
      return chunks;
    } catch (error) {
      logger.warn({ error }, 'HybridChunker failed, falling back to simple chunking');
      return this.fallbackSimpleChunking(content, chunkSize, chunkOverlap);
    }
  }

  /**
   * Chunk a document using Docling document object (from conversion)
   */
  async chunkWithDocling(
    doclingDoc: any,
    options: ChunkingOptions = {}
  ): Promise<DocumentChunk[]> {
    const maxTokens = options.maxTokens || 512;

    logger.info({ maxTokens }, 'Chunking with Docling document object');

    try {
      // Use docling-sdk's chunking with the document object
      const result = await this.docling.chunk(doclingDoc, {
        max_tokens: maxTokens,
        chunker_type: 'hybrid',
        merge_peers: options.mergePeers !== false,
      });

      const chunks = this.processHybridChunks(result.chunks || []);
      logger.info({ chunkCount: chunks.length }, 'Docling chunking completed successfully');
      return chunks;
    } catch (error) {
      logger.warn({ error }, 'Docling chunking failed, falling back to simple chunking');
      // Extract text from docling document for fallback
      const content = this.extractTextFromDocling(doclingDoc);
      return this.fallbackSimpleChunking(
        content,
        options.chunkSize || 1000,
        options.chunkOverlap || 200
      );
    }
  }

  /**
   * Process chunks from HybridChunker
   */
  private processHybridChunks(hybridChunks: any[]): DocumentChunk[] {
    return hybridChunks.map((chunk, index) => {
      const content = chunk.text || chunk.content || '';
      const chunkType = this.detectChunkType(chunk);
      const headingPath = this.extractHeadingPath(chunk);

      // Validate and use token count from chunk, or estimate if invalid
      let tokenCount = chunk.token_count;
      if (typeof tokenCount !== 'number' || tokenCount < 0 || isNaN(tokenCount)) {
        tokenCount = this.estimateTokenCount(content);
      }

      const metadata: ChunkMetadata = {
        chunkType,
        hasContext: true,
        headingPath: headingPath.length > 0 ? headingPath : undefined,
        pageNumber: chunk.page_number,
      };

      return {
        content,
        index,
        tokenCount,
        metadata,
      };
    });
  }

  /**
   * Detect chunk type from HybridChunker metadata
   */
  private detectChunkType(chunk: any): ChunkType {
    const type = chunk.type?.toLowerCase() || '';
    
    if (type.includes('table')) return 'table';
    if (type.includes('heading') || type.includes('title')) return 'heading';
    if (type.includes('section')) return 'section';
    if (type.includes('list')) return 'list';
    if (type.includes('code')) return 'code';
    
    return 'paragraph';
  }

  /**
   * Extract heading hierarchy from chunk metadata
   */
  private extractHeadingPath(chunk: any): string[] {
    if (chunk.heading_path && Array.isArray(chunk.heading_path)) {
      return chunk.heading_path;
    }
    
    if (chunk.headings && Array.isArray(chunk.headings)) {
      return chunk.headings;
    }
    
    if (chunk.section_hierarchy && Array.isArray(chunk.section_hierarchy)) {
      return chunk.section_hierarchy;
    }
    
    return [];
  }

  /**
   * Extract text content from Docling document object
   */
  private extractTextFromDocling(doclingDoc: any): string {
    if (typeof doclingDoc === 'string') {
      return doclingDoc;
    }
    
    if (doclingDoc.text) {
      return doclingDoc.text;
    }
    
    if (doclingDoc.content) {
      return doclingDoc.content;
    }
    
    // Try to extract from markdown
    if (doclingDoc.markdown) {
      return doclingDoc.markdown;
    }
    
    return '';
  }

  /**
   * Fallback to simple text chunking
   */
  private fallbackSimpleChunking(
    content: string,
    chunkSize: number,
    chunkOverlap: number
  ): DocumentChunk[] {
    if (!content || content.trim().length === 0) {
      return [];
    }

    const chunks: DocumentChunk[] = [];
    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < content.length) {
      const endIndex = Math.min(startIndex + chunkSize, content.length);
      const chunkContent = content.slice(startIndex, endIndex);

      const metadata: ChunkMetadata = {
        chunkType: 'paragraph',
        hasContext: false,
      };

      chunks.push({
        content: chunkContent,
        index: chunkIndex,
        tokenCount: this.estimateTokenCount(chunkContent),
        metadata,
      });

      chunkIndex++;
      
      // Move to next chunk position
      const nextStart = endIndex - chunkOverlap;
      
      // Prevent infinite loop: ensure we're making progress
      if (nextStart <= startIndex) {
        startIndex = endIndex;
      } else {
        startIndex = nextStart;
      }
      
      // Break if we've reached the end
      if (startIndex >= content.length) {
        break;
      }
    }

    logger.info({ chunkCount: chunks.length }, 'Simple chunking completed');
    return chunks;
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
