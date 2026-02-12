/**
 * Unit tests for IngestionService
 * 
 * Tests cover:
 * - Task 4.4.1: Document file scanning
 * - Task 4.4.2: Document conversion integration
 * - Task 4.4.3: Chunking integration
 * - Task 4.4.4: Error handling
 * - Task 4.4.5: Progress reporting
 * - Task 4.4.6: Batch processing
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

describe('IngestionService - Document File Scanning (Task 4.4.1)', () => {
  let service: IngestionService;
  let mockEmbeddingService: EmbeddingService;
  let mockLanceClient: LanceDBClientWrapper;
  let mockFileScanner: FileScannerService;
  let mockDocumentConverter: DocumentConverterService;
  let mockDocumentChunker: DocumentChunkerService;
  let config: Config;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup config
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

    // Setup mocks
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

    // Create service instance
    service = new IngestionService(mockEmbeddingService, mockLanceClient, config);

    // Get mock instances
    mockFileScanner = (service as any).fileScanner;
    mockDocumentConverter = (service as any).documentConverter;
    mockDocumentChunker = (service as any).documentChunker;
  });

  describe('File scanning for document formats', () => {
    it('should scan directory for all supported document formats', async () => {
      // Arrange
      const mockFiles = [
        {
          path: '/test/doc1.pdf',
          relativePath: 'doc1.pdf',
          size: 1000,
          documentType: 'pdf',
          isTest: false,
          extension: '.pdf',
        },
        {
          path: '/test/doc2.docx',
          relativePath: 'doc2.docx',
          size: 2000,
          documentType: 'docx',
          isTest: false,
          extension: '.docx',
        },
        {
          path: '/test/presentation.pptx',
          relativePath: 'presentation.pptx',
          size: 3000,
          documentType: 'pptx',
          isTest: false,
          extension: '.pptx',
        },
      ];

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: mockFiles,
        statistics: {
          totalFiles: 3,
          supportedFiles: 3,
          unsupportedFiles: 0,
          unsupportedByExtension: 0,
        },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue(mockFiles);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# Test',
        metadata: { title: 'Test', format: 'pdf', wordCount: 1, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        {
          content: 'Test chunk',
          index: 0,
          tokenCount: 2,
          metadata: { chunkType: 'paragraph', hasContext: true },
        },
      ]);

      // Act
      const result = await service.ingestCodebase({
        name: 'test-kb',
        path: '/test',
      });

      // Assert
      expect(mockFileScanner.scanDirectory).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          respectGitignore: true,
          skipHiddenDirectories: true,
          maxFileSize: config.ingestion.maxFileSize,
        })
      );
      expect(result.supportedFiles).toBe(3);
    });

    it('should detect PDF files during scanning', async () => {
      // Arrange
      const pdfFile = {
        path: '/test/document.pdf',
        relativePath: 'document.pdf',
        size: 5000,
        documentType: 'pdf',
        isTest: false,
        extension: '.pdf',
      };

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: [pdfFile],
        statistics: { totalFiles: 1, supportedFiles: 1, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue([pdfFile]);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# PDF Content',
        metadata: { title: 'PDF', format: 'pdf', wordCount: 2, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk', index: 0, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(mockFileScanner.getSupportedFiles).toHaveBeenCalled();
      expect(result.supportedFiles).toBe(1);
    });

    it('should detect DOCX files during scanning', async () => {
      // Arrange
      const docxFile = {
        path: '/test/report.docx',
        relativePath: 'report.docx',
        size: 3000,
        documentType: 'docx',
        isTest: false,
        extension: '.docx',
      };

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: [docxFile],
        statistics: { totalFiles: 1, supportedFiles: 1, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue([docxFile]);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# Report',
        metadata: { title: 'Report', format: 'docx', wordCount: 1, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk', index: 0, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.supportedFiles).toBe(1);
    });

    it('should detect PPTX files during scanning', async () => {
      // Arrange
      const pptxFile = {
        path: '/test/slides.pptx',
        relativePath: 'slides.pptx',
        size: 4000,
        documentType: 'pptx',
        isTest: false,
        extension: '.pptx',
      };

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: [pptxFile],
        statistics: { totalFiles: 1, supportedFiles: 1, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue([pptxFile]);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# Slides',
        metadata: { title: 'Slides', format: 'pptx', wordCount: 1, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk', index: 0, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.supportedFiles).toBe(1);
    });

    it('should detect XLSX files during scanning', async () => {
      // Arrange
      const xlsxFile = {
        path: '/test/data.xlsx',
        relativePath: 'data.xlsx',
        size: 2000,
        documentType: 'xlsx',
        isTest: false,
        extension: '.xlsx',
      };

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: [xlsxFile],
        statistics: { totalFiles: 1, supportedFiles: 1, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue([xlsxFile]);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# Data',
        metadata: { title: 'Data', format: 'xlsx', wordCount: 1, hasImages: false, hasTables: true },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk', index: 0, tokenCount: 1, metadata: { chunkType: 'table', hasContext: true } },
      ]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.supportedFiles).toBe(1);
    });

    it('should detect HTML files during scanning', async () => {
      // Arrange
      const htmlFile = {
        path: '/test/page.html',
        relativePath: 'page.html',
        size: 1500,
        documentType: 'html',
        isTest: false,
        extension: '.html',
      };

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: [htmlFile],
        statistics: { totalFiles: 1, supportedFiles: 1, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue([htmlFile]);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# Page',
        metadata: { title: 'Page', format: 'html', wordCount: 1, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk', index: 0, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.supportedFiles).toBe(1);
    });

    it('should detect Markdown files during scanning', async () => {
      // Arrange
      const mdFile = {
        path: '/test/readme.md',
        relativePath: 'readme.md',
        size: 800,
        documentType: 'markdown',
        isTest: false,
        extension: '.md',
      };

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: [mdFile],
        statistics: { totalFiles: 1, supportedFiles: 1, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue([mdFile]);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: '# README',
        metadata: { title: 'README', format: 'markdown', wordCount: 1, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk', index: 0, tokenCount: 1, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.supportedFiles).toBe(1);
    });

    it('should detect text files during scanning', async () => {
      // Arrange
      const txtFile = {
        path: '/test/notes.txt',
        relativePath: 'notes.txt',
        size: 500,
        documentType: 'text',
        isTest: false,
        extension: '.txt',
      };

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: [txtFile],
        statistics: { totalFiles: 1, supportedFiles: 1, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue([txtFile]);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: 'Notes content',
        metadata: { title: 'notes.txt', format: 'text', wordCount: 2, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk', index: 0, tokenCount: 2, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.supportedFiles).toBe(1);
    });

    it('should detect audio files during scanning', async () => {
      // Arrange
      const audioFile = {
        path: '/test/recording.mp3',
        relativePath: 'recording.mp3',
        size: 10000,
        documentType: 'audio',
        isTest: false,
        extension: '.mp3',
      };

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: [audioFile],
        statistics: { totalFiles: 1, supportedFiles: 1, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue([audioFile]);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      mockDocumentConverter.convertDocument = vi.fn().mockResolvedValue({
        markdown: 'Transcribed audio content',
        metadata: { title: 'recording.mp3', format: 'audio', wordCount: 3, hasImages: false, hasTables: false },
        doclingDocument: null,
      });

      mockDocumentChunker.chunkDocument = vi.fn().mockResolvedValue([
        { content: 'Chunk', index: 0, tokenCount: 3, metadata: { chunkType: 'paragraph', hasContext: true } },
      ]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.supportedFiles).toBe(1);
    });

    it('should respect .gitignore patterns during scanning', async () => {
      // Arrange
      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: [],
        statistics: { totalFiles: 0, supportedFiles: 0, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue([]);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      // Act
      await service.ingestCodebase({ name: 'test-kb', path: '/test', respectGitignore: true });

      // Assert
      expect(mockFileScanner.scanDirectory).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({ respectGitignore: true })
      );
    });

    it('should skip files exceeding maxFileSize', async () => {
      // Arrange
      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: [],
        statistics: { totalFiles: 0, supportedFiles: 0, unsupportedFiles: 0, unsupportedByExtension: 0 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue([]);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([]);

      // Act
      await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(mockFileScanner.scanDirectory).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({ maxFileSize: config.ingestion.maxFileSize })
      );
    });

    it('should log warnings for unsupported files', async () => {
      // Arrange
      const unsupportedFile = {
        path: '/test/image.jpg',
        relativePath: 'image.jpg',
        size: 1000,
        documentType: 'unknown',
        isTest: false,
        extension: '.jpg',
      };

      mockFileScanner.scanDirectory = vi.fn().mockResolvedValue({
        files: [unsupportedFile],
        statistics: { totalFiles: 1, supportedFiles: 0, unsupportedFiles: 1, unsupportedByExtension: 1 },
      });

      mockFileScanner.getSupportedFiles = vi.fn().mockReturnValue([]);
      mockFileScanner.getUnsupportedFiles = vi.fn().mockReturnValue([unsupportedFile]);

      // Act
      const result = await service.ingestCodebase({ name: 'test-kb', path: '/test' });

      // Assert
      expect(result.unsupportedFiles).toBe(1);
      expect(result.supportedFiles).toBe(0);
    });
  });
});
