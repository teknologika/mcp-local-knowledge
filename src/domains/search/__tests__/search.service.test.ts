/**
 * Unit tests for SearchService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchService, SearchError } from '../search.service.js';
import { LanceDBClientWrapper } from '../../../infrastructure/lancedb/lancedb.client.js';
import type { EmbeddingService } from '../../embedding/embedding.service.js';
import type { Config, SearchParams } from '../../../shared/types/index.js';
import { DEFAULT_CONFIG } from '../../../shared/config/config.js';

describe('SearchService', () => {
  let service: SearchService;
  let mockLanceClient: LanceDBClientWrapper;
  let mockEmbeddingService: EmbeddingService;
  let config: Config;

  beforeEach(() => {
    config = { ...DEFAULT_CONFIG };
    
    // Create mock embedding service
    mockEmbeddingService = {
      initialize: vi.fn(),
      generateEmbedding: vi.fn(),
      batchGenerateEmbeddings: vi.fn(),
      getModelName: vi.fn().mockReturnValue('test-model'),
      getEmbeddingDimension: vi.fn().mockReturnValue(384),
      isInitialized: vi.fn().mockReturnValue(true),
    };

    // Create mock LanceDB client
    mockLanceClient = {
      listTables: vi.fn(),
      getOrCreateTable: vi.fn(),
      tableExists: vi.fn(),
      getConnection: vi.fn(),
    } as any;

    service = new SearchService(mockLanceClient, mockEmbeddingService, config);
  });

  describe('search', () => {
    it('should return empty results when no collections exist', async () => {
      vi.mocked(mockLanceClient.listTables).mockResolvedValue([]);
      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue(
        new Array(384).fill(0)
      );

      const params: SearchParams = {
        query: 'test query',
      };

      const result = await service.search(params);

      expect(result.results).toEqual([]);
      expect(result.totalResults).toBe(0);
      expect(result.queryTime).toBeGreaterThanOrEqual(0);
    });

    it('should search and return ranked results', async () => {
      const mockQueryEmbedding = new Array(384).fill(0.1);
      
      const mockResults = [
        {
          filePath: '/path/to/document1.pdf',
          documentType: 'pdf',
          chunkType: 'paragraph',
          chunkIndex: 0,
          content: 'This is a test document about machine learning.',
          isTestFile: false,
          pageNumber: 1,
          _distance: 0.2,
        },
        {
          filePath: '/path/to/document2.docx',
          documentType: 'docx',
          chunkType: 'section',
          chunkIndex: 1,
          content: 'Another document discussing AI concepts.',
          isTestFile: false,
          pageNumber: 2,
          _distance: 0.5,
        },
      ];

      const mockToArray = vi.fn().mockResolvedValue(mockResults);
      const mockWhere = vi.fn().mockReturnValue({ toArray: mockToArray });
      const mockLimitResult = { 
        where: mockWhere,
        toArray: mockToArray  // Support both with and without where
      };
      const mockLimit = vi.fn().mockReturnValue(mockLimitResult);
      const mockSearch = vi.fn().mockReturnValue({ limit: mockLimit });

      const mockConnection = {
        openTable: vi.fn().mockResolvedValue({
          search: mockSearch,
        }),
      };

      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue(mockQueryEmbedding);
      vi.mocked(mockLanceClient.listTables).mockResolvedValue([
        {
          name: 'knowledgebase_test-project_1_0_0',
          metadata: { knowledgeBaseName: 'test-project' },
        },
      ]);
      vi.mocked(mockLanceClient.getConnection).mockReturnValue(mockConnection as any);

      const params: SearchParams = {
        query: 'test query',
      };

      const result = await service.search(params);

      expect(result.results).toHaveLength(2);
      expect(result.totalResults).toBe(2);
      
      // Results should be ranked by similarity (descending)
      expect(result.results[0].score).toBeGreaterThan(result.results[1].score);
      expect(result.results[0].metadata.filePath).toBe('/path/to/document1.pdf');
      expect(result.results[0].content).toBe('This is a test document about machine learning.');
      expect(result.results[0].metadata.documentType).toBe('pdf');
      expect(result.results[0].metadata.chunkType).toBe('paragraph');
      expect(result.results[0].metadata.pageNumber).toBe(1);
    });

    it('should filter by knowledge base name', async () => {
      const mockQueryEmbedding = new Array(384).fill(0.1);
      
      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue(mockQueryEmbedding);
      vi.mocked(mockLanceClient.tableExists).mockResolvedValue(true);
      
      const mockTable = {
        search: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      vi.mocked(mockLanceClient.getOrCreateTable).mockResolvedValue(mockTable as any);

      const params: SearchParams = {
        query: 'test query',
        knowledgeBaseName: 'specific-project',
      };

      await service.search(params);

      expect(mockLanceClient.tableExists).toHaveBeenCalledWith('specific-project');
    });

    it('should filter by document type', async () => {
      const mockQueryEmbedding = new Array(384).fill(0.1);
      
      const mockWhere = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      });
      
      const mockLimit = vi.fn().mockReturnValue({
        where: mockWhere,
      });
      
      const mockConnection = {
        openTable: vi.fn().mockResolvedValue({
          search: vi.fn().mockReturnValue({
            limit: mockLimit,
          }),
        }),
      };

      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue(mockQueryEmbedding);
      vi.mocked(mockLanceClient.listTables).mockResolvedValue([
        {
          name: 'knowledgebase_test-project_1_0_0',
          metadata: { knowledgeBaseName: 'test-project' },
        },
      ]);
      vi.mocked(mockLanceClient.getConnection).mockReturnValue(mockConnection as any);

      const params: SearchParams = {
        query: 'test query',
        documentType: 'pdf',
      };

      await service.search(params);

      expect(mockWhere).toHaveBeenCalledWith("documentType = 'pdf'");
    });

    it('should limit results to maxResults', async () => {
      const mockQueryEmbedding = new Array(384).fill(0.1);
      
      const mockLimit = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      });
      
      const mockConnection = {
        openTable: vi.fn().mockResolvedValue({
          search: vi.fn().mockReturnValue({
            limit: mockLimit,
          }),
        }),
      };

      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue(mockQueryEmbedding);
      vi.mocked(mockLanceClient.listTables).mockResolvedValue([
        {
          name: 'knowledgebase_test-project_1_0_0',
          metadata: { knowledgeBaseName: 'test-project' },
        },
      ]);
      vi.mocked(mockLanceClient.getConnection).mockReturnValue(mockConnection as any);

      const params: SearchParams = {
        query: 'test query',
        maxResults: 10,
      };

      await service.search(params);

      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should use cached results for identical queries', async () => {
      const mockQueryEmbedding = new Array(384).fill(0.1);
      
      const mockResults = [
        {
          filePath: '/path/to/document.pdf',
          documentType: 'pdf',
          chunkType: 'paragraph',
          chunkIndex: 0,
          content: 'Test document content',
          isTestFile: false,
          _distance: 0.2,
        },
      ];

      const mockToArray = vi.fn().mockResolvedValue(mockResults);
      const mockWhere = vi.fn().mockReturnValue({ toArray: mockToArray });
      const mockLimitResult = { 
        where: mockWhere,
        toArray: mockToArray
      };
      const mockLimit = vi.fn().mockReturnValue(mockLimitResult);
      const mockSearch = vi.fn().mockReturnValue({ limit: mockLimit });

      const mockConnection = {
        openTable: vi.fn().mockResolvedValue({
          search: mockSearch,
        }),
      };

      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue(mockQueryEmbedding);
      vi.mocked(mockLanceClient.listTables).mockResolvedValue([
        {
          name: 'knowledgebase_test-project_1_0_0',
          metadata: { knowledgeBaseName: 'test-project' },
        },
      ]);
      vi.mocked(mockLanceClient.getConnection).mockReturnValue(mockConnection as any);

      const params: SearchParams = {
        query: 'test query',
      };

      // First search
      const result1 = await service.search(params);
      expect(mockConnection.openTable).toHaveBeenCalledTimes(1);

      // Second search with same params should use cache
      const result2 = await service.search(params);
      expect(mockConnection.openTable).toHaveBeenCalledTimes(1); // Not called again
      expect(result2).toEqual(result1);
    });

    it('should throw SearchError when embedding service not initialized', async () => {
      vi.mocked(mockEmbeddingService.isInitialized).mockReturnValue(false);

      const params: SearchParams = {
        query: 'test query',
      };

      await expect(service.search(params)).rejects.toThrow(SearchError);
      await expect(service.search(params)).rejects.toThrow('Embedding service not initialized');
    });

    it('should throw SearchError on embedding generation failure', async () => {
      vi.mocked(mockEmbeddingService.generateEmbedding).mockRejectedValue(
        new Error('Embedding failed')
      );

      const params: SearchParams = {
        query: 'test query',
      };

      await expect(service.search(params)).rejects.toThrow(SearchError);
    });

    it('should filter out test files when excludeTests is true', async () => {
      const mockQueryEmbedding = new Array(384).fill(0.1);
      
      const mockWhere = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      });
      
      const mockLimit = vi.fn().mockReturnValue({
        where: mockWhere,
      });
      
      const mockConnection = {
        openTable: vi.fn().mockResolvedValue({
          search: vi.fn().mockReturnValue({
            limit: mockLimit,
          }),
        }),
      };

      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue(mockQueryEmbedding);
      vi.mocked(mockLanceClient.listTables).mockResolvedValue([
        {
          name: 'knowledgebase_test-project_1_0_0',
          metadata: { knowledgeBaseName: 'test-project' },
        },
      ]);
      vi.mocked(mockLanceClient.getConnection).mockReturnValue(mockConnection as any);

      const params: SearchParams = {
        query: 'test query',
        excludeTests: true,
      };

      await service.search(params);

      expect(mockWhere).toHaveBeenCalledWith('isTestFile = false');
    });

    it('should combine multiple filters with AND', async () => {
      const mockQueryEmbedding = new Array(384).fill(0.1);
      
      const mockWhere = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      });
      
      const mockLimit = vi.fn().mockReturnValue({
        where: mockWhere,
      });
      
      const mockConnection = {
        openTable: vi.fn().mockResolvedValue({
          search: vi.fn().mockReturnValue({
            limit: mockLimit,
          }),
        }),
      };

      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue(mockQueryEmbedding);
      vi.mocked(mockLanceClient.listTables).mockResolvedValue([
        {
          name: 'knowledgebase_test-project_1_0_0',
          metadata: { knowledgeBaseName: 'test-project' },
        },
      ]);
      vi.mocked(mockLanceClient.getConnection).mockReturnValue(mockConnection as any);

      const params: SearchParams = {
        query: 'test query',
        documentType: 'pdf',
        excludeTests: true,
      };

      await service.search(params);

      expect(mockWhere).toHaveBeenCalledWith("documentType = 'pdf' AND isTestFile = false");
    });

    it('should include document-specific metadata in results', async () => {
      const mockQueryEmbedding = new Array(384).fill(0.1);
      
      const mockResults = [
        {
          filePath: '/path/to/document.pdf',
          documentType: 'pdf',
          chunkType: 'section',
          chunkIndex: 2,
          content: 'Document section content',
          isTestFile: false,
          pageNumber: 5,
          headingPath: ['Chapter 1', 'Section 1.1'],
          _distance: 0.3,
        },
      ];

      const mockToArray = vi.fn().mockResolvedValue(mockResults);
      const mockWhere = vi.fn().mockReturnValue({ toArray: mockToArray });
      const mockLimitResult = { 
        where: mockWhere,
        toArray: mockToArray
      };
      const mockLimit = vi.fn().mockReturnValue(mockLimitResult);
      const mockSearch = vi.fn().mockReturnValue({ limit: mockLimit });

      const mockConnection = {
        openTable: vi.fn().mockResolvedValue({
          search: mockSearch,
        }),
      };

      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue(mockQueryEmbedding);
      vi.mocked(mockLanceClient.listTables).mockResolvedValue([
        {
          name: 'knowledgebase_test-project_1_0_0',
          metadata: { knowledgeBaseName: 'test-project' },
        },
      ]);
      vi.mocked(mockLanceClient.getConnection).mockReturnValue(mockConnection as any);

      const params: SearchParams = {
        query: 'test query',
      };

      const result = await service.search(params);

      expect(result.results).toHaveLength(1);
      const firstResult = result.results[0];
      
      // Verify document-specific metadata
      expect(firstResult.metadata.documentType).toBe('pdf');
      expect(firstResult.metadata.chunkType).toBe('section');
      expect(firstResult.metadata.chunkIndex).toBe(2);
      expect(firstResult.metadata.pageNumber).toBe(5);
      expect(firstResult.metadata.headingPath).toEqual(['Chapter 1', 'Section 1.1']);
      expect(firstResult.metadata.isTest).toBe(false);
    });

    it('should handle various document types in results', async () => {
      const mockQueryEmbedding = new Array(384).fill(0.1);
      
      const mockResults = [
        {
          filePath: '/docs/report.pdf',
          documentType: 'pdf',
          chunkType: 'paragraph',
          chunkIndex: 0,
          content: 'PDF content',
          isTestFile: false,
          _distance: 0.1,
        },
        {
          filePath: '/docs/notes.docx',
          documentType: 'docx',
          chunkType: 'section',
          chunkIndex: 1,
          content: 'DOCX content',
          isTestFile: false,
          _distance: 0.2,
        },
        {
          filePath: '/docs/slides.pptx',
          documentType: 'pptx',
          chunkType: 'paragraph',
          chunkIndex: 0,
          content: 'PPTX content',
          isTestFile: false,
          _distance: 0.3,
        },
        {
          filePath: '/docs/data.xlsx',
          documentType: 'xlsx',
          chunkType: 'table',
          chunkIndex: 0,
          content: 'XLSX content',
          isTestFile: false,
          _distance: 0.4,
        },
        {
          filePath: '/docs/page.html',
          documentType: 'html',
          chunkType: 'section',
          chunkIndex: 0,
          content: 'HTML content',
          isTestFile: false,
          _distance: 0.5,
        },
        {
          filePath: '/docs/readme.md',
          documentType: 'markdown',
          chunkType: 'heading',
          chunkIndex: 0,
          content: 'Markdown content',
          isTestFile: false,
          _distance: 0.6,
        },
        {
          filePath: '/docs/notes.txt',
          documentType: 'text',
          chunkType: 'paragraph',
          chunkIndex: 0,
          content: 'Text content',
          isTestFile: false,
          _distance: 0.7,
        },
      ];

      const mockToArray = vi.fn().mockResolvedValue(mockResults);
      const mockWhere = vi.fn().mockReturnValue({ toArray: mockToArray });
      const mockLimitResult = { 
        where: mockWhere,
        toArray: mockToArray
      };
      const mockLimit = vi.fn().mockReturnValue(mockLimitResult);
      const mockSearch = vi.fn().mockReturnValue({ limit: mockLimit });

      const mockConnection = {
        openTable: vi.fn().mockResolvedValue({
          search: mockSearch,
        }),
      };

      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue(mockQueryEmbedding);
      vi.mocked(mockLanceClient.listTables).mockResolvedValue([
        {
          name: 'knowledgebase_test-project_1_0_0',
          metadata: { knowledgeBaseName: 'test-project' },
        },
      ]);
      vi.mocked(mockLanceClient.getConnection).mockReturnValue(mockConnection as any);

      const params: SearchParams = {
        query: 'test query',
        maxResults: 10,
      };

      const result = await service.search(params);

      expect(result.results).toHaveLength(7);
      
      // Verify all document types are present
      const documentTypes = result.results.map(r => r.metadata.documentType);
      expect(documentTypes).toContain('pdf');
      expect(documentTypes).toContain('docx');
      expect(documentTypes).toContain('pptx');
      expect(documentTypes).toContain('xlsx');
      expect(documentTypes).toContain('html');
      expect(documentTypes).toContain('markdown');
      expect(documentTypes).toContain('text');
    });

    it('should handle missing optional metadata fields gracefully', async () => {
      const mockQueryEmbedding = new Array(384).fill(0.1);
      
      const mockResults = [
        {
          filePath: '/path/to/document.txt',
          documentType: 'text',
          chunkType: 'paragraph',
          chunkIndex: 0,
          content: 'Simple text content',
          isTestFile: false,
          // pageNumber and headingPath are undefined
          _distance: 0.2,
        },
      ];

      const mockToArray = vi.fn().mockResolvedValue(mockResults);
      const mockWhere = vi.fn().mockReturnValue({ toArray: mockToArray });
      const mockLimitResult = { 
        where: mockWhere,
        toArray: mockToArray
      };
      const mockLimit = vi.fn().mockReturnValue(mockLimitResult);
      const mockSearch = vi.fn().mockReturnValue({ limit: mockLimit });

      const mockConnection = {
        openTable: vi.fn().mockResolvedValue({
          search: mockSearch,
        }),
      };

      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue(mockQueryEmbedding);
      vi.mocked(mockLanceClient.listTables).mockResolvedValue([
        {
          name: 'knowledgebase_test-project_1_0_0',
          metadata: { knowledgeBaseName: 'test-project' },
        },
      ]);
      vi.mocked(mockLanceClient.getConnection).mockReturnValue(mockConnection as any);

      const params: SearchParams = {
        query: 'test query',
      };

      const result = await service.search(params);

      expect(result.results).toHaveLength(1);
      const firstResult = result.results[0];
      
      // Verify optional fields are undefined
      expect(firstResult.metadata.pageNumber).toBeUndefined();
      expect(firstResult.metadata.headingPath).toBeUndefined();
      
      // Verify required fields are present
      expect(firstResult.metadata.documentType).toBe('text');
      expect(firstResult.metadata.chunkType).toBe('paragraph');
      expect(firstResult.metadata.isTest).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear the search cache', () => {
      service.clearCache();
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('keys');
      expect(typeof stats.size).toBe('number');
      expect(Array.isArray(stats.keys)).toBe(true);
    });
  });
});
