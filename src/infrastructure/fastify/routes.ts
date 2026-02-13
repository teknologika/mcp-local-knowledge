/**
 * HTTP API routes for the Fastify server
 * Provides REST endpoints for knowledge base management and search
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { KnowledgeBaseService } from '../../domains/knowledgebase/knowledgebase.service.js';
import type { SearchService } from '../../domains/search/search.service.js';
import AjvModule from 'ajv';
import addFormatsModule from 'ajv-formats';
import { createLogger } from '../../shared/logging/index.js';

const rootLogger = createLogger('info');
const logger = rootLogger.child('FastifyRoutes');

// Get the constructors - handle both ESM and CJS
const Ajv = (AjvModule as any).default || AjvModule;
const addFormats = (addFormatsModule as any).default || addFormatsModule;

// Initialize AJV for schema validation
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

/**
 * Validation schemas for API endpoints
 */
const schemas = {
  search: {
    type: 'object',
    properties: {
      query: { type: 'string', minLength: 1 },
      knowledgeBaseName: { type: 'string' },
      documentType: { type: 'string' },
      maxResults: { type: 'integer', minimum: 1, maximum: 1000 },
    },
    required: ['query'],
    additionalProperties: false,
  },
  rename: {
    type: 'object',
    properties: {
      newName: { type: 'string', minLength: 1, maxLength: 255 },
    },
    required: ['newName'],
    additionalProperties: false,
  },
};

// Compile validators
const validateSearch = ajv.compile(schemas.search);
const validateRename = ajv.compile(schemas.rename);

/**
 * Error response format
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Create error response
 */
function createErrorResponse(
  code: string,
  message: string,
  details?: any
): ErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

/**
 * Register all API routes
 */
