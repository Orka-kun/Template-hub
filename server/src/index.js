require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const templateRoutes = require('./routes/templates');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tagRoutes = require('./routes/tags');
const formRoutes = require('./routes/forms');

const app = express();

// Rate limiting middleware (increased limit for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Increased to 5000 requests per windowMs for development
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});

// Apply rate limiting
app.use(limiter);

// CORS configuration with preflight handling
app.use(
  cors({
    origin: ['http://localhost:5173', 'https://course-project-frontend-wdt3.onrender.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Explicitly allow headers
  })
);

// Parse JSON requests
app.use(express.json());

// Routes
app.use('/api/templates', templateRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/forms', formRoutes);

// Handle unhandled routes
app.use((req, res) => {
  console.log(`Unhandled route: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
