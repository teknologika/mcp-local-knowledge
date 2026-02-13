/**
 * MCP Tool Schemas
 * 
 * JSON schemas for all MCP tools exposed by the knowledge base server.
 * These schemas define input validation rules and output formats for each tool.
 * 
 * Validates: Requirements 15.1
 */

/**
 * Schema for list_knowledgebases tool
 * 
 * Lists all indexed knowledge bases with their metadata.
 * No input parameters required.
 */
export const LIST_KNOWLEDGEBASES_SCHEMA = {
  name: 'list_knowledgebases',
  description: 'List all indexed knowledge bases with their metadata including name, path, chunk count, file count, last ingestion timestamp, and document types.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      knowledgebases: {
        type: 'array',
        description: 'Array of all indexed knowledge bases',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Unique name of the knowledge base',
            },
            path: {
              type: 'string',
              description: 'File system path to the knowledge base directory',
            },
            chunkCount: {
              type: 'number',
              description: 'Total number of document chunks indexed',
              minimum: 0,
            },
            fileCount: {
              type: 'number',
              description: 'Total number of files processed',
              minimum: 0,
            },
            lastIngestion: {
              type: 'string',
              description: 'ISO 8601 timestamp of the last ingestion',
              format: 'date-time',
            },
          },
          required: ['name', 'path', 'chunkCount', 'fileCount', 'lastIngestion'],
          additionalProperties: false,
        },
      },
    },
    required: ['knowledgebases'],
    additionalProperties: false,
  },
} as const;

/**
 * Schema for search_knowledgebases tool
 * 
 * Performs semantic search across indexed knowledge bases.
 * Accepts a query string and optional filters for knowledge base name, document type, and max results.
 */
export const SEARCH_KNOWLEDGEBASES_SCHEMA = {
  name: 'search_knowledgebases',
  description: 'Search indexed knowledge bases using semantic search. Returns document chunks ranked by similarity to the query. Supports optional filters for knowledge base name, document type, and maximum number of results.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query describing the content you want to find (e.g., "project requirements", "meeting notes about Q4")',
        minLength: 1,
      },
      knowledgebaseName: {
        type: 'string',
        description: 'Optional filter to search only within a specific knowledge base',
      },
      documentType: {
        type: 'string',
        description: 'Optional filter to search only for documents of a specific type',
        enum: ['pdf', 'docx', 'pptx', 'xlsx', 'html', 'markdown', 'text', 'audio'],
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return (default: 50)',
        minimum: 1,
        maximum: 200,
        default: 50,
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        description: 'Array of search results ranked by similarity score',
        items: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Relative path to the file containing this document chunk',
            },
            startLine: {
              type: 'number',
              description: 'Starting line number of the chunk (1-indexed)',
              minimum: 1,
            },
            endLine: {
              type: 'number',
              description: 'Ending line number of the chunk (1-indexed)',
              minimum: 1,
            },
            documentType: {
              type: 'string',
              description: 'Document type of the chunk',
              enum: ['pdf', 'docx', 'pptx', 'xlsx', 'html', 'markdown', 'text', 'audio'],
            },
            chunkType: {
              type: 'string',
              description: 'Type of document chunk (paragraph, section, table, heading, list, code)',
            },
            content: {
              type: 'string',
              description: 'The actual content of the chunk',
            },
            similarityScore: {
              type: 'number',
              description: 'Similarity score between 0 and 1 (higher is more similar)',
              minimum: 0,
              maximum: 1,
            },
            knowledgebaseName: {
              type: 'string',
              description: 'Name of the knowledge base containing this chunk',
            },
          },
          required: [
            'filePath',
            'startLine',
            'endLine',
            'documentType',
            'chunkType',
            'content',
            'similarityScore',
            'knowledgebaseName',
          ],
          additionalProperties: false,
        },
      },
      totalResults: {
        type: 'number',
        description: 'Total number of results found (may be greater than results returned)',
        minimum: 0,
      },
      queryTime: {
        type: 'number',
        description: 'Time taken to execute the query in milliseconds',
        minimum: 0,
      },
    },
    required: ['results', 'totalResults', 'queryTime'],
    additionalProperties: false,
  },
} as const;

/**
 * Schema for get_knowledgebase_stats tool
 * 
 * Retrieves detailed statistics for a specific knowledge base.
 * Requires the knowledge base name as input.
 */
