const express = require('express');
const router = express.Router();

module.exports = (db) => {

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

    // Get all public blog posts
    router.get('/', (req, res) => {
        db.all('SELECT * FROM posts WHERE is_published = 1 ORDER BY created_at DESC', [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    // Get all blog posts (Admin)
    router.get('/admin', verifyToken, (req, res) => {
         db.all('SELECT * FROM posts ORDER BY created_at DESC', [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    })

    // Get single blog post
    router.get('/:id', (req, res) => {
        db.get('SELECT * FROM posts WHERE id = ?', [req.params.id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Post not found' });
            res.json(row);
        });
    });

    // Create a new post (Protected)
    router.post('/', verifyToken, (req, res) => {
        const { title, content, excerpt, image_url, is_published } = req.body;

        if(!title || !content) {
             return res.status(400).json({error: "Title and content are required."});
        }

        const stmt = db.prepare('INSERT INTO posts (title, content, excerpt, image_url, is_published) VALUES (?, ?, ?, ?, ?)');
        stmt.run([title, content, excerpt, image_url, is_published ? 1 : 0], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Post created successfully' });
        });
        stmt.finalize();
    });

    // Update post (Protected)
    router.put('/:id', verifyToken, (req, res) => {
        const { title, content, excerpt, image_url, is_published } = req.body;
        const stmt = db.prepare('UPDATE posts SET title = ?, content = ?, excerpt = ?, image_url = ?, is_published = ? WHERE id = ?');
        stmt.run([title, content, excerpt, image_url, is_published ? 1 : 0, req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Post updated successfully', changes: this.changes });
        });
        stmt.finalize();
    });

    // Delete post (Protected)
    router.delete('/:id', verifyToken, (req, res) => {
        const stmt = db.prepare('DELETE FROM posts WHERE id = ?');
        stmt.run([req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Post deleted successfully', changes: this.changes });
        });
        stmt.finalize();
    });

    return router;
};
