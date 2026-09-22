const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const noteRoutes = require('./routes/notes');

const app = express();

app.disable('x-powered-by');

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

module.exports = app;
