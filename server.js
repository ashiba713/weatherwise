// server.js — Weather Forecast App Entry Point
// Ashiba Alben A — AI & Data Science Engineer

require('dotenv').config();

const express   = require('express');
const path      = require('path');
const helmet    = require('helmet');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');

const weatherRoutes = require('./routes/weatherRoutes');

const app  = express();
const PORT = process.env.PORT || 4000;

// ---- SECURITY ----
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:", "https://openweathermap.org", "https:"]
    }
  }
}));

app.use(cors());
app.use(express.json());

// ---- RATE LIMITING ----
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests. Try again later.' }
}));

// ---- STATIC FILES ----
app.use(express.static(path.join(__dirname, 'public')));

// ---- API ROUTES ----
app.use('/api', weatherRoutes);

// ---- HEALTH CHECK ----
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    app: 'Weather Forecast App',
    timestamp: new Date().toISOString()
  });
});

// ---- SERVE FRONTEND ----
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- ERROR HANDLER ----
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// ---- START ----
app.listen(PORT, () => {
  console.log('================================');
  console.log('  Weather Forecast App');
  console.log(`  http://localhost:${PORT}`);
  console.log('================================');
});
