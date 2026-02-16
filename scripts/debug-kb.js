#!/usr/bin/env node
/**
 * Debug script to inspect knowledge base tables
 * Helps diagnose issues with knowledge base not found errors
 */

import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

const lancedbPath = join(homedir(), '.knowledge-base', 'lancedb');

console.log('=== Knowledge Base Debug Info ===\n');
console.log(`LanceDB Path: ${lancedbPath}`);
console.log(`Path exists: ${existsSync(lancedbPath)}\n`);

if (existsSync(lancedbPath)) {
  console.log('Tables found:');
  const files = readdirSync(lancedbPath);
  const tables = files.filter(f => f.startsWith('knowledgebase_'));
  
  if (tables.length === 0) {
    console.log('  (none)');
  } else {
    tables.forEach(table => {
      // Extract knowledge base name from table name
      const match = table.match(/^knowledgebase_(.+)_\d+_\d+_\d+\.lance$/);
      if (match) {
        const sanitizedName = match[1];
        const displayName = sanitizedName.replace(/_/g, '-');
        console.log(`  - ${table}`);
        console.log(`    Sanitized name: ${sanitizedName}`);
        console.log(`    Display name: ${displayName}`);
      } else {
        console.log(`  - ${table} (unexpected format)`);
      }
    });
  }
} else {
  console.log('LanceDB directory does not exist!');
  console.log('This means no knowledge bases have been created yet.');
}

console.log('\n=== Troubleshooting ===');
console.log('If you ingested via CLI but MCP server can\'t find it:');
console.log('1. Check if both are using the same data directory');
console.log('2. Verify the knowledge base name matches exactly');
console.log('3. Try listing knowledge bases via MCP to see what names are returned');
console.log('4. Check for case sensitivity issues in the name');
