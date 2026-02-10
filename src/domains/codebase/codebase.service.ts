/**
 * Codebase service for CRUD operations
 * Manages codebase metadata, statistics, and lifecycle operations
 */

import type { 
  CodebaseMetadata, 
  CodebaseStats, 
  LanguageStats, 
  ChunkTypeStats,
  Config 
} from '../../shared/types/index.js';
import { LanceDBClientWrapper } from '../../infrastructure/lancedb/lancedb.client.js';
import { createLogger } from '../../shared/logging/index.js';

const rootLogger = createLogger('info');
const logger = rootLogger.child('CodebaseService');

/**
 * Error thrown when codebase operations fail
 */
export class CodebaseError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CodebaseError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Service for managing codebases
 */
export class CodebaseService {
  private lanceClient: LanceDBClientWrapper;

  constructor(lanceClient: LanceDBClientWrapper, _config: Config) {
    this.lanceClient = lanceClient;
  }

  /**
   * List all codebases with metadata
   */
  async listCodebases(): Promise<CodebaseMetadata[]> {
    try {
      logger.info('Listing all codebases');

      const tables = await this.lanceClient.listTables();
      const codebases: CodebaseMetadata[]  = [];

      for (const table of tables) {
        const metadata = table.metadata;
        
        // Only include tables that are codebase tables
        if (!metadata?.codebaseName) {
          continue;
        }

        const codebaseName = metadata.codebaseName as string;
        
        // Open table to query chunk count
        const lanceTable = await this.lanceClient.getOrCreateTable(codebaseName);
        const count = await lanceTable.countRows();
        
        // Extract metadata from first row if available
        let path = '';
        let fileCount = 0;
        let lastIngestion = '';
        let languages: string[] = [];

        try {
          const sample = await lanceTable.query().limit(1).toArray();
          if (sample.length > 0) {
            const firstRow = sample[0];
            path = firstRow._path || '';
            lastIngestion = firstRow._lastIngestion || firstRow._createdAt || '';
            
            // Get unique languages and file count from all rows
            const allRows = await lanceTable.query().select(['language', 'filePath']).toArray();
            const uniqueFiles = new Set<string>();
            const uniqueLanguages = new Set<string>();
            
            for (const row of allRows) {
              if (row.filePath) uniqueFiles.add(row.filePath);
              if (row.language) uniqueLanguages.add(row.language);
            }
            
            fileCount = uniqueFiles.size;
            languages = Array.from(uniqueLanguages);
          }
        } catch (error) {
          logger.warn('Failed to get table metadata', { codebaseName, error });
        }

        codebases.push({
          name: codebaseName,
          path,
          chunkCount: count,
          fileCount,
          lastIngestion,
          languages,
        });
      }

      logger.info('Codebases listed successfully', { count: codebases.length });
      return codebases;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to list codebases',
        error instanceof Error ? error : new Error(errorMessage)
      );
      throw new CodebaseError(
        `Failed to list codebases: ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Get detailed statistics for a codebase
   */
  async getCodebaseStats(name: string): Promise<CodebaseStats> {
    try {
      logger.info('Getting codebase statistics', { codebaseName: name });

      const table = await this.lanceClient.getOrCreateTable(name);
      
      // Get all rows to calculate statistics
      const rows = await table.query().toArray();
      
      const chunkCount = rows.length;

      // Calculate language distribution
      const languageMap = new Map<string, { fileCount: Set<string>; chunkCount: number }>();
      const chunkTypeMap = new Map<string, number>();
      const fileSet = new Set<string>();
      let totalSize = 0;
      let path = '';
      let lastIngestion = '';

      for (const row of rows) {
        const language = row.language || 'unknown';
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

        // Track language stats
        if (!languageMap.has(language)) {
          languageMap.set(language, { fileCount: new Set(), chunkCount: 0 });
        }
        const langStats = languageMap.get(language)!;
        langStats.fileCount.add(filePath);
        langStats.chunkCount++;

        // Track chunk type stats
        chunkTypeMap.set(chunkType, (chunkTypeMap.get(chunkType) || 0) + 1);
      }

      // Convert to arrays
      const languages: LanguageStats[] = Array.from(languageMap.entries()).map(
        ([language, stats]) => ({
          language,
          fileCount: stats.fileCount.size,
          chunkCount: stats.chunkCount,
        })
      );

      const chunkTypes: ChunkTypeStats[] = Array.from(chunkTypeMap.entries()).map(
        ([type, count]) => ({
          type,
          count,
        })
      );

      const stats: CodebaseStats = {
        name,
        path,
        chunkCount,
        fileCount: fileSet.size,
        lastIngestion,
        languages,
        chunkTypes,
        sizeBytes: totalSize,
      };

      logger.info('Codebase statistics retrieved successfully', {
        codebaseName: name,
        chunkCount,
        fileCount: fileSet.size,
      });

      return stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to get codebase statistics',
        error instanceof Error ? error : new Error(errorMessage),
        { codebaseName: name }
      );
      throw new CodebaseError(
        `Failed to get statistics for codebase '${name}': ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Rename a codebase and propagate to all chunk metadata
   */
  async renameCodebase(oldName: string, newName: string): Promise<void> {
    try {
      logger.info('Renaming codebase', { oldName, newName });

      // Get the old table
      const oldTable = await this.lanceClient.getOrCreateTable(oldName);
      
      // Get all rows from old table
      const rows = await oldTable.query().toArray();

      if (rows.length === 0) {
        logger.warn('No chunks found in codebase to rename', { oldName });
      }

      // Update codebaseName in all rows
      const updatedRows = rows.map((row: any) => ({
        ...row,
        _codebaseName: newName,
        _renamedFrom: oldName,
        _renamedAt: new Date().toISOString(),
      }));

      // Create new table with updated data
      const newTable = await this.lanceClient.getOrCreateTable(newName);
      if (updatedRows.length > 0) {
        await newTable.add(updatedRows);
      }

      // Delete old table
      await this.lanceClient.deleteTable(oldName);

      logger.info('Codebase renamed successfully', {
        oldName,
        newName,
        chunksUpdated: rows.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to rename codebase',
        error instanceof Error ? error : new Error(errorMessage),
        { oldName, newName }
      );
      throw new CodebaseError(
        `Failed to rename codebase from '${oldName}' to '${newName}': ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Delete a codebase and all its chunks
   */
  async deleteCodebase(name: string): Promise<void> {
    try {
      logger.info('Deleting codebase', { codebaseName: name });

      await this.lanceClient.deleteTable(name);

      logger.info('Codebase deleted successfully', { codebaseName: name });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to delete codebase',
        error instanceof Error ? error : new Error(errorMessage),
        { codebaseName: name }
      );
      throw new CodebaseError(
        `Failed to delete codebase '${name}': ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Delete chunks from a specific ingestion timestamp
   */
  async deleteChunkSet(codebaseName: string, timestamp: string): Promise<number> {
    try {
      logger.info('Deleting chunk set', { codebaseName, timestamp });

      const table = await this.lanceClient.getOrCreateTable(codebaseName);

      // Count chunks with the specified timestamp
      const rows = await table.query()
        .where(`ingestionTimestamp = '${timestamp}'`)
        .toArray();

      const chunkCount = rows.length;

      if (chunkCount === 0) {
        logger.warn('No chunks found with specified timestamp', {
          codebaseName,
          timestamp,
        });
        return 0;
      }

      // Delete the chunks
      await table.delete(`ingestionTimestamp = '${timestamp}'`);

      logger.info('Chunk set deleted successfully', {
        codebaseName,
        timestamp,
        chunksDeleted: chunkCount,
      });

      return chunkCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to delete chunk set',
        error instanceof Error ? error : new Error(errorMessage),
        { codebaseName, timestamp }
      );
      throw new CodebaseError(
        `Failed to delete chunk set for codebase '${codebaseName}' at timestamp '${timestamp}': ${errorMessage}`,
        error
      );
    }
  }
}
