/**
 * Knowledge base service for CRUD operations
 * Manages knowledge base metadata, statistics, and lifecycle operations
 */

import type { 
  KnowledgeBaseMetadata, 
  KnowledgeBaseStats, 
  ChunkTypeStats,
  Config 
} from '../../shared/types/index.js';
import { LanceDBClientWrapper } from '../../infrastructure/lancedb/lancedb.client.js';
import { createLogger } from '../../shared/logging/index.js';

const rootLogger = createLogger('info');
const logger = rootLogger.child('KnowledgeBaseService');

/**
 * Error thrown when knowledge base operations fail
 */
export class KnowledgeBaseError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'KnowledgeBaseError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Service for managing knowledge bases
 */
export class KnowledgeBaseService {
  private lanceClient: LanceDBClientWrapper;

  constructor(lanceClient: LanceDBClientWrapper, _config: Config) {
    this.lanceClient = lanceClient;
  }

  /**
   * Create an empty knowledge base
   * Creates a table with a placeholder record so the KB exists
   */
  async createKnowledgeBase(name: string): Promise<void> {
    try {
      logger.debug('Creating empty knowledge base', { knowledgeBaseName: name });

      const timestamp = new Date().toISOString();
      
      // Create a placeholder chunk matching EXACTLY the schema used by storeChunks
      const placeholderChunk = {
        id: `${name}_placeholder_${timestamp}`,
        vector: new Array(384).fill(0), // Empty embedding vector (384 dimensions)
        content: '__PLACEHOLDER__', // Non-empty so we can filter it out
        filePath: '__PLACEHOLDER__',
        startLine: 0,
        endLine: 0,
        chunkType: 'placeholder',
        documentType: 'placeholder',
        tokenCount: 0,
        headingPath: ['__PLACEHOLDER__'], // Must have at least one element
        pageNumber: 0,
        ingestionTimestamp: timestamp,
        _knowledgeBaseName: name,
        _path: '',
        _lastIngestion: timestamp,
      };

      // Create table with placeholder
      await this.lanceClient.createTableWithData(name, [placeholderChunk]);

      logger.debug('Empty knowledge base created successfully', { knowledgeBaseName: name });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to create empty knowledge base',
        error instanceof Error ? error : new Error(errorMessage),
        { knowledgeBaseName: name }
      );
      throw new KnowledgeBaseError(
        `Failed to create knowledge base '${name}': ${errorMessage}`,
        error
      );
    }
  }

  /**
   * List all knowledge bases with metadata
   */
  async listKnowledgeBases(): Promise<KnowledgeBaseMetadata[]> {
    try {
      logger.debug('Listing all knowledge bases');

      const tables = await this.lanceClient.listTables();
      const knowledgeBases: KnowledgeBaseMetadata[]  = [];

      for (const table of tables) {
        // All tables from listTables() are already filtered to knowledgebase_ prefix
        // Extract knowledge base name from table name pattern: knowledgebase_{name}_{version}
        const match = table.name.match(/^knowledgebase_(.+)_\d+_\d+_\d+$/);
        if (!match) {
          logger.warn('Table name does not match expected pattern', { tableName: table.name });
          continue;
        }

        // Use the sanitized name as-is (don't convert underscores back)
        // This ensures consistency between ingestion and retrieval
        const knowledgeBaseName = match[1];
        
        // Open table directly by name
        const lanceTable = await this.lanceClient.getConnection().openTable(table.name);
        
        // Extract metadata from first row if available
        let path = '';
        let fileCount = 0;
        let lastIngestion = '';
        let chunkCount = 0;

        try {
          const sample = await lanceTable.query().limit(1).toArray();
          if (sample.length > 0) {
            const firstRow = sample[0];
            path = firstRow._path || '';
            lastIngestion = firstRow._lastIngestion || firstRow._createdAt || '';
            
            // Get all rows to count chunks and files
            const allRows = await lanceTable.query().toArray();
            const uniqueFiles = new Set<string>();
            
            logger.info('Counting chunks and files', { 
              knowledgeBaseName, 
              totalRows: allRows.length 
            });
            
            for (const row of allRows) {
              // Skip placeholder chunks when counting
              if (row.filePath === '__PLACEHOLDER__' || row.content === '__PLACEHOLDER__') {
                continue;
              }
              
              chunkCount++;
              if (row.filePath) {
                uniqueFiles.add(row.filePath);
              }
            }
            
            fileCount = uniqueFiles.size;
            
            logger.info('Chunk and file count complete', {
              knowledgeBaseName,
              chunkCount,
              fileCount
            });
          }
        } catch (error) {
          // Log metadata errors but don't fail the entire listing
          logger.warn('Failed to get metadata for knowledge base', {
            knowledgeBaseName,
            error: error instanceof Error ? error.message : String(error)
          });
          // This is not critical for listing knowledge bases - continue with zeros
        }

        knowledgeBases.push({
          name: knowledgeBaseName,
          path,
          chunkCount,
          fileCount,
          lastIngestion,
        });
      }

      logger.debug('Knowledge bases listed successfully', { count: knowledgeBases.length });
      return knowledgeBases;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to list knowledge bases',
        error instanceof Error ? error : new Error(errorMessage)
      );
      throw new KnowledgeBaseError(
        `Failed to list knowledge bases: ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Get detailed statistics for a knowledge base
   */
  async getKnowledgeBaseStats(name: string): Promise<KnowledgeBaseStats> {
    try {
      logger.debug('Getting knowledge base statistics', { knowledgeBaseName: name });

      const table = await this.lanceClient.getOrCreateTable(name);
      if (!table) {
        throw new KnowledgeBaseError(`Knowledge base '${name}' not found`);
      }
      
      // Get all rows to calculate statistics
      const rows = await table.query().toArray();

      // Calculate statistics (excluding placeholder chunks)
      const chunkTypeMap = new Map<string, number>();
      const fileSet = new Set<string>();
      let totalSize = 0;
      let path = '';
      let lastIngestion = '';
      let actualChunkCount = 0;

      for (const row of rows) {
        // Skip placeholder chunks
        if (row.filePath === '__PLACEHOLDER__' || row.content === '__PLACEHOLDER__') {
          continue;
        }

        actualChunkCount++;
        
        const filePath = row.filePath || '';
        const chunkType = row.chunkType || 'unknown';
        const content = row.content || '';

        // Get metadata from first row
        if (!path && row._path) path = row._path;
        if (!lastIngestion && (row._lastIngestion || row._createdAt)) {
          lastIngestion = row._lastIngestion || row._createdAt;
        }

        fileSet.add(filePath);
        totalSize += content.length;

        // Track chunk type stats
        chunkTypeMap.set(chunkType, (chunkTypeMap.get(chunkType) || 0) + 1);
      }

      // Convert to arrays
      const chunkTypes: ChunkTypeStats[] = Array.from(chunkTypeMap.entries()).map(
        ([type, count]) => ({
          type,
          count,
        })
      );

      const stats: KnowledgeBaseStats = {
        name,
        path,
        chunkCount: actualChunkCount,
        fileCount: fileSet.size,
        lastIngestion,
        chunkTypes,
        sizeBytes: totalSize,
      };

      logger.debug('Knowledge base statistics retrieved successfully', {
        knowledgeBaseName: name,
        chunkCount: actualChunkCount,
        fileCount: fileSet.size,
      });

      return stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to get knowledge base statistics',
        error instanceof Error ? error : new Error(errorMessage),
        { knowledgeBaseName: name }
      );
      throw new KnowledgeBaseError(
        `Failed to get statistics for knowledge base '${name}': ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Rename a knowledge base and propagate to all chunk metadata
   */
  async renameKnowledgeBase(oldName: string, newName: string): Promise<void> {
    try {
      logger.debug('Renaming knowledge base', { oldName, newName });

      // Get the old table
      const oldTable = await this.lanceClient.getOrCreateTable(oldName);
      if (!oldTable) {
        throw new KnowledgeBaseError(`Knowledge base '${oldName}' not found`);
      }
      
      // Get all rows from old table
      const rows = await oldTable.query().toArray();

      if (rows.length === 0) {
        logger.warn('No chunks found in knowledge base to rename', { oldName });
      }

      // Update knowledgeBaseName in all rows
      const updatedRows = rows.map((row: any) => ({
        ...row,
        _knowledgeBaseName: newName,
        _renamedFrom: oldName,
        _renamedAt: new Date().toISOString(),
      }));

      // Create new table with updated data
      if (updatedRows.length > 0) {
        await this.lanceClient.createTableWithData(newName, updatedRows);
      }

      // Delete old table
      await this.lanceClient.deleteTable(oldName);

      logger.debug('Knowledge base renamed successfully', {
        oldName,
        newName,
        chunksUpdated: rows.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to rename knowledge base',
        error instanceof Error ? error : new Error(errorMessage),
        { oldName, newName }
      );
      throw new KnowledgeBaseError(
        `Failed to rename knowledge base from '${oldName}' to '${newName}': ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Delete a knowledge base and all its chunks
   */
  async deleteKnowledgeBase(name: string): Promise<void> {
    try {
      logger.debug('Deleting knowledge base', { knowledgeBaseName: name });

      await this.lanceClient.deleteTable(name);

      logger.debug('Knowledge base deleted successfully', { knowledgeBaseName: name });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to delete knowledge base',
        error instanceof Error ? error : new Error(errorMessage),
        { knowledgeBaseName: name }
      );
      throw new KnowledgeBaseError(
        `Failed to delete knowledge base '${name}': ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Delete chunks from a specific ingestion timestamp
   */
  async deleteChunkSet(knowledgeBaseName: string, timestamp: string): Promise<number> {
    try {
      logger.debug('Deleting chunk set', { knowledgeBaseName, timestamp });

      const table = await this.lanceClient.getOrCreateTable(knowledgeBaseName);
      if (!table) {
        throw new KnowledgeBaseError(`Knowledge base '${knowledgeBaseName}' not found`);
      }

      // Count chunks with the specified timestamp
      const rows = await table.query()
        .where(`ingestionTimestamp = '${timestamp}'`)
        .toArray();

      const chunkCount = rows.length;

      if (chunkCount === 0) {
        logger.warn('No chunks found with specified timestamp', {
          knowledgeBaseName,
          timestamp,
        });
        return 0;
      }

      // Delete the chunks
      await table.delete(`ingestionTimestamp = '${timestamp}'`);

      logger.debug('Chunk set deleted successfully', {
        knowledgeBaseName,
        timestamp,
        chunksDeleted: chunkCount,
      });

      return chunkCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to delete chunk set',
        error instanceof Error ? error : new Error(errorMessage),
        { knowledgeBaseName, timestamp }
      );
      throw new KnowledgeBaseError(
        `Failed to delete chunk set for knowledge base '${knowledgeBaseName}' at timestamp '${timestamp}': ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Delete all chunks for a specific document from a knowledge base
   * @param knowledgeBaseName - Name of the knowledge base
   * @param filePath - Relative path to the document to remove
   * @returns Number of chunks deleted
   */
  async deleteDocument(knowledgeBaseName: string, filePath: string): Promise<number> {
    try {
      logger.debug('Deleting document', { knowledgeBaseName, filePath });

      // Validate inputs
      if (!filePath || filePath.trim() === '') {
        throw new KnowledgeBaseError('File path cannot be empty');
      }

      // Security: Prevent path traversal
      if (filePath.includes('..') || filePath.startsWith('/')) {
        throw new KnowledgeBaseError('Invalid file path: path traversal not allowed');
      }

      const table = await this.lanceClient.getOrCreateTable(knowledgeBaseName);
      if (!table) {
        throw new KnowledgeBaseError(`Knowledge base '${knowledgeBaseName}' not found`);
      }

      // Debug: Log a sample row to see the actual field structure
      try {
        const sampleRows = await table.query().limit(1).toArray();
        if (sampleRows.length > 0) {
          logger.debug('Sample row fields', {
            knowledgeBaseName,
            fields: Object.keys(sampleRows[0]),
            sampleFilePath: sampleRows[0].filePath,
          });
        }
      } catch (debugError) {
        logger.warn('Could not fetch sample row for debugging', { error: debugError });
      }

      // Count chunks before deletion
      const beforeCount = await table.countRows();

      // Escape single quotes in filePath for SQL filter
      const escapedFilePath = filePath.replace(/'/g, "''");

      // Delete chunks matching filePath
      // Note: LanceDB requires backticks for field names with mixed case
      await table.delete(`\`filePath\` = '${escapedFilePath}'`);

      // Count chunks after deletion
      const afterCount = await table.countRows();
      const deletedCount = beforeCount - afterCount;

      logger.info('Document deleted', {
        knowledgeBaseName,
        filePath,
        chunksDeleted: deletedCount,
      });

      return deletedCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to delete document',
        error instanceof Error ? error : new Error(errorMessage),
        { knowledgeBaseName, filePath }
      );
      throw new KnowledgeBaseError(
        `Failed to delete document '${filePath}' from knowledge base '${knowledgeBaseName}': ${errorMessage}`,
        error
      );
    }
  }

  /**
   * List all unique documents in a knowledge base
   * @param knowledgeBaseName - Name of the knowledge base
   * @returns Array of document metadata
   */
  async listDocuments(knowledgeBaseName: string): Promise<import('../../shared/types/index.js').DocumentInfo[]> {
    try {
      logger.debug('Listing documents', { knowledgeBaseName });

      const table = await this.lanceClient.getOrCreateTable(knowledgeBaseName);
      if (!table) {
        // Get list of available knowledge bases for better error message
        const availableKBs = await this.listKnowledgeBases();
        const kbNames = availableKBs.map(kb => kb.name).join(', ');
        throw new KnowledgeBaseError(
          `Knowledge base '${knowledgeBaseName}' not found. Available knowledge bases: ${kbNames || '(none)'}`
        );
      }

      // Query all rows and aggregate by filePath
      const rows = await table.query().toArray();

      const documentsMap = new Map<string, import('../../shared/types/index.js').DocumentInfo>();

      for (const row of rows) {
        // Skip placeholder chunks
        if (row.filePath === '__PLACEHOLDER__' || row.content === '__PLACEHOLDER__') {
          continue;
        }

        const filePath = row.filePath || '';
        if (!filePath) continue;

        if (!documentsMap.has(filePath)) {
          documentsMap.set(filePath, {
            filePath,
            documentType: row.documentType || 'text',
            chunkCount: 0,
            lastIngestion: row.ingestionTimestamp || '',
            sizeBytes: 0,
          });
        }

        const doc = documentsMap.get(filePath)!;
        doc.chunkCount++;
        doc.sizeBytes += (row.content || '').length;

        // Update to latest ingestion timestamp
        if (row.ingestionTimestamp && row.ingestionTimestamp > doc.lastIngestion) {
          doc.lastIngestion = row.ingestionTimestamp;
        }
      }

      const documents = Array.from(documentsMap.values());

      logger.debug('Documents listed successfully', {
        knowledgeBaseName,
        documentCount: documents.length,
      });

      return documents;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to list documents',
        error instanceof Error ? error : new Error(errorMessage),
        { knowledgeBaseName }
      );
      throw new KnowledgeBaseError(
        `Failed to list documents in knowledge base '${knowledgeBaseName}': ${errorMessage}`,
        error
      );
    }
  }
}
