#!/usr/bin/env node

/**
 * Ingestion CLI Entry Point
 * 
 * Command-line interface for ingesting knowledge bases into the semantic search system.
 * 
 * Usage:
 *   ingest --path <directory> --name <knowledge-base-name> [--config <config-file>]
 * 
 * Requirements: 9.2, 9.4
 */

import { Command } from 'commander';
import { resolve } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { loadConfig } from '../shared/config/config.js';
import { createLogger } from '../shared/logging/logger.js';
import { IngestionService } from '../domains/ingestion/ingestion.service.js';
import { createEmbeddingService } from '../domains/embedding/embedding.service.js';
import { LanceDBClientWrapper } from '../infrastructure/lancedb/lancedb.client.js';

/**
 * Format duration in seconds
 */
function formatDuration(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
}



/**
 * Create a simple progress bar
 */
function createProgressBar(phase: string, current: number, total: number): string {
  const percentage = Math.floor((current / total) * 100);
  const barLength = 40;
  const filledLength = Math.floor((current / total) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  return `${phase}: [${bar}] ${percentage}% (${current}/${total})`;
}

/**
 * Main CLI function
 */
async function main() {
  const program = new Command();

  program
    .name('mcp-knowledge-ingest')
    .description('Ingest documents into a knowledge base for semantic search')
    .version('0.1.0')
    .requiredOption('-p, --path <path>', 'Path to document directory or file')
    .requiredOption('-n, --name <name>', 'Unique name for the knowledge base')
    .option('-c, --config <file>', 'Path to configuration file')
    .option('--no-gitignore', 'Disable .gitignore filtering (include all files)')
    .parse(process.argv);

  const options = program.opts();

  try {
    // Validate required arguments
    if (!options.path) {
      console.error('Error: --path is required');
      process.exit(1);
    }

    if (!options.name) {
      console.error('Error: --name is required');
      process.exit(1);
    }

    // Resolve and validate path
    const knowledgeBasePath = resolve(options.path);
    if (!existsSync(knowledgeBasePath)) {
      console.error(`Error: Path not found: ${knowledgeBasePath}`);
      process.exit(1);
    }

    // Check if path is a file or directory
    const pathStats = statSync(knowledgeBasePath);
    const isFile = pathStats.isFile();
    const isDirectory = pathStats.isDirectory();

    if (!isFile && !isDirectory) {
      console.error(`Error: Path must be a file or directory: ${knowledgeBasePath}`);
      process.exit(1);
    }

    // Load configuration
    const config = loadConfig(options.config);
    const logger = createLogger(config.logging.level);

    console.log(`\nIngesting knowledge base: ${options.name}`);
    console.log(`Path: ${knowledgeBasePath}`);
    console.log(`Type: ${isFile ? 'Single file' : 'Directory'}`);
    console.log(`Supported formats: PDF, DOCX, PPTX, XLSX, HTML, Markdown, Text, Audio`);
    console.log('');

    // Initialize services
    logger.info('Initializing services...');

    const lanceClient = new LanceDBClientWrapper(config);
    await lanceClient.initialize();

    const embeddingService = createEmbeddingService(config, logger);
    await embeddingService.initialize();

    const ingestionService = new IngestionService(
      embeddingService,
      lanceClient,
      config
    );

    // Track progress
    let lastPhase = '';
    let lastProgress = '';

    const progressCallback = (phase: string, current: number, total: number) => {
      const progressBar = createProgressBar(phase, current, total);
      
      // Clear previous line if same phase
      if (phase === lastPhase && lastProgress) {
        process.stdout.write('\r\x1b[K');
      } else if (lastPhase && phase !== lastPhase) {
        // New phase, print newline
        console.log('');
      }
      
      process.stdout.write(progressBar);
      lastPhase = phase;
      lastProgress = progressBar;
      
      // Print newline when complete
      if (current === total) {
        console.log('');
      }
    };

    // Run ingestion based on path type
    const startTime = Date.now();
    let stats;

    if (isFile) {
      // Single file ingestion
      console.log('Processing file...');
      const result = await ingestionService.ingestFiles({
        files: [knowledgeBasePath],
        knowledgeBaseName: options.name,
        config,
      });

      const endTime = Date.now();
      
      // Format stats to match directory ingestion format
      stats = {
        totalFiles: 1,
        supportedFiles: result.filesProcessed,
        unsupportedFiles: new Map<string, number>(),
        chunksCreated: result.chunksCreated,
        durationMs: endTime - startTime,
      };

      // Add unsupported file info if there were errors
      if (result.errors.length > 0) {
        const ext = knowledgeBasePath.split('.').pop()?.toLowerCase() || 'unknown';
        stats.unsupportedFiles.set(`.${ext}`, result.errors.length);
      }

      // Log any errors
      if (result.errors.length > 0) {
        console.log('');
        console.log('Errors encountered:');
        for (const error of result.errors) {
          console.log(`  ${error.filePath}: ${error.error}`);
        }
      }
    } else {
      // Directory ingestion
      stats = await ingestionService.ingestCodebase(
        {
          path: knowledgeBasePath,
          name: options.name,
          config,
          respectGitignore: options.gitignore !== false, // Commander sets to false if --no-gitignore is used
        },
        progressCallback
      );
    }

    // Print statistics
    console.log('');
    console.log('✓ Ingestion completed successfully!');
    console.log('');
    console.log('Statistics:');
    console.log(`  Total files scanned: ${stats.totalFiles}`);
    console.log(`  Supported files: ${stats.supportedFiles}`);
    console.log(`  Unsupported files: ${stats.unsupportedFiles}`);
    console.log(`  Chunks created: ${stats.chunksCreated}`);
    console.log(`  Duration: ${formatDuration(stats.durationMs)}`);
    console.log('');

    // Print unsupported file summary
    if (stats.unsupportedFiles.size > 0) {
      console.log('Unsupported files by extension:');
      const sortedExtensions = Array.from(stats.unsupportedFiles.entries()).sort(
        (a, b) => b[1] - a[1]
      );
      for (const [ext, count] of sortedExtensions) {
        console.log(`  ${ext}: ${count} files`);
      }
      console.log('');
    }

    logger.info('Ingestion completed', {
      knowledgeBaseName: options.name,
      ...stats,
    });

    // Let Node.js exit naturally instead of forcing exit
    // This allows LanceDB to cleanup properly
  } catch (error) {
    console.error('');
    console.error('✗ Ingestion failed');
    console.error('');
    
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      
      // Print stack trace in debug mode
      if (process.env.DEBUG) {
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error(`Error: ${String(error)}`);
    }
    
    console.error('');
    console.error('Tip: Set DEBUG=1 for detailed error information');
    console.error('');
    
    // Let Node.js exit naturally to allow proper cleanup
  }
}

// Run the CLI
main().catch((error) => {
  console.error('Unexpected error:', error);
  // Let Node.js exit naturally
});