export async function registerRoutes(
  fastify: FastifyInstance,
  codebaseService: KnowledgeBaseService,
  searchService: SearchService
): Promise<void> {
  /**
   * GET /api/knowledgebases
   * List all knowledge bases with metadata
   */
  fastify.get('/api/knowledgebases', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('GET /api/knowledgebases');
      const knowledgeBases = await knowledgeBaseService.listKnowledgeBases();
      return { knowledgeBases };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to list knowledge bases', error instanceof Error ? error : new Error(errorMessage));
      
      reply.status(500);
      return createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to list knowledge bases',
        errorMessage
      );
    }
  });

  /**
   * POST /api/search
   * Search knowledge bases with query and filters
   */
  fastify.post('/api/search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('POST /api/search', { body: request.body });

      // Validate request body
      if (!validateSearch(request.body)) {
        reply.status(400);
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid search parameters',
          validateSearch.errors
        );
      }

      const params = request.body as {
        query: string;
        knowledgeBaseName?: string;
        language?: string;
        maxResults?: number;
      };

      const results = await searchService.search(params);
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Search failed', error instanceof Error ? error : new Error(errorMessage));
      
      reply.status(500);
      return createErrorResponse(
        'INTERNAL_ERROR',
        'Search operation failed',
        errorMessage
      );
    }
  });

  /**
   * GET /api/codebases/:name/stats
   * Get detailed statistics for a knowledge base
   */
  fastify.get<{ Params: { name: string } }>(
    '/api/codebases/:name/stats',
    async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) => {
      try {
        const { name } = request.params;
        logger.info('GET /api/codebases/:name/stats', { name });

        if (!name || name.trim() === '') {
          reply.status(400);
          return createErrorResponse(
            'VALIDATION_ERROR',
            'Knowledge base name is required'
          );
        }

        const stats = await codebaseService.getKnowledgeBaseStats(name);
        return stats;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Check if it's a not found error
        if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
          logger.warn('Knowledge base not found', { name: request.params.name });
          reply.status(404);
          return createErrorResponse(
            'NOT_FOUND',
            `Knowledge base '${request.params.name}' not found`
          );
        }

        logger.error('Failed to get knowledge base stats', error instanceof Error ? error : new Error(errorMessage));
        reply.status(500);
        return createErrorResponse(
          'INTERNAL_ERROR',
          'Failed to get knowledge base statistics',
          errorMessage
        );
      }
    }
  );

  /**
   * PUT /api/codebases/:name
   * Rename a knowledge base
   */
  fastify.put<{ Params: { name: string } }>(
    '/api/codebases/:name',
    async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) => {
      try {
        const { name } = request.params;
        logger.info('PUT /api/codebases/:name', { name, body: request.body });

        if (!name || name.trim() === '') {
          reply.status(400);
          return createErrorResponse(
            'VALIDATION_ERROR',
            'Knowledge base name is required'
          );
        }

        // Validate request body
        if (!validateRename(request.body)) {
          reply.status(400);
          return createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid rename parameters',
            validateRename.errors
          );
        }

        const { newName } = request.body as { newName: string };

        await codebaseService.renameKnowledgeBase(name, newName);
        
        return {
          success: true,
          message: `Knowledge base '${name}' renamed to '${newName}'`,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Check if it's a not found error
        if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
          logger.warn('Knowledge base not found', { name: request.params.name });
          reply.status(404);
          return createErrorResponse(
            'NOT_FOUND',
            `Knowledge base '${request.params.name}' not found`
          );
        }

        logger.error('Failed to rename knowledge base', error instanceof Error ? error : new Error(errorMessage));
        reply.status(500);
        return createErrorResponse(
          'INTERNAL_ERROR',
          'Failed to rename knowledge base',
          errorMessage
        );
      }
    }
  );

  /**
   * DELETE /api/codebases/:name
   * Delete a knowledge base and all its chunks
   */
  fastify.delete<{ Params: { name: string } }>(
    '/api/codebases/:name',
    async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) => {
      try {
        const { name } = request.params;
        logger.info('DELETE /api/codebases/:name', { name });

        if (!name || name.trim() === '') {
          reply.status(400);
          return createErrorResponse(
            'VALIDATION_ERROR',
            'Knowledge base name is required'
          );
        }

        await codebaseService.deleteKnowledgeBase(name);
        
        return {
          success: true,
          message: `Knowledge base '${name}' deleted successfully`,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Check if it's a not found error
        if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
          logger.warn('Knowledge base not found', { name: request.params.name });
          reply.status(404);
          return createErrorResponse(
            'NOT_FOUND',
            `Knowledge base '${request.params.name}' not found`
          );
        }

        logger.error('Failed to delete knowledge base', error instanceof Error ? error : new Error(errorMessage));
        reply.status(500);
        return createErrorResponse(
          'INTERNAL_ERROR',
          'Failed to delete knowledge base',
          errorMessage
        );
      }
    }
  );

  /**
   * DELETE /api/codebases/:name/chunk-sets/:timestamp
   * Delete chunks from a specific ingestion timestamp
   */
  fastify.delete<{ Params: { name: string; timestamp: string } }>(
    '/api/codebases/:name/chunk-sets/:timestamp',
    async (
      request: FastifyRequest<{ Params: { name: string; timestamp: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { name, timestamp } = request.params;
        logger.info('DELETE /api/codebases/:name/chunk-sets/:timestamp', {
          name,
          timestamp,
        });

        if (!name || name.trim() === '') {
          reply.status(400);
          return createErrorResponse(
            'VALIDATION_ERROR',
            'Knowledge base name is required'
          );
        }

        if (!timestamp || timestamp.trim() === '') {
          reply.status(400);
          return createErrorResponse(
            'VALIDATION_ERROR',
            'Timestamp is required'
          );
        }

        const chunksDeleted = await codebaseService.deleteChunkSet(name, timestamp);
        
        return {
          success: true,
          chunksDeleted,
          message: `Deleted ${chunksDeleted} chunks from knowledge base '${name}' at timestamp '${timestamp}'`,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Check if it's a not found error
        if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
          logger.warn('Knowledge base not found', { name: request.params.name });
          reply.status(404);
          return createErrorResponse(
            'NOT_FOUND',
            `Knowledge base '${request.params.name}' not found`
          );
        }

        logger.error('Failed to delete chunk set', error instanceof Error ? error : new Error(errorMessage));
        reply.status(500);
        return createErrorResponse(
          'INTERNAL_ERROR',
          'Failed to delete chunk set',
          errorMessage
        );
      }
    }
  );

  logger.debug('API routes registered successfully');
}
