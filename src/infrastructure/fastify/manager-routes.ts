/**
 * Manager UI routes with server-side rendering
 * Provides web interface for knowledge base management
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { KnowledgeBaseService } from '../../domains/knowledgebase/knowledgebase.service.js';
import type { SearchService } from '../../domains/search/search.service.js';
import type { IngestionService } from '../../domains/ingestion/ingestion.service.js';
import type { Config } from '../../shared/types/index.js';
import { createLogger } from '../../shared/logging/index.js';
import { randomUUID } from 'node:crypto';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const rootLogger = createLogger('info');
const logger = rootLogger.child('ManagerRoutes');

/**
 * Ingestion job tracking
 */
interface IngestionJob {
  id: string;
  knowledgeBaseName: string;
  phase: string;
  current: number;
  total: number;
  status: 'running' | 'completed' | 'failed';
  error?: string;
}

const ingestionJobs = new Map<string, IngestionJob>();

/**
 * Register Manager UI routes
 */
export async function registerManagerRoutes(
  fastify: FastifyInstance,
  knowledgeBaseService: KnowledgeBaseService,
  searchService: SearchService,
  ingestionService: IngestionService,
  config: Config
): Promise<void> {
  /**
   * GET /browse-folders
   * Browse filesystem folders (server-side)
   */
  fastify.get('/browse-folders', async (request: FastifyRequest, reply: FastifyReply) => {
    const { path: currentPath } = request.query as { path?: string };
    
    try {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const os = await import('node:os');
      
      // Default to home directory if no path provided
      const browsePath = currentPath || os.homedir();
      
      // Read directory contents
      const entries = await fs.readdir(browsePath, { withFileTypes: true });
      
      // Filter to only directories and sort
      const directories = entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => ({
          name: entry.name,
          path: path.join(browsePath, entry.name)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      // Get parent directory
      const parentPath = path.dirname(browsePath);
      
      return reply.send({
        currentPath: browsePath,
        parentPath: parentPath !== browsePath ? parentPath : null,
        directories
      });
    } catch (error) {
      logger.error('Failed to browse folders', error instanceof Error ? error : new Error(String(error)));
      return reply.status(500).send({
        error: 'Failed to browse folders',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * GET /
   * Main page - list knowledge bases
   */
  fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const knowledgeBases = await knowledgeBaseService.listKnowledgeBases();
      
      logger.debug('Knowledge bases loaded', { count: knowledgeBases.length, knowledgeBases: knowledgeBases.map(c => ({ name: c.name, fileCount: c.fileCount, lastIngestion: c.lastIngestion })) });
      
      // Get flash messages using reply.flash()
      const flashMessages = (reply as any).flash();
      
      return reply.view('index.hbs', {
        title: 'Dashboard',
        knowledgeBases,
        message: flashMessages?.message?.[0],
        messageType: flashMessages?.messageType?.[0]
      });
    } catch (error) {
      logger.error('Failed to load knowledge bases', error instanceof Error ? error : new Error(String(error)));
      return reply.view('index.hbs', {
        title: 'Dashboard',
        knowledgeBases: [],
        message: 'Failed to load knowledge bases',
        messageType: 'error'
      });
    }
  });

  /**
   * GET /codebase/:name
   * View knowledge base details
   */
  fastify.get<{ Params: { name: string } }>(
    '/codebase/:name',
    async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) => {
      const { name } = request.params;
      
      try {
        const stats = await knowledgeBaseService.getKnowledgeBaseStats(name);
        const knowledgeBases = await knowledgeBaseService.listKnowledgeBases();
        
        return reply.view('index.hbs', {
          title: name,
          knowledgeBases,
          selectedCodebase: name,
          stats
        });
      } catch (error) {
        logger.error('Failed to load knowledge base', error instanceof Error ? error : new Error(String(error)), { name });
        (request as any).flash('message', `Failed to load knowledge base: ${error instanceof Error ? error.message : String(error)}`);
        (request as any).flash('messageType', 'error');
        return reply.redirect('/');
      }
    }
  );

  /**
   * POST /search
   * Search knowledge bases
   */
  fastify.post('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const { query, maxResults = 10, excludeTests } = request.body as { 
      query: string; 
      maxResults?: number;
      excludeTests?: string;
    };
    
    try {
      logger.info('POST /search', { query, maxResults, excludeTests });
      
      if (!query || query.trim() === '') {
        (request as any).flash('message', 'Search query is required');
        (request as any).flash('messageType', 'error');
        return reply.redirect('/');
      }
      
      const results = await searchService.search({
        query,
        maxResults: Number(maxResults),
        excludeTests: excludeTests === 'true',
      });
      
      const knowledgeBases = await knowledgeBaseService.listKnowledgeBases();
      
      return reply.view('index.hbs', {
        title: 'Search Results',
        knowledgeBases,
        searchResults: results.results,
        searchQuery: query,
        maxResults: Number(maxResults),
        excludeTests: excludeTests === 'true',
      });
    } catch (error) {
      logger.error('Search failed', error instanceof Error ? error : new Error(String(error)));
      (request as any).flash('message', `Search failed: ${error instanceof Error ? error.message : String(error)}`);
      (request as any).flash('messageType', 'error');
      return reply.redirect('/');
    }
  });

  /**
   * POST /ingest
   * Start knowledge base ingestion (returns job ID immediately)
   */
  fastify.post('/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, path, respectGitignore } = request.body as { name: string; path: string; respectGitignore?: string };
    
    try {
      logger.info('POST /ingest - received request', { name, path, respectGitignore, body: request.body });
      
      // Validation
      if (!name || !path) {
        logger.warn('POST /ingest - missing name or path', { name, path });
        return reply.status(400).send({
          error: 'Knowledge base name and path are required'
        });
      }
      
      // Normalize name: spaces to hyphens, lowercase, alphanumeric only
      const normalizedName = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      logger.info('POST /ingest - normalized name', { originalName: name, normalizedName });
      
      if (!normalizedName) {
        logger.warn('POST /ingest - normalized name is empty', { originalName: name });
        return reply.status(400).send({
          error: 'Knowledge base name must contain at least one alphanumeric character'
        });
      }
      
      // Verify path exists
      const fs = await import('node:fs/promises');
      try {
        const stats = await fs.stat(path);
        if (!stats.isDirectory()) {
          logger.warn('POST /ingest - path is not a directory', { path });
          return reply.status(400).send({
            error: 'Path must be a directory'
          });
        }
      } catch (error) {
        logger.warn('POST /ingest - path does not exist', { path, error: error instanceof Error ? error.message : String(error) });
        return reply.status(400).send({
          error: 'Path does not exist or is not accessible'
        });
      }
      
      // Create job ID
      const jobId = randomUUID();
      
      logger.info('POST /ingest - starting ingestion', { jobId, normalizedName, path, respectGitignore });
      
      // Initialize job tracking
      ingestionJobs.set(jobId, {
        id: jobId,
        knowledgeBaseName: normalizedName,
        phase: 'Starting',
        current: 0,
        total: 1,
        status: 'running'
      });
      
      // Start ingestion in background
      ingestionService.ingestCodebase(
        { 
          name: normalizedName, 
          path, 
          config,
          respectGitignore: respectGitignore === 'true'
        },
        (phase: string, current: number, total: number) => {
          const job = ingestionJobs.get(jobId);
          if (job) {
            job.phase = phase;
            job.current = current;
            job.total = total;
          }
        }
      ).then(() => {
        const job = ingestionJobs.get(jobId);
        if (job) {
          job.status = 'completed';
          job.phase = 'Complete';
          job.current = job.total;
        }
        logger.info('Ingestion completed', { jobId, knowledgeBaseName: normalizedName });
      }).catch((error) => {
        const job = ingestionJobs.get(jobId);
        if (job) {
          job.status = 'failed';
          job.error = error instanceof Error ? error.message : String(error);
        }
        logger.error('Ingestion failed', error instanceof Error ? error : new Error(String(error)), { jobId, knowledgeBaseName: normalizedName });
      });
      
      // Return job ID immediately
      logger.info('POST /ingest - returning job ID', { jobId });
      return reply.send({ jobId });
      
    } catch (error) {
      logger.error('Failed to start ingestion', error instanceof Error ? error : new Error(String(error)), { name, path });
      return reply.status(500).send({
        error: `Failed to start ingestion: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });

  /**
   * GET /ingest-progress/:jobId
   * Stream ingestion progress via Server-Sent Events
   */
  fastify.get<{ Params: { jobId: string } }>(
    '/ingest-progress/:jobId',
    async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      const { jobId } = request.params;
      
      const job = ingestionJobs.get(jobId);
      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }
      
      // Set up SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      
      // Send initial progress
      const sendProgress = () => {
        const currentJob = ingestionJobs.get(jobId);
        if (!currentJob) return false;
        
        const data = JSON.stringify({
          phase: currentJob.phase,
          current: currentJob.current,
          total: currentJob.total,
          status: currentJob.status,
          error: currentJob.error
        });
        
        reply.raw.write(`data: ${data}\n\n`);
        
        return currentJob.status === 'running';
      };
      
      // Send progress updates every 500ms
      const interval = setInterval(() => {
        const shouldContinue = sendProgress();
        if (!shouldContinue) {
          clearInterval(interval);
          // Clean up job after 5 seconds
          setTimeout(() => {
            ingestionJobs.delete(jobId);
            logger.info('Cleaned up ingestion job', { jobId });
          }, 5000);
          reply.raw.end();
        }
      }, 500);
      
      // Handle client disconnect
      request.raw.on('close', () => {
        clearInterval(interval);
        logger.info('Client disconnected from SSE', { jobId });
      });
    }
  );

  /**
   * POST /rename
   * Rename knowledge base
   */
  fastify.post('/rename', async (request: FastifyRequest, reply: FastifyReply) => {
    const { oldName, newName } = request.body as { oldName: string; newName: string };
    
    try {
      logger.info('POST /rename', { oldName, newName });
      
      if (!oldName || !newName) {
        (request as any).flash('message', 'Both old and new names are required');
        (request as any).flash('messageType', 'error');
        return reply.redirect('/');
      }
      
      // Normalize new name: spaces to hyphens, lowercase, alphanumeric only
      const normalizedNewName = newName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      if (!normalizedNewName) {
        (request as any).flash('message', 'New name must contain at least one alphanumeric character');
        (request as any).flash('messageType', 'error');
        return reply.redirect('/');
      }
      
      await knowledgeBaseService.renameKnowledgeBase(oldName, normalizedNewName);
      
      (request as any).flash('message', `Renamed ${oldName} to ${normalizedNewName}`);
      (request as any).flash('messageType', 'success');
      return reply.redirect('/');
    } catch (error) {
      logger.error('Rename failed', error instanceof Error ? error : new Error(String(error)), { oldName, newName });
      (request as any).flash('message', `Rename failed: ${error instanceof Error ? error.message : String(error)}`);
      (request as any).flash('messageType', 'error');
      return reply.redirect('/');
    }
  });

  /**
   * POST /delete
   * Delete knowledge base
   */
  fastify.post('/delete', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name } = request.body as { name: string };
    
    try {
      logger.info('POST /delete', { name });
      
      if (!name) {
        (request as any).flash('message', 'Knowledge base name is required');
        (request as any).flash('messageType', 'error');
        return reply.redirect('/');
      }
      
      await knowledgeBaseService.deleteKnowledgeBase(name);
      
      (request as any).flash('message', `Deleted ${name}`);
      (request as any).flash('messageType', 'success');
      return reply.redirect('/');
    } catch (error) {
      logger.error('Delete failed', error instanceof Error ? error : new Error(String(error)), { name });
      (request as any).flash('message', `Delete failed: ${error instanceof Error ? error.message : String(error)}`);
      (request as any).flash('messageType', 'error');
      return reply.redirect('/');
    }
  });

  /**
   * POST /api/upload/file
   * Upload single file to knowledge base
   */
  fastify.post('/api/upload/file', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get multipart data
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({
          error: 'No file provided'
        });
      }
      
      // Get knowledge base name from fields
      const knowledgeBaseNameField = data.fields.knowledgeBaseName;
      const knowledgeBaseName = typeof knowledgeBaseNameField === 'object' && 'value' in knowledgeBaseNameField 
        ? String(knowledgeBaseNameField.value)
        : String(knowledgeBaseNameField);
      
      if (!knowledgeBaseName) {
        return reply.status(400).send({
          error: 'Knowledge base name is required'
        });
      }
      
      // Validate file type
      const filename = data.filename;
      const ext = '.' + filename.split('.').pop()?.toLowerCase();
      const supportedExtensions = [
        '.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls',
        '.html', '.htm', '.md', '.markdown', '.txt',
        '.mp3', '.wav', '.m4a', '.flac'
      ];
      
      if (!supportedExtensions.includes(ext)) {
        return reply.status(400).send({
          error: `Unsupported file type: ${ext}. Supported: ${supportedExtensions.join(', ')}`
        });
      }
      
      // Validate file size (use config maxFileSize)
      const buffer = await data.toBuffer();
      const maxSize = config.ingestion.maxFileSize;
      
      if (buffer.length > maxSize) {
        return reply.status(400).send({
          error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit (${Math.round(buffer.length / 1024 / 1024)}MB)`
        });
      }
      
      // Verify knowledge base exists
      const kbs = await knowledgeBaseService.listKnowledgeBases();
      const kb = kbs.find(k => k.name === knowledgeBaseName);
      if (!kb) {
        return reply.status(404).send({
          error: `Knowledge base not found: ${knowledgeBaseName}`
        });
      }
      
      // Create temp directory if it doesn't exist
      const tempDir = join(tmpdir(), 'mcp-knowledge-uploads');
      await mkdir(tempDir, { recursive: true });
      
      // Save file to temp location
      const tempFilePath = join(tempDir, `${randomUUID()}-${filename}`);
      await writeFile(tempFilePath, buffer);
      
      logger.info('File uploaded to temp location', { filename, tempFilePath, size: buffer.length });
      
      try {
        // Process the file through ingestion service
        await ingestionService.ingestFiles({
          files: [tempFilePath],
          knowledgeBaseName,
          config
        });
        
        logger.info('File processed successfully', { filename, knowledgeBaseName });
        
        // Clean up temp file
        await unlink(tempFilePath).catch(() => {
          logger.warn('Failed to delete temp file', { tempFilePath });
        });
        
        return reply.send({
          success: true,
          filename,
          knowledgeBaseName
        });
        
      } catch (error) {
        // Clean up temp file on error
        await unlink(tempFilePath).catch(() => {
          logger.warn('Failed to delete temp file after error', { tempFilePath });
        });
        
        throw error;
      }
      
    } catch (error) {
      logger.error('File upload failed', error instanceof Error ? error : new Error(String(error)));
      return reply.status(500).send({
        error: `Upload failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });

  logger.debug('Manager UI routes registered successfully');
}
