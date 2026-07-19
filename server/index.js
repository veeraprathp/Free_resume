/**
 * Server Entry Point
 * Starts the Express server on the specified port
 */

const { spawn } = require('child_process');
const path = require('path');
const app = require('./app');
const browserPool = require('./browserPool');

const PORT = process.env.PORT || 3000;

// ---- Portkey AI Gateway (translates OpenAI format to 1,600+ models; BYOK keys pass through, never stored) ----
let gatewayProcess = null;

function startGateway() {
  const gatewayEntry = path.join(__dirname, '..', 'node_modules', '@portkey-ai', 'gateway', 'build', 'start-server.js');
  gatewayProcess = spawn(process.execPath, [gatewayEntry], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });
  gatewayProcess.stdout.on('data', d => {
    const line = d.toString().trim();
    if (line.includes('running') || line.includes('Ready')) console.log('[Gateway]', line.replace(/\x1b\[[0-9;]*m/g, ''));
  });
  gatewayProcess.stderr.on('data', d => console.error('[Gateway:err]', d.toString().trim()));
  gatewayProcess.on('exit', (code, signal) => {
    console.error(`[Gateway] exited (code=${code}, signal=${signal})${shuttingDown ? '' : ' — restarting in 3s'}`);
    if (!shuttingDown) setTimeout(startGateway, 3000);
  });
}

let shuttingDown = false;
startGateway();

// Handle unhandled rejections (async errors not caught by try/catch)
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
  // Log and continue — don't crash the entire process
  // In production, send to error tracking service (Sentry, etc.)
});

// Handle uncaught exceptions (sync errors not caught by try/catch)
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  // Gracefully shut down — process state is compromised
  server.close(() => {
    console.log('Server closed due to uncaught exception');
    process.exit(1);
  });
  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('Forced exit after timeout');
    process.exit(1);
  }, 10000).unref();
});

const server = app.listen(PORT, () => {
  console.log(`
╔═════════════════════════════════════════════════════════╗
║  ApplyJob - Resume & Cover Letter Generation API       ║
║  Server running on http://localhost:${PORT}                  ║
╚═════════════════════════════════════════════════════════╝

Available endpoints:
  POST /api/generate   - Generate with AI tailoring
  POST /api/preview    - Quick preview without AI
  POST /api/pdf        - Export HTML to PDF
  GET  /health         - Health check

Environment:
  NODE_ENV: ${process.env.NODE_ENV || 'development'}
  PORT: ${PORT}
  `);
});

// Graceful shutdown
async function shutdown(signal) {
  console.log(`${signal} signal received: closing HTTP server`);
  shuttingDown = true;
  if (gatewayProcess) {
    try { gatewayProcess.kill(); console.log('AI gateway stopped'); } catch (e) { /* already dead */ }
  }
  server.close(async () => {
    console.log('HTTP server closed');
    try {
      await browserPool.drain();
      await browserPool.clear();
      console.log('Browser pool drained and cleared');
    } catch (err) {
      console.error('Error draining browser pool:', err.message);
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
