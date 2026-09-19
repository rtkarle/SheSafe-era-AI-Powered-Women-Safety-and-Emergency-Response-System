const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const { db } = require('./firebaseClient');

// Health check
app.get("/", (req, res) => {
  res.json({ status: "SheShield API running" });
});

// Firestore connection test
app.get('/test-firestore', async (req, res) => {
  try {
    const ref = await db.collection('test').add({
      message: 'Hello from SheShield backend',
      timestamp: new Date().toISOString(),
    });
    res.json({ success: true, id: ref.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Real alerts route (writes to Firestore)
const alertsRouter = require('./routes/alerts');
app.use('/api/alerts', alertsRouter);

const contactsRouter = require('./routes/contacts');
app.use('/api/contacts', contactsRouter);

const guardianRouter = require('./routes/guardian');
app.use('/api/guardian', guardianRouter);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SheShield API running on port ${PORT}`);
});