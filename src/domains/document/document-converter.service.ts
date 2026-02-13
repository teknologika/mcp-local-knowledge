import { readFile, mkdir } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { spawn } from 'node:child_process';
import type { DocumentConversionResult, DocumentMetadata } from './document.types.js';
import type { DocumentType } from '../../shared/types/index.js';
import { createLogger } from '../../shared/logging/index.js';

const rootLogger = createLogger('info');
const logger = rootLogger.child('DocumentConverterService');

/**
 * Service for converting various document formats to markdown using docling CLI
 */
export class DocumentConverterService {
  private conversionTimeout: number;
  private outputDir: string;

  constructor(options: { outputDir?: string; conversionTimeout?: number } = {}) {
    this.outputDir = options.outputDir || './temp';
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

    // For text-based formats (markdown, text, HTML), skip Docling and read directly
    if (documentType === 'text' || documentType === 'markdown' || documentType === 'html') {
      try {
        const content = await readFile(filePath, 'utf-8');
        const duration = Date.now() - startTime;
        
        logger.info('Document conversion completed (direct read)', { 
          filePath, 
          duration, 
          wordCount: this.countWords(content) 
        });
        
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
      } catch (error) {
        logger.error('Failed to read text file', error instanceof Error ? error : undefined, { filePath });
        throw new Error(
          `Failed to read document ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // For binary formats (PDF, Office docs, audio), use Docling CLI directly
    try {
      // Ensure output directory exists
      await mkdir(this.outputDir, { recursive: true });
      
      // Build docling CLI command
      const baseNameWithoutExt = basename(fileName, extname(fileName));
      const args = [
        '--ocr',  // Enable OCR for scanned PDFs
        '--image-export-mode', 'placeholder',  // Use placeholders instead of base64 images
        filePath,
        '--to', 'md',  // Output markdown format
        '--to', 'json',  // Output JSON format
        '--output', this.outputDir,
      ];
      
      logger.info('Executing docling CLI', { args, outputDir: this.outputDir });
      
      // Execute docling CLI with timeout
      const { stderr, exitCode } = await this.executeDoclingCLI(args);
      
      if (exitCode !== 0) {
        throw new Error(`Docling CLI failed with exit code ${exitCode}: ${stderr}`);
      }
      
      // Read the generated markdown and JSON files
      const mdPath = join(this.outputDir, `${baseNameWithoutExt}.md`);
      const jsonPath = join(this.outputDir, `${baseNameWithoutExt}.json`);
      
      let markdown = '';
      let jsonContent: any = null;
      
      try {
        markdown = await readFile(mdPath, 'utf-8');
        logger.info('Successfully read markdown from disk', { mdPath, length: markdown.length });
      } catch (error) {
        logger.warn('Failed to read markdown file', { mdPath, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      
      try {
        const jsonText = await readFile(jsonPath, 'utf-8');
        jsonContent = JSON.parse(jsonText);
        logger.info('Successfully read JSON from disk', { jsonPath });
      } catch (error) {
        logger.warn('Failed to read JSON file', { jsonPath, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      
      // Extract metadata from JSON content
      const metadata: DocumentMetadata = {
        title: jsonContent?.name || fileName,
        format: documentType,
        pageCount: jsonContent?.page_count,
        wordCount: this.countWords(markdown),
        hasImages: jsonContent?.has_images || false,
        hasTables: jsonContent?.has_tables || false,
        conversionDuration: Date.now() - startTime,
      };

      logger.info('Document conversion completed', { filePath, duration: metadata.conversionDuration, wordCount: metadata.wordCount });

      return {
        markdown,
        metadata,
        doclingDocument: jsonContent, // For HybridChunker
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
   * Execute docling CLI command with timeout
   */
  private async executeDoclingCLI(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const child = spawn('docling', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 1000);
        reject(new Error(`Docling CLI timed out after ${this.conversionTimeout}ms`));
      }, this.conversionTimeout);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        if (!timedOut) {
          reject(new Error(`Failed to spawn docling CLI: ${error.message}`));
        }
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (!timedOut) {
          resolve({
            stdout,
            stderr,
            exitCode: code || 0,
          });
        }
      });
    });
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
