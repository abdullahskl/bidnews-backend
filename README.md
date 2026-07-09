# Bidnews Backend

Express.js backend for Bidnews F&B newsletter platform.

## Quick Start

```bash
npm install
npm start
```

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` - MongoDB Atlas connection string
- `REDIS_URL` - Upstash Redis URL
- `NEWSAPI_KEY` - Your NewsAPI key
- `JWT_SECRET` - Random secret for JWT tokens

## API Endpoints

- `GET /health` - Health check
- `GET/POST /api/v1/news` - News management
- `GET/POST /api/v1/restaurants` - Restaurant management
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
