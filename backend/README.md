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
5. Check `http://localhost:4000/api/v1/health`.

From the project root, you can also run `npm run backend:dev`.

## Initial endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | API and MongoDB health |
| `GET` | `/api/v1/donors` | List and filter donors |
| `POST` | `/api/v1/donors` | Register a donor |
| `GET` | `/api/v1/donors/:donorId` | Retrieve a donor |
| `PATCH` | `/api/v1/donors/:donorId/availability` | Change donor availability |
| `GET` | `/api/v1/blood-requests` | List active hospital requests |
| `POST` | `/api/v1/blood-requests` | Create a hospital request |

Never expose `MONGODB_URI` to the Expo application. Only `EXPO_PUBLIC_API_URL` belongs in the app's environment file.

The backend passes `MONGODB_DB` to Mongoose as `dbName`, so `BloodBridge` overrides any database name in the connection URI. MongoDB creates the database when the application first stores data in it.
