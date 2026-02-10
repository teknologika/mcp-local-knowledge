#!/usr/bin/env node
/**
 * MCP Server Entry Point
 * 
 * Starts the MCP server with stdio transport for communication with MCP clients.
 * 
 * Usage:
 *   mcp-server [--config <path>]
 * 
 * Environment Variables:
 *   CONFIG_PATH - Path to configuration file
 * 
 * Validates: Requirements 9.2, 9.3, 15.5
 */

import { loadConfig } from '../shared/config/index.js';
import { createLogger } from '../shared/logging/index.js';
import { LanceDBClientWrapper } from '../infrastructure/lancedb/lancedb.client.js';
import { HuggingFaceEmbeddingService } from '../domains/embedding/index.js';
import { CodebaseService } from '../domains/codebase/codebase.service.js';
import { SearchService } from '../domains/search/search.service.js';
import { MCPServer } from '../infrastructure/mcp/mcp-server.js';

// Parse command line arguments
const args = process.argv.slice(2);
let configPath: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--config' && i + 1 < args.length) {
    configPath = args[i + 1];
    i++;
  }
}

// Use environment variable if not provided via CLI
if (!configPath && process.env.CONFIG_PATH) {
  configPath = process.env.CONFIG_PATH;
}

/**
 * Main function to start the MCP server
 */
async function main() {
  // Initialize logger early with default level
  let logger = createLogger('info');
  let mainLogger = logger.child('main');

  try {
    // Load configuration
    const config = loadConfig(configPath);

    // Re-initialize logger with configured level
    logger = createLogger(config.logging.level);
    mainLogger = logger.child('main');

    mainLogger.info('Initializing MCP server', {
      configPath: configPath || 'default',
      schemaVersion: config.schemaVersion,
    });

    // Initialize LanceDB client (non-blocking - will create directory if needed)
    mainLogger.info('Creating LanceDB client', {
      persistPath: config.lancedb.persistPath,
    });
    const lanceClient = new LanceDBClientWrapper(config);
    
    // Try to initialize, but don't fail if LanceDB isn't available yet
    try {
      await lanceClient.initialize();
    } catch (error) {
      mainLogger.warn('LanceDB initialization failed, will retry on first use', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't exit - let the server start and LanceDB will initialize on first use
    }

    // Initialize embedding service (lazy - will initialize on first use)
    mainLogger.info('Creating embedding service', {
      modelName: config.embedding.modelName,
    });
    const embeddingService = new HuggingFaceEmbeddingService(config, logger);
    // Don't initialize yet - let it initialize on first use to avoid blocking startup

    // Initialize codebase service
    mainLogger.info('Initializing codebase service');
    const codebaseService = new CodebaseService(lanceClient, config);

    // Initialize search service
    mainLogger.info('Initializing search service');
    const searchService = new SearchService(
      lanceClient,
      embeddingService,
      config
    );

    // Create and start MCP server
    const mcpServer = new MCPServer(codebaseService, searchService, config);

    // Setup graceful shutdown
    const shutdown = async (signal: string) => {
      mainLogger.info('Received shutdown signal', { signal });
      try {
        await mcpServer.stop();
        process.exit(0);
      } catch (error) {
        mainLogger.error(
          'Error during shutdown',
          error instanceof Error ? error : new Error(String(error))
        );
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Start the server
    await mcpServer.start();

    mainLogger.info('MCP server is running and ready to accept requests');

    // Keep the process alive - stdio transport will handle communication
    // Process will exit on SIGINT/SIGTERM or when client closes connection
  } catch (error) {
    const errorLogger = logger.child('main');
    errorLogger.error(
      'Failed to start MCP server',
      error instanceof Error ? error : new Error(String(error))
    );

    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
