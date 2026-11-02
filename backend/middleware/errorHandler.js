exports.notFound = (req, res) => res.status(404).json({ message: 'Route not found.' });
exports.errorHandler = (err, req, res, next) => { // eslint-disable-line
  console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong on the server.' });
};
// Wrap async controllers so thrown errors reach errorHandler
exports.wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
