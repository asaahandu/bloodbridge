import mongoose from 'mongoose';

export function getHealth(_request, response) {
  const connected = mongoose.connection.readyState === 1;

  response.status(connected ? 200 : 503).json({
    data: {
      database: connected ? 'connected' : 'disconnected',
      service: 'bloodbridge-api',
      timestamp: new Date().toISOString(),
    },
  });
}
