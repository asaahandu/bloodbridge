# BloodBridge Admin

Next.js admin console for BloodBridge operations. The overview reads donor, hospital, blood request, donor response, and delivery-status metrics from the protected backend dashboard endpoint.

## Run locally

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

`BLOODBRIDGE_API_URL` should point to the BloodBridge REST API. The default local value is `http://localhost:4000/api/v1`.

Set `ADMIN_DASHBOARD_TOKEN` to the same long, random server-only value in both `admin/.env.local` and `backend/.env`. Never prefix this token with `NEXT_PUBLIC_`; the Next.js server sends it to the API without exposing it to the browser.

The backend must be running and connected to MongoDB before the dashboard can load data.
