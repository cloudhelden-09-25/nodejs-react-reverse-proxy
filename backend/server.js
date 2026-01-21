import express from 'express';
import cors from 'cors';
import os from 'os';
import pg from 'pg';

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
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization failed:', err.message);
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Root API route
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from Backend API!' });
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

  res.json({
    status: 'healthy',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Server info endpoint
app.get('/api/info', (req, res) => {
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
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Echo endpoint for testing POST requests
app.post('/api/echo', (req, res) => {
  res.json({
    received: req.body,
    timestamp: new Date().toISOString(),
    serverHostname: os.hostname()
  });
});

app.get('/api/test', (req, res) => {
  res.send('Test was successful!');
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  await initDb();
});
