const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = (db) => {
  // Login Route
  router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Please provide username and password' });
    }

    // In a real app, you'd fetch the user from the database.
    // For this simple local app with a single admin, we can hardcode
    // or store an initial admin in the DB. Let's assume an initial DB user.

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
             return res.status(401).json({ error: 'Invalid credentials' });
        }

        const passwordIsValid = bcrypt.compareSync(password, user.password);

        if (!passwordIsValid) {
            return res.status(401).json({ auth: false, token: null, error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'supersecret', {
            expiresIn: 86400 // 24 hours
        });

        res.status(200).json({ auth: true, token, user: { id: user.id, username: user.username } });
    });
  });

  // Verify Token Route (useful for frontend to check if logged in)
  router.get('/me', (req, res) => {
      const token = req.headers['x-access-token'] || req.headers['authorization'];
      if (!token) return res.status(401).send({ auth: false, message: 'No token provided.' });

      // Remove Bearer if present
      const tokenString = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;

      jwt.verify(tokenString, process.env.JWT_SECRET || 'supersecret', (err, decoded) => {
          if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
          
          res.status(200).send(decoded);
      });
  });

  return router;
};
