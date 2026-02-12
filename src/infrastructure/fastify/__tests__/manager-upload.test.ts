/**
 * Tests for Manager UI file upload functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FastifyServer } from '../fastify-server.js';
import { KnowledgeBaseService } from '../../../domains/knowledgebase/knowledgebase.service.js';
import { SearchService } from '../../../domains/search/search.service.js';
import { IngestionService } from '../../../domains/ingestion/ingestion.service.js';
import { Config } from '../../../shared/types/index.js';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Manager Upload Routes', () => {
  let server: FastifyServer;
  let mockKnowledgeBaseService: any;
  let mockSearchService: any;
  let mockIngestionService: any;
  let config: Config;
  let testFilePath: string;

  beforeEach(async () => {
    // Create mock services
    mockKnowledgeBaseService = {
      listKnowledgeBases: vi.fn().mockResolvedValue([
        { name: 'test-kb', fileCount: 10, chunkCount: 100, lastIngestion: new Date().toISOString() }
      ]),
      getKnowledgeBase: vi.fn().mockResolvedValue({
        name: 'test-kb',
        path: '/test/path',
        fileCount: 10,
        chunkCount: 100,
        lastIngestion: new Date().toISOString()
      }),
      getKnowledgeBaseStats: vi.fn().mockResolvedValue({
        name: 'test-kb',
        fileCount: 10,
        chunkCount: 100,
        totalSize: 1000000
      }),
      createKnowledgeBase: vi.fn().mockResolvedValue(undefined),
      deleteKnowledgeBase: vi.fn().mockResolvedValue(undefined),
      renameKnowledgeBase: vi.fn().mockResolvedValue(undefined),
    };

    mockSearchService = {
      search: vi.fn().mockResolvedValue({
        results: [],
        totalResults: 0
      }),
    };

    mockIngestionService = {
      ingestCodebase: vi.fn().mockResolvedValue({
        totalFiles: 1,
        supportedFiles: 1,
        unsupportedFiles: 0,
        chunksCreated: 10,
        durationMs: 1000
      }),
      ingestFiles: vi.fn().mockResolvedValue({
        filesProcessed: 1,
        chunksCreated: 10,
        errors: []
      }),
    };

    config = {
      lancedb: {
        persistPath: join(tmpdir(), 'test-lancedb'),
      },
      embedding: {
        modelName: 'Xenova/all-MiniLM-L6-v2',
        cachePath: join(tmpdir(), 'test-models'),
      },
      server: {
        host: 'localhost',
        port: 0, // Random port
        sessionSecret: 'test-secret',
      },
      mcp: {
        transport: 'stdio' as const,
      },
      ingestion: {
        batchSize: 100,
        maxFileSize: 10485760,
      },
      search: {
        defaultMaxResults: 50,
        cacheTimeoutSeconds: 60,
      },
      document: {
        conversionTimeout: 30000,
        maxTokens: 512,
        chunkSize: 1000,
        chunkOverlap: 200,
      },
      logging: {
        level: 'error' as const,
      },
      schemaVersion: '1.0.0',
    };

    // Create test file
    const tempDir = join(tmpdir(), 'test-uploads');
    await mkdir(tempDir, { recursive: true });
    testFilePath = join(tempDir, 'test.txt');
    await writeFile(testFilePath, 'Test content');

    // Create server
    server = new FastifyServer(
      mockKnowledgeBaseService,
      mockSearchService,
      mockIngestionService,
      config
    );

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
    
    // Clean up test file
    try {
      await unlink(testFilePath);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/upload/file', () => {
    it('should reject upload without file', async () => {
      const response = await server.getInstance().inject({
        method: 'POST',
        url: '/api/upload/file',
        headers: {
          'content-type': 'multipart/form-data; boundary=----test',
        },
        payload: '------test--',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('No file provided');
    });

    it('should reject upload without knowledge base name', async () => {
      const boundary = '----test';
      const payload = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.txt"',
        'Content-Type: text/plain',
        '',
        'Test content',
        `--${boundary}--`,
      ].join('\r\n');

      const response = await server.getInstance().inject({
        method: 'POST',
        url: '/api/upload/file',
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Knowledge base name is required');
    });

    it('should reject unsupported file types', async () => {
      const boundary = '----test';
      const payload = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.exe"',
        'Content-Type: application/octet-stream',
        '',
        'Test content',
        `--${boundary}`,
        'Content-Disposition: form-data; name="knowledgeBaseName"',
        '',
        'test-kb',
        `--${boundary}--`,
      ].join('\r\n');

      const response = await server.getInstance().inject({
        method: 'POST',
        url: '/api/upload/file',
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Unsupported file type');
    });

    it('should reject files exceeding size limit', async () => {
      const boundary = '----test';
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const payload = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.txt"',
        'Content-Type: text/plain',
        '',
        largeContent,
        `--${boundary}`,
        'Content-Disposition: form-data; name="knowledgeBaseName"',
        '',
        'test-kb',
        `--${boundary}--`,
      ].join('\r\n');

      const response = await server.getInstance().inject({
        method: 'POST',
        url: '/api/upload/file',
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('exceeds 10MB limit');
    });

    it('should reject upload to non-existent knowledge base', async () => {
      mockKnowledgeBaseService.getKnowledgeBase.mockResolvedValueOnce(null);

      const boundary = '----test';
      const payload = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.txt"',
        'Content-Type: text/plain',
        '',
        'Test content',
        `--${boundary}`,
        'Content-Disposition: form-data; name="knowledgeBaseName"',
        '',
        'nonexistent-kb',
        `--${boundary}--`,
      ].join('\r\n');

      const response = await server.getInstance().inject({
        method: 'POST',
        url: '/api/upload/file',
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Knowledge base not found');
    });

    it('should successfully upload valid file', async () => {
      const boundary = '----test';
      const payload = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.txt"',
        'Content-Type: text/plain',
        '',
        'Test content',
        `--${boundary}`,
        'Content-Disposition: form-data; name="knowledgeBaseName"',
        '',
        'test-kb',
        `--${boundary}--`,
      ].join('\r\n');

      const response = await server.getInstance().inject({
        method: 'POST',
        url: '/api/upload/file',
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.filename).toBe('test.txt');
      expect(body.knowledgeBaseName).toBe('test-kb');
      expect(mockIngestionService.ingestFiles).toHaveBeenCalled();
    });

    it('should handle ingestion errors gracefully', async () => {
      mockIngestionService.ingestFiles.mockRejectedValueOnce(new Error('Ingestion failed'));

      const boundary = '----test';
      const payload = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.txt"',
        'Content-Type: text/plain',
        '',
        'Test content',
        `--${boundary}`,
        'Content-Disposition: form-data; name="knowledgeBaseName"',
        '',
        'test-kb',
        `--${boundary}--`,
      ].join('\r\n');

      const response = await server.getInstance().inject({
        method: 'POST',
        url: '/api/upload/file',
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Upload failed');
    });
  });

  describe('File validation', () => {
    it('should accept all supported document formats', async () => {
      const supportedFormats = [
        'test.pdf',
        'test.docx',
        'test.doc',
        'test.pptx',
        'test.ppt',
        'test.xlsx',
        'test.xls',
        'test.html',
        'test.htm',
        'test.md',
        'test.markdown',
        'test.txt',
        'test.mp3',
        'test.wav',
        'test.m4a',
        'test.flac',
      ];

      for (const filename of supportedFormats) {
        const boundary = '----test';
        const payload = [
          `--${boundary}`,
          `Content-Disposition: form-data; name="file"; filename="${filename}"`,
          'Content-Type: application/octet-stream',
          '',
          'Test content',
          `--${boundary}`,
          'Content-Disposition: form-data; name="knowledgeBaseName"',
          '',
          'test-kb',
          `--${boundary}--`,
        ].join('\r\n');

        const response = await server.getInstance().inject({
          method: 'POST',
          url: '/api/upload/file',
          headers: {
            'content-type': `multipart/form-data; boundary=${boundary}`,
          },
          payload,
        });

        expect(response.statusCode).toBe(200);
      }
    });
  });
});
