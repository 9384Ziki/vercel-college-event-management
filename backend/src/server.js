const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));

app.use(express.json());

const PORT = process.env.PORT || 5000;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'college_events',

  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('WARNING: JWT_SECRET is not configured.');
}

// --------------------------------------------------
// DATABASE CONNECTION
// --------------------------------------------------

async function waitForDatabase() {
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      const connection = await pool.getConnection();
      console.log('MySQL database connected!');
      connection.release();
      return;
    } catch (error) {
      console.log(
        `Waiting for MySQL... attempt ${attempt}/30`
      );

      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.error('Could not connect to MySQL.');
  process.exit(1);
}

// --------------------------------------------------
// AUTH MIDDLEWARE
// --------------------------------------------------

function auth(requiredRole = null) {
  return (req, res, next) => {
    try {
      if (!JWT_SECRET) {
        return res.status(500).json({
          message: 'JWT_SECRET is not configured'
        });
      }

      const header = req.headers.authorization;

      if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({
          message: 'Authentication required'
        });
      }

      const token = header.split(' ')[1];

      const decoded = jwt.verify(token, JWT_SECRET);

      req.user = decoded;

      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({
          message: 'Admin access required'
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        message: 'Invalid or expired token'
      });
    }
  };
}

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: error.message
    });
  }
});

// --------------------------------------------------
// REGISTER USER
// --------------------------------------------------

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must contain at least 6 characters'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: 'Email already registered'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users
       (name, email, password_hash, role)
       VALUES (?, ?, ?, 'student')`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: result.insertId,
        name: name.trim(),
        email: normalizedEmail,
        role: 'student'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);

    res.status(500).json({
      message: error.message
    });
  }
});

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({
        message: 'JWT_SECRET is not configured'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [rows] = await pool.query(
      `SELECT id, name, email, password_hash, role
       FROM users
       WHERE email = ?`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const user = rows[0];

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      {
        expiresIn: '24h'
      }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      message: error.message
    });
  }
});

// --------------------------------------------------
// GET ALL EVENTS
// --------------------------------------------------

app.get('/api/events', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.venue,
        e.created_by,
        e.created_at
       FROM events e
       ORDER BY e.event_date ASC`
    );

    res.json(rows);

  } catch (error) {
    console.error('Get events error:', error);

    res.status(500).json({
      message: error.message
    });
  }
});

// --------------------------------------------------
// CREATE EVENT - ADMIN ONLY
// --------------------------------------------------

app.post('/api/events', auth('admin'), async (req, res) => {
  try {
    const {
      title,
      description,
      event_date,
      venue
    } = req.body;

    if (!title || !event_date || !venue) {
      return res.status(400).json({
        message: 'Title, event date and venue are required'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO events
       (title, description, event_date, venue, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        title,
        description || null,
        event_date,
        venue,
        req.user.id
      ]
    );

    res.status(201).json({
      message: 'Event created successfully',
      eventId: result.insertId
    });

  } catch (error) {
    console.error('Create event error:', error);

    res.status(500).json({
      message: error.message
    });
  }
});

// --------------------------------------------------
// DELETE EVENT - ADMIN ONLY
// --------------------------------------------------

app.delete('/api/events/:id', auth('admin'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM events WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    res.json({
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Delete event error:', error);

    res.status(500).json({
      message: error.message
    });
  }
});

// --------------------------------------------------
// REGISTER FOR EVENT
// --------------------------------------------------

app.post('/api/events/:id/register', auth(), async (req, res) => {
  try {
    const eventId = Number(req.params.id);

    const [events] = await pool.query(
      'SELECT id FROM events WHERE id = ?',
      [eventId]
    );

    if (events.length === 0) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    const [existing] = await pool.query(
      `SELECT id
       FROM registrations
       WHERE event_id = ? AND user_id = ?`,
      [eventId, req.user.id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: 'You are already registered for this event'
      });
    }

    await pool.query(
      `INSERT INTO registrations
       (event_id, user_id)
       VALUES (?, ?)`,
      [eventId, req.user.id]
    );

    res.status(201).json({
      message: 'Registered successfully'
    });

  } catch (error) {
    console.error('Register event error:', error);

    res.status(500).json({
      message: error.message
    });
  }
});

// --------------------------------------------------
// UNREGISTER FROM EVENT
// --------------------------------------------------

app.delete('/api/events/:id/register', auth(), async (req, res) => {
  try {
    const eventId = Number(req.params.id);

    const [result] = await pool.query(
      `DELETE FROM registrations
       WHERE event_id = ? AND user_id = ?`,
      [eventId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Registration not found'
      });
    }

    res.json({
      message: 'Event unregistered successfully'
    });

  } catch (error) {
    console.error('Unregister event error:', error);

    res.status(500).json({
      message: error.message
    });
  }
});

// --------------------------------------------------
// GET MY REGISTERED EVENTS
// --------------------------------------------------

app.get('/api/my-events', auth(), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.venue,
        r.registered_at
       FROM registrations r
       INNER JOIN events e
         ON e.id = r.event_id
       WHERE r.user_id = ?
       ORDER BY e.event_date ASC`,
      [req.user.id]
    );

    res.json(rows);

  } catch (error) {
    console.error('My events error:', error);

    res.status(500).json({
      message: error.message
    });
  }
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

async function startServer() {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });

  try {
    await waitForDatabase();
  } catch (error) {
    console.error('Database startup check failed:', error.message);
  }
}

startServer();
