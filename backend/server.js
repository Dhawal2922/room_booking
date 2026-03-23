const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const exceljs = require('exceljs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
require('dotenv').config();

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

app.use(cors());
app.use(express.json());

let db;

// ✅ ROOT ROUTE (FIXED)
app.get("/", (req, res) => {
  res.send("Room Booking API is running 🚀");
});

// Initialize Database
async function initDB() {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      building TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      reason TEXT NOT NULL,
      room_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      FOREIGN KEY(room_id) REFERENCES rooms(id)
    );

    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );
  `);

  try {
    const tableInfo = await db.all("PRAGMA table_info(bookings)");
    if (!tableInfo.some(col => col.name === 'end_date')) {
      await db.run("ALTER TABLE bookings ADD COLUMN end_date TEXT");
    }
    if (!tableInfo.some(col => col.name === 'status')) {
      await db.run("ALTER TABLE bookings ADD COLUMN status TEXT DEFAULT 'active'");
    }
  } catch (err) {
    console.error("Could not alter bookings table", err);
  }

  const existingAdmin = await db.get('SELECT * FROM admin');
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await db.run('INSERT INTO admin (username, password) VALUES (?, ?)', ['admin', hashedPassword]);
  }
}

initDB().then(() => {
  console.log('Database initialized');
});

// Auth Endpoints & Middleware

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const admin = await db.get('SELECT * FROM admin WHERE username = ?', [username]);
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: admin.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.put('/admin/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });

  try {
    const admin = await db.get('SELECT * FROM admin WHERE id = ?', [req.user.id]);
    const validPassword = await bcrypt.compare(currentPassword, admin.password);
    if (!validPassword) return res.status(401).json({ error: 'Incorrect current password' });
    
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE admin SET password = ? WHERE id = ?', [hashedNewPassword, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= ROOMS =================

// ✅ Protected routes only where needed
app.delete('/rooms', authenticateToken, async (req, res) => {
  try {
    await db.run('DELETE FROM bookings');
    await db.run('DELETE FROM rooms');
    res.json({ message: 'All rooms and associated bookings deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/rooms/bulk', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];
    
    const rooms = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        // Expected structure from screenshot:
        // Col 2: Room Name (Class/Labs)
        // Col 4: Floor (Building/Floor)
        // Col 5: Capacity (Total Seat)
        
        let name = row.getCell(2).value;
        let building = row.getCell(4).value;
        let capacityStr = row.getCell(5).value;

        // Handle possible rich text objects from exceljs
        if (name && typeof name === 'object' && name.richText) name = name.richText.map(rt => rt.text).join('');
        if (building && typeof building === 'object' && building.richText) building = building.richText.map(rt => rt.text).join('');
        if (capacityStr && typeof capacityStr === 'object' && capacityStr.richText) capacityStr = capacityStr.richText.map(rt => rt.text).join('');
        if (capacityStr && typeof capacityStr === 'object' && capacityStr.result !== undefined) capacityStr = capacityStr.result; // For formulas

        name = name?.toString().trim();
        building = building?.toString().trim();
        const capacity = parseInt(capacityStr);

        // Name must exist, Capacity must be a valid number, and Building must exist. 
        // This implicitly skips all the visually merged block header rows.
        if (name && !isNaN(capacity) && building && name.toLowerCase() !== 'class/labs') {
          rooms.push({ name, capacity, building });
        }
      }
    });

    if (rooms.length === 0) return res.status(400).json({ error: 'No valid rooms found in file.' });

    const stmt = await db.prepare('INSERT INTO rooms (name, capacity, building) VALUES (?, ?, ?)');
    for (const room of rooms) {
      await stmt.run([room.name, room.capacity, room.building]);
    }
    await stmt.finalize();

    res.json({ message: 'Rooms imported successfully', count: rooms.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process file. Ensure it is a valid Excel file.' });
  }
});

// ✅ Public routes
app.get('/rooms', async (req, res) => {
  try {
    const rooms = await db.all('SELECT * FROM rooms');
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/rooms', authenticateToken, async (req, res) => {
  const { name, capacity, building } = req.body;
  if (!name || (!capacity && capacity !== 0) || !building) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const result = await db.run(
      'INSERT INTO rooms (name, capacity, building) VALUES (?, ?, ?)',
      [name, capacity, building]
    );
    res.status(201).json({ id: result.lastID, name, capacity, building });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/rooms/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.run('DELETE FROM rooms WHERE id = ?', [id]);
    await db.run('DELETE FROM bookings WHERE room_id = ?', [id]);
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= BOOKINGS =================

// ✅ Public
app.get('/bookings', async (req, res) => {
  try {
    const bookings = await db.all(`
      SELECT b.*, r.name as room_name 
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
    `);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function isOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

// ✅ Public booking
app.post('/bookings', async (req, res) => {
  const { name, email, reason, room_id, room_ids, date, end_date, start_time, end_time } = req.body;
  const targetRoomIds = Array.isArray(room_ids) && room_ids.length > 0 ? room_ids : (room_id ? [room_id] : []);
  const finalEndDate = end_date || date;
  
  if (!name || !email || !reason || targetRoomIds.length === 0 || !date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const reqStart = new Date(`${date}T${start_time}`);
  const reqEnd = new Date(`${finalEndDate}T${end_time}`);

  if (reqStart >= reqEnd) {
    return res.status(400).json({ error: 'Start date/time must be before end date/time' });
  }

  try {
    // Check ALL requested rooms for overlap
    for (const id of targetRoomIds) {
      const existingBookings = await db.all(
        "SELECT date, end_date, start_time, end_time FROM bookings WHERE room_id = ? AND status != 'cancelled'",
        [id]
      );
      for (const booking of existingBookings) {
        const bStart = new Date(`${booking.date}T${booking.start_time}`);
        const bEndDate = booking.end_date || booking.date;
        const bEnd = new Date(`${bEndDate}T${booking.end_time}`);
        
        if (reqStart < bEnd && bStart < reqEnd) {
          return res.status(409).json({ error: `Time slot overlaps with an existing booking for a selected room` });
        }
      }
    }

    // Insert ALL bookings
    const stmt = await db.prepare('INSERT INTO bookings (name, email, reason, room_id, date, end_date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const id of targetRoomIds) {
      await stmt.run([name, email, reason, id, date, finalEndDate, start_time, end_time, 'active']);
    }
    await stmt.finalize();

    res.status(201).json({ message: 'Bookings created successfully', count: targetRoomIds.length, room_ids: targetRoomIds, date, end_date: finalEndDate, start_time, end_time });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Public export
// --- Bookings Endpoint Overrides ---

app.delete('/bookings', async (req, res) => {
  try {
    await db.run('DELETE FROM bookings');
    res.json({ message: 'All bookings deleted permanently' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.run("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [id]);
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/export', async (req, res) => {
  try {
    const bookings = await db.all(`
      SELECT b.name, b.email, r.name as room_name, b.date, b.end_date, b.start_time, b.end_time, b.reason, b.status 
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      ORDER BY b.date DESC, b.start_time ASC
    `);

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Bookings');
    
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Room', key: 'room_name', width: 15 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Time Slot', key: 'time_slot', width: 20 },
      { header: 'Reason', key: 'reason', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    bookings.forEach(booking => {
      worksheet.addRow({
        name: booking.name,
        email: booking.email,
        room_name: booking.room_name,
        date: booking.end_date && booking.end_date !== booking.date ? `${booking.date} to ${booking.end_date}` : booking.date,
        time_slot: booking.start_time + ' - ' + booking.end_time,
        reason: booking.reason,
        status: (booking.status || 'active').toUpperCase()
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=bookings.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log('Server is running on http://localhost:' + PORT);
});