/**
 * Unit tests for IngestionService - Progress Reporting
 * Task 4.4.5: Test progress reporting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IngestionService, type ProgressCallback } from '../ingestion.service.js';
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

describe('IngestionService - Progress Reporting (Task 4.4.5)', () => {
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

  describe('Progress callback', () => {
    it('should call progress callback for scanning phase', async () => {
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

      const progressCallback: ProgressCallback = vi.fn();

      // Act
      await service.ingestCodebase({ name: 'test-kb', path: '/test' }, progressCallback);

      // Assert
      expect(progressCallback).toHaveBeenCalledWith('Scanning directory', 0, 1);
    });

    it('should call progress callback for document processing phase', async () => {
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

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk', index: 0, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      const progressCallback: ProgressCallback = vi.fn();

      // Act
      await service.ingestCodebase({ name: 'test-kb', path: '/test' }, progressCallback);

      // Assert
      expect(progressCallback).toHaveBeenCalledWith('Processing documents', 1, 2);
      expect(progressCallback).toHaveBeenCalledWith('Processing documents', 2, 2);
    });

    it('should call progress callback for embedding generation phase', async () => {
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

      const progressCallback: ProgressCallback = vi.fn();

      // Act
      await service.ingestCodebase({ name: 'test-kb', path: '/test' }, progressCallback);

      // Assert
      expect(progressCallback).toHaveBeenCalledWith('Generating embeddings', expect.any(Number), 1);
    });

    it('should call progress callback for storage phase', async () => {
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

      const progressCallback: ProgressCallback = vi.fn();

      // Act
      await service.ingestCodebase({ name: 'test-kb', path: '/test' }, progressCallback);

      // Assert
      expect(progressCallback).toHaveBeenCalledWith('Storing chunks', expect.any(Number), 1);
    });

    it('should work without progress callback', async () => {
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

      // Act & Assert - should not throw
      await expect(service.ingestCodebase({ name: 'test-kb', path: '/test' })).resolves.toBeDefined();
    });

    it('should report accurate progress counts', async () => {
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

      const progressCallback: ProgressCallback = vi.fn();

      // Act
      await service.ingestCodebase({ name: 'test-kb', path: '/test' }, progressCallback);

      // Assert
      expect(progressCallback).toHaveBeenCalledWith('Processing documents', 1, 5);
      expect(progressCallback).toHaveBeenCalledWith('Processing documents', 2, 5);
      expect(progressCallback).toHaveBeenCalledWith('Processing documents', 3, 5);
      expect(progressCallback).toHaveBeenCalledWith('Processing documents', 4, 5);
      expect(progressCallback).toHaveBeenCalledWith('Processing documents', 5, 5);
    });
  });

  describe('Statistics reporting', () => {
    it('should return accurate ingestion statistics', async () => {
      // Arrange
      const mockFiles = [
        { path: '/test/doc1.pdf', relativePath: 'doc1.pdf', size: 1000, documentType: 'pdf', isTest: false, extension: '.pdf' },
        { path: '/test/doc2.docx', relativePath: 'doc2.docx', size: 2000, documentType: 'docx', isTest: false, extension: '.docx' },
      ];

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: mockFiles,
        statistics: { totalFiles: 3, supportedFiles: 2, unsupportedFiles: 1, unsupportedByExtension: 1 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue(mockFiles);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# Test',
        metadata: { title: 'Test', format: 'pdf', wordCount: 1, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk 1', index: 0, tokenCount: 2, metadata: { chunkType: 'paragraph', hasContext: true } },
        { content: 'Chunk 2', index: 1, tokenCount: 2, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.totalFiles).toBe(3);
      expect(result.supportedFiles).toBe(2);
      expect(result.unsupportedFiles).toBe(1);
      expect(result.chunksCreated).toBe(4); // 2 files × 2 chunks each
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should report duration in milliseconds', async () => {
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

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.durationMs).toBeDefined();
      expect(typeof result.durationMs).toBe('number');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
