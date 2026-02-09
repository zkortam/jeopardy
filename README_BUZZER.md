# Buzzer System Setup

## Pusher Configuration

1. Sign up for a free Pusher account at https://dashboard.pusher.com/
2. Create a new app (choose "Channels" app)
   - In App Settings, enable **Client Events**
3. Get your credentials:
   - App Key
   - App Secret
   - Cluster (e.g., us2, eu, ap-southeast-1)
4. Create a `.env` file in the root directory:
   ```
   VITE_PUSHER_KEY=your-app-key-here
   VITE_PUSHER_CLUSTER=us2
   VITE_PUSHER_AUTH_ENDPOINT=/api/pusher/auth
   ```
5. Add serverless env vars (Vercel Project Settings → Environment Variables):
   ```
   PUSHER_KEY=your-app-key-here
   PUSHER_SECRET=your-app-secret-here
   ```
6. Or update `src/config/pusher.ts` directly with your credentials

### Local Development Note
- The auth endpoint lives at `/api/pusher/auth`. For local testing, either run `vercel dev` or set `VITE_PUSHER_AUTH_ENDPOINT` to a deployed URL.

## How It Works

### Host/Admin View (Projector)
- Create teams and start game
- Room code is displayed in top-right corner
- When a question is shown, buzzer is automatically enabled
- First player to buzz is displayed on screen with their name and team
- Buzzer locks after first press

### Player View (Mobile Devices)
- Players visit: `your-url?room=ROOMCODE` or `your-url/room/ROOMCODE`
- Enter name and select team
- Large buzzer button appears
- Button is enabled when question is shown
- First to buzz locks everyone else out
- Shows "You buzzed in!" or "Someone else buzzed first!"

## Features
- Real-time buzzer synchronization via Pusher
- First-come-first-served buzzer lockout
- Works on any device with a browser
- Uses a serverless auth endpoint for private channels (no dedicated server)
- Free Pusher tier supports 100 concurrent connections

## Usage
1. Host starts game on projector
2. Share room code and player URL with participants
3. Players join and select teams
4. When question appears, players can buzz
5. Admin sees who buzzed first on projector screen
