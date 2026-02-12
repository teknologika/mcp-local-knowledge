/**
 * Unit tests for IngestionService - Chunking Integration
 * Task 4.4.3: Test chunking integration
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

describe('IngestionService - Chunking Integration (Task 4.4.3)', () => {
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

  describe('DocumentChunker integration', () => {
    it('should chunk converted documents', async () => {
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
        markdown: '# Test Document\n\nContent here.',
        metadata: { title: 'Test', format: 'pdf', wordCount: 3, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk 1', index: 0, tokenCount: 5, metadata: { chunkType: 'heading', hasContext: true } },
        { content: 'Chunk 2', index: 1, tokenCount: 3, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(mockDocumentChunker.chunkDocument).toHaveBeenCalledWith(
        '# Test Document\n\nContent here.',
        expect.objectContaining({
          maxTokens: 512,
          chunkSize: 1000,
          chunkOverlap: 200,
        })
      );
      expect(result.chunksCreated).toBe(2);
    });

    it('should pass maxTokens from config to chunker', async () => {
      // Arrange
      const customConfig = {
        ...config,
        document: {
          ...config.document,
          maxTokens: 1024,
        },
      };

      service = new IngestionService(mockEmbeddingService, mockLanceClient, customConfig);
      mockFileScanner = (service as any).fileScanner;
      mockDocumentConverter = (service as any).documentConverter;
      mockDocumentChunker = (service as any).documentChunker;

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
        { content: 'Chunk', index: 0, tokenCount: 10, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // Act
      await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(mockDocumentChunker.chunkDocument).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ maxTokens: 1024 })
      );
    });

    it('should pass chunkSize and chunkOverlap from config', async () => {
      // Arrange
      const customConfig = {
        ...config,
        document: {
          ...config.document,
          chunkSize: 2000,
          chunkOverlap: 400,
        },
      };

      service = new IngestionService(mockEmbeddingService, mockLanceClient, customConfig);
      mockFileScanner = (service as any).fileScanner;
      mockDocumentConverter = (service as any).documentConverter;
      mockDocumentChunker = (service as any).documentChunker;

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
        { content: 'Chunk', index: 0, tokenCount: 10, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // Act
      await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(mockDocumentChunker.chunkDocument).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          chunkSize: 2000,
          chunkOverlap: 400,
        })
      );
    });

    it('should transform document chunks to Chunk format', async () => {
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
        {
          content: 'Test content',
          index: 0,
          tokenCount: 5,
          metadata: {
            chunkType: 'paragraph',
            hasContext: true,
            headingPath: ['Introduction'],
            pageNumber: 1,
          },
        },
      ]);

      const mockTable = {
        add: vi.fn().mockResolvedValue(undefined),
        countRows: vi.fn().mockResolvedValue(0),
      };

      mockLanceClient.createTableWithData = vi.fn().mockResolvedValue(mockTable);

      // Act
      await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(mockLanceClient.createTableWithData).toHaveBeenCalledWith(
        'test-kb',
        expect.arrayContaining([
          expect.objectContaining({
            content: 'Test content',
            filePath: 'doc.pdf',
            chunkType: 'paragraph',
            documentType: 'pdf',
            tokenCount: 5,
            isTestFile: false,
            headingPath: ['Introduction'],
            pageNumber: 1,
          }),
        ])
      );
    });

    it('should handle chunks with different types', async () => {
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
        { content: 'Heading', index: 0, tokenCount: 1, metadata: { chunkType: 'heading', hasContext: true } },
        { content: 'Paragraph', index: 1, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
        { content: 'Table', index: 2, tokenCount: 1, metadata: { chunkType: 'table', hasContext: true } },
        { content: 'Section', index: 3, tokenCount: 1, metadata: { chunkType: 'section', hasContext: true } },
      ]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.chunksCreated).toBe(4);
    });

    it('should handle chunks with heading paths', async () => {
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
        {
          content: 'Content',
          index: 0,
          tokenCount: 1,
          metadata: {
            chunkType: 'paragraph',
            hasContext: true,
            headingPath: ['Chapter 1', 'Section 1.1', 'Subsection 1.1.1'],
          },
        },
      ]);

      const mockTable = {
        add: vi.fn().mockResolvedValue(undefined),
        countRows: vi.fn().mockResolvedValue(0),
      };

      mockLanceClient.createTableWithData = vi.fn().mockResolvedValue(mockTable);

      // Act
      await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(mockLanceClient.createTableWithData).toHaveBeenCalledWith(
        'test-kb',
        expect.arrayContaining([
          expect.objectContaining({
            headingPath: ['Chapter 1', 'Section 1.1', 'Subsection 1.1.1'],
          }),
        ])
      );
    });

    it('should handle chunks with page numbers', async () => {
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
        {
          content: 'Page 1 content',
          index: 0,
          tokenCount: 3,
          metadata: { chunkType: 'paragraph', hasContext: true, pageNumber: 1 },
        },
        {
          content: 'Page 2 content',
          index: 1,
          tokenCount: 3,
          metadata: { chunkType: 'paragraph', hasContext: true, pageNumber: 2 },
        },
      ]);

      const mockTable = {
        add: vi.fn().mockResolvedValue(undefined),
        countRows: vi.fn().mockResolvedValue(0),
      };

      mockLanceClient.createTableWithData = vi.fn().mockResolvedValue(mockTable);

      // Act
      await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(mockLanceClient.createTableWithData).toHaveBeenCalledWith(
        'test-kb',
        expect.arrayContaining([
          expect.objectContaining({ pageNumber: 1 }),
          expect.objectContaining({ pageNumber: 2 }),
        ])
      );
    });
  });
});
