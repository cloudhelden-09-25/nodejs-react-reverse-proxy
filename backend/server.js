import express from 'express';
import cors from 'cors';
import os from 'os';
import pg from 'pg';
import winston from 'winston';

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'nodepulse-backend', hostname: os.hostname() },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 2
            ? ` ${JSON.stringify(meta)}`
            : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
      )
    })
  ]
});

const app = express();
const PORT = process.env.PORT || 3000;
const startTime = Date.now();

// PostgreSQL connection
const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nodepulse',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Initialize database table
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Database initialized');
  } catch (err) {
    logger.error('Database initialization failed', { error: err.message });
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });
  next();
});

// Root API route
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from Backend API!' });
  logger.info('Root API accessed');
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  logger.info('Health check performed', { database: dbStatus });
  res.json({
    status: 'healthy',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Server info endpoint
app.get('/api/info', (req, res) => {
  logger.info('Info endpoint accessed');
  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
});

// Get all messages
app.get('/api/messages', async (req, res) => {

  try {
    const result = await pool.query(
      'SELECT * FROM messages ORDER BY created_at DESC LIMIT 50'
    );
    res.json(result.rows);
  } catch (err) {
    logger.error('Failed to fetch messages', { error: err.message });
    res.status(500).json({ error: 'Database error' });
  }
});

// Create new message
app.post('/api/messages', async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) {
    return res.status(400).json({ error: 'Content required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO messages (content) VALUES ($1) RETURNING *',
      [content.trim()]
    );
    logger.info('Message created', { id: result.rows[0].id });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Failed to create message', { error: err.message });
    res.status(500).json({ error: 'Database error' });
  }
});

// Echo endpoint for testing POST requests
app.post('/api/echo', (req, res) => {
  logger.info('Echo endpoint accessed', { body: req.body });
  res.json({
    received: req.body,
    timestamp: new Date().toISOString(),
    serverHostname: os.hostname()
  });
});

app.get('/api/test', (req, res) => {
  logger.info('Test endpoint accessed');
  res.send('Test was successful!');
});

// Start server
const server = app.listen(PORT, '0.0.0.0', async () => {
  logger.info(`Server started on port ${PORT}`);
  await initDb();
});

// Graceful shutdown
async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await pool.end();
      logger.info('Database pool closed');
    } catch (err) {
      logger.error('Error closing database pool', { error: err.message });
    }

    logger.info('Shutdown complete');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
