# BloodBridge

BloodBridge helps hospitals quickly find compatible blood donors. The repository contains two separate applications:

- `mobile/`: Expo SDK 54 mobile application.
- `backend/`: Node.js, Express, Mongoose, and MongoDB REST API.

## Start the backend

```powershell
Copy-Item backend/.env.example backend/.env
npm.cmd --prefix backend install
npm.cmd --prefix backend run dev
```

Set the real `MONGODB_URI` in `backend/.env` before starting it. Keep `MONGODB_DB=BloodBridge` so the API always uses the project database.

## Start the Expo application

```powershell
Copy-Item mobile/.env.example mobile/.env
npm.cmd --prefix mobile install
npm.cmd --prefix mobile start
```

Set `EXPO_PUBLIC_API_URL` to an address reachable from the target device. An Android emulator typically uses `http://10.0.2.2:4000/api/v1`; a physical phone should use the development computer's LAN address. Public Expo environment variables are embedded in the client, so never put database credentials in them.

See `backend/README.md` for the backend structure and API endpoints.