export const GET_KNOWLEDGEBASE_STATS_SCHEMA = {
  name: 'get_knowledgebase_stats',
  description: 'Get detailed statistics for a specific knowledge base including chunk count, file count, document type distribution, chunk type distribution, and storage size.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the knowledge base to retrieve statistics for',
        minLength: 1,
      },
    },
    required: ['name'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the knowledge base',
      },
      path: {
        type: 'string',
        description: 'File system path to the knowledge base directory',
      },
      chunkCount: {
        type: 'number',
        description: 'Total number of document chunks indexed',
        minimum: 0,
      },
      fileCount: {
        type: 'number',
        description: 'Total number of files processed',
        minimum: 0,
      },
      lastIngestion: {
        type: 'string',
        description: 'ISO 8601 timestamp of the last ingestion',
        format: 'date-time',
      },
      documentTypes: {
        type: 'array',
        description: 'Document type distribution statistics',
        items: {
          type: 'object',
          properties: {
            documentType: {
              type: 'string',
              description: 'Document type name',
            },
            fileCount: {
              type: 'number',
              description: 'Number of files of this type',
              minimum: 0,
            },
            chunkCount: {
              type: 'number',
              description: 'Number of chunks of this type',
              minimum: 0,
            },
          },
          required: ['documentType', 'fileCount', 'chunkCount'],
          additionalProperties: false,
        },
      },
      chunkTypes: {
        type: 'array',
        description: 'Chunk type distribution statistics',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Type of document chunk',
            },
            count: {
              type: 'number',
              description: 'Number of chunks of this type',
              minimum: 0,
            },
          },
          required: ['type', 'count'],
          additionalProperties: false,
        },
      },
      sizeBytes: {
        type: 'number',
        description: 'Total size of all document chunks in bytes',
        minimum: 0,
      },
    },
    required: ['name', 'path', 'chunkCount', 'fileCount', 'lastIngestion', 'documentTypes', 'chunkTypes', 'sizeBytes'],
    additionalProperties: false,
  },
} as const;

/**
 * Schema for open_knowledgebase_manager tool
 * 
 * Opens the web-based knowledge base manager UI in the default browser.
 * No input parameters required.
 */
export const OPEN_KNOWLEDGEBASE_MANAGER_SCHEMA = {
  name: 'open_knowledgebase_manager',
  description: 'Open the web-based knowledge base manager UI in the default browser. The manager provides a visual interface for viewing knowledge base statistics, renaming knowledge bases, and deleting knowledge bases.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL of the manager UI (e.g., "http://localhost:8009")',
        format: 'uri',
      },
      message: {
        type: 'string',
        description: 'Status message about the operation',
      },
    },
    required: ['url', 'message'],
    additionalProperties: false,
  },
} as const;

/**
 * All tool schemas exported as an array for easy registration
 */
export const ALL_TOOL_SCHEMAS = [
  LIST_KNOWLEDGEBASES_SCHEMA,
  SEARCH_KNOWLEDGEBASES_SCHEMA,
  GET_KNOWLEDGEBASE_STATS_SCHEMA,
  OPEN_KNOWLEDGEBASE_MANAGER_SCHEMA,
] as const;

/**
 * Type definitions for tool inputs and outputs
 */

export interface ListKnowledgebasesInput {
  // No parameters
}

export interface ListKnowledgebasesOutput {
  knowledgebases: Array<{
    name: string;
    path: string;
    chunkCount: number;
    fileCount: number;
    lastIngestion: string;
  }>;
}

export interface SearchKnowledgebasesInput {
  query: string;
  knowledgebaseName?: string;
  documentType?: 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'html' | 'markdown' | 'text' | 'audio';
  maxResults?: number;
}

export interface SearchKnowledgebasesOutput {
  results: Array<{
    filePath: string;
    startLine: number;
    endLine: number;
    documentType: string;
    chunkType: string;
    content: string;
    similarityScore: number;
    knowledgebaseName: string;
  }>;
  totalResults: number;
  queryTime: number;
}

export interface GetKnowledgebaseStatsInput {
  name: string;
}

export interface GetKnowledgebaseStatsOutput {
  name: string;
  path: string;
  chunkCount: number;
  fileCount: number;
  lastIngestion: string;
  documentTypes: Array<{
    documentType: string;
    fileCount: number;
    chunkCount: number;
  }>;
  chunkTypes: Array<{
    type: string;
    count: number;
  }>;
  sizeBytes: number;
}

export interface OpenKnowledgebaseManagerInput {
  // No parameters
}

export interface OpenKnowledgebaseManagerOutput {
  url: string;
  message: string;
}
