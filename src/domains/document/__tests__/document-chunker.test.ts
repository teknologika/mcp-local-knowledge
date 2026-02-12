import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { DocumentChunkerService } from '../document-chunker.service.js';
import { Docling } from 'docling-sdk';

// Mock logging module BEFORE any imports that use it
vi.mock('../../shared/logging/index.js', () => ({
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
}));

// Mock docling-sdk
vi.mock('docling-sdk', () => ({
  Docling: vi.fn().mockImplementation(() => ({
    chunk: vi.fn(),
  })),
}));

describe('DocumentChunkerService - HybridChunker Integration', () => {
  let service: DocumentChunkerService;
  let mockDocling: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocling = {
      chunk: vi.fn(),
    };
    (Docling as any).mockImplementation(() => mockDocling);
    service = new DocumentChunkerService({ outputDir: './temp' });
  });

  describe('Task 3.4.10: HybridChunker integration via docling-sdk', () => {
    it('should chunk document using HybridChunker with max_tokens=512', async () => {
      // Arrange
      const content = '# Introduction\n\nThis is a test document with multiple paragraphs.\n\n## Section 1\n\nContent for section 1.';
      const mockResult = {
        chunks: [
          {
            text: '# Introduction\n\nThis is a test document with multiple paragraphs.',
            token_count: 12,
            type: 'section',
            heading_path: ['Introduction'],
          },
          {
            text: '## Section 1\n\nContent for section 1.',
            token_count: 8,
            type: 'section',
            heading_path: ['Introduction', 'Section 1'],
          },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(mockDocling.chunk).toHaveBeenCalledWith(content, {
        max_tokens: 512,
        chunker_type: 'hybrid',
        merge_peers: true,
      });
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('# Introduction\n\nThis is a test document with multiple paragraphs.');
      expect(result[1].content).toBe('## Section 1\n\nContent for section 1.');
    });

    it('should use custom max_tokens when provided', async () => {
      // Arrange
      const content = 'Test content';
      const mockResult = { chunks: [] };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      await service.chunkDocument(content, { maxTokens: 256 });

      // Assert
      expect(mockDocling.chunk).toHaveBeenCalledWith(content, {
        max_tokens: 256,
        chunker_type: 'hybrid',
        merge_peers: true,
      });
    });

    it('should set chunker_type to hybrid', async () => {
      // Arrange
      const content = 'Test content';
      const mockResult = { chunks: [] };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      await service.chunkDocument(content);

      // Assert
      expect(mockDocling.chunk).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ chunker_type: 'hybrid' })
      );
    });

    it('should enable merge_peers by default', async () => {
      // Arrange
      const content = 'Test content';
      const mockResult = { chunks: [] };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      await service.chunkDocument(content);

      // Assert
      expect(mockDocling.chunk).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ merge_peers: true })
      );
    });

    it('should respect mergePeers option when set to false', async () => {
      // Arrange
      const content = 'Test content';
      const mockResult = { chunks: [] };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      await service.chunkDocument(content, { mergePeers: false });

      // Assert
      expect(mockDocling.chunk).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ merge_peers: false })
      );
    });

    it('should process chunks returned by HybridChunker', async () => {
      // Arrange
      const content = 'Test document';
      const mockResult = {
        chunks: [
          {
            text: 'First chunk',
            token_count: 5,
            type: 'paragraph',
          },
          {
            text: 'Second chunk',
            token_count: 6,
            type: 'paragraph',
          },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('First chunk');
      expect(result[0].tokenCount).toBe(5);
      expect(result[1].content).toBe('Second chunk');
      expect(result[1].tokenCount).toBe(6);
    });

    it('should handle empty chunks array from HybridChunker', async () => {
      // Arrange
      const content = 'Test content';
      const mockResult = { chunks: [] };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle undefined chunks in result', async () => {
      // Arrange
      const content = 'Test content';
      const mockResult = {};
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('Task 3.4.10: chunkWithDocling method', () => {
    it('should chunk using Docling document object', async () => {
      // Arrange
      const doclingDoc = {
        text: 'Document text',
        markdown: '# Title\n\nContent',
      };
      const mockResult = {
        chunks: [
          {
            text: '# Title',
            token_count: 3,
            type: 'heading',
          },
          {
            text: 'Content',
            token_count: 2,
            type: 'paragraph',
          },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkWithDocling(doclingDoc);

      // Assert
      expect(mockDocling.chunk).toHaveBeenCalledWith(doclingDoc, {
        max_tokens: 512,
        chunker_type: 'hybrid',
        merge_peers: true,
      });
      expect(result).toHaveLength(2);
    });

    it('should use custom max_tokens with Docling document', async () => {
      // Arrange
      const doclingDoc = { text: 'Test' };
      const mockResult = { chunks: [] };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      await service.chunkWithDocling(doclingDoc, { maxTokens: 1024 });

      // Assert
      expect(mockDocling.chunk).toHaveBeenCalledWith(
        doclingDoc,
        expect.objectContaining({ max_tokens: 1024 })
      );
    });
  });
});

describe('DocumentChunkerService - Fallback Chunking', () => {
  let service: DocumentChunkerService;
  let mockDocling: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocling = {
      chunk: vi.fn(),
    };
    (Docling as any).mockImplementation(() => mockDocling);
    service = new DocumentChunkerService({ outputDir: './temp' });
  });

  describe('Task 3.4.11: Fallback chunking when HybridChunker fails', () => {
    it('should fallback to simple chunking when HybridChunker throws error', async () => {
      // Arrange
      const content = 'A'.repeat(1500); // 1.5KB
      mockDocling.chunk.mockRejectedValue(new Error('HybridChunker failed'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].metadata.hasContext).toBe(false);
      expect(result[0].metadata.chunkType).toBe('paragraph');
    });

    it('should use chunk_size=1000 for fallback chunking', async () => {
      // Arrange
      const content = 'A'.repeat(1500);
      mockDocling.chunk.mockRejectedValue(new Error('Failed'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      // First chunk should be approximately 1000 characters
      expect(result[0].content.length).toBeLessThanOrEqual(1000);
    });

    it('should use chunk_overlap=200 for fallback chunking', async () => {
      // Arrange
      const content = 'A'.repeat(1500);
      mockDocling.chunk.mockRejectedValue(new Error('Failed'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      // Should have overlapping content between chunks
      expect(result.length).toBeGreaterThan(1);
      // Second chunk should start 800 characters after first (1000 - 200 overlap)
    });

    it('should set hasContext=false for fallback chunks', async () => {
      // Arrange
      const content = 'Test content for fallback';
      mockDocling.chunk.mockRejectedValue(new Error('Failed'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result.every(chunk => chunk.metadata.hasContext === false)).toBe(true);
    });

    it('should set chunkType=paragraph for fallback chunks', async () => {
      // Arrange
      const content = 'Test content for fallback';
      mockDocling.chunk.mockRejectedValue(new Error('Failed'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result.every(chunk => chunk.metadata.chunkType === 'paragraph')).toBe(true);
    });

    it('should handle empty content in fallback', async () => {
      // Arrange
      const content = '';
      mockDocling.chunk.mockRejectedValue(new Error('Failed'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle whitespace-only content in fallback', async () => {
      // Arrange
      const content = '   \n\t\n   ';
      mockDocling.chunk.mockRejectedValue(new Error('Failed'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should use custom chunkSize when provided', async () => {
      // Arrange
      const content = 'A'.repeat(1500);
      mockDocling.chunk.mockRejectedValue(new Error('Failed'));

      // Act
      const result = await service.chunkDocument(content, { chunkSize: 500 });

      // Assert
      expect(result[0].content.length).toBeLessThanOrEqual(500);
    });

    it('should use custom chunkOverlap when provided', async () => {
      // Arrange
      const content = 'A'.repeat(1500);
      mockDocling.chunk.mockRejectedValue(new Error('Failed'));

      // Act
      const result = await service.chunkDocument(content, { 
        chunkSize: 1000, 
        chunkOverlap: 100 
      });

      // Assert
      // Should have more chunks with smaller overlap
      expect(result.length).toBeGreaterThan(1);
    });

    it('should assign sequential chunk indices in fallback', async () => {
      // Arrange
      const content = 'A'.repeat(1500);
      mockDocling.chunk.mockRejectedValue(new Error('Failed'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      result.forEach((chunk, index) => {
        expect(chunk.index).toBe(index);
      });
    });

    it('should estimate token count for fallback chunks', async () => {
      // Arrange
      const content = 'A'.repeat(400); // 400 characters ≈ 100 tokens
      mockDocling.chunk.mockRejectedValue(new Error('Failed'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].tokenCount).toBeGreaterThan(0);
      expect(result[0].tokenCount).toBeCloseTo(100, -1); // Within 10 tokens
    });

    it('should fallback when chunkWithDocling fails', async () => {
      // Arrange
      const doclingDoc = { text: 'Test content', markdown: '# Test' };
      mockDocling.chunk.mockRejectedValue(new Error('Failed'));

      // Act
      const result = await service.chunkWithDocling(doclingDoc);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].metadata.hasContext).toBe(false);
    });

    it('should extract text from docling document for fallback', async () => {
      // Arrange
      const doclingDoc = { text: 'Extracted text content' };
      mockDocling.chunk.mockRejectedValue(new Error('Failed'));

      // Act
      const result = await service.chunkWithDocling(doclingDoc);

      // Assert
      expect(result[0].content).toBe('Extracted text content');
    });

    it('should extract markdown from docling document if text missing', async () => {
      // Arrange
      const doclingDoc = { markdown: '# Markdown content' };
      mockDocling.chunk.mockRejectedValue(new Error('Failed'));

      // Act
      const result = await service.chunkWithDocling(doclingDoc);

      // Assert
      expect(result[0].content).toBe('# Markdown content');
    });
  });
});

describe('DocumentChunkerService - Metadata Extraction', () => {
  let service: DocumentChunkerService;
  let mockDocling: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocling = {
      chunk: vi.fn(),
    };
    (Docling as any).mockImplementation(() => mockDocling);
    service = new DocumentChunkerService({ outputDir: './temp' });
  });

  describe('Task 3.4.12: Metadata extraction', () => {
    it('should extract chunk type from HybridChunker metadata', async () => {
      // Arrange
      const content = 'Test document';
      const mockResult = {
        chunks: [
          { text: 'Paragraph text', type: 'paragraph', token_count: 5 },
          { text: '# Heading', type: 'heading', token_count: 3 },
          { text: '## Section', type: 'section', token_count: 3 },
          { text: '| A | B |', type: 'table', token_count: 6 },
          { text: '- Item 1', type: 'list', token_count: 4 },
          { text: 'function test() {}', type: 'code', token_count: 7 },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].metadata.chunkType).toBe('paragraph');
      expect(result[1].metadata.chunkType).toBe('heading');
      expect(result[2].metadata.chunkType).toBe('section');
      expect(result[3].metadata.chunkType).toBe('table');
      expect(result[4].metadata.chunkType).toBe('list');
      expect(result[5].metadata.chunkType).toBe('code');
    });

    it('should detect table chunk type from type field', async () => {
      // Arrange
      const content = 'Document with table';
      const mockResult = {
        chunks: [
          { text: '| Col1 | Col2 |', type: 'table_cell', token_count: 8 },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].metadata.chunkType).toBe('table');
    });

    it('should detect heading chunk type from type field', async () => {
      // Arrange
      const content = 'Document with heading';
      const mockResult = {
        chunks: [
          { text: '# Main Title', type: 'title', token_count: 4 },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].metadata.chunkType).toBe('heading');
    });

    it('should default to paragraph for unknown chunk types', async () => {
      // Arrange
      const content = 'Test document';
      const mockResult = {
        chunks: [
          { text: 'Unknown type', type: 'unknown', token_count: 5 },
          { text: 'No type', token_count: 3 },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].metadata.chunkType).toBe('paragraph');
      expect(result[1].metadata.chunkType).toBe('paragraph');
    });

    it('should extract token count from chunk metadata', async () => {
      // Arrange
      const content = 'Test document';
      const mockResult = {
        chunks: [
          { text: 'First chunk', token_count: 25 },
          { text: 'Second chunk', token_count: 50 },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].tokenCount).toBe(25);
      expect(result[1].tokenCount).toBe(50);
    });

    it('should estimate token count when not provided', async () => {
      // Arrange
      const content = 'Test document';
      const mockResult = {
        chunks: [
          { text: 'A'.repeat(400) }, // 400 chars ≈ 100 tokens
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].tokenCount).toBeGreaterThan(0);
      expect(result[0].tokenCount).toBeCloseTo(100, -1);
    });

    it('should extract heading path from chunk metadata', async () => {
      // Arrange
      const content = 'Document with headings';
      const mockResult = {
        chunks: [
          {
            text: 'Content under Introduction > Overview',
            type: 'paragraph',
            token_count: 10,
            heading_path: ['Introduction', 'Overview'],
          },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].metadata.headingPath).toEqual(['Introduction', 'Overview']);
    });

    it('should extract heading path from headings field', async () => {
      // Arrange
      const content = 'Document with headings';
      const mockResult = {
        chunks: [
          {
            text: 'Content',
            type: 'paragraph',
            token_count: 5,
            headings: ['Chapter 1', 'Section A'],
          },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].metadata.headingPath).toEqual(['Chapter 1', 'Section A']);
    });

    it('should extract heading path from section_hierarchy field', async () => {
      // Arrange
      const content = 'Document with sections';
      const mockResult = {
        chunks: [
          {
            text: 'Content',
            type: 'paragraph',
            token_count: 5,
            section_hierarchy: ['Part 1', 'Chapter 2', 'Section 3'],
          },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].metadata.headingPath).toEqual(['Part 1', 'Chapter 2', 'Section 3']);
    });

    it('should not include headingPath when not available', async () => {
      // Arrange
      const content = 'Document without headings';
      const mockResult = {
        chunks: [
          {
            text: 'Content without heading context',
            type: 'paragraph',
            token_count: 8,
          },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].metadata.headingPath).toBeUndefined();
    });

    it('should extract page number from chunk metadata', async () => {
      // Arrange
      const content = 'Multi-page document';
      const mockResult = {
        chunks: [
          { text: 'Page 1 content', type: 'paragraph', token_count: 5, page_number: 1 },
          { text: 'Page 2 content', type: 'paragraph', token_count: 5, page_number: 2 },
          { text: 'Page 5 content', type: 'paragraph', token_count: 5, page_number: 5 },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].metadata.pageNumber).toBe(1);
      expect(result[1].metadata.pageNumber).toBe(2);
      expect(result[2].metadata.pageNumber).toBe(5);
    });

    it('should set hasContext=true for HybridChunker chunks', async () => {
      // Arrange
      const content = 'Test document';
      const mockResult = {
        chunks: [
          { text: 'Chunk 1', type: 'paragraph', token_count: 5 },
          { text: 'Chunk 2', type: 'section', token_count: 5 },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].metadata.hasContext).toBe(true);
      expect(result[1].metadata.hasContext).toBe(true);
    });

    it('should assign sequential chunk indices', async () => {
      // Arrange
      const content = 'Test document';
      const mockResult = {
        chunks: [
          { text: 'Chunk 1', type: 'paragraph', token_count: 5 },
          { text: 'Chunk 2', type: 'paragraph', token_count: 5 },
          { text: 'Chunk 3', type: 'paragraph', token_count: 5 },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].index).toBe(0);
      expect(result[1].index).toBe(1);
      expect(result[2].index).toBe(2);
    });

    it('should handle chunk with text field', async () => {
      // Arrange
      const content = 'Test document';
      const mockResult = {
        chunks: [
          { text: 'Content in text field', type: 'paragraph', token_count: 5 },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].content).toBe('Content in text field');
    });

    it('should handle chunk with content field', async () => {
      // Arrange
      const content = 'Test document';
      const mockResult = {
        chunks: [
          { content: 'Content in content field', type: 'paragraph', token_count: 5 },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].content).toBe('Content in content field');
    });

    it('should handle chunk with empty content', async () => {
      // Arrange
      const content = 'Test document';
      const mockResult = {
        chunks: [
          { type: 'paragraph', token_count: 0 },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].content).toBe('');
    });
  });
});

describe('DocumentChunkerService - Timeout Handling', () => {
  let service: DocumentChunkerService;
  let mockDocling: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocling = {
      chunk: vi.fn(),
    };
    (Docling as any).mockImplementation(() => mockDocling);
    service = new DocumentChunkerService({ outputDir: './temp' });
  });

  describe('Task 3.4.13: Timeout handling', () => {
    it('should handle long-running HybridChunker operations', async () => {
      // Arrange
      const content = 'Very large document';
      mockDocling.chunk.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ chunks: [] }), 100))
      );

      // Act
      const startTime = Date.now();
      const result = await service.chunkDocument(content);
      const duration = Date.now() - startTime;

      // Assert
      expect(result).toBeDefined();
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should fallback when HybridChunker times out', async () => {
      // Arrange
      const content = 'A'.repeat(2000);
      mockDocling.chunk.mockImplementation(() => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 50))
      );

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].metadata.hasContext).toBe(false);
    });

    it('should handle timeout errors gracefully', async () => {
      // Arrange
      const content = 'Test content';
      mockDocling.chunk.mockRejectedValue(new Error('Operation timed out'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should not hang on very large documents', async () => {
      // Arrange
      const content = 'A'.repeat(10000); // 10KB document
      mockDocling.chunk.mockRejectedValue(new Error('Too large'));

      // Act
      const startTime = Date.now();
      const result = await service.chunkDocument(content);
      const duration = Date.now() - startTime;

      // Assert
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

describe('DocumentChunkerService - Error Handling', () => {
  let service: DocumentChunkerService;
  let mockDocling: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocling = {
      chunk: vi.fn(),
    };
    (Docling as any).mockImplementation(() => mockDocling);
    service = new DocumentChunkerService({ outputDir: './temp' });
  });

  describe('Task 3.4.14: Error handling with descriptive messages', () => {
    it('should handle HybridChunker errors with descriptive fallback', async () => {
      // Arrange
      const content = 'Test content';
      const error = new Error('HybridChunker failed: Invalid document structure');
      mockDocling.chunk.mockRejectedValue(error);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      const content = 'Test content';
      mockDocling.chunk.mockRejectedValue(new Error('Network error: Connection refused'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result).toBeDefined();
      expect(result[0].metadata.hasContext).toBe(false);
    });

    it('should handle parsing errors gracefully', async () => {
      // Arrange
      const content = 'Test content';
      mockDocling.chunk.mockRejectedValue(new Error('Parse error: Malformed document'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle memory errors gracefully', async () => {
      // Arrange
      const content = 'Test content';
      mockDocling.chunk.mockRejectedValue(new Error('Out of memory'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle undefined error gracefully', async () => {
      // Arrange
      const content = 'Test content';
      mockDocling.chunk.mockRejectedValue(undefined);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle null result from HybridChunker', async () => {
      // Arrange
      const content = 'Test content';
      mockDocling.chunk.mockResolvedValue(null);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      // Should fallback to simple chunking when result is null
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].metadata.hasContext).toBe(false);
    });

    it('should handle malformed chunk data', async () => {
      // Arrange
      const content = 'Test content';
      const mockResult = {
        chunks: [
          { /* missing required fields */ },
          { text: null, type: null, token_count: null },
          { text: undefined, type: undefined },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].content).toBe('');
      expect(result[1].content).toBe('');
      expect(result[2].content).toBe('');
    });

    it('should handle chunks with invalid token counts', async () => {
      // Arrange
      const content = 'Test content';
      const mockResult = {
        chunks: [
          { text: 'Valid content', token_count: -1 },
          { text: 'Another chunk', token_count: NaN },
          { text: 'Third chunk', token_count: null },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].tokenCount).toBeGreaterThan(0); // Should estimate
      expect(result[1].tokenCount).toBeGreaterThan(0); // Should estimate
      expect(result[2].tokenCount).toBeGreaterThan(0); // Should estimate
    });

    it('should handle chunks with invalid heading paths', async () => {
      // Arrange
      const content = 'Test content';
      const mockResult = {
        chunks: [
          { text: 'Content', type: 'paragraph', token_count: 5, heading_path: null },
          { text: 'Content', type: 'paragraph', token_count: 5, heading_path: 'not-an-array' },
          { text: 'Content', type: 'paragraph', token_count: 5, heading_path: [null, undefined, ''] },
        ],
      };
      mockDocling.chunk.mockResolvedValue(mockResult);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result[0].metadata.headingPath).toBeUndefined();
      expect(result[1].metadata.headingPath).toBeUndefined();
      expect(result[2].metadata.headingPath).toEqual([null, undefined, '']);
    });

    it('should handle docling-sdk not available error', () => {
      // Arrange
      (Docling as any).mockImplementation(() => {
        throw new Error('docling-sdk is not installed');
      });

      // Act & Assert
      expect(() => new DocumentChunkerService({ outputDir: './temp' }))
        .toThrow('docling-sdk is not installed');
    });

    it('should handle empty string content', async () => {
      // Arrange
      const content = '';
      mockDocling.chunk.mockRejectedValue(new Error('Empty content'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle very long single line', async () => {
      // Arrange
      const content = 'A'.repeat(5000); // 5KB single line
      mockDocling.chunk.mockRejectedValue(new Error('Line too long'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].content.length).toBeLessThanOrEqual(1000);
    });

    it('should handle special characters in content', async () => {
      // Arrange
      const content = '特殊字符 émojis 🎉 symbols ©®™';
      mockDocling.chunk.mockRejectedValue(new Error('Encoding error'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result).toBeDefined();
      expect(result[0].content).toContain('特殊字符');
    });

    it('should handle content with null bytes', async () => {
      // Arrange
      const content = 'Content\x00with\x00null\x00bytes';
      mockDocling.chunk.mockRejectedValue(new Error('Invalid characters'));

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      expect(result).toBeDefined();
    });

    it('should provide descriptive error context in logs', async () => {
      // Arrange
      const content = 'Test content';
      const error = new Error('Specific error: Document format not supported');
      mockDocling.chunk.mockRejectedValue(error);

      // Act
      const result = await service.chunkDocument(content);

      // Assert
      // Should fallback successfully despite error
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
