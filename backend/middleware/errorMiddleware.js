exports.errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERROR:`, err.message);

  if (err.code === 'ER_DUP_ENTRY')
    return res.status(400).json({ success: false, message: 'Duplicate entry' });

  if (err.name === 'ValidationError')
    return res.status(400).json({ success: false, message: err.message });

  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(status).json({ success: false, message });
};