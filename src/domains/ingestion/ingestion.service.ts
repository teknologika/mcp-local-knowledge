/**
 * Ingestion Orchestration Service
 * 
 * Coordinates the complete ingestion pipeline:
 * - File scanning
 * - Document conversion and chunking
 * - Embedding generation
 * - Storage in LanceDB
 * 
 * Handles re-ingestion by deleting existing chunks before storing new ones.
 * Processes files in batches for memory efficiency.
 * 
 * Requirements: 2.1, 2.3, 2.5, 2.6, 6.2, 6.3, 12.4, 14.1, 14.2, 14.3
 */

import type { Config, IngestionParams, IngestionStats, Chunk, DocumentType } from '../../shared/types/index.js';
import { FileScannerService, type ScannedFile } from './file-scanner.service.js';
import type { EmbeddingService } from '../embedding/embedding.service.js';
import { DocumentConverterService } from '../document/document-converter.service.js';
import { DocumentChunkerService } from '../document/document-chunker.service.js';
import { LanceDBClientWrapper } from '../../infrastructure/lancedb/lancedb.client.js';
import { createLogger, startTimer, logMemoryUsage } from '../../shared/logging/index.js';
import type { Logger } from '../../shared/logging/logger.js';

const rootLogger = createLogger('info');

/**
 * Error thrown when ingestion operations fail
 */
export class IngestionError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'IngestionError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Progress callback for ingestion operations
 */
export type ProgressCallback = (phase: string, current: number, total: number) => void;

/**
 * Ingestion orchestration service
 */
export class IngestionService {
  private fileScanner: FileScannerService;
  private embeddingService: EmbeddingService;
  private documentConverter: DocumentConverterService;
  private documentChunker: DocumentChunkerService;
  private lanceClient: LanceDBClientWrapper;
  private config: Config;
  private logger: Logger;

  constructor(
    embeddingService: EmbeddingService,
    lanceClient: LanceDBClientWrapper,
    config: Config
  ) {
    this.fileScanner = new FileScannerService();
    this.embeddingService = embeddingService;
    this.documentConverter = new DocumentConverterService({
      outputDir: './temp',
      conversionTimeout: config.document?.conversionTimeout || 30000,
    });
    this.documentChunker = new DocumentChunkerService({
      outputDir: './temp',
    });
    this.lanceClient = lanceClient;
    this.config = config;
    this.logger = rootLogger.child('IngestionService');
  }

