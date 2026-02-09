# Firebase Realtime Database rules

The app needs read/write access under `rooms/{roomCode}`. If you see **PERMISSION_DENIED** when creating a room or joining, set your Realtime Database rules as follows.

## Option 1: Firebase Console (quick)

1. Open [Firebase Console](https://console.firebase.google.com/) and select project **esagbm**.
2. Go to **Build → Realtime Database → Rules**.
3. Replace the rules with:

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

4. Click **Publish**.

## Option 2: Deploy with Firebase CLI

If you use Firebase CLI and have the project linked:

```bash
firebase deploy --only database
```

The repo includes `database.rules.json` with the rules above.

---

**Note:** These rules allow anyone to read/write any room. That is acceptable when access is effectively guarded by the 4–8 character room code. For stricter security you would add Firebase Auth and restrict by `auth != null` or similar.
