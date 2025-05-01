const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('No Authorization header provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    console.log('Invalid Authorization header format');
    return res.status(401).json({ error: 'Invalid token format' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded JWT:', decoded);
    req.user = decoded; // Attach decoded token (contains id, email, is_admin)
    next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid token', details: err.message });
  }
};

module.exports = authenticate;