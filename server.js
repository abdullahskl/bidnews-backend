require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Bidnews Backend', timestamp: new Date() });
});

// News endpoints
app.get('/api/v1/news', (req, res) => {
  res.json({ 
    data: [
      { id: 1, title: 'Welcome to Bidnews', description: 'Your backend is running!', category: 'INDUSTRY' }
    ],
    total: 1 
  });
});

app.post('/api/v1/news', (req, res) => {
  res.json({ message: 'News creation endpoint', ...req.body });
});

// Restaurants endpoints
app.get('/api/v1/restaurants', (req, res) => {
  res.json({ data: [], total: 0 });
});

app.post('/api/v1/restaurants', (req, res) => {
  res.json({ message: 'Restaurant created', ...req.body });
});

// Auth endpoints
app.post('/api/v1/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  res.json({ 
    message: 'Registration successful',
    user: { email, name, isInternal: email?.endsWith('@bidfood.com'), role: 'USER' }
  });
});

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  res.json({ 
    token: 'sample-jwt-token-' + Date.now(),
    user: { email, isInternal: email?.endsWith('@bidfood.com') }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
