# Port Restart Feature

## Overview

Added automatic port conflict detection and resolution for the Manager UI server. When the server detects that the configured port is already in use, it will automatically attempt to shut down the existing server and restart.

## Changes Made

### 1. Manager Entry Point (`src/bin/manager.ts`)

Added three new utility functions:

- **`isPortInUse(port, host)`**: Checks if a port is currently in use
- **`shutdownExistingServer(host, port)`**: Attempts to shut down an existing server by calling its `/api/shutdown` endpoint
- **`waitForPort(port, host, maxAttempts)`**: Waits for a port to become available after shutdown

### 2. Startup Flow

The manager now follows this startup sequence:

1. Check if the configured port is in use
2. If in use:
   - Display message: "⚠ Port is already in use. Attempting to restart existing server..."
   - Call the `/api/shutdown` endpoint on the existing server
   - Wait up to 5 seconds (10 attempts × 500ms) for the port to become available
   - If successful, proceed with starting the new server
   - If unsuccessful, throw an error with instructions to manually stop the process
3. If not in use, start the server normally

### 3. Shutdown Endpoint

The `/api/shutdown` endpoint was already implemented in `src/infrastructure/fastify/fastify-server.ts`:

- Accepts POST requests to `/api/shutdown`
- Sends success response
- Gracefully shuts down the server after 500ms delay
- Exits the process with code 0

### 4. UI Integration

The "Quit Manager" button in the UI already calls the `/api/shutdown` endpoint:

- Shows confirmation dialog
- Calls `/api/shutdown` via fetch
- Closes the browser tab or displays "Manager Stopped" message

## User Experience

### Before
```
✗ Failed to start Manager UI server
Error: Failed to start server: listen EADDRINUSE: address already in use ::1:8009
```

User had to manually find and kill the process.

### After
```
⚠ Port is already in use. Attempting to restart existing server...

✓ Existing server shutdown requested

✓ Port is now available

Manager UI server is running
URL: http://localhost:8009
Press Ctrl+C to stop
```

Server automatically restarts without manual intervention.

## Error Handling

If the automatic restart fails, the user receives a clear error message:

```
Port 8009 is already in use and could not be freed.
Please manually stop the process using port 8009 or use a different port.
```

## Configuration

No configuration changes required. The feature uses the existing `server.host` and `server.port` settings from the config file.

## Testing

To test the feature:

1. Start the manager: `npm run manager`
2. Without stopping it, run `npm run manager` again in another terminal
3. The second instance should automatically shut down the first and start successfully

## Technical Details

- Uses Node.js `net` module to check port availability
- Uses `fetch` API to call shutdown endpoint
- Implements exponential backoff with 500ms intervals
- Maximum wait time: 5 seconds (configurable via `maxAttempts` parameter)
- Graceful shutdown delay: 500ms to allow response to be sent

## Benefits

1. **Developer Experience**: No need to manually find and kill processes
2. **Reliability**: Automatic recovery from port conflicts
3. **User-Friendly**: Clear messages about what's happening
4. **Safe**: Graceful shutdown ensures data integrity
5. **Fast**: Typically completes in 1-2 seconds
