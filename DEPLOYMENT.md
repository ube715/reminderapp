# Deployment Guide (Vercel Frontend + Render Backend)

This app is deployed with a static web frontend on **Vercel** and the Flask API on **Render**.

## Render: Flask API

1. **Create a new Web Service** in Render.
2. **Repository**: select this repo.
3. **Root Directory**: `/backend`.
4. **Build Command**:
   ```bash
   pip install -r requirements.txt
   ```
5. **Start Command**:
   ```bash
   python app.py
   ```
6. **Health Check Path**: `/api/health`.

### Environment Variables (Render)

Set these if you plan to use SMS reminders:

```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_MESSAGING_SERVICE_SID=your_twilio_messaging_service_sid
```

### Persistence

SQLite is stored alongside `app.py` at `backend/reminders.db`. For persistence on Render, either:
- attach a **persistent disk** and move the DB location to that mount, or
- migrate to a managed database (Postgres, MongoDB, etc.).

## Vercel: Static Web Frontend

1. **Create a new Vercel project** from this repo.
2. **Build Command**:
   ```bash
   npm run web:export
   ```
3. **Output Directory**: `dist`
4. **Environment Variables**:
   ```
   EXPO_PUBLIC_API_BASE_URL=https://<your-render-service>.onrender.com
   ```

## Verify Deployment

1. Visit the Render health check: `https://<your-render-service>.onrender.com/api/health`
2. Open your Vercel URL and log in with `demo@example.com / demo123`
3. Create, update, and delete reminders to confirm API connectivity.
