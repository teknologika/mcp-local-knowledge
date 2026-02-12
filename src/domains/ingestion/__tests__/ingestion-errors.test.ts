/**
 * Unit tests for IngestionService - Error Handling
 * Task 4.4.4: Test error handling
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

describe('IngestionService - Error Handling (Task 4.4.4)', () => {
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

  describe('Error resilience', () => {
    it('should continue processing when individual file conversion fails', async () => {
      // Arrange
      const mockFiles = [
        { path: '/test/good.pdf', relativePath: 'good.pdf', size: 1000, documentType: 'pdf', isTest: false, extension: '.pdf' },
        { path: '/test/bad.pdf', relativePath: 'bad.pdf', size: 1000, documentType: 'pdf', isTest: false, extension: '.pdf' },
        { path: '/test/good2.pdf', relativePath: 'good2.pdf', size: 1000, documentType: 'pdf', isTest: false, extension: '.pdf' },
      ];

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: mockFiles,
        statistics: { totalFiles: 3, supportedFiles: 3, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue(mockFiles);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn()
        .mockResolvedValueOnce({
          markdown: '# Good 1',
          metadata: { title: 'Good 1', format: 'pdf', wordCount: 2, hasImages: false, hasTables: false },
          doclingDocument: null,
        })
        .mockRejectedValueOnce(new Error('Conversion failed'))
        .mockResolvedValueOnce({
          markdown: '# Good 2',
          metadata: { title: 'Good 2', format: 'pdf', wordCount: 2, hasImages: false, hasTables: false },
          doclingDocument: null,
        });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk', index: 0, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.chunksCreated).toBe(2); // Only 2 successful files
      expect(mockDocumentConverter.convertDocument).toHaveBeenCalledTimes(3);
    });

    it('should continue processing when individual file chunking fails', async () => {
      // Arrange
      const mockFiles = [
        { path: '/test/doc1.pdf', relativePath: 'doc1.pdf', size: 1000, documentType: 'pdf', isTest: false, extension: '.pdf' },
        { path: '/test/doc2.pdf', relativePath: 'doc2.pdf', size: 1000, documentType: 'pdf', isTest: false, extension: '.pdf' },
      ];

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: mockFiles,
        statistics: { totalFiles: 2, supportedFiles: 2, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue(mockFiles);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# Test',
        metadata: { title: 'Test', format: 'pdf', wordCount: 1, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn()
        .mockResolvedValueOnce([
          { content: 'Chunk', index: 0, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
        ])
        .mockRejectedValueOnce(new Error('Chunking failed'));

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.chunksCreated).toBe(1); // Only 1 successful file
    });

    it('should log errors for failed files', async () => {
      // Arrange
      const mockFile = {
        path: '/test/bad.pdf',
        relativePath: 'bad.pdf',
        size: 1000,
        documentType: 'pdf',
        isTest: false,
        extension: '.pdf',
      };

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: [mockFile],
        statistics: { totalFiles: 1, supportedFiles: 1, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue([mockFile]);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      const conversionError = new Error('PDF parsing failed');
      mockDocumentConverter.convertDocument = vi.fn().mockRejectedValue(conversionError);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.chunksCreated).toBe(0);
      // Logger should have been called with error
      const logger = (service as any).logger;
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle conversion timeout errors', async () => {
      // Arrange
      const mockFile = {
        path: '/test/large.pdf',
        relativePath: 'large.pdf',
        size: 5000000,
        documentType: 'pdf',
        isTest: false,
        extension: '.pdf',
      };

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: [mockFile],
        statistics: { totalFiles: 1, supportedFiles: 1, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue([mockFile]);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockRejectedValue(
        new Error('Conversion timeout after 30 seconds')
      );

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.chunksCreated).toBe(0);
    });

    it('should handle embedding generation errors gracefully', async () => {
      // Arrange
      const mockFile = {
        path: '/test/doc.pdf',
        relativePath: 'doc.pdf',
        size: 1000,
        documentType: 'pdf',
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

      mockEmbeddingService.batchGenerateEmbeddings = vi.fn().mockRejectedValue(
        new Error('Embedding model failed')
      );

      // Act & Assert
      await expect(service.ingestCodebase({ name: 'test-kb', path: '/test' })).rejects.toThrow();
    });

    it('should handle LanceDB storage errors', async () => {
      // Arrange
      const mockFile = {
        path: '/test/doc.pdf',
        relativePath: 'doc.pdf',
        size: 1000,
        documentType: 'pdf',
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
        new Error('Database write failed')
      );

      // Act & Assert
      await expect(service.ingestCodebase({ name: 'test-kb', path: '/test' })).rejects.toThrow();
    });

    it('should handle file scanner errors', async () => {
      // Arrange
      mockFileScanner.scanDirectory = vi.fn().mockRejectedValue(
        new Error('Permission denied')
      );

      // Act & Assert
      await expect(service.ingestCodebase({ name: 'test-kb', path: '/test' })).rejects.toThrow();
    });

    it('should provide descriptive error messages', async () => {
      // Arrange
      mockFileScanner.scanDirectory = vi.fn().mockRejectedValue(
        new Error('Directory not found')
      );

      // Act & Assert
      await expect(service.ingestCodebase({ name: 'test-kb', path: '/test' }))
        .rejects
        .toThrow(/Failed to ingest knowledge base/);
    });
  });

  describe('Re-ingestion handling', () => {
    it('should delete existing chunks before re-ingestion', async () => {
      // Arrange
      const mockFile = {
        path: '/test/doc.pdf',
        relativePath: 'doc.pdf',
        size: 1000,
        documentType: 'pdf',
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

      // Simulate existing table
      mockLanceClient.tableExists = vi.fn().mockResolvedValue(true);
      const mockExistingTable = {
        countRows: vi.fn().mockResolvedValue(100),
      };
      mockLanceClient.getOrCreateTable = vi.fn().mockResolvedValue(mockExistingTable);

      // Act
      await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(mockLanceClient.deleteTable).toHaveBeenCalledWith('test-kb');
    });

    it('should handle re-ingestion deletion errors', async () => {
      // Arrange
      const mockFile = {
        path: '/test/doc.pdf',
        relativePath: 'doc.pdf',
        size: 1000,
        documentType: 'pdf',
        isTest: false,
        extension: '.pdf',
      };

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: [mockFile],
        statistics: { totalFiles: 1, supportedFiles: 1, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue([mockFile]);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockLanceClient.tableExists = vi.fn().mockResolvedValue(true);
      mockLanceClient.getOrCreateTable = vi.fn().mockResolvedValue({
        countRows: vi.fn().mockResolvedValue(50),
      });
      mockLanceClient.deleteTable = vi.fn().mockRejectedValue(
        new Error('Failed to delete table')
      );

      // Act & Assert
      await expect(service.ingestCodebase({ name: 'test-kb', path: '/test' })).rejects.toThrow();
    });
  });
});
