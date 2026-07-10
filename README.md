# Bidnews Backend

Express.js backend for Bidnews newsletter platform with SQLite database.

## Setup

```bash
npm install
cp .env.example .env
npm start
```

## API Endpoints

- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/news` - Get news
- `GET /api/v1/sales` - Get sales data
- `POST /api/v1/sales` - Update sales (protected)
- `GET /health` - Health check
