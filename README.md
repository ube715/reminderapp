<<<<<<< HEAD
# Reminder Assessment App
This is a clean, interview-ready cross-platform reminder app built with Expo React Native.

## Features
- **Authentication**: Login screen with demo credentials
- **Loading Screen**: Initializes app state and notifications on startup
- **Reminder Management**: Create, view, update, and delete reminders
- **Notifications**: Real-time local notifications for reminders
- **Backend Integration**: Connected to Flask REST API for persistent storage
- **Smooth Animations**: Fade, scale, and slide transitions using React Native's Animated API

## Animations & Visual Design

### Enhanced Colorful Login Screen
The login screen now features a vibrant, modern design with 3D-like animations and floating visual elements:

**Color Scheme:**
- Dark background: `#0F172A` (deep navy blue)
- Primary accent: `#EC4899` (bright pink)
- Secondary accent: `#8B5CF6` (purple)
- Tertiary accent: `#06B6D4` (cyan)
- Text colors: White (`#FFFFFF`), light purple (`#A78BFA`)

**Animated Elements:**
- **Floating Orbs** (3 animated circular elements):
  - Orb 1: Pink (`#EC4899`) - floats up/down with continuous rotation
  - Orb 2: Purple (`#8B5CF6`) - floats up/down with reverse rotation
  - Orb 3: Cyan (`#06B6D4`) - floats up/down smoothly
  - All orbs have glowing shadow effects for depth

