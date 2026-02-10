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
      
      const mockTable = {
        search: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue([
                {
                  filePath: '/path/to/file1.ts',
                  startLine: 10,
                  endLine: 20,
                  language: 'typescript',
                  chunkType: 'function',
                  content: 'function test() {}',
                  _distance: 0.2,
                  _codebaseName: 'test-project',
                },
                {
                  filePath: '/path/to/file2.ts',
                  startLine: 30,
                  endLine: 40,
                  language: 'typescript',
                  chunkType: 'class',
                  content: 'class Test {}',
                  _distance: 0.5,
                  _codebaseName: 'test-project',
                },
              ]),
            }),
          }),
        }),
      };

      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue(mockQueryEmbedding);
      vi.mocked(mockLanceClient.listTables).mockResolvedValue([
        {
          name: 'codebase_test-project_1_0_0',
          metadata: { codebaseName: 'test-project' },
        },
      ]);
      vi.mocked(mockLanceClient.getOrCreateTable).mockResolvedValue(mockTable as any);

      const params: SearchParams = {
        query: 'test query',
      };

      const result = await service.search(params);

      expect(result.results).toHaveLength(2);
      expect(result.totalResults).toBe(2);
      
      // Results should be ranked by similarity (descending)
      expect(result.results[0].similarityScore).toBeGreaterThan(result.results[1].similarityScore);
      expect(result.results[0].filePath).toBe('/path/to/file1.ts');
      expect(result.results[0].content).toBe('function test() {}');
    });

    it('should filter by codebase name', async () => {
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
        codebaseName: 'specific-project',
      };

      await service.search(params);

      expect(mockLanceClient.tableExists).toHaveBeenCalledWith('specific-project');
    });

    it('should filter by language', async () => {
      const mockQueryEmbedding = new Array(384).fill(0.1);
      
      const mockWhere = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      });
      
      const mockLimit = vi.fn().mockReturnValue({
        where: mockWhere,
      });
      
      const mockTable = {
        search: vi.fn().mockReturnValue({
          limit: mockLimit,
        }),
      };

      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue(mockQueryEmbedding);
      vi.mocked(mockLanceClient.listTables).mockResolvedValue([
        {
          name: 'codebase_test-project_1_0_0',
          metadata: { codebaseName: 'test-project' },
        },
      ]);
      vi.mocked(mockLanceClient.getOrCreateTable).mockResolvedValue(mockTable as any);

      const params: SearchParams = {
        query: 'test query',
        language: 'typescript',
      };

      await service.search(params);

      expect(mockWhere).toHaveBeenCalledWith('language = "typescript"');
    });

    it('should limit results to maxResults', async () => {
      const mockQueryEmbedding = new Array(384).fill(0.1);
      
      const mockLimit = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      });
      
      const mockTable = {
        search: vi.fn().mockReturnValue({
          limit: mockLimit,
        }),
      };

      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue(mockQueryEmbedding);
      vi.mocked(mockLanceClient.listTables).mockResolvedValue([
        {
          name: 'codebase_test-project_1_0_0',
          metadata: { codebaseName: 'test-project' },
        },
      ]);
      vi.mocked(mockLanceClient.getOrCreateTable).mockResolvedValue(mockTable as any);

      const params: SearchParams = {
        query: 'test query',
        maxResults: 10,
      };

      await service.search(params);

      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should use cached results for identical queries', async () => {
      const mockQueryEmbedding = new Array(384).fill(0.1);
      
      const mockTable = {
        search: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue([
                {
                  filePath: '/path/to/file.ts',
                  startLine: 10,
                  endLine: 20,
                  language: 'typescript',
                  chunkType: 'function',
                  content: 'function test() {}',
                  _distance: 0.2,
                  _codebaseName: 'test-project',
                },
              ]),
            }),
          }),
        }),
      };

      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue(mockQueryEmbedding);
      vi.mocked(mockLanceClient.listTables).mockResolvedValue([
        {
          name: 'codebase_test-project_1_0_0',
          metadata: { codebaseName: 'test-project' },
        },
      ]);
      vi.mocked(mockLanceClient.getOrCreateTable).mockResolvedValue(mockTable as any);

      const params: SearchParams = {
        query: 'test query',
      };

      // First search
      const result1 = await service.search(params);
      expect(mockTable.search).toHaveBeenCalledTimes(1);

      // Second search with same params should use cache
      const result2 = await service.search(params);
      expect(mockTable.search).toHaveBeenCalledTimes(1); // Not called again
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
