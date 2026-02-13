#!/usr/bin/env node

import { execSync } from 'node:child_process';

const port = 8009;

console.log('Testing shutdown logic...\n');

// Test 1: Try fetch
console.log('Test 1: Trying fetch to /api/shutdown...');
try {
  const response = await fetch(`http://localhost:${port}/api/shutdown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  console.log('  Response status:', response.status);
  console.log('  Response ok:', response.ok);
} catch (error) {
  console.log('  Fetch failed:', error.message);
  
  // Test 2: Try lsof
  console.log('\nTest 2: Trying lsof...');
  try {
    const lsofOutput = execSync(`lsof -ti :${port}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    console.log('  lsof output:', lsofOutput);
    
    if (lsofOutput) {
      const pids = lsofOutput.split('\n').filter(pid => pid);
      console.log('  PIDs found:', pids);
      
      for (const pid of pids) {
        console.log(`  Killing PID ${pid}...`);
        try {
          execSync(`kill ${pid}`, { stdio: ['pipe', 'pipe', 'pipe'] });
          console.log(`  ✓ Killed ${pid}`);
        } catch (killError) {
          console.log(`  ✗ Failed to kill ${pid}:`, killError.message);
        }
      }
    } else {
      console.log('  No processes found on port');
    }
  } catch (lsofError) {
    console.log('  lsof failed:', lsofError.message);
  }
}

console.log('\nDone');
