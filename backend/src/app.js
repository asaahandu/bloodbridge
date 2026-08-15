import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { apiRouter } from './routes/index.js';
import { AppError } from './utils/app-error.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientOrigins.length === 0 || env.clientOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new AppError('Origin is not allowed by CORS', 403));
    },
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/', (_request, response) => {
  response.json({ message: 'BloodBridge API', version: 'v1' });
});
app.use('/api/v1', apiRouter);

app.use(notFound);
app.use(errorHandler);
