/**
 * Embedding service using Hugging Face transformers
 * 
 * Generates embeddings for code chunks using local transformer models.
 * The model is cached in memory for the process lifetime.
 * 
 * Requirements: 2.4, 4.1, 4.2, 4.3, 4.5, 12.1
 */

import { pipeline, type Pipeline } from '@huggingface/transformers';
import type { Config } from '../../shared/types/index.js';
import type { Logger } from '../../shared/logging/logger.js';

/**
 * Embedding service interface
 */
export interface EmbeddingService {
  /**
   * Initialize the embedding model
   * Must be called before generating embeddings
   */
  initialize(): Promise<void>;

  /**
   * Generate embedding for a single text
   * @param text - Text to embed
   * @returns Embedding vector
   * @throws Error if model is not initialized or embedding generation fails
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts in batch
   * More efficient than calling generateEmbedding multiple times
   * @param texts - Array of texts to embed
   * @returns Array of embedding vectors
   * @throws Error if model is not initialized or embedding generation fails
   */
  batchGenerateEmbeddings(texts: string[]): Promise<number[][]>;

  /**
   * Get the embedding model name
   */
  getModelName(): string;

  /**
   * Get the embedding dimensionality
   */
  getEmbeddingDimension(): number;

  /**
   * Check if the model is initialized
   */
  isInitialized(): boolean;
}

/**
 * Implementation of embedding service using Hugging Face transformers
 */
export class HuggingFaceEmbeddingService implements EmbeddingService {
  private model: Pipeline | null = null;
  private readonly modelName: string;
  private readonly cachePath: string;
  private readonly logger: Logger;
  private embeddingDimension: number = 384; // Default for all-MiniLM-L6-v2

  constructor(config: Config, logger: Logger) {
    this.modelName = config.embedding.modelName;
    this.cachePath = config.embedding.cachePath;
    this.logger = logger.child('EmbeddingService');
  }

  /**
   * Initialize the embedding model
   * Downloads and caches the model if not already cached
   * Model is cached in memory for the process lifetime
   */
  async initialize(): Promise<void> {
    if (this.model) {
      this.logger.debug('Embedding model already initialized', {
        modelName: this.modelName,
      });
      return;
    }

    this.logger.info('Initializing embedding model', {
      modelName: this.modelName,
      cachePath: this.cachePath,
    });

    const startTime = Date.now();

    try {
      // Set cache directory for model downloads
      if (this.cachePath) {
        process.env.HF_HOME = this.cachePath;
      }

      // Load the feature extraction pipeline
      // This will download the model if not cached
      this.model = await pipeline('feature-extraction', this.modelName, {
        // Use local cache
        local_files_only: false,
        // Quantize for better performance
        quantized: true,
      });

      const durationMs = Date.now() - startTime;

      // Test the model to get embedding dimension
      const testEmbedding = await this.generateEmbedding('test');
      this.embeddingDimension = testEmbedding.length;

      this.logger.info('Embedding model initialized successfully', {
        modelName: this.modelName,
        embeddingDimension: this.embeddingDimension,
        durationMs,
      });
    } catch (error) {
      this.logger.error(
        'Failed to initialize embedding model',
        error instanceof Error ? error : new Error(String(error)),
        {
          modelName: this.modelName,
          cachePath: this.cachePath,
        }
      );
      throw new Error(
        `Failed to initialize embedding model: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.model) {
      throw new Error('Embedding model not initialized. Call initialize() first.');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    try {
      // Generate embedding using the pipeline
      const result = await this.model(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Extract the embedding array from the result
      // The result is a tensor, we need to convert it to a plain array
      const embedding = Array.from(result.data as Float32Array);

      return embedding;
    } catch (error) {
      this.logger.error(
        'Failed to generate embedding',
        error instanceof Error ? error : new Error(String(error)),
        {
          textLength: text.length,
          textPreview: text.substring(0, 100),
        }
      );
      throw new Error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * More efficient than calling generateEmbedding multiple times
   */
  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.model) {
      throw new Error('Embedding model not initialized. Call initialize() first.');
    }

    if (texts.length === 0) {
      return [];
    }

    // Filter out empty texts and track their indices
    const validTexts: string[] = [];
    const validIndices: number[] = [];
    const results: number[][] = new Array(texts.length);

    for (let i = 0; i < texts.length; i++) {
      if (texts[i] && texts[i].trim().length > 0) {
        validTexts.push(texts[i]);
        validIndices.push(i);
      } else {
        this.logger.warn('Skipping empty text in batch', { index: i });
      }
    }

    if (validTexts.length === 0) {
      throw new Error('No valid texts to embed in batch');
    }

    this.logger.debug('Generating batch embeddings', {
      totalTexts: texts.length,
      validTexts: validTexts.length,
    });

    try {
      // Process each text individually but collect results
      // Note: @huggingface/transformers doesn't support true batching in the same way as Python
      // but we can process them efficiently in sequence
      const embeddings: number[][] = [];

      for (let i = 0; i < validTexts.length; i++) {
        try {
          const embedding = await this.generateEmbedding(validTexts[i]);
          embeddings.push(embedding);
        } catch (error) {
          // Log error but continue with other texts
          this.logger.error(
            'Failed to generate embedding in batch',
            error instanceof Error ? error : new Error(String(error)),
            {
              batchIndex: i,
              textLength: validTexts[i].length,
            }
          );
          // Skip this embedding - caller will need to handle missing embeddings
          throw error; // Re-throw to maintain error handling contract
        }
      }

      // Place embeddings back in their original positions
      for (let i = 0; i < validIndices.length; i++) {
        results[validIndices[i]] = embeddings[i];
      }

      return results.filter((r) => r !== undefined);
    } catch (error) {
      this.logger.error(
        'Failed to generate batch embeddings',
        error instanceof Error ? error : new Error(String(error)),
        {
          batchSize: texts.length,
        }
      );
      throw error;
    }
  }

  /**
   * Get the embedding model name
   */
  getModelName(): string {
    return this.modelName;
  }

  /**
   * Get the embedding dimensionality
   */
  getEmbeddingDimension(): number {
    return this.embeddingDimension;
  }

  /**
   * Check if the model is initialized
   */
  isInitialized(): boolean {
    return this.model !== null;
  }
}

/**
 * Create an embedding service instance
 */
export function createEmbeddingService(config: Config, logger: Logger): EmbeddingService {
  return new HuggingFaceEmbeddingService(config, logger);
}
