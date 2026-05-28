const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Initializing database tables...');

db.serialize(() => {
  // Users Table (Admins)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Events Table
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    location TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    price TEXT,
    link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Blog Posts Table
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    image_url TEXT,
    is_published INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create an initial admin user if none exists
  db.get('SELECT count(*) as count FROM users', [], (err, row) => {
      if (err) return console.error(err);
      if (row.count === 0) {
          const defaultPasswordHash = bcrypt.hashSync('admin123', 8);
          db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', defaultPasswordHash], (err) => {
              if (err) console.error("Error creating default admin:", err);
              else console.log("Default admin created (admin / admin123)");
          });
      }
  });

  console.log('Database schema initialization complete.');
});

// db.close(); // Not closing immediately let it finish async inserts
