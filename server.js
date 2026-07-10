const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// SQLite Database Setup
const db = new sqlite3.Database('./bidnews.db', (err) => {
  if (err) console.error('Database error:', err);
  else console.log('Connected to SQLite database');
});

// Create users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    isInternal INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create sales data table
db.run(`
  CREATE TABLE IF NOT EXISTS sales_data (
    id INTEGER PRIMARY KEY,
    month TEXT,
    salesTarget REAL,
    salesAchieved REAL,
    customersTarget INTEGER,
    customersAchieved INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ========== AUTH ENDPOINTS ==========

// Register
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const isInternal = email.endsWith('@bidfood.com') ? 1 : 0;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (email, password, name, isInternal) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name || 'User', isInternal],
      function(err) {
        if (err) {
          return res.status(400).json({ error: 'User already exists' });
        }
        res.status(201).json({
          message: 'User created',
          isInternal: isInternal === 1
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/v1/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    db.get(
      'SELECT * FROM users WHERE email = ?',
      [email],
      async (err, user) => {
        if (err || !user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, isInternal: user.isInternal === 1 },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '30d' }
        );

        res.json({
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isInternal: user.isInternal === 1
          }
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== NEWS ENDPOINTS ==========

// Fetch news from multiple APIs
app.get('/api/v1/news', async (req, res) => {
  try {
    const newsArray = [];

    // 1. NewsAPI
    if (process.env.NEWSAPI_KEY) {
      try {
        const response = await axios.get('https://newsapi.org/v2/everything', {
          params: {
            q: 'UAE F&B restaurant food industry',
            country: 'ae',
            sortBy: 'publishedAt',
            apiKey: process.env.NEWSAPI_KEY,
            pageSize: 10
          }
        });
        newsArray.push(...(response.data.articles || []).map(a => ({
          ...a,
          source: 'NewsAPI'
        })));
      } catch (err) {
        console.log('NewsAPI error:', err.message);
      }
    }

    // 2. Mediastack
    if (process.env.MEDIASTACK_KEY) {
      try {
        const response = await axios.get('http://api.mediastack.com/v1/news', {
          params: {
            keywords: 'UAE restaurant food',
            countries: 'ae',
            limit: 10,
            apikey: process.env.MEDIASTACK_KEY
          }
        });
        newsArray.push(...(response.data.data || []).map(a => ({
          title: a.title,
          description: a.description,
          url: a.url,
          urlToImage: a.image,
          publishedAt: a.published_at,
          source: 'Mediastack'
        })));
      } catch (err) {
        console.log('Mediastack error:', err.message);
      }
    }

    // 3. Currents API
    if (process.env.CURRENTS_API_KEY) {
      try {
        const response = await axios.get('https://api.currentsapi.services/v1/search', {
          params: {
            keywords: 'UAE F&B restaurant',
            language: 'en',
            apikey: process.env.CURRENTS_API_KEY,
            limit: 10
          }
        });
        newsArray.push(...(response.data.news || []).map(a => ({
          title: a.title,
          description: a.description,
          url: a.url,
          urlToImage: a.image,
          publishedAt: a.published_at,
          source: 'Currents'
        })));
      } catch (err) {
        console.log('Currents error:', err.message);
      }
    }

    // 4. TheNews API
    if (process.env.THENEWS_API_KEY) {
      try {
        const response = await axios.get('https://api.thenewsapi.com/v1/news/search', {
          params: {
            query: 'UAE restaurant food',
            limit: 10,
            api_token: process.env.THENEWS_API_KEY
          }
        });
        newsArray.push(...(response.data.data || []).map(a => ({
          title: a.title,
          description: a.description,
          url: a.url,
          urlToImage: a.image_url,
          publishedAt: a.published_at,
          source: 'TheNews'
        })));
      } catch (err) {
        console.log('TheNews error:', err.message);
      }
    }

    const uniqueNews = Array.from(
      new Map(newsArray.map(item => [item.url, item])).values()
    ).slice(0, 20);

    res.json({ articles: uniqueNews, totalResults: uniqueNews.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== SALES DATA ENDPOINTS ==========

app.get('/api/v1/sales', (req, res) => {
  db.all('SELECT * FROM sales_data ORDER BY month DESC LIMIT 1', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows[0] || {});
  });
});

app.post('/api/v1/sales', verifyToken, (req, res) => {
  try {
    const { month, salesTarget, salesAchieved, customersTarget, customersAchieved } = req.body;
    db.run(
      'INSERT INTO sales_data (month, salesTarget, salesAchieved, customersTarget, customersAchieved) VALUES (?, ?, ?, ?, ?)',
      [month, salesTarget, salesAchieved, customersTarget, customersAchieved],
      function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Sales data updated', id: this.lastID });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== RESTAURANTS ==========

app.get('/api/v1/restaurants', (req, res) => {
  const restaurants = [
    { id: 1, name: 'Gymkhana', type: 'Fine Dining', location: 'DIFC, Dubai', cuisine: 'Indian', openingDate: 'May 2026' },
    { id: 2, name: 'L\'Abysse', type: 'Fine Dining', location: 'One&Only The Palm', cuisine: 'Japanese/French', openingDate: 'May 2026' },
    { id: 3, name: 'Barrafina', type: 'Tapas Bar', location: 'DIFC, Dubai', cuisine: 'Spanish', openingDate: 'May 2026' }
  ];
  res.json(restaurants);
});

// ========== HEALTH CHECK ==========

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Bidnews Backend',
    timestamp: new Date().toISOString()
  });
});

// ========== MIDDLEWARE ==========

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Bidnews Backend running on port ${PORT}`);
});
