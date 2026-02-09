# Buzzer System Setup

## Firebase Realtime Database Configuration

1. Create or open the Firebase project: `esagbm`
2. Enable **Realtime Database**
3. Update your Realtime Database Rules (no auth flow is used right now):
   ```
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
   Note: This is open access. If you need lock‑down, add Firebase Auth and restrict rules by user/room.
4. The client config is stored in `src/config/firebase.ts`

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
- Real-time buzzer synchronization via Firebase Realtime Database
- First-come-first-served buzzer lockout
- Works on any device with a browser
- No backend server required

## Usage
1. Host opens `/admin` on the projector and starts the game
2. Share the room code and player URL with participants
3. Players join and select teams
4. When question appears, players can buzz
5. Admin sees who buzzed first on projector screen