- **Header Section**:
  - Icon: Scales from 0.8 to 1 with 3D rotation effect (0° from -15° rotation)
  - Title: Glowing text shadow (purple glow)
  - Semi-transparent backdrop with purple border
  # reminderapp
  Medical reminder using React Native and Python (Flask).

  This is a clean, interview-ready cross-platform reminder app built with Expo React Native.

  ## Features
  - **Authentication**: Login screen with demo credentials
  - **Loading Screen**: Initializes app state and notifications on startup
  - **Reminder Management**: Create, view, update, and delete reminders
  - **Notifications**: Real-time local notifications for reminders
  - **Backend Integration**: Connected to Flask REST API for persistent storage
  - **Smooth Animations**: Fade, scale, and slide transitions using React Native's Animated API

  ## Animations & Visual Design

  ### Enhanced Colorful Login Screen
  The login screen now features a vibrant, modern design with 3D-like animations and floating visual elements:

  **Color Scheme:**
  - Dark background: `#0F172A` (deep navy blue)
  - Primary accent: `#EC4899` (bright pink)
  - Secondary accent: `#8B5CF6` (purple)
  - Tertiary accent: `#06B6D4` (cyan)
  - Text colors: White (`#FFFFFF`), light purple (`#A78BFA`)

  **Animated Elements:**
  - **Floating Orbs** (3 animated circular elements):
    - Orb 1: Pink (`#EC4899`) - floats up/down with continuous rotation
    - Orb 2: Purple (`#8B5CF6`) - floats up/down with reverse rotation
    - Orb 3: Cyan (`#06B6D4`) - floats up/down smoothly
    - All orbs have glowing shadow effects for depth

  - **Header Section**:
    - Icon: Scales from 0.8 to 1 with 3D rotation effect (0° from -15° rotation)
    - Title: Glowing text shadow (purple glow)
    - Semi-transparent backdrop with purple border
    - Fade in + scale up animation (700ms)

  - **Form Section**:
    - Input fields with purple glow on focus
    - Gradient-style button (pink-to-purple)
    - Cyan accent for demo button
    - Staggered animations with slide-up effect (200ms delay, 700ms duration)

  - **Interactive Effects**:
    - Glowing shadows on buttons (pink and cyan colors)
    - Elevated button styles with shadow depth
    - Transparent dark overlays with colored borders
    - Text transforms and letter spacing for modern look

  ### Other Screen Animations

  - **Loading Screen**:
    - Rotating spinner with fade-in effect
    - Continuous 360° rotation animation

  - **Create Reminder Screen**:
    - Input section: Fade in + slide up (500ms)
    - Reminder list: Fade in (staggered at 300ms delay)
    - Offline banner: Smooth slide down when offline

  - **Reminder Details Screen**:
    - Card: Fade in + scale up (500ms)
    - Content: Slide up with delay (200ms)

  All animations use React Native's native Animated API for optimal 60fps performance across iOS, Android, and Web.

  ## Implemented Requirements
  - Page 1 has:
    - Reminder input field
    - `Set Reminder` button
  - On `Set Reminder`:
    - Immediate real local notification appears with message: `Reminder Set`
    - Another real local notification is scheduled after 30 seconds with message: `You have a reminder. Click to view it.`
  - Notification tap behavior:
    - Opens app from killed/closed state
    - Navigates directly to Page 2
    - Page 2 shows the same reminder message entered on Page 1

  ## Technical Design
  - **Authentication**: Demo login endpoint with email/password validation
  - **Animations**: Advanced keyframe-style animations with floating 3D-like orbs
  - **Visual Effects**: Glowing shadows, gradient-style buttons, colored accents
  - **Local notifications**: `expo-notifications`
  - **Navigation**: React Navigation (native stack) with conditional auth flow
  - **Cold-start deep-link-like behavior** from notification tap:
    - `Notifications.getLastNotificationResponseAsync()`
  - **Background/terminated app notification support**:
    - Notification is scheduled at set time and handled by OS
  - **API**: Flask backend with SQLite persistence and CORS support

  ## Files to Review
  - `App.js` — Main app entry with auth state and navigation
  - `src/screens/LoginScreen.js` — Login form with demo credentials
  - `src/screens/LoadingScreen.js` — Loading spinner during app initialization
  - `src/screens/CreateReminderScreen.js` — Reminder creation and list
  - `src/screens/ReminderDetailsScreen.js` — Reminder detail view
  - `src/services/apiService.js` — API client with login endpoint
  - `src/services/notificationService.js` — Notification configuration
  - `backend/app.py` — Flask API with auth and reminder endpoints

  ## Demo Credentials
  ```
  Email: demo@example.com
  Password: demo123
  ```

  ## Setup
  ```bash
  npm install
  ```

  ## Backend
  Start the Flask API before launching the app:

  ```bash
  cd backend
  pip install -r requirements.txt
  python app.py
  ```
  The backend will:
  - Initialize SQLite database (`reminders.db`)
  - Start on `http://localhost:5000`
  - Accept logins at `/api/auth/login`
  - Manage reminders at `/api/reminders`

  If you are running the app against a different host, set `EXPO_PUBLIC_API_BASE_URL` to that backend URL before starting Expo.

  ## Run
  ```bash
  npm run start
  ```

  From Expo terminal:
  - press `a` for Android
  - press `i` for iOS
  - press `w` for web

  Or:
  ```bash
  npm run android
  npm run ios
  npm run web
  ```

  The app will show:
  1. **Loading Screen** — Initializes notifications and checks auth state
  2. **Login Screen** — Enter credentials or use demo login
  3. **Reminder Screens** — Create and manage reminders after successful login

  ## Build Android APK
  ```bash
  npm install -g eas-cli
  eas login
  npm run build:android:apk
  ```

  ## Build iOS
  ```bash
  npm run build:ios
  ```

  ## Build macOS DMG (Optional)
  This project includes an Electron wrapper around the exported web build to create a `.dmg`.

  ```bash
  npm run desktop:build
  ```

  Output:
  - `desktop-release/`

  ## Submission Checklist
  - Source code: zip this project or upload to GitHub
  - Android APK: from EAS preview build
  - iOS build: from EAS build output/TestFlight path
  - Screen recording showing:
    - reminder creation
    - immediate notification
    - app kill/remove from recents
    - 30-second notification when app is closed
    - notification tap opening details page with same message
