const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

// DB Connection
const dbPath = path.resolve(__dirname, 'db', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Basic endpoint
app.get('/', (req, res) => {
  res.send('LittleLocals API is running');
});

// Import Routes
const authRoutes = require('./routes/auth')(db);
const eventRoutes = require('./routes/events')(db);
const blogRoutes = require('./routes/blog')(db);

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/blog', blogRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
