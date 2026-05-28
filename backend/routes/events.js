const express = require('express');
const router = express.Router();

module.exports = (db) => {
  
  // Get all events (can be filtered by date/search in the future)
  router.get('/', (req, res) => {
    const searchTerm = req.query.search;
    let query = 'SELECT * FROM events ORDER BY date ASC';
    let params = [];

    if (searchTerm) {
        query = 'SELECT * FROM events WHERE title LIKE ? OR description LIKE ? ORDER BY date ASC';
        params = [`%${searchTerm}%`, `%${searchTerm}%`];
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });

  // Get single event
  router.get('/:id', (req, res) => {
      db.get('SELECT * FROM events WHERE id = ?', [req.params.id], (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          if (!row) return res.status(404).json({ error: 'Event not found' });
          res.json(row);
      })
  });

  // Middleware to verify token for protected routes
  const verifyToken = (req, res, next) => {
      const token = req.headers['x-access-token'] || req.headers['authorization'];
      if (!token) return res.status(403).send({ auth: false, message: 'No token provided.' });
      const tokenString = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
      
      const jwt = require('jsonwebtoken');
      jwt.verify(tokenString, process.env.JWT_SECRET || 'supersecret', (err, decoded) => {
          if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
          req.userId = decoded.id;
          next();
      });
  };

  // Create event (Protected)
  router.post('/', verifyToken, (req, res) => {
    const { title, date, time, location, description, image_url, price, link } = req.body;
    
    if(!title || !date || !location) {
        return res.status(400).json({error: "Title, date, and location are required."});
    }

    const stmt = db.prepare('INSERT INTO events (title, date, time, location, description, image_url, price, link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run([title, date, time, location, description, image_url, price, link], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, message: 'Event created successfully' });
    });
    stmt.finalize();
  });

  // Update event (Protected)
  router.put('/:id', verifyToken, (req, res) => {
    const { title, date, time, location, description, image_url, price, link } = req.body;
    const stmt = db.prepare('UPDATE events SET title = ?, date = ?, time = ?, location = ?, description = ?, image_url = ?, price = ?, link = ? WHERE id = ?');
    stmt.run([title, date, time, location, description, image_url, price, link, req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Event updated successfully', changes: this.changes });
    });
    stmt.finalize();
  });

  // Delete event (Protected)
  router.delete('/:id', verifyToken, (req, res) => {
      const stmt = db.prepare('DELETE FROM events WHERE id = ?');
      stmt.run([req.params.id], function(err){
          if (err) return res.status(500).json({error: err.message});
          res.json({message: 'Event deleted', changes: this.changes});
      });
      stmt.finalize();
  })

  return router;
};
