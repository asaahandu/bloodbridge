import { Router } from 'express';

import { bloodRequestRouter } from './blood-request.routes.js';
import { donorRouter } from './donor.routes.js';
import { healthRouter } from './health.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/donors', donorRouter);
apiRouter.use('/blood-requests', bloodRequestRouter);
