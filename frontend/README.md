# BloodBridge frontend

Expo application for donors and hospitals.

## Setup

1. Install dependencies with `npm install`.
2. Start the backend by following the setup instructions in `../backend/README.md`.
3. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to the backend URL:
   - Use `http://localhost:4000/api/v1` when the app runs on the same host as the backend.
   - For Expo Go on a physical phone, use the computer's LAN IP, for example
     `http://192.168.1.10:4000/api/v1`. Keep the phone and computer on the same network.
4. Start Expo with `npx expo start`.

The client defaults to the Expo development host on backend port `4000` when
`EXPO_PUBLIC_API_URL` is not set. After changing `.env`, restart Expo so the new
public environment variable is included in the app.
