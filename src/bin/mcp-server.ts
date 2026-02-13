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
import { LanceDBClientWrapper } from '../infrastructure/lancedb/lancedb.client.js';
import { HuggingFaceEmbeddingService } from '../domains/embedding/index.js';
import { KnowledgeBaseService } from '../domains/knowledgebase/knowledgebase.service.js';
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
  // For MCP stdio mode, disable ALL logging to avoid interfering with JSON-RPC
  // MCP protocol requires stdout to be ONLY JSON-RPC messages
  // Create a silent logger that does nothing
  const silentLogger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    child: () => silentLogger,
  } as any;

  try {
    // Load configuration
    const config = loadConfig(configPath);

    // Initialize LanceDB client (non-blocking - will create directory if needed)
    const lanceClient = new LanceDBClientWrapper(config, silentLogger);
    
    // Try to initialize, but don't fail if LanceDB isn't available yet
    try {
      await lanceClient.initialize();
    } catch (error) {
      // Don't exit - let the server start and LanceDB will initialize on first use
    }

    // Initialize embedding service (lazy - will initialize on first use)
    const embeddingService = new HuggingFaceEmbeddingService(config, silentLogger);
    // Don't initialize yet - let it initialize on first use to avoid blocking startup

    // Initialize knowledge base service
    const knowledgeBaseService = new KnowledgeBaseService(lanceClient, config);

    // Initialize search service
    const searchService = new SearchService(
      lanceClient,
      embeddingService,
      config
    );

    // Ensure default knowledge base exists
    try {
      const knowledgeBases = await knowledgeBaseService.listKnowledgeBases();
      const hasDefault = knowledgeBases.some(kb => kb.name === 'default');
      
      if (!hasDefault) {
        await knowledgeBaseService.createKnowledgeBase('default');
      }
    } catch (error) {
      // Don't fail startup if default KB creation fails
      // It will be created on first use if needed
    }

    // Create and start MCP server
    const mcpServer = new MCPServer(knowledgeBaseService, searchService, config);

    // Setup graceful shutdown
    const shutdown = async (_signal: string) => {
      try {
        await mcpServer.stop();
        process.exit(0);
      } catch (error) {
        // Only write critical errors to stderr
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Start the server
    await mcpServer.start();

    // Keep the process alive - stdio transport will handle communication
    // Process will exit on SIGINT/SIGTERM or when client closes connection
  } catch (error) {
    // Only write critical errors to stderr
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
