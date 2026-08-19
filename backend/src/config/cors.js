const DEFAULT_CLIENT_ORIGINS = ['http://localhost:4200'];

function parseClientOrigins() {
  const configuredOrigins = process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN;

  if (!configuredOrigins) {
    return DEFAULT_CLIENT_ORIGINS;
  }

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = parseClientOrigins();

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  }
};

module.exports = {
  allowedOrigins,
  corsOptions
};
