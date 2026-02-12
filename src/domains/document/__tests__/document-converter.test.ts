import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentConverterService } from '../document-converter.service.js';
import { Docling } from 'docling-sdk';

// Mock docling-sdk
vi.mock('docling-sdk', () => ({
  Docling: vi.fn().mockImplementation(() => ({
    convert: vi.fn(),
  })),
}));

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('DocumentConverterService - Document Type Detection', () => {
  let service: DocumentConverterService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DocumentConverterService({ outputDir: './temp' });
  });

  describe('PDF format detection', () => {
    it('should detect .pdf extension as pdf type', () => {
      const filePath = '/path/to/document.pdf';
      // Access private method via type assertion for testing
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('pdf');
    });
  });

  describe('DOCX format detection', () => {
    it('should detect .docx extension as docx type', () => {
      const filePath = '/path/to/document.docx';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('docx');
    });

    it('should detect .doc extension as docx type', () => {
      const filePath = '/path/to/document.doc';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('docx');
    });
  });

  describe('PPTX format detection', () => {
    it('should detect .pptx extension as pptx type', () => {
      const filePath = '/path/to/presentation.pptx';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('pptx');
    });

    it('should detect .ppt extension as pptx type', () => {
      const filePath = '/path/to/presentation.ppt';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('pptx');
    });
  });

  describe('XLSX format detection', () => {
    it('should detect .xlsx extension as xlsx type', () => {
      const filePath = '/path/to/spreadsheet.xlsx';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('xlsx');
    });

    it('should detect .xls extension as xlsx type', () => {
      const filePath = '/path/to/spreadsheet.xls';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('xlsx');
    });
  });

  describe('HTML format detection', () => {
    it('should detect .html extension as html type', () => {
      const filePath = '/path/to/page.html';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('html');
    });

    it('should detect .htm extension as html type', () => {
      const filePath = '/path/to/page.htm';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('html');
    });
  });

  describe('Markdown format detection', () => {
    it('should detect .md extension as markdown type', () => {
      const filePath = '/path/to/readme.md';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('markdown');
    });

    it('should detect .markdown extension as markdown type', () => {
      const filePath = '/path/to/readme.markdown';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('markdown');
    });
  });

  describe('Text format detection', () => {
    it('should detect .txt extension as text type', () => {
      const filePath = '/path/to/notes.txt';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('text');
    });
  });

  describe('Audio format detection', () => {
    it('should detect .mp3 extension as audio type', () => {
      const filePath = '/path/to/recording.mp3';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('audio');
    });

    it('should detect .wav extension as audio type', () => {
      const filePath = '/path/to/recording.wav';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('audio');
    });

    it('should detect .m4a extension as audio type', () => {
      const filePath = '/path/to/recording.m4a';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('audio');
    });

    it('should detect .flac extension as audio type', () => {
      const filePath = '/path/to/recording.flac';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('audio');
    });
  });

  describe('Case insensitivity', () => {
    it('should detect uppercase .PDF extension', () => {
      const filePath = '/path/to/document.PDF';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('pdf');
    });

    it('should detect mixed case .PdF extension', () => {
      const filePath = '/path/to/document.PdF';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('pdf');
    });

    it('should detect uppercase .DOCX extension', () => {
      const filePath = '/path/to/document.DOCX';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('docx');
    });
  });

  describe('Unsupported format error handling', () => {
    it('should throw error for unsupported .zip extension', () => {
      const filePath = '/path/to/archive.zip';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(() => detectType(filePath)).toThrow('Unsupported file format: .zip');
    });

    it('should throw error for unsupported .exe extension', () => {
      const filePath = '/path/to/program.exe';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(() => detectType(filePath)).toThrow('Unsupported file format: .exe');
    });

    it('should throw error for unsupported .jpg extension', () => {
      const filePath = '/path/to/image.jpg';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(() => detectType(filePath)).toThrow('Unsupported file format: .jpg');
    });

    it('should throw error for file without extension', () => {
      const filePath = '/path/to/noextension';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(() => detectType(filePath)).toThrow('Unsupported file format: ');
    });
  });

  describe('Edge cases', () => {
    it('should handle file with multiple dots in name', () => {
      const filePath = '/path/to/my.document.with.dots.pdf';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('pdf');
    });

    it('should handle file in nested directory', () => {
      const filePath = '/very/deep/nested/path/to/document.docx';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('docx');
    });

    it('should handle file with spaces in name', () => {
      const filePath = '/path/to/my document with spaces.pdf';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('pdf');
    });

    it('should handle file with special characters in name', () => {
      const filePath = '/path/to/document-2024_final(v2).pdf';
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType(filePath)).toBe('pdf');
    });
  });

  describe('getSupportedFormats', () => {
    it('should return all supported file extensions', () => {
      const formats = service.getSupportedFormats();
      
      expect(formats).toContain('.pdf');
      expect(formats).toContain('.docx');
      expect(formats).toContain('.doc');
      expect(formats).toContain('.pptx');
      expect(formats).toContain('.ppt');
      expect(formats).toContain('.xlsx');
      expect(formats).toContain('.xls');
      expect(formats).toContain('.html');
      expect(formats).toContain('.htm');
      expect(formats).toContain('.md');
      expect(formats).toContain('.markdown');
      expect(formats).toContain('.txt');
      expect(formats).toContain('.mp3');
      expect(formats).toContain('.wav');
      expect(formats).toContain('.m4a');
      expect(formats).toContain('.flac');
    });

    it('should return exactly 16 supported formats', () => {
      const formats = service.getSupportedFormats();
      expect(formats).toHaveLength(16);
    });
  });
});