  /**
   * Ingest individual files into an existing knowledge base
   * 
   * @param params - File ingestion parameters
   * @returns Ingestion statistics
   */
  async ingestFiles(params: {
    files: string[];
    knowledgeBaseName: string;
    config: Config;
  }): Promise<{ filesProcessed: number; chunksCreated: number; errors: Array<{ filePath: string; error: string }> }> {
    const { files, knowledgeBaseName } = params;
    
    this.logger.info('Starting file ingestion', {
      knowledgeBaseName,
      fileCount: files.length,
    });

    const allChunks: Chunk[] = [];
    let processedFiles = 0;
    const errors: Array<{ filePath: string; error: string }> = [];
    const ingestionTimestamp = new Date().toISOString();

    // Process each file
    for (const filePath of files) {
      try {
        // Convert document to markdown
        const conversionResult = await this.documentConverter.convertDocument(filePath);

        // Chunk the document
        let documentChunks;
        if (conversionResult.doclingDocument) {
          documentChunks = await this.documentChunker.chunkWithDocling(
            conversionResult.doclingDocument,
            {
              maxTokens: this.config.document?.maxTokens || 512,
              chunkSize: this.config.document?.chunkSize || 1000,
              chunkOverlap: this.config.document?.chunkOverlap || 200,
            }
          );
        } else {
          documentChunks = await this.documentChunker.chunkDocument(
            conversionResult.markdown,
            {
              maxTokens: this.config.document?.maxTokens || 512,
              chunkSize: this.config.document?.chunkSize || 1000,
              chunkOverlap: this.config.document?.chunkOverlap || 200,
            }
          );
        }

        // Determine document type from file extension
        const ext = '.' + filePath.split('.').pop()?.toLowerCase();
        const documentType = this.getDocumentType(ext);

        // Transform to Chunk format
        for (const docChunk of documentChunks) {
          allChunks.push({
            content: docChunk.content,
            filePath: filePath.split('/').pop() || filePath, // Use filename only
            startLine: 0,
            endLine: 0,
            chunkType: docChunk.metadata.chunkType,
            isTestFile: false,
            documentType,
            tokenCount: docChunk.tokenCount,
            headingPath: docChunk.metadata.headingPath,
            pageNumber: docChunk.metadata.pageNumber,
          });
        }

        processedFiles++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(
          'Failed to process file',
          error instanceof Error ? error : new Error(errorMessage),
          { filePath }
        );
        errors.push({
          filePath,
          error: errorMessage,
        });
      }
    }

    this.logger.info('File processing completed', {
      totalChunks: allChunks.length,
      processedFiles,
      errors: errors.length,
    });

    // Generate embeddings
    const chunksWithEmbeddings = await this.generateEmbeddingsBatch(allChunks);

    // Store chunks
    if (chunksWithEmbeddings.length > 0) {
      await this.storeChunks(
        knowledgeBaseName,
        '', // No base path for individual files
        chunksWithEmbeddings,
        ingestionTimestamp,
        processedFiles
      );
    }

    return {
      filesProcessed: processedFiles,
      chunksCreated: allChunks.length,
      errors,
    };
  }

  /**
   * Get document type from file extension
   */
  private getDocumentType(ext: string): DocumentType {
    if (ext === '.pdf') return 'pdf';
    if (['.docx', '.doc'].includes(ext)) return 'docx';
    if (['.pptx', '.ppt'].includes(ext)) return 'pptx';
    if (['.xlsx', '.xls'].includes(ext)) return 'xlsx';
    if (['.html', '.htm'].includes(ext)) return 'html';
    if (['.md', '.markdown'].includes(ext)) return 'markdown';
    if (['.mp3', '.wav', '.m4a', '.flac'].includes(ext)) return 'audio';
    return 'text';
  }

