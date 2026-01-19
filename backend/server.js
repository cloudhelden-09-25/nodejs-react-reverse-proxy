import express from 'express';
import cors from 'cors';
import os from 'os';

const app = express();
const PORT = process.env.PORT || 3000;
const startTime = Date.now();

// Middleware
app.use(cors());
app.use(express.json());

// Root API route
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from Backend API!' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});