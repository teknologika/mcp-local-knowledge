import { Docling } from 'docling-sdk';
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import type { DocumentConversionResult, DocumentMetadata } from './document.types.js';
import type { DocumentType } from '../../shared/types/index.js';
import { createLogger } from '../../shared/logging/index.js';

const rootLogger = createLogger('info');
const logger = rootLogger.child('DocumentConverterService');

/**
 * Service for converting various document formats to markdown using docling-sdk
 */
export class DocumentConverterService {
  private docling: Docling;
  private conversionTimeout: number;

  constructor(options: { outputDir?: string; conversionTimeout?: number } = {}) {
    this.docling = new Docling({
      cli: {
        outputDir: options.outputDir || './temp',
      },
    });
    this.conversionTimeout = options.conversionTimeout || 30000; // 30 seconds default
  }

  /**
   * Convert a document to markdown
   */
  async convertDocument(filePath: string): Promise<DocumentConversionResult> {
    const startTime = Date.now();
    const fileName = basename(filePath);
    const documentType = this.detectDocumentType(filePath);

    logger.info('Starting document conversion', { filePath, documentType });

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Document conversion timed out after ${this.conversionTimeout}ms`));
        }, this.conversionTimeout);
      });

      // Convert document with timeout
      const conversionPromise = this.docling.convert(filePath, fileName, {
        to_formats: ['md', 'json'],
      });

      const result = await Promise.race([conversionPromise, timeoutPromise]);

      // Extract markdown content
      const markdown = result.markdown || '';
      
      // Extract metadata from docling result
      const metadata: DocumentMetadata = {
        title: result.metadata?.title || fileName,
        format: documentType,
        pageCount: result.metadata?.page_count,
        wordCount: this.countWords(markdown),
        hasImages: result.metadata?.has_images || false,
        hasTables: result.metadata?.has_tables || false,
        conversionDuration: Date.now() - startTime,
      };

      logger.info('Document conversion completed', { filePath, duration: metadata.conversionDuration, wordCount: metadata.wordCount });

      return {
        markdown,
        metadata,
        doclingDocument: result.document, // For HybridChunker
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof Error && error.message.includes('timed out')) {
        logger.warn('Document conversion timed out, attempting fallback', { filePath, duration });
        return this.fallbackTextExtraction(filePath, documentType, duration);
      }

      logger.error('Document conversion failed, attempting fallback', error instanceof Error ? error : undefined, { filePath, duration });
      return this.fallbackTextExtraction(filePath, documentType, duration);
    }
  }

  /**
   * Fallback to simple text extraction when conversion fails
   */
  private async fallbackTextExtraction(
    filePath: string,
    documentType: DocumentType,
    duration: number
  ): Promise<DocumentConversionResult> {
    try {
      // For text-based formats, read directly
      if (documentType === 'text' || documentType === 'markdown') {
        const content = await readFile(filePath, 'utf-8');
        const fileName = basename(filePath);
        
        return {
          markdown: content,
          metadata: {
            title: fileName,
            format: documentType,
            wordCount: this.countWords(content),
            hasImages: false,
            hasTables: false,
            conversionDuration: duration,
          },
        };
      }

      // For other formats, return error
      throw new Error(`Fallback text extraction not supported for ${documentType} files`);
    } catch (error) {
      logger.error('Fallback text extraction failed', error instanceof Error ? error : undefined, { filePath });
      throw new Error(
        `Failed to convert document ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Detect document type by file extension
   */
  private detectDocumentType(filePath: string): DocumentType {
    const ext = extname(filePath).toLowerCase();
    
    const typeMap: Record<string, DocumentType> = {
      '.pdf': 'pdf',
      '.docx': 'docx',
      '.doc': 'docx',
      '.pptx': 'pptx',
      '.ppt': 'pptx',
      '.xlsx': 'xlsx',
      '.xls': 'xlsx',
      '.html': 'html',
      '.htm': 'html',
      '.md': 'markdown',
      '.markdown': 'markdown',
      '.txt': 'text',
      '.mp3': 'audio',
      '.wav': 'audio',
      '.m4a': 'audio',
      '.flac': 'audio',
    };

    const documentType = typeMap[ext];
    if (!documentType) {
      throw new Error(`Unsupported file format: ${ext}`);
    }

    return documentType;
  }

  /**
   * Get list of supported document formats
   */
  getSupportedFormats(): string[] {
    return [
      '.pdf',
      '.docx',
      '.doc',
      '.pptx',
      '.ppt',
      '.xlsx',
      '.xls',
      '.html',
      '.htm',
      '.md',
      '.markdown',
      '.txt',
      '.mp3',
      '.wav',
      '.m4a',
      '.flac',
    ];
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}
