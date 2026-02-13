# LanceDB Cleanup Fix

## Problem
The ingestion CLI was crashing on exit with:
```
libc++abi: terminating due to uncaught exception of type std::__1::system_error: 
mutex lock failed: Invalid argument
Abort trap: 6
```

## Root Cause
LanceDB's native code cleanup was still running when Node.js forcefully exited via `process.exit()`. This caused a mutex lock error in the C++ layer.

## Solution
Removed forced `process.exit()` calls and let Node.js exit naturally after all async operations complete.

### Changes Made (`src/bin/ingest.ts`)

**Before:**
```typescript
// Give LanceDB time to cleanup before exit
await new Promise(resolve => setTimeout(resolve, 100));
process.exit(0);
```

**After:**
```typescript
// Let Node.js exit naturally instead of forcing exit
// This allows LanceDB to cleanup properly
```

## Results
✅ Clean exit without crashes
✅ Data successfully stored
✅ Exit code 0
✅ No mutex errors

## Testing
```bash
node dist/bin/ingest.js --name test-natural-exit --path test-simple.md
```

Output: Clean exit, 4 chunks created, no errors.