  /**
   * Ingest a knowledge base
   * 
   * @param params - Ingestion parameters
   * @param progressCallback - Optional callback for progress updates
   * @returns Ingestion statistics
   */
  async ingestCodebase(
    params: IngestionParams,
    progressCallback?: ProgressCallback
  ): Promise<IngestionStats> {
    const overallTimer = startTimer('ingestCodebase', this.logger, {
      codebaseName: params.name,
    });
    const { path: codebasePath, name: codebaseName } = params;

    this.logger.info('Starting knowledge base ingestion', {
      codebaseName,
      codebasePath,
    });

    // Log initial memory usage
    logMemoryUsage(this.logger, { phase: 'start', codebaseName });

    try {
      // Generate unique ingestion timestamp
      const ingestionTimestamp = new Date().toISOString();

      // Phase 1: Scan directory for files
      this.logger.info('Phase 1: Scanning directory', { codebasePath });
      progressCallback?.('Scanning directory', 0, 1);

      const scanTimer = startTimer('scanDirectory', this.logger);
      const { files, statistics: scanStats } = await this.fileScanner.scanDirectory(
        codebasePath,
        {
          respectGitignore: params.respectGitignore ?? true,
          skipHiddenDirectories: true,
          maxFileSize: this.config.ingestion.maxFileSize,
        }
      );
      scanTimer.end();

      const supportedFiles = this.fileScanner.getSupportedFiles(files);
      const unsupportedFiles = this.fileScanner.getUnsupportedFiles(files);

      this.logger.info('Directory scan completed', {
        totalFiles: scanStats.totalFiles,
        supportedFiles: scanStats.supportedFiles,
        unsupportedFiles: scanStats.unsupportedFiles,
      });

      // Log warnings for unsupported files
      this.logUnsupportedFiles(unsupportedFiles);

      // Phase 2: Convert and chunk documents
      this.logger.info('Phase 2: Converting and chunking documents', {
        fileCount: supportedFiles.length,
      });

      const parseTimer = startTimer('processAllDocuments', this.logger, {
        fileCount: supportedFiles.length,
      });

      const allChunks: Chunk[] = [];
      let processedFiles = 0;
      const errors: Array<{ filePath: string; error: string }> = [];

      // Process files in batches
      const batchSize = this.config.ingestion.batchSize;
      for (let i = 0; i < supportedFiles.length; i += batchSize) {
        const batch = supportedFiles.slice(i, i + batchSize);

        for (const file of batch) {
          try {
            // Convert document to markdown
            const conversionResult = await this.documentConverter.convertDocument(file.path);

            // Chunk the document
            let documentChunks;
            if (conversionResult.doclingDocument) {
              // Use Docling document object for better chunking
              documentChunks = await this.documentChunker.chunkWithDocling(
                conversionResult.doclingDocument,
                {
                  maxTokens: this.config.document?.maxTokens || 512,
                  chunkSize: this.config.document?.chunkSize || 1000,
                  chunkOverlap: this.config.document?.chunkOverlap || 200,
                }
              );
            } else {
              // Fallback to markdown chunking
              documentChunks = await this.documentChunker.chunkDocument(
                conversionResult.markdown,
                {
                  maxTokens: this.config.document?.maxTokens || 512,
                  chunkSize: this.config.document?.chunkSize || 1000,
                  chunkOverlap: this.config.document?.chunkOverlap || 200,
                }
              );
            }

            // Transform to Chunk format
            for (const docChunk of documentChunks) {
              allChunks.push({
                content: docChunk.content,
                filePath: file.relativePath,
                startLine: 0,
                endLine: 0,
                chunkType: docChunk.metadata.chunkType,
                isTestFile: file.isTest,
                documentType: file.documentType,
                tokenCount: docChunk.tokenCount,
                headingPath: docChunk.metadata.headingPath,
                pageNumber: docChunk.metadata.pageNumber,
              });
            }

            processedFiles++;
            progressCallback?.('Processing documents', processedFiles, supportedFiles.length);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(
              'Failed to process document',
              error instanceof Error ? error : new Error(errorMessage),
              { filePath: file.relativePath }
            );
            errors.push({
              filePath: file.relativePath,
              error: errorMessage,
            });
          }
        }
      }

      parseTimer.end();

      this.logger.info('Document processing completed', {
        totalChunks: allChunks.length,
        processedFiles,
        errors: errors.length,
      });

      if (errors.length > 0) {
        this.logger.warn('Some documents failed to process', {
          errorCount: errors.length,
          errors: errors.slice(0, 10), // Log first 10 errors
        });
      }

      // Log memory after parsing
      logMemoryUsage(this.logger, { phase: 'afterParsing', codebaseName, chunkCount: allChunks.length });

      // Phase 3: Handle re-ingestion (delete existing chunks)
      const previousChunkCount = await this.handleReingestion(codebaseName);

      // Phase 4: Generate embeddings in batches
      this.logger.info('Phase 3: Generating embeddings', {
        chunkCount: allChunks.length,
        batchSize: this.config.ingestion.batchSize,
      });

      const embeddingTimer = startTimer('generateAllEmbeddings', this.logger, {
        chunkCount: allChunks.length,
      });

      const chunksWithEmbeddings = await this.generateEmbeddingsBatch(
        allChunks,
        progressCallback
      );

      embeddingTimer.end();

      // Log memory after embeddings
      logMemoryUsage(this.logger, { phase: 'afterEmbeddings', codebaseName, chunkCount: chunksWithEmbeddings.length });

      // Phase 5: Store in LanceDB
      this.logger.info('Phase 4: Storing chunks in LanceDB', {
        chunkCount: chunksWithEmbeddings.length,
      });

      const storeTimer = startTimer('storeAllChunks', this.logger, {
        chunkCount: chunksWithEmbeddings.length,
      });

      await this.storeChunks(
        codebaseName,
        codebasePath,
        chunksWithEmbeddings,
        ingestionTimestamp,
        supportedFiles.length,
        progressCallback
      );

      storeTimer.end();

      // Calculate statistics
      const durationMs = overallTimer.end();
      const chunkDiff = allChunks.length - previousChunkCount;

      // Log final memory usage
      logMemoryUsage(this.logger, { phase: 'complete', codebaseName });

      const stats: IngestionStats = {
        totalFiles: scanStats.totalFiles,
        supportedFiles: scanStats.supportedFiles,
        unsupportedFiles: scanStats.unsupportedByExtension,
        chunksCreated: allChunks.length,
        durationMs,
      };

      this.logger.info('Ingestion completed successfully', {
        codebaseName,
        ...stats,
        chunkDiff,
        previousChunkCount,
      });

      return stats;
    } catch (error) {
      overallTimer.end();
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Ingestion failed',
        error instanceof Error ? error : new Error(errorMessage),
        { codebaseName, codebasePath }
      );
      throw new IngestionError(
        `Failed to ingest knowledge base '${codebaseName}': ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Handle re-ingestion by deleting existing chunks
   * Returns the previous chunk count
   */
  private async handleReingestion(codebaseName: string): Promise<number> {
    try {
      const exists = await this.lanceClient.tableExists(codebaseName);
      
      if (!exists) {
        this.logger.info('First-time ingestion, no existing chunks to delete', {
          codebaseName,
        });
        return 0;
      }

      this.logger.info('Re-ingestion detected, deleting existing chunks', {
        codebaseName,
      });

      // Get current chunk count before deletion
      const table = await this.lanceClient.getOrCreateTable(codebaseName);
      const previousCount = table ? await table.countRows() : 0;

      // Delete the table
      await this.lanceClient.deleteTable(codebaseName);

      this.logger.info('Existing chunks deleted', {
        codebaseName,
        previousChunkCount: previousCount,
      });

      return previousCount;
    } catch (error) {
      this.logger.error(
        'Failed to handle re-ingestion',
        error instanceof Error ? error : new Error(String(error)),
        { codebaseName }
      );
      throw error;
    }
  }

  /**
   * Generate embeddings for chunks in batches
   */
  private async generateEmbeddingsBatch(
    chunks: Chunk[],
    progressCallback?: ProgressCallback
  ): Promise<Array<Chunk & { embedding: number[] }>> {
    const batchSize = this.config.ingestion.batchSize;
    const chunksWithEmbeddings: Array<Chunk & { embedding: number[] }> = [];
    let processedCount = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchTexts = batch.map((chunk) => chunk.content);

      try {
        const embeddings = await this.embeddingService.batchGenerateEmbeddings(batchTexts);

        // Combine chunks with their embeddings
        for (let j = 0; j < batch.length; j++) {
          if (embeddings[j]) {
            chunksWithEmbeddings.push({
              ...batch[j],
              embedding: embeddings[j],
            });
          } else {
            this.logger.warn('Embedding generation failed for chunk, skipping', {
              filePath: batch[j].filePath,
              startLine: batch[j].startLine,
            });
          }
        }

        processedCount += batch.length;
        progressCallback?.('Generating embeddings', processedCount, chunks.length);

        this.logger.debug('Batch embeddings generated', {
          batchIndex: Math.floor(i / batchSize) + 1,
          batchSize: batch.length,
          successCount: embeddings.filter((e) => e).length,
        });
      } catch (error) {
        // Log error and continue with next batch
        this.logger.error(
          'Failed to generate embeddings for batch, skipping',
          error instanceof Error ? error : new Error(String(error)),
          {
            batchIndex: Math.floor(i / batchSize) + 1,
            batchSize: batch.length,
          }
        );
      }
    }

    return chunksWithEmbeddings;
  }

  /**
   * Store chunks in LanceDB
   */
  private async storeChunks(
    codebaseName: string,
    codebasePath: string,
    chunks: Array<Chunk & { embedding: number[] }>,
    ingestionTimestamp: string,
    _fileCount: number,
    progressCallback?: ProgressCallback
  ): Promise<void> {
    if (chunks.length === 0) {
      this.logger.warn('No chunks to store', { codebaseName });
      return;
    }

    // Store chunks in batches
    const batchSize = this.config.ingestion.batchSize;
    let storedCount = 0;
    let table: any = null;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      // Transform chunks to LanceDB row format
      const rows = batch.map((chunk, idx) => ({
        id: `${codebaseName}_${ingestionTimestamp}_${i + idx}`,
        vector: chunk.embedding,
        content: chunk.content || '',
        filePath: chunk.filePath || '',
        startLine: chunk.startLine || 0,
        endLine: chunk.endLine || 0,
        chunkType: chunk.chunkType || 'paragraph',
        documentType: chunk.documentType || 'text',
        tokenCount: chunk.tokenCount || 0,
        isTestFile: chunk.isTestFile || false,
        headingPath: chunk.headingPath || [],
        pageNumber: chunk.pageNumber,
        ingestionTimestamp,
        _knowledgeBaseName: codebaseName,
        _path: codebasePath,
        _lastIngestion: ingestionTimestamp,
      }));

      // Debug: Log first row structure
      if (i === 0 && rows.length > 0) {
        this.logger.debug('First row structure', {
          id: rows[0].id,
          vectorLength: rows[0].vector?.length,
          contentLength: rows[0].content.length,
          filePath: rows[0].filePath,
          hasAllFields: Object.keys(rows[0]).join(','),
        });
      }

      try {
        // For first batch, create table if it doesn't exist
        if (i === 0) {
          table = await this.lanceClient.getOrCreateTable(codebaseName);
          if (!table) {
            // Table doesn't exist, create it with first batch
            this.logger.info('Creating new table with first batch', {
              codebaseName,
              batchSize: rows.length,
            });
            table = await this.lanceClient.createTableWithData(codebaseName, rows);
            storedCount += batch.length;
            progressCallback?.('Storing chunks', storedCount, chunks.length);
            continue; // Skip the add() call below since we already created with data
          }
        }

        // Add batch to existing table
        await table.add(rows);

        storedCount += batch.length;
        progressCallback?.('Storing chunks', storedCount, chunks.length);

        this.logger.debug('Batch stored successfully', {
          batchIndex: Math.floor(i / batchSize) + 1,
          batchSize: batch.length,
        });
      } catch (error) {
        this.logger.error(
          'Failed to store batch',
          error instanceof Error ? error : new Error(String(error)),
          {
            batchIndex: Math.floor(i / batchSize) + 1,
            batchSize: batch.length,
          }
        );
        throw error;
      }
    }

    this.logger.info('All chunks stored successfully', {
      codebaseName,
      chunkCount: storedCount,
    });
  }

  /**
   * Log warnings for unsupported files
   */
  private logUnsupportedFiles(unsupportedFiles: ScannedFile[]): void {
    if (unsupportedFiles.length === 0) {
      return;
    }

    // Group by extension
    const byExtension = new Map<string, string[]>();
    for (const file of unsupportedFiles) {
      const ext = file.extension || '(no extension)';
      if (!byExtension.has(ext)) {
        byExtension.set(ext, []);
      }
      byExtension.get(ext)!.push(file.relativePath);
    }

    // Log summary
    this.logger.warn('Unsupported files detected', {
      totalUnsupported: unsupportedFiles.length,
      byExtension: Array.from(byExtension.entries()).map(([ext, files]) => ({
        extension: ext,
        count: files.length,
      })),
    });

    // Log individual files at debug level
    for (const file of unsupportedFiles) {
      this.logger.debug('Skipping unsupported file', {
        filePath: file.relativePath,
        extension: file.extension,
      });
    }
  }
}
