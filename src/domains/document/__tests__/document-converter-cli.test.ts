import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DocumentConverterService } from '../document-converter.service.js';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';

// Mock node:child_process
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

// Mock node:fs/promises
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual('node:fs/promises');
  return {
    ...actual,
    readFile: vi.fn(),
    mkdir: vi.fn(),
  };
});

describe('DocumentConverterService - Direct CLI Implementation', () => {
  let service: DocumentConverterService;
  let mockChildProcess: ChildProcess & EventEmitter;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create mock child process
    mockChildProcess = new EventEmitter() as ChildProcess & EventEmitter;
    mockChildProcess.stdout = new EventEmitter() as any;
    mockChildProcess.stderr = new EventEmitter() as any;
    mockChildProcess.kill = vi.fn();
    mockChildProcess.killed = false;
    
    (spawn as any).mockReturnValue(mockChildProcess);
    
    const { mkdir } = await import('node:fs/promises');
    (mkdir as any).mockResolvedValue(undefined);
    
    service = new DocumentConverterService({ outputDir: './temp', conversionTimeout: 30000 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PDF conversion with direct CLI', () => {
    it('should execute docling CLI with correct arguments', async () => {
      // Arrange
      const filePath = '/path/to/document.pdf';
      const { readFile } = await import('node:fs/promises');
      (readFile as any).mockResolvedValueOnce('# Test Document\n\nContent here.');
      (readFile as any).mockResolvedValueOnce(JSON.stringify({
        name: 'Test Document',
        page_count: 5,
        has_images: true,
        has_tables: false,
      }));

      // Act
      const conversionPromise = service.convertDocument(filePath);
      
      // Simulate successful CLI execution
      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await conversionPromise;

      // Assert
      expect(spawn).toHaveBeenCalledWith('docling', [
        '--ocr',
        '--image-export-mode', 'placeholder',
        filePath,
        '--to', 'md',
        '--to', 'json',
        '--output', './temp',
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      
      expect(result.markdown).toBe('# Test Document\n\nContent here.');
      expect(result.metadata.title).toBe('Test Document');
      expect(result.metadata.pageCount).toBe(5);
      expect(result.metadata.hasImages).toBe(true);
      expect(result.metadata.hasTables).toBe(false);
    });

    it('should handle CLI execution errors', async () => {
      // Arrange
      const filePath = '/path/to/document.pdf';

      // Act
      const conversionPromise = service.convertDocument(filePath);
      
      // Simulate CLI error
      setTimeout(() => {
        mockChildProcess.stderr?.emit('data', Buffer.from('Error: File not found'));
        mockChildProcess.emit('close', 1);
      }, 10);

      // Assert
      await expect(conversionPromise).rejects.toThrow();
    });

    it('should timeout after configured duration', async () => {
      // Arrange
      const filePath = '/path/to/large.pdf';
      service = new DocumentConverterService({ outputDir: './temp', conversionTimeout: 100 });

      // Act
      const conversionPromise = service.convertDocument(filePath);
      
      // Don't emit close event - let it timeout

      // Assert
      await expect(conversionPromise).rejects.toThrow();
    });

    it('should read generated markdown and JSON files', async () => {
      // Arrange
      const filePath = '/path/to/report.pdf';
      const { readFile } = await import('node:fs/promises');
      const markdownContent = '# Annual Report\n\nExecutive summary here.';
      const jsonContent = {
        name: 'Annual Report 2024',
        page_count: 42,
        has_images: true,
        has_tables: true,
      };
      
      (readFile as any).mockResolvedValueOnce(markdownContent);
      (readFile as any).mockResolvedValueOnce(JSON.stringify(jsonContent));

      // Act
      const conversionPromise = service.convertDocument(filePath);
      
      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await conversionPromise;

      // Assert
      expect(result.markdown).toBe(markdownContent);
      expect(result.metadata.title).toBe('Annual Report 2024');
      expect(result.metadata.pageCount).toBe(42);
      expect(result.metadata.wordCount).toBe(6); // "Annual Report Executive summary here"
      expect(result.doclingDocument).toEqual(jsonContent);
    });

    it('should handle missing output files gracefully', async () => {
      // Arrange
      const filePath = '/path/to/document.pdf';
      const { readFile } = await import('node:fs/promises');
      (readFile as any).mockRejectedValue(new Error('ENOENT: no such file'));

      // Act
      const conversionPromise = service.convertDocument(filePath);
      
      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await conversionPromise;

      // Assert
      expect(result.markdown).toBe('');
      expect(result.metadata.wordCount).toBe(0);
    });
  });

  describe('Text file direct reading', () => {
    it('should read markdown files directly without CLI', async () => {
      // Arrange
      const filePath = '/path/to/readme.md';
      const { readFile } = await import('node:fs/promises');
      (readFile as any).mockResolvedValue('# README\n\nProject documentation.');

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(spawn).not.toHaveBeenCalled();
      expect(result.markdown).toBe('# README\n\nProject documentation.');
      expect(result.metadata.format).toBe('markdown');
      expect(result.metadata.wordCount).toBe(4); // "README Project documentation"
    });

    it('should read text files directly without CLI', async () => {
      // Arrange
      const filePath = '/path/to/notes.txt';
      const { readFile } = await import('node:fs/promises');
      (readFile as any).mockResolvedValue('Simple text content here.');

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(spawn).not.toHaveBeenCalled();
      expect(result.markdown).toBe('Simple text content here.');
      expect(result.metadata.format).toBe('text');
    });

    it('should read HTML files directly without CLI', async () => {
      // Arrange
      const filePath = '/path/to/page.html';
      const { readFile } = await import('node:fs/promises');
      (readFile as any).mockResolvedValue('<html><body><h1>Title</h1></body></html>');

      // Act
      const result = await service.convertDocument(filePath);

      // Assert
      expect(spawn).not.toHaveBeenCalled();
      expect(result.markdown).toBe('<html><body><h1>Title</h1></body></html>');
      expect(result.metadata.format).toBe('html');
    });
  });

  describe('Document type detection', () => {
    it('should detect PDF format', () => {
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType('/path/to/file.pdf')).toBe('pdf');
      expect(detectType('/path/to/file.PDF')).toBe('pdf');
    });

    it('should detect DOCX formats', () => {
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType('/path/to/file.docx')).toBe('docx');
      expect(detectType('/path/to/file.doc')).toBe('docx');
    });

    it('should detect audio formats', () => {
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(detectType('/path/to/file.mp3')).toBe('audio');
      expect(detectType('/path/to/file.wav')).toBe('audio');
      expect(detectType('/path/to/file.m4a')).toBe('audio');
      expect(detectType('/path/to/file.flac')).toBe('audio');
    });

    it('should throw error for unsupported formats', () => {
      const detectType = (service as any).detectDocumentType.bind(service);
      expect(() => detectType('/path/to/file.zip')).toThrow('Unsupported file format: .zip');
    });
  });

  describe('Word counting', () => {
    it('should count words correctly', () => {
      const countWords = (service as any).countWords.bind(service);
      expect(countWords('one two three')).toBe(3);
      expect(countWords('  one   two  ')).toBe(2);
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
    });
  });
});
