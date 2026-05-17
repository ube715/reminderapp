# Vercel Deployment Guide

## Quick Deploy

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
vercel --prod
```

## Environment Variables

Set these in Vercel Dashboard (Settings → Environment Variables):

```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_MESSAGING_SERVICE_SID=your_twilio_messaging_service_sid
```

## Testing After Deployment

1. Open your Vercel URL
2. Log in with: **demo@example.com / demo123**
3. Water reminders will send SMS via Twilio

## API Endpoints

All API routes are available at:
- `https://your-vercel-domain.vercel.app/api/...`

Examples:
- `POST /api/auth/login` - Login
- `POST /api/reminders` - Create reminder
- `GET /api/reminders` - List reminders
- `POST /api/wellness/water-reminder` - Send water reminder SMS

## Frontend

The React Native web app is exported to `/dist` and served as static files.

## Database

Uses SQLite at `/tmp/reminders.db` (ephemeral storage, data resets between deployments).

For persistent storage, consider upgrading to:
- Vercel PostgreSQL
- MongoDB Atlas
- Firebase Realtime Database
