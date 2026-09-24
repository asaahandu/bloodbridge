# BloodBridge backend

Standalone Node.js REST API for donors, hospitals, and blood requests.

## Structure

```text
src/
├── config/       Environment and MongoDB configuration
├── controllers/  HTTP request and response handling
├── middleware/   Error and 404 middleware
├── models/       Mongoose schemas
├── routes/       Versioned Express routes
├── services/     Business and database logic
├── utils/        Shared backend utilities
├── app.js        Express application configuration
└── server.js     Database connection and HTTP server startup
```

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Add your MongoDB Atlas URI to `.env` and keep `MONGODB_DB=BloodBridge`.
4. Start development mode with `npm run dev`.
5. Check `http://localhost:4000/`.

From the project root, you can also run `npm run backend:dev`.

## Initial endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/users` | Create a donor or hospital account |
| `POST` | `/api/v1/users/login` | Verify credentials and return the user's account role |
| `DELETE` | `/api/v1/users/me/session` | Revoke only the current Bearer-token session |
| `POST` | `/api/v1/users/donor-match-preview` | Estimate compatible donors near a facility |
| `PATCH` | `/api/v1/users/:userId/location` | Save the user's latest authorized location |
| `GET` | `/api/v1/blood-requests` | List active hospital requests |
| `POST` | `/api/v1/blood-requests` | Create a hospital request using a hospital Bearer token |
| `POST` | `/api/v1/blood-requests/draft` | Turn a plain-language description into a reviewable request draft |
| `GET` | `/api/v1/blood-requests/mine` | List the authenticated hospital's requests |
| `GET` | `/api/v1/blood-requests/mine/:requestId` | Get one request owned by the hospital |
| `GET` | `/api/v1/blood-requests/mine/:requestId/donor-responses/:donorId` | Get a responding donor's profile and AI screening summary |
| `POST` | `/api/v1/ai/chat/eligibility/:requestId/start` | Start or resume an accepted donor request's eligibility screening |
| `POST` | `/api/v1/ai/chat/eligibility/:requestId/messages` | Submit one answer to the eligibility screening |

Never expose `MONGODB_URI` to the Expo application. Only `EXPO_PUBLIC_API_URL` belongs in the app's environment file.

## AI request drafting

AI drafting is optional and runs only in the backend. Add `OPENAI_API_KEY` to `backend/.env` to
enable it. `OPENAI_REQUEST_DRAFT_MODEL` defaults to `gpt-5.4-mini`. Never put the OpenAI key in
`mobile/.env` or an `EXPO_PUBLIC_` variable.

The AI endpoint requires an authenticated hospital account. It extracts a structured draft from a
plain-language operational description, returns missing-field warnings, and does not publish the
request. Hospital staff must review the normal form and press **Submit request** themselves. Do not
include patient names, phone numbers, email addresses, or medical record numbers in the description.

## AI donor eligibility screening

After an authenticated donor accepts a request, the mobile app opens a request-specific screening
chat. The server guides the interview using the reference dialogues in
`bloodbridge_eligibility_training.jsonl`. It asks about the required health and recent-activity
topics one question at a time, but it never makes a final eligibility decision.

The donor must have an accepted `DonorRequestActivity` record for the request. The transcript,
covered topics, final answer summary, and clinical-review flags are saved in the MongoDB collection
named exactly `AIresult`. OpenAI response storage is disabled; qualified clinical staff still make
the final decision during the in-person assessment. This feature uses `OPENAI_API_KEY` and
`OPENAI_CHAT_MODEL`, and the API key remains backend-only.

The backend passes `MONGODB_DB` to Mongoose as `dbName`, so `BloodBridge` overrides any database name in the connection URI. MongoDB creates the database when the application first stores data in it.

Passwords are stored as salted scrypt hashes. Registration returns a private location tracking
token. The app stores that token securely and sends it as `Authorization: Bearer <token>` for each
location update. The database keeps the latest GeoJSON point using coordinate order
`[longitude, latitude]`.

Login tokens are stored as independent, hashed sessions with no automatic expiry. Signing in on a
second device does not revoke an existing device, and signing out revokes only the token used by
that device. Legacy single-token sessions remain valid until they are explicitly signed out.

The Expo client requests foreground access first. It watches for meaningful movement while open
and can request background access to continue updates after roughly one kilometre of movement.
Background tracking requires a development or production build; Expo Go supports the foreground
part of this flow only.
