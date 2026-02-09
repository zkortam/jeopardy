# Buzzer System Setup

## Pusher Configuration

1. Sign up for a free Pusher account at https://dashboard.pusher.com/
2. Create a new app (choose "Channels" app)
3. Get your credentials:
   - App Key
   - Cluster (e.g., us2, eu, ap-southeast-1)
4. Create a `.env` file in the root directory:
   ```
   VITE_PUSHER_KEY=your-app-key-here
   VITE_PUSHER_CLUSTER=us2
   ```
5. Or update `src/config/pusher.ts` directly with your credentials

## How It Works

### Host/Admin View (Projector)
- Create teams and start game
- Room code is displayed in top-right corner
- When a question is shown, buzzer is automatically enabled
- First player to buzz is displayed on screen with their name and team
- Buzzer locks after first press

### Player View (Mobile Devices)
- Players visit: `your-url?player=true&room=ROOMCODE`
- Enter name and select team
- Large buzzer button appears
- Button is enabled when question is shown
- First to buzz locks everyone else out
- Shows "You buzzed in!" or "Someone else buzzed first!"

## Features
- Real-time buzzer synchronization via Pusher
- First-come-first-served buzzer lockout
- Works on any device with a browser
- No backend server needed (fully serverless)
- Free Pusher tier supports 100 concurrent connections

## Usage
1. Host starts game on projector
2. Share room code and player URL with participants
3. Players join and select teams
4. When question appears, players can buzz
5. Admin sees who buzzed first on projector screen