describe('DocumentConverterService - PDF Conversion', () => {
  let service: DocumentConverterService;
  let mockDocling: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocling = {
      convert: vi.fn(),
    };
    (Docling as any).mockImplementation(() => mockDocling);
    service = new DocumentConverterService({ outputDir: './temp' });
  });

  describe('Successful PDF conversion', () => {
    it('should convert PDF and return markdown content with metadata', async () => {
      // Arrange
      const filePath = '/path/to/document.pdf';
      const mockResult = {
        markdown: '# Test Document\n\nThis is a test PDF document with some content.',
        metadata: {
          title: 'Test Document',
          page_count: 5,
          has_images: true,
          has_tables: false,
        },
        document: { /* docling document object */ },
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(mockDocling.convert).toHaveBeenCalledWith(
        filePath,
        'document.pdf',
        { to_formats: ['md', 'json'] }
      );
      expect(result.markdown).toBe(mockResult.markdown);
      expect(result.metadata.title).toBe('Test Document');
      expect(result.metadata.format).toBe('pdf');
      expect(result.metadata.pageCount).toBe(5);
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.hasImages).toBe(true);
      expect(result.metadata.hasTables).toBe(false);
      expect(result.metadata.conversionDuration).toBeGreaterThanOrEqual(0);
      expect(result.doclingDocument).toBeDefined();
    });

    it('should extract title from metadata when available', async () => {
      // Arrange
      const filePath = '/path/to/report.pdf';
      const mockResult = {
        markdown: '# Annual Report\n\nContent here.',
        metadata: {
          title: 'Annual Report 2024',
          page_count: 10,
          has_images: false,
          has_tables: true,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.title).toBe('Annual Report 2024');
    });

    it('should use filename as title when metadata title is missing', async () => {
      // Arrange
      const filePath = '/path/to/untitled.pdf';
      const mockResult = {
        markdown: 'Content without title',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.title).toBe('untitled.pdf');
    });

    it('should correctly count words in markdown content', async () => {
      // Arrange
      const filePath = '/path/to/document.pdf';
      const mockResult = {
        markdown: 'One two three four five six seven eight nine ten',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.wordCount).toBe(10);
    });

    it('should handle PDF with images', async () => {
      // Arrange
      const filePath = '/path/to/presentation.pdf';
      const mockResult = {
        markdown: '# Presentation\n\n![Image](image.png)\n\nSlide content',
        metadata: {
          title: 'Presentation',
          page_count: 20,
          has_images: true,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.hasImages).toBe(true);
      expect(result.metadata.hasTables).toBe(false);
    });

    it('should handle PDF with tables', async () => {
      // Arrange
      const filePath = '/path/to/data.pdf';
      const mockResult = {
        markdown: '# Data Report\n\n| Col1 | Col2 |\n|------|------|\n| A    | B    |',
        metadata: {
          title: 'Data Report',
          page_count: 3,
          has_images: false,
          has_tables: true,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.hasImages).toBe(false);
      expect(result.metadata.hasTables).toBe(true);
    });

    it('should handle PDF with both images and tables', async () => {
      // Arrange
      const filePath = '/path/to/complex.pdf';
      const mockResult = {
        markdown: '# Complex Document\n\n![Chart](chart.png)\n\n| Data | Value |\n|------|-------|\n| X    | 100   |',
        metadata: {
          title: 'Complex Document',
          page_count: 15,
          has_images: true,
          has_tables: true,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.hasImages).toBe(true);
      expect(result.metadata.hasTables).toBe(true);
    });

    it('should record conversion duration', async () => {
      // Arrange
      const filePath = '/path/to/document.pdf';
      const mockResult = {
        markdown: 'Content',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const startTime = Date.now();
      const result = await service.convertDocument(filePath);
      const endTime = Date.now();

      // Assert
      expect(result.metadata.conversionDuration).toBeDefined();
      expect(result.metadata.conversionDuration).toBeGreaterThanOrEqual(0);
      expect(result.metadata.conversionDuration).toBeLessThanOrEqual(endTime - startTime + 10);
    });

    it('should handle empty markdown content', async () => {
      // Arrange
      const filePath = '/path/to/empty.pdf';
      const mockResult = {
        markdown: '',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.markdown).toBe('');
      expect(result.metadata.wordCount).toBe(0);
    });

    it('should handle missing markdown field in result', async () => {
      // Arrange
      const filePath = '/path/to/document.pdf';
      const mockResult = {
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.markdown).toBe('');
      expect(result.metadata.wordCount).toBe(0);
    });
  });

  describe('Timeout handling', () => {
    it('should timeout after configured duration', async () => {
      // Arrange
      const filePath = '/path/to/large.pdf';
      const shortTimeout = 100; // 100ms
      
      // Re-initialize service with short timeout
      const mockDoclingWithTimeout = {
        convert: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({
            markdown: 'Content',
            metadata: {},
            document: {},
          }), 200))
        ),
      };
      (Docling as any).mockImplementation(() => mockDoclingWithTimeout);
      
      service = new DocumentConverterService({ 
        outputDir: './temp',
        conversionTimeout: shortTimeout 
      });

      // Act & Assert
      // Should timeout and throw error since PDF fallback is not supported
      await expect(service.convertDocument(filePath)).rejects.toThrow();
    });

    it('should use default timeout of 30 seconds', async () => {
      // Arrange
      const filePath = '/path/to/document.pdf';
      const mockResult = {
        markdown: 'Content',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert - should complete successfully with default timeout
      expect(result.markdown).toBe('Content');
    });
  });

  describe('Error handling', () => {
    it('should handle conversion errors with fallback', async () => {
      // Arrange
      const filePath = '/path/to/corrupted.pdf';
      mockDocling.convert.mockRejectedValue(new Error('PDF parsing failed'));

      // Act & Assert
      await expect(service.convertDocument(filePath)).rejects.toThrow();
    });

    it('should handle missing metadata gracefully', async () => {
      // Arrange
      const filePath = '/path/to/document.pdf';
      const mockResult = {
        markdown: 'Content without metadata',
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.markdown).toBe('Content without metadata');
      expect(result.metadata.hasImages).toBe(false);
      expect(result.metadata.hasTables).toBe(false);
      expect(result.metadata.pageCount).toBeUndefined();
    });

    it('should handle docling-sdk initialization errors', () => {
      // Arrange
      (Docling as any).mockImplementation(() => {
        throw new Error('Docling not installed');
      });

      // Act & Assert
      expect(() => new DocumentConverterService({ outputDir: './temp' }))
        .toThrow('Docling not installed');
    });
  });

  describe('Edge cases', () => {
    it('should handle PDF with special characters in filename', async () => {
      // Arrange
      const filePath = '/path/to/document (final) [v2].pdf';
      const mockResult = {
        markdown: 'Content',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(mockDocling.convert).toHaveBeenCalledWith(
        filePath,
        'document (final) [v2].pdf',
        { to_formats: ['md', 'json'] }
      );
      expect(result.metadata.title).toBe('document (final) [v2].pdf');
    });

    it('should handle PDF with unicode characters in filename', async () => {
      // Arrange
      const filePath = '/path/to/文档.pdf';
      const mockResult = {
        markdown: 'Content',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.title).toBe('文档.pdf');
    });

    it('should handle very large page counts', async () => {
      // Arrange
      const filePath = '/path/to/book.pdf';
      const mockResult = {
        markdown: 'Very long book content...',
        metadata: {
          title: 'Complete Works',
          page_count: 9999,
          has_images: true,
          has_tables: true,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.pageCount).toBe(9999);
    });

    it('should handle markdown with multiple whitespace types', async () => {
      // Arrange
      const filePath = '/path/to/document.pdf';
      const mockResult = {
        markdown: 'Word1\tWord2\nWord3\r\nWord4  Word5',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.wordCount).toBe(5);
    });

    it('should handle markdown with only whitespace', async () => {
      // Arrange
      const filePath = '/path/to/blank.pdf';
      const mockResult = {
        markdown: '   \n\t\n   ',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.wordCount).toBe(0);
    });
  });

  describe('Metadata extraction', () => {
    it('should extract all available metadata fields', async () => {
      // Arrange
      const filePath = '/path/to/complete.pdf';
      const mockResult = {
        markdown: '# Complete Document\n\nWith all metadata fields populated.',
        metadata: {
          title: 'Complete Document',
          page_count: 42,
          has_images: true,
          has_tables: true,
        },
        document: { type: 'pdf', version: '1.7' },
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata).toMatchObject({
        title: 'Complete Document',
        format: 'pdf',
        pageCount: 42,
        hasImages: true,
        hasTables: true,
      });
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.conversionDuration).toBeGreaterThanOrEqual(0);
      expect(result.doclingDocument).toBeDefined();
    });

    it('should handle partial metadata', async () => {
      // Arrange
      const filePath = '/path/to/partial.pdf';
      const mockResult = {
        markdown: 'Content',
        metadata: {
          page_count: 5,
          // Missing title, has_images, has_tables
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.title).toBe('partial.pdf'); // Fallback to filename
      expect(result.metadata.pageCount).toBe(5);
      expect(result.metadata.hasImages).toBe(false); // Default value
      expect(result.metadata.hasTables).toBe(false); // Default value
    });

    it('should handle zero page count', async () => {
      // Arrange
      const filePath = '/path/to/empty.pdf';
      const mockResult = {
        markdown: '',
        metadata: {
          page_count: 0,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.pageCount).toBe(0);
    });
  });
});


describe('DocumentConverterService - DOCX Conversion', () => {
  let service: DocumentConverterService;
  let mockDocling: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocling = {
      convert: vi.fn(),
    };
    (Docling as any).mockImplementation(() => mockDocling);
    service = new DocumentConverterService({ outputDir: './temp' });
  });

  describe('Successful DOCX conversion', () => {
    it('should convert .docx file and return markdown content with metadata', async () => {
      // Arrange
      const filePath = '/path/to/report.docx';
      const mockResult = {
        markdown: '# Annual Report\n\n## Executive Summary\n\nThis report covers the fiscal year 2024.',
        metadata: {
          title: 'Annual Report 2024',
          page_count: 15,
          has_images: false,
          has_tables: true,
        },
        document: { type: 'docx' },
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(mockDocling.convert).toHaveBeenCalledWith(
        filePath,
        'report.docx',
        { to_formats: ['md', 'json'] }
      );
      expect(result.markdown).toBe(mockResult.markdown);
      expect(result.metadata.title).toBe('Annual Report 2024');
      expect(result.metadata.format).toBe('docx');
      expect(result.metadata.pageCount).toBe(15);
      expect(result.metadata.hasImages).toBe(false);
      expect(result.metadata.hasTables).toBe(true);
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.conversionDuration).toBeGreaterThanOrEqual(0);
      expect(result.doclingDocument).toBeDefined();
    });

    it('should convert .doc file (legacy format) and return markdown', async () => {
      // Arrange
      const filePath = '/path/to/legacy.doc';
      const mockResult = {
        markdown: '# Legacy Document\n\nContent from old Word format.',
        metadata: {
          title: 'Legacy Document',
          page_count: 3,
          has_images: false,
          has_tables: false,
        },
        document: { type: 'doc' },
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(mockDocling.convert).toHaveBeenCalledWith(
        filePath,
        'legacy.doc',
        { to_formats: ['md', 'json'] }
      );
      expect(result.markdown).toBe(mockResult.markdown);
      expect(result.metadata.format).toBe('docx'); // .doc maps to docx type
      expect(result.metadata.title).toBe('Legacy Document');
    });

    it('should handle DOCX with complex formatting', async () => {
      // Arrange
      const filePath = '/path/to/formatted.docx';
      const mockResult = {
        markdown: '# Title\n\n**Bold text** and *italic text*\n\n- Bullet 1\n- Bullet 2\n\n1. Numbered 1\n2. Numbered 2',
        metadata: {
          title: 'Formatted Document',
          page_count: 2,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.markdown).toContain('**Bold text**');
      expect(result.markdown).toContain('*italic text*');
      expect(result.markdown).toContain('- Bullet');
      expect(result.markdown).toContain('1. Numbered');
    });

    it('should handle DOCX with tables', async () => {
      // Arrange
      const filePath = '/path/to/data-report.docx';
      const mockResult = {
        markdown: '# Data Report\n\n| Name | Value | Status |\n|------|-------|--------|\n| A    | 100   | Active |\n| B    | 200   | Inactive |',
        metadata: {
          title: 'Data Report',
          page_count: 5,
          has_images: false,
          has_tables: true,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.hasTables).toBe(true);
      expect(result.markdown).toContain('| Name | Value | Status |');
      expect(result.markdown).toContain('|------|-------|--------|');
    });

    it('should handle DOCX with images', async () => {
      // Arrange
      const filePath = '/path/to/presentation.docx';
      const mockResult = {
        markdown: '# Presentation\n\n![Company Logo](logo.png)\n\n## Overview\n\nContent with images.',
        metadata: {
          title: 'Presentation',
          page_count: 10,
          has_images: true,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.hasImages).toBe(true);
      expect(result.markdown).toContain('![Company Logo](logo.png)');
    });

    it('should handle DOCX with both images and tables', async () => {
      // Arrange
      const filePath = '/path/to/complex.docx';
      const mockResult = {
        markdown: '# Complex Document\n\n![Chart](chart.png)\n\n| Q1 | Q2 | Q3 | Q4 |\n|----|----|----|----|\n| 10 | 20 | 30 | 40 |',
        metadata: {
          title: 'Complex Document',
          page_count: 20,
          has_images: true,
          has_tables: true,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.hasImages).toBe(true);
      expect(result.metadata.hasTables).toBe(true);
    });

    it('should extract title from document metadata', async () => {
      // Arrange
      const filePath = '/path/to/titled.docx';
      const mockResult = {
        markdown: 'Document content',
        metadata: {
          title: 'Official Document Title from Metadata',
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.title).toBe('Official Document Title from Metadata');
    });

    it('should use filename as title when metadata title is missing', async () => {
      // Arrange
      const filePath = '/path/to/untitled-document.docx';
      const mockResult = {
        markdown: 'Content without title metadata',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.title).toBe('untitled-document.docx');
    });

    it('should correctly count words in DOCX content', async () => {
      // Arrange
      const filePath = '/path/to/essay.docx';
      const mockResult = {
        markdown: 'This is a test document with exactly fifteen words in this sentence right here now.',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.wordCount).toBe(15);
    });

    it('should handle DOCX with multiple pages', async () => {
      // Arrange
      const filePath = '/path/to/thesis.docx';
      const mockResult = {
        markdown: '# Thesis\n\n' + 'Content '.repeat(1000),
        metadata: {
          title: 'PhD Thesis',
          page_count: 250,
          has_images: true,
          has_tables: true,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.pageCount).toBe(250);
      expect(result.metadata.wordCount).toBeGreaterThan(1000);
    });

    it('should record conversion duration for DOCX', async () => {
      // Arrange
      const filePath = '/path/to/document.docx';
      const mockResult = {
        markdown: 'Content',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const startTime = Date.now();
      const result = await service.convertDocument(filePath);
      const endTime = Date.now();

      // Assert
      expect(result.metadata.conversionDuration).toBeDefined();
      expect(result.metadata.conversionDuration).toBeGreaterThanOrEqual(0);
      expect(result.metadata.conversionDuration).toBeLessThanOrEqual(endTime - startTime + 10);
    });

    it('should handle empty DOCX file', async () => {
      // Arrange
      const filePath = '/path/to/empty.docx';
      const mockResult = {
        markdown: '',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.markdown).toBe('');
      expect(result.metadata.wordCount).toBe(0);
    });

    it('should handle DOCX with special characters in filename', async () => {
      // Arrange
      const filePath = '/path/to/report (final) [v2].docx';
      const mockResult = {
        markdown: 'Final report content',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(mockDocling.convert).toHaveBeenCalledWith(
        filePath,
        'report (final) [v2].docx',
        { to_formats: ['md', 'json'] }
      );
      expect(result.metadata.title).toBe('report (final) [v2].docx');
    });

    it('should handle DOCX with unicode characters in filename', async () => {
      // Arrange
      const filePath = '/path/to/文档报告.docx';
      const mockResult = {
        markdown: 'Content in Chinese document',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.title).toBe('文档报告.docx');
    });

    it('should handle DOCX with headings hierarchy', async () => {
      // Arrange
      const filePath = '/path/to/structured.docx';
      const mockResult = {
        markdown: '# Main Title\n\n## Section 1\n\n### Subsection 1.1\n\nContent\n\n### Subsection 1.2\n\nMore content\n\n## Section 2\n\nFinal content',
        metadata: {
          title: 'Structured Document',
          page_count: 5,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.markdown).toContain('# Main Title');
      expect(result.markdown).toContain('## Section 1');
      expect(result.markdown).toContain('### Subsection 1.1');
    });
  });

  describe('DOCX conversion error handling', () => {
    it('should handle conversion errors with fallback', async () => {
      // Arrange
      const filePath = '/path/to/corrupted.docx';
      mockDocling.convert.mockRejectedValue(new Error('DOCX parsing failed: corrupted file'));

      // Act & Assert
      await expect(service.convertDocument(filePath)).rejects.toThrow();
    });

    it('should handle timeout for large DOCX files', async () => {
      // Arrange
      const filePath = '/path/to/large.docx';
      const shortTimeout = 100;
      
      const mockDoclingWithTimeout = {
        convert: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({
            markdown: 'Content',
            metadata: {},
            document: {},
          }), 200))
        ),
      };
      (Docling as any).mockImplementation(() => mockDoclingWithTimeout);
      
      service = new DocumentConverterService({ 
        outputDir: './temp',
        conversionTimeout: shortTimeout 
      });

      // Act & Assert
      await expect(service.convertDocument(filePath)).rejects.toThrow();
    });

    it('should handle missing markdown field in DOCX result', async () => {
      // Arrange
      const filePath = '/path/to/document.docx';
      const mockResult = {
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.markdown).toBe('');
      expect(result.metadata.wordCount).toBe(0);
    });

    it('should handle partial metadata in DOCX result', async () => {
      // Arrange
      const filePath = '/path/to/partial.docx';
      const mockResult = {
        markdown: 'Content with partial metadata',
        metadata: {
          page_count: 3,
          // Missing title, has_images, has_tables
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.title).toBe('partial.docx'); // Fallback to filename
      expect(result.metadata.pageCount).toBe(3);
      expect(result.metadata.hasImages).toBe(false); // Default value
      expect(result.metadata.hasTables).toBe(false); // Default value
    });

    it('should handle DOCX with zero page count', async () => {
      // Arrange
      const filePath = '/path/to/empty-pages.docx';
      const mockResult = {
        markdown: '',
        metadata: {
          page_count: 0,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.pageCount).toBe(0);
    });

    it('should handle DOCX conversion with docling-sdk error', async () => {
      // Arrange
      const filePath = '/path/to/protected.docx';
      mockDocling.convert.mockRejectedValue(new Error('Document is password protected'));

      // Act & Assert
      await expect(service.convertDocument(filePath)).rejects.toThrow();
    });
  });

  describe('DOCX metadata extraction', () => {
    it('should extract all available metadata fields from DOCX', async () => {
      // Arrange
      const filePath = '/path/to/complete.docx';
      const mockResult = {
        markdown: '# Complete DOCX\n\nWith all metadata fields populated and comprehensive content.',
        metadata: {
          title: 'Complete DOCX Document',
          page_count: 42,
          has_images: true,
          has_tables: true,
        },
        document: { type: 'docx', version: '2016' },
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata).toMatchObject({
        title: 'Complete DOCX Document',
        format: 'docx',
        pageCount: 42,
        hasImages: true,
        hasTables: true,
      });
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.conversionDuration).toBeGreaterThanOrEqual(0);
      expect(result.doclingDocument).toBeDefined();
    });

    it('should handle DOCX with only required metadata', async () => {
      // Arrange
      const filePath = '/path/to/minimal.docx';
      const mockResult = {
        markdown: 'Minimal content',
        metadata: {},
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.title).toBe('minimal.docx'); // Fallback
      expect(result.metadata.format).toBe('docx');
      expect(result.metadata.hasImages).toBe(false); // Default
      expect(result.metadata.hasTables).toBe(false); // Default
      expect(result.metadata.pageCount).toBeUndefined();
    });

    it('should handle DOCX with very large page count', async () => {
      // Arrange
      const filePath = '/path/to/book.docx';
      const mockResult = {
        markdown: 'Very long book content...',
        metadata: {
          title: 'Complete Works',
          page_count: 5000,
          has_images: true,
          has_tables: true,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.pageCount).toBe(5000);
    });
  });

  describe('DOCX edge cases', () => {
    it('should handle DOCX with only whitespace content', async () => {
      // Arrange
      const filePath = '/path/to/whitespace.docx';
      const mockResult = {
        markdown: '   \n\t\n   ',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.wordCount).toBe(0);
    });

    it('should handle DOCX with mixed whitespace types', async () => {
      // Arrange
      const filePath = '/path/to/mixed-whitespace.docx';
      const mockResult = {
        markdown: 'Word1\tWord2\nWord3\r\nWord4  Word5',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.wordCount).toBe(5);
    });

    it('should handle DOCX with very long filename', async () => {
      // Arrange
      const longName = 'a'.repeat(200) + '.docx';
      const filePath = `/path/to/${longName}`;
      const mockResult = {
        markdown: 'Content',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(result.metadata.title).toBe(longName);
    });

    it('should handle DOCX in deeply nested directory', async () => {
      // Arrange
      const filePath = '/very/deep/nested/path/to/my/document/file.docx';
      const mockResult = {
        markdown: 'Nested document content',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(mockDocling.convert).toHaveBeenCalledWith(
        filePath,
        'file.docx',
        { to_formats: ['md', 'json'] }
      );
    });
  });

  describe('DOCX format support', () => {
    it('should support both .docx and .doc extensions', () => {
      const detectType = (service as any).detectDocumentType.bind(service);
      
      expect(detectType('/path/to/file.docx')).toBe('docx');
      expect(detectType('/path/to/file.doc')).toBe('docx');
      expect(detectType('/path/to/file.DOCX')).toBe('docx');
      expect(detectType('/path/to/file.DOC')).toBe('docx');
    });

    it('should include .docx and .doc in supported formats list', () => {
      const formats = service.getSupportedFormats();
      
      expect(formats).toContain('.docx');
      expect(formats).toContain('.doc');
    });
  });
});

describe('DocumentConverterService - PPTX Conversion', () => {
  let service: DocumentConverterService;
  let mockDocling: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocling = {
      convert: vi.fn(),
    };
    (Docling as any).mockImplementation(() => mockDocling);
    service = new DocumentConverterService({ outputDir: './temp' });
  });

  describe('Successful PPTX conversion', () => {
    it('should convert .pptx file and return markdown with slide content', async () => {
      const filePath = '/path/to/presentation.pptx';
      const mockResult = {
        markdown: '# Slide 1: Introduction\n\nWelcome to our presentation\n\n---\n\n# Slide 2: Overview\n\nKey points here',
        metadata: {
          title: 'Q4 Presentation',
          page_count: 15,
          has_images: true,
          has_tables: false,
        },
        document: { type: 'pptx' },
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(mockDocling.convert).toHaveBeenCalledWith(
        filePath,
        'presentation.pptx',
        { to_formats: ['md', 'json'] }
      );
      expect(result.markdown).toBe(mockResult.markdown);
      expect(result.metadata.title).toBe('Q4 Presentation');
      expect(result.metadata.format).toBe('pptx');
      expect(result.metadata.pageCount).toBe(15);
      expect(result.metadata.hasImages).toBe(true);
      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });

    it('should convert .ppt file (legacy format)', async () => {
      const filePath = '/path/to/legacy.ppt';
      const mockResult = {
        markdown: '# Legacy Presentation\n\nOld PowerPoint format',
        metadata: {
          title: 'Legacy Slides',
          page_count: 5,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.format).toBe('pptx');
      expect(result.metadata.title).toBe('Legacy Slides');
    });

    it('should handle PPTX with images and charts', async () => {
      const filePath = '/path/to/charts.pptx';
      const mockResult = {
        markdown: '# Sales Data\n\n![Chart](chart.png)\n\n## Q1 Results\n\nRevenue increased',
        metadata: {
          title: 'Sales Presentation',
          page_count: 20,
          has_images: true,
          has_tables: true,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.hasImages).toBe(true);
      expect(result.metadata.hasTables).toBe(true);
      expect(result.markdown).toContain('![Chart](chart.png)');
    });

    it('should handle PPTX with tables', async () => {
      const filePath = '/path/to/data.pptx';
      const mockResult = {
        markdown: '# Data Overview\n\n| Quarter | Revenue | Growth |\n|---------|---------|--------|\n| Q1      | $100K   | 10%    |',
        metadata: {
          title: 'Data Presentation',
          page_count: 10,
          has_images: false,
          has_tables: true,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.hasTables).toBe(true);
      expect(result.markdown).toContain('| Quarter | Revenue | Growth |');
    });

    it('should extract slide count as page count', async () => {
      const filePath = '/path/to/slides.pptx';
      const mockResult = {
        markdown: '# Slide content',
        metadata: {
          page_count: 50,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.pageCount).toBe(50);
    });
  });

  describe('PPTX error handling', () => {
    it('should handle conversion errors', async () => {
      const filePath = '/path/to/corrupted.pptx';
      mockDocling.convert.mockRejectedValue(new Error('PPTX parsing failed'));

      await expect(service.convertDocument(filePath)).rejects.toThrow();
    });

    it('should handle timeout for large presentations', async () => {
      const filePath = '/path/to/large.pptx';
      const shortTimeout = 100;
      
      const mockDoclingWithTimeout = {
        convert: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({
            markdown: 'Content',
            metadata: {},
            document: {},
          }), 200))
        ),
      };
      (Docling as any).mockImplementation(() => mockDoclingWithTimeout);
      
      service = new DocumentConverterService({ 
        outputDir: './temp',
        conversionTimeout: shortTimeout 
      });

      await expect(service.convertDocument(filePath)).rejects.toThrow();
    });
  });
});

describe('DocumentConverterService - XLSX Conversion', () => {
  let service: DocumentConverterService;
  let mockDocling: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocling = {
      convert: vi.fn(),
    };
    (Docling as any).mockImplementation(() => mockDocling);
    service = new DocumentConverterService({ outputDir: './temp' });
  });

  describe('Successful XLSX conversion', () => {
    it('should convert .xlsx file and return markdown with table data', async () => {
      const filePath = '/path/to/data.xlsx';
      const mockResult = {
        markdown: '# Sheet1\n\n| Name | Age | City |\n|------|-----|------|\n| Alice | 30 | NYC |\n| Bob | 25 | LA |',
        metadata: {
          title: 'Employee Data',
          page_count: 3,
          has_images: false,
          has_tables: true,
        },
        document: { type: 'xlsx' },
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(mockDocling.convert).toHaveBeenCalledWith(
        filePath,
        'data.xlsx',
        { to_formats: ['md', 'json'] }
      );
      expect(result.markdown).toBe(mockResult.markdown);
      expect(result.metadata.title).toBe('Employee Data');
      expect(result.metadata.format).toBe('xlsx');
      expect(result.metadata.hasTables).toBe(true);
      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });

    it('should convert .xls file (legacy format)', async () => {
      const filePath = '/path/to/legacy.xls';
      const mockResult = {
        markdown: '# Data\n\n| Col1 | Col2 |\n|------|------|\n| A | B |',
        metadata: {
          title: 'Legacy Spreadsheet',
          page_count: 1,
          has_images: false,
          has_tables: true,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.format).toBe('xlsx');
      expect(result.metadata.hasTables).toBe(true);
    });

    it('should handle XLSX with multiple sheets', async () => {
      const filePath = '/path/to/workbook.xlsx';
      const mockResult = {
        markdown: '# Sheet1\n\n| Data |\n|------|\n| A |\n\n# Sheet2\n\n| More Data |\n|-----------|\n| B |',
        metadata: {
          title: 'Workbook',
          page_count: 2,
          has_images: false,
          has_tables: true,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.markdown).toContain('# Sheet1');
      expect(result.markdown).toContain('# Sheet2');
      expect(result.metadata.pageCount).toBe(2);
    });

    it('should handle XLSX with formulas and calculated values', async () => {
      const filePath = '/path/to/calculations.xlsx';
      const mockResult = {
        markdown: '# Calculations\n\n| Item | Price | Tax | Total |\n|------|-------|-----|-------|\n| A | 100 | 10 | 110 |',
        metadata: {
          title: 'Calculations',
          page_count: 1,
          has_images: false,
          has_tables: true,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.hasTables).toBe(true);
      expect(result.markdown).toContain('| Total |');
    });

    it('should extract sheet count as page count', async () => {
      const filePath = '/path/to/multi-sheet.xlsx';
      const mockResult = {
        markdown: '# Sheet content',
        metadata: {
          page_count: 10,
          has_images: false,
          has_tables: true,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.pageCount).toBe(10);
    });
  });

  describe('XLSX error handling', () => {
    it('should handle conversion errors', async () => {
      const filePath = '/path/to/corrupted.xlsx';
      mockDocling.convert.mockRejectedValue(new Error('XLSX parsing failed'));

      await expect(service.convertDocument(filePath)).rejects.toThrow();
    });

    it('should handle empty spreadsheet', async () => {
      const filePath = '/path/to/empty.xlsx';
      const mockResult = {
        markdown: '',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.markdown).toBe('');
      expect(result.metadata.wordCount).toBe(0);
    });
  });
});

describe('DocumentConverterService - HTML Conversion', () => {
  let service: DocumentConverterService;
  let mockDocling: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocling = {
      convert: vi.fn(),
    };
    (Docling as any).mockImplementation(() => mockDocling);
    service = new DocumentConverterService({ outputDir: './temp' });
  });

  describe('Successful HTML conversion', () => {
    it('should convert .html file and preserve structure', async () => {
      const filePath = '/path/to/page.html';
      const mockResult = {
        markdown: '# Welcome\n\n## About Us\n\nWe are a company.\n\n- Item 1\n- Item 2',
        metadata: {
          title: 'Company Website',
          page_count: 1,
          has_images: true,
          has_tables: false,
        },
        document: { type: 'html' },
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(mockDocling.convert).toHaveBeenCalledWith(
        filePath,
        'page.html',
        { to_formats: ['md', 'json'] }
      );
      expect(result.markdown).toBe(mockResult.markdown);
      expect(result.metadata.title).toBe('Company Website');
      expect(result.metadata.format).toBe('html');
      expect(result.metadata.hasImages).toBe(true);
    });

    it('should convert .htm file', async () => {
      const filePath = '/path/to/page.htm';
      const mockResult = {
        markdown: '# Page Content',
        metadata: {
          title: 'Page',
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.format).toBe('html');
    });

    it('should handle HTML with tables', async () => {
      const filePath = '/path/to/data.html';
      const mockResult = {
        markdown: '# Data Table\n\n| Name | Value |\n|------|-------|\n| A | 1 |\n| B | 2 |',
        metadata: {
          title: 'Data Page',
          page_count: 1,
          has_images: false,
          has_tables: true,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.hasTables).toBe(true);
      expect(result.markdown).toContain('| Name | Value |');
    });

    it('should handle HTML with images', async () => {
      const filePath = '/path/to/gallery.html';
      const mockResult = {
        markdown: '# Gallery\n\n![Photo 1](photo1.jpg)\n![Photo 2](photo2.jpg)',
        metadata: {
          title: 'Photo Gallery',
          page_count: 1,
          has_images: true,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.hasImages).toBe(true);
      expect(result.markdown).toContain('![Photo 1]');
    });

    it('should preserve heading hierarchy from HTML', async () => {
      const filePath = '/path/to/article.html';
      const mockResult = {
        markdown: '# Main Title\n\n## Section 1\n\n### Subsection 1.1\n\nContent\n\n## Section 2\n\nMore content',
        metadata: {
          title: 'Article',
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.markdown).toContain('# Main Title');
      expect(result.markdown).toContain('## Section 1');
      expect(result.markdown).toContain('### Subsection 1.1');
    });
  });

  describe('HTML error handling', () => {
    it('should handle malformed HTML', async () => {
      const filePath = '/path/to/malformed.html';
      mockDocling.convert.mockRejectedValue(new Error('HTML parsing failed'));

      await expect(service.convertDocument(filePath)).rejects.toThrow();
    });

    it('should handle empty HTML file', async () => {
      const filePath = '/path/to/empty.html';
      const mockResult = {
        markdown: '',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.markdown).toBe('');
      expect(result.metadata.wordCount).toBe(0);
    });
  });
});

describe('DocumentConverterService - Markdown Conversion', () => {
  let service: DocumentConverterService;
  let mockDocling: any;
  let mockReadFile: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDocling = {
      convert: vi.fn(),
    };
    (Docling as any).mockImplementation(() => mockDocling);
    service = new DocumentConverterService({ outputDir: './temp' });
    
    // Get the mocked readFile
    const fsPromises = await import('node:fs/promises');
    mockReadFile = fsPromises.readFile;
  });

  describe('Successful Markdown conversion', () => {
    it('should convert .md file and return content', async () => {
      const filePath = '/path/to/readme.md';
      const markdownContent = '# Project\n\n## Installation\n\n```bash\nnpm install\n```';
      
      // Mock docling to fail, triggering fallback
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockResolvedValue(markdownContent);

      const result = await service.convertDocument(filePath);

      expect(result.markdown).toBe(markdownContent);
      expect(result.metadata.format).toBe('markdown');
      expect(result.metadata.title).toBe('readme.md');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });

    it('should convert .markdown file', async () => {
      const filePath = '/path/to/doc.markdown';
      const markdownContent = '# Documentation\n\nContent here';
      
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockResolvedValue(markdownContent);

      const result = await service.convertDocument(filePath);

      expect(result.markdown).toBe(markdownContent);
      expect(result.metadata.format).toBe('markdown');
    });

    it('should handle Markdown with code blocks', async () => {
      const filePath = '/path/to/tutorial.md';
      const markdownContent = '# Tutorial\n\n```javascript\nconst x = 10;\n```\n\nExplanation here';
      
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockResolvedValue(markdownContent);

      const result = await service.convertDocument(filePath);

      expect(result.markdown).toContain('```javascript');
      expect(result.markdown).toContain('const x = 10;');
    });

    it('should handle Markdown with tables', async () => {
      const filePath = '/path/to/data.md';
      const markdownContent = '# Data\n\n| Col1 | Col2 |\n|------|------|\n| A | B |';
      
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockResolvedValue(markdownContent);

      const result = await service.convertDocument(filePath);

      expect(result.markdown).toContain('| Col1 | Col2 |');
      expect(result.metadata.hasTables).toBe(false); // Native markdown doesn't set this
    });

    it('should handle Markdown with images', async () => {
      const filePath = '/path/to/guide.md';
      const markdownContent = '# Guide\n\n![Screenshot](screenshot.png)\n\nInstructions';
      
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockResolvedValue(markdownContent);

      const result = await service.convertDocument(filePath);

      expect(result.markdown).toContain('![Screenshot]');
      expect(result.metadata.hasImages).toBe(false); // Native markdown doesn't set this
    });

    it('should count words correctly in Markdown', async () => {
      const filePath = '/path/to/article.md';
      const markdownContent = 'One two three four five six seven eight nine ten';
      
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockResolvedValue(markdownContent);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.wordCount).toBe(10);
    });
  });

  describe('Markdown error handling', () => {
    it('should handle file read errors', async () => {
      const filePath = '/path/to/missing.md';
      
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockRejectedValue(new Error('File not found'));

      await expect(service.convertDocument(filePath)).rejects.toThrow();
    });

    it('should handle empty Markdown file', async () => {
      const filePath = '/path/to/empty.md';
      
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockResolvedValue('');

      const result = await service.convertDocument(filePath);

      expect(result.markdown).toBe('');
      expect(result.metadata.wordCount).toBe(0);
    });

    it('should handle Markdown with only whitespace', async () => {
      const filePath = '/path/to/whitespace.md';
      
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockResolvedValue('   \n\t\n   ');

      const result = await service.convertDocument(filePath);

      expect(result.metadata.wordCount).toBe(0);
    });
  });
});

describe('DocumentConverterService - Text File Conversion', () => {
  let service: DocumentConverterService;
  let mockDocling: any;
  let mockReadFile: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDocling = {
      convert: vi.fn(),
    };
    (Docling as any).mockImplementation(() => mockDocling);
    service = new DocumentConverterService({ outputDir: './temp' });
    
    // Get the mocked readFile
    const fsPromises = await import('node:fs/promises');
    mockReadFile = fsPromises.readFile;
  });

  describe('Successful text file conversion', () => {
    it('should convert .txt file and return content', async () => {
      const filePath = '/path/to/notes.txt';
      const textContent = 'These are my notes.\nLine 2 of notes.\nLine 3 of notes.';
      
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockResolvedValue(textContent);

      const result = await service.convertDocument(filePath);

      expect(result.markdown).toBe(textContent);
      expect(result.metadata.format).toBe('text');
      expect(result.metadata.title).toBe('notes.txt');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.hasImages).toBe(false);
      expect(result.metadata.hasTables).toBe(false);
    });

    it('should handle plain text with multiple lines', async () => {
      const filePath = '/path/to/log.txt';
      const textContent = 'Log entry 1\nLog entry 2\nLog entry 3\nLog entry 4';
      
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockResolvedValue(textContent);

      const result = await service.convertDocument(filePath);

      expect(result.markdown).toBe(textContent);
      expect(result.markdown.split('\n')).toHaveLength(4);
    });

    it('should count words correctly in text file', async () => {
      const filePath = '/path/to/words.txt';
      const textContent = 'One two three four five';
      
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockResolvedValue(textContent);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.wordCount).toBe(5);
    });

    it('should handle text with various whitespace', async () => {
      const filePath = '/path/to/formatted.txt';
      const textContent = 'Word1\tWord2\nWord3\r\nWord4  Word5';
      
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockResolvedValue(textContent);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.wordCount).toBe(5);
    });

    it('should handle large text files', async () => {
      const filePath = '/path/to/large.txt';
      const textContent = 'word '.repeat(10000);
      
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockResolvedValue(textContent);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.wordCount).toBe(10000);
    });
  });

  describe('Text file error handling', () => {
    it('should handle file read errors', async () => {
      const filePath = '/path/to/missing.txt';
      
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockRejectedValue(new Error('File not found'));

      await expect(service.convertDocument(filePath)).rejects.toThrow();
    });

    it('should handle empty text file', async () => {
      const filePath = '/path/to/empty.txt';
      
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockResolvedValue('');

      const result = await service.convertDocument(filePath);

      expect(result.markdown).toBe('');
      expect(result.metadata.wordCount).toBe(0);
    });

    it('should handle text file with only whitespace', async () => {
      const filePath = '/path/to/whitespace.txt';
      
      mockDocling.convert.mockRejectedValue(new Error('Docling conversion failed'));
      (mockReadFile as any).mockResolvedValue('   \n\t\n   ');

      const result = await service.convertDocument(filePath);

      expect(result.metadata.wordCount).toBe(0);
    });
  });
});

describe('DocumentConverterService - Audio Transcription', () => {
  let service: DocumentConverterService;
  let mockDocling: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocling = {
      convert: vi.fn(),
    };
    (Docling as any).mockImplementation(() => mockDocling);
    service = new DocumentConverterService({ outputDir: './temp' });
  });

  describe('Successful audio transcription', () => {
    it('should transcribe .mp3 file using Whisper ASR', async () => {
      const filePath = '/path/to/recording.mp3';
      const mockResult = {
        markdown: 'This is a transcription of the audio recording. The speaker discusses various topics.',
        metadata: {
          title: 'Audio Recording',
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: { type: 'audio', format: 'mp3' },
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(mockDocling.convert).toHaveBeenCalledWith(
        filePath,
        'recording.mp3',
        { to_formats: ['md', 'json'] }
      );
      expect(result.markdown).toBe(mockResult.markdown);
      expect(result.metadata.title).toBe('Audio Recording');
      expect(result.metadata.format).toBe('audio');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });

    it('should transcribe .wav file', async () => {
      const filePath = '/path/to/interview.wav';
      const mockResult = {
        markdown: 'Interview transcription: Question one, answer one. Question two, answer two.',
        metadata: {
          title: 'Interview',
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: { type: 'audio' },
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.format).toBe('audio');
      expect(result.markdown).toContain('Interview transcription');
    });

    it('should transcribe .m4a file', async () => {
      const filePath = '/path/to/podcast.m4a';
      const mockResult = {
        markdown: 'Welcome to our podcast. Today we discuss technology trends and innovations.',
        metadata: {
          title: 'Podcast Episode',
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.format).toBe('audio');
      expect(result.markdown).toContain('podcast');
    });

    it('should transcribe .flac file', async () => {
      const filePath = '/path/to/lecture.flac';
      const mockResult = {
        markdown: 'Lecture notes: Introduction to machine learning. Topics covered include supervised learning.',
        metadata: {
          title: 'Lecture',
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.format).toBe('audio');
      expect(result.markdown).toContain('Lecture notes');
    });

    it('should count words in transcription', async () => {
      const filePath = '/path/to/speech.mp3';
      const mockResult = {
        markdown: 'One two three four five six seven eight nine ten',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.wordCount).toBe(10);
    });

    it('should handle long audio files with extended transcription', async () => {
      const filePath = '/path/to/long-recording.mp3';
      const longTranscription = 'This is a very long transcription. '.repeat(100);
      const mockResult = {
        markdown: longTranscription,
        metadata: {
          title: 'Long Recording',
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.wordCount).toBeGreaterThan(500);
    });

    it('should use filename as title when metadata missing', async () => {
      const filePath = '/path/to/untitled-audio.mp3';
      const mockResult = {
        markdown: 'Transcription content',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.metadata.title).toBe('untitled-audio.mp3');
    });

    it('should record conversion duration for audio transcription', async () => {
      const filePath = '/path/to/audio.mp3';
      const mockResult = {
        markdown: 'Transcription',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const startTime = Date.now();
      const result = await service.convertDocument(filePath);
      const endTime = Date.now();

      expect(result.metadata.conversionDuration).toBeDefined();
      expect(result.metadata.conversionDuration).toBeGreaterThanOrEqual(0);
      expect(result.metadata.conversionDuration).toBeLessThanOrEqual(endTime - startTime + 10);
    });
  });

  describe('Audio transcription error handling', () => {
    it('should handle transcription errors', async () => {
      const filePath = '/path/to/corrupted.mp3';
      mockDocling.convert.mockRejectedValue(new Error('Audio transcription failed'));

      await expect(service.convertDocument(filePath)).rejects.toThrow();
    });

    it('should handle timeout for long audio files', async () => {
      const filePath = '/path/to/very-long.mp3';
      const shortTimeout = 100;
      
      const mockDoclingWithTimeout = {
        convert: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({
            markdown: 'Transcription',
            metadata: {},
            document: {},
          }), 200))
        ),
      };
      (Docling as any).mockImplementation(() => mockDoclingWithTimeout);
      
      service = new DocumentConverterService({ 
        outputDir: './temp',
        conversionTimeout: shortTimeout 
      });

      await expect(service.convertDocument(filePath)).rejects.toThrow();
    });

    it('should handle empty transcription result', async () => {
      const filePath = '/path/to/silent.mp3';
      const mockResult = {
        markdown: '',
        metadata: {
          page_count: 1,
          has_images: false,
          has_tables: false,
        },
        document: {},
      };
      mockDocling.convert.mockResolvedValue(mockResult);

      const result = await service.convertDocument(filePath);

      expect(result.markdown).toBe('');
      expect(result.metadata.wordCount).toBe(0);
    });

    it('should handle Whisper ASR initialization errors', async () => {
      const filePath = '/path/to/audio.mp3';
      mockDocling.convert.mockRejectedValue(new Error('Whisper model not available'));

      await expect(service.convertDocument(filePath)).rejects.toThrow();
    });
  });
});
