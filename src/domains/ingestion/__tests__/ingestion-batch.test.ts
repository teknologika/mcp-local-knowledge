/**
 * Unit tests for IngestionService - Batch Processing
 * Task 4.4.6: Test batch processing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IngestionService } from '../ingestion.service.js';
import { FileScannerService } from '../file-scanner.service.js';
import { DocumentConverterService } from '../../document/document-converter.service.js';
import { DocumentChunkerService } from '../../document/document-chunker.service.js';
import type { EmbeddingService } from '../../embedding/embedding.service.js';
import { LanceDBClientWrapper } from '../../../infrastructure/lancedb/lancedb.client.js';
import type { Config } from '../../../shared/types/index.js';

// Mock all dependencies
vi.mock('../file-scanner.service.js');
vi.mock('../../document/document-converter.service.js');
vi.mock('../../document/document-chunker.service.js');
vi.mock('../../../infrastructure/lancedb/lancedb.client.js');
vi.mock('../../../shared/logging/index.js', () => ({
  createLogger: vi.fn(() => {
    const mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(),
    };
    mockLogger.child.mockReturnValue(mockLogger);
    return mockLogger;
  }),
  startTimer: vi.fn(() => ({
    end: vi.fn(() => 1000),
  })),
  logMemoryUsage: vi.fn(),
}));

describe('IngestionService - Batch Processing (Task 4.4.6)', () => {
  let service: IngestionService;
  let mockEmbeddingService: EmbeddingService;
  let mockLanceClient: LanceDBClientWrapper;
  let mockFileScanner: FileScannerService;
  let mockDocumentConverter: DocumentConverterService;
  let mockDocumentChunker: DocumentChunkerService;
  let config: Config;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      lancedb: { persistPath: './test-db' },
      embedding: { modelName: 'test-model', cachePath: './test-cache' },
      server: { port: 8008, host: 'localhost' },
      mcp: { transport: 'stdio' },
      ingestion: { batchSize: 100, maxFileSize: 10485760 },
      search: { defaultMaxResults: 50, cacheTimeoutSeconds: 60 },
      document: {
        conversionTimeout: 30000,
        maxTokens: 512,
        chunkSize: 1000,
        chunkOverlap: 200,
      },
      logging: { level: 'info' },
      schemaVersion: '1.0.0',
    } as Config;

    mockEmbeddingService = {
      batchGenerateEmbeddings: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    } as any;

    mockLanceClient = {
      tableExists: vi.fn().mockResolvedValue(false),
      getOrCreateTable: vi.fn().mockResolvedValue(null),
      createTableWithData: vi.fn().mockResolvedValue({
        add: vi.fn().mockResolvedValue(undefined),
        countRows: vi.fn().mockResolvedValue(0),
      }),
      deleteTable: vi.fn().mockResolvedValue(undefined),
    } as any;

    service = new IngestionService(mockEmbeddingService, mockLanceClient, config);

    mockFileScanner = (service as any).fileScanner;
    mockDocumentConverter = (service as any).documentConverter;
    mockDocumentChunker = (service as any).documentChunker;
  });

  describe('File batch processing', () => {
    it('should process files in batches of default size (100)', async () => {
      // Arrange
      const mockFiles = Array.from({ length: 250 }, (_, i) => ({
        path: `/test/doc${i}.pdf`,
        relativePath: `doc${i}.pdf`,
        size: 1000,
        documentType: 'pdf' as const,
        isTest: false,
        extension: '.pdf',
      }));

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: mockFiles,
        statistics: { totalFiles: 250, supportedFiles: 250, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue(mockFiles);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# Test',
        metadata: { title: 'Test', format: 'pdf', wordCount: 1, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk', index: 0, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.chunksCreated).toBe(250);
      expect(mockDocumentConverter.convertDocument).toHaveBeenCalledTimes(250);
    });

    it('should use custom batch size from config', async () => {
      // Arrange
      const customConfig = {
        ...config,
        ingestion: {
          ...config.ingestion,
          batchSize: 50,
        },
      };

      service = new IngestionService(mockEmbeddingService, mockLanceClient, customConfig);
      mockFileScanner = (service as any).fileScanner;
      mockDocumentConverter = (service as any).documentConverter;
      mockDocumentChunker = (service as any).documentChunker;

      const mockFiles = Array.from({ length: 150 }, (_, i) => ({
        path: `/test/doc${i}.pdf`,
        relativePath: `doc${i}.pdf`,
        size: 1000,
        documentType: 'pdf' as const,
        isTest: false,
        extension: '.pdf',
      }));

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: mockFiles,
        statistics: { totalFiles: 150, supportedFiles: 150, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue(mockFiles);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# Test',
        metadata: { title: 'Test', format: 'pdf', wordCount: 1, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk', index: 0, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.chunksCreated).toBe(150);
    });

    it('should handle partial batches correctly', async () => {
      // Arrange
      const mockFiles = Array.from({ length: 125 }, (_, i) => ({
        path: `/test/doc${i}.pdf`,
        relativePath: `doc${i}.pdf`,
        size: 1000,
        documentType: 'pdf' as const,
        isTest: false,
        extension: '.pdf',
      }));

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: mockFiles,
        statistics: { totalFiles: 125, supportedFiles: 125, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue(mockFiles);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# Test',
        metadata: { title: 'Test', format: 'pdf', wordCount: 1, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk', index: 0, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.chunksCreated).toBe(125);
      expect(mockDocumentConverter.convertDocument).toHaveBeenCalledTimes(125);
    });
  });

  describe('Embedding batch processing', () => {
    it('should generate embeddings in batches', async () => {
      // Arrange
      const mockFiles = Array.from({ length: 10 }, (_, i) => ({
        path: `/test/doc${i}.pdf`,
        relativePath: `doc${i}.pdf`,
        size: 1000,
        documentType: 'pdf' as const,
        isTest: false,
        extension: '.pdf',
      }));

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: mockFiles,
        statistics: { totalFiles: 10, supportedFiles: 10, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue(mockFiles);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# Test',
        metadata: { title: 'Test', format: 'pdf', wordCount: 1, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk', index: 0, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      mockEmbeddingService.batchGenerateEmbeddings = vi.fn().mockResolvedValue(
        Array(10).fill([0.1, 0.2, 0.3])
      );

      // Act
      await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(mockEmbeddingService.batchGenerateEmbeddings).toHaveBeenCalled();
    });

    it('should handle embedding batch failures gracefully', async () => {
      // Arrange
      const mockFiles = Array.from({ length: 5 }, (_, i) => ({
        path: `/test/doc${i}.pdf`,
        relativePath: `doc${i}.pdf`,
        size: 1000,
        documentType: 'pdf' as const,
        isTest: false,
        extension: '.pdf',
      }));

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: mockFiles,
        statistics: { totalFiles: 5, supportedFiles: 5, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue(mockFiles);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# Test',
        metadata: { title: 'Test', format: 'pdf', wordCount: 1, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk', index: 0, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // First batch succeeds, second fails
      mockEmbeddingService.batchGenerateEmbeddings = vi.fn()
        .mockResolvedValueOnce(Array(3).fill([0.1, 0.2, 0.3]))
        .mockRejectedValueOnce(new Error('Embedding failed'));

      // Act & Assert
      await expect(service.ingestCodebase({ name: 'test-kb', path: '/test' })).rejects.toThrow();
    });

    it('should skip chunks with failed embeddings', async () => {
      // Arrange
      const mockFile = {
        path: '/test/doc.pdf',
        relativePath: 'doc.pdf',
        size: 1000,
        documentType: 'pdf' as const,
        isTest: false,
        extension: '.pdf',
      };

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: [mockFile],
        statistics: { totalFiles: 1, supportedFiles: 1, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue([mockFile]);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# Test',
        metadata: { title: 'Test', format: 'pdf', wordCount: 1, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk 1', index: 0, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
        { content: 'Chunk 2', index: 1, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // Return null for second embedding (failed)
      mockEmbeddingService.batchGenerateEmbeddings = vi.fn().mockResolvedValue([
        [0.1, 0.2, 0.3],
        null,
      ]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.chunksCreated).toBe(2); // Both chunks created, but only 1 stored
    });
  });

  describe('Storage batch processing', () => {
    it('should store chunks in batches', async () => {
      // Arrange
      const mockFiles = Array.from({ length: 5 }, (_, i) => ({
        path: `/test/doc${i}.pdf`,
        relativePath: `doc${i}.pdf`,
        size: 1000,
        documentType: 'pdf' as const,
        isTest: false,
        extension: '.pdf',
      }));

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: mockFiles,
        statistics: { totalFiles: 5, supportedFiles: 5, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue(mockFiles);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# Test',
        metadata: { title: 'Test', format: 'pdf', wordCount: 1, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      // Each file produces 2 chunks
      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk 1', index: 0, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
        { content: 'Chunk 2', index: 1, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      const mockTable = {
        add: vi.fn().mockResolvedValue(undefined),
        countRows: vi.fn().mockResolvedValue(0),
      };

      mockLanceClient.createTableWithData = vi.fn().mockResolvedValue(mockTable);

      // Act
      await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      // Should create table with first batch, then add remaining batches
      expect(mockLanceClient.createTableWithData).toHaveBeenCalledTimes(1);
    });

    it('should handle storage batch failures', async () => {
      // Arrange
      const mockFile = {
        path: '/test/doc.pdf',
        relativePath: 'doc.pdf',
        size: 1000,
        documentType: 'pdf' as const,
        isTest: false,
        extension: '.pdf',
      };

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: [mockFile],
        statistics: { totalFiles: 1, supportedFiles: 1, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue([mockFile]);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# Test',
        metadata: { title: 'Test', format: 'pdf', wordCount: 1, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk', index: 0, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      mockLanceClient.createTableWithData = vi.fn().mockRejectedValue(
        new Error('Storage failed')
      );

      // Act & Assert
      await expect(service.ingestCodebase({ name: 'test-kb', path: '/test' })).rejects.toThrow();
    });
  });
});
