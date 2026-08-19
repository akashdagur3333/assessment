function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error.statusCode || 500;
  let message = error.message || 'Something went wrong';
  const details = {};

  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    Object.keys(error.errors).forEach((field) => {
      details[field] = error.errors[field].message;
    });
  }

  if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    message = `${field} already exists`;
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: Object.keys(details).length ? details : undefined
  });
}

module.exports = { notFound, errorHandler };
