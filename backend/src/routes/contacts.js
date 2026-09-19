const express = require('express');
const { db } = require('../firebaseClient');

const router = express.Router();

// POST /api/contacts — Create a contact (admin SDK, bypasses security rules)
router.post('/', async (req, res) => {
  try {
    const { user_id, name, phone, email, relationship } = req.body;
    if (!user_id || !name || !phone) {
      return res.status(400).json({ error: 'user_id, name, and phone are required' });
    }
    const contactData = { user_id, name, phone };
    if (email) contactData.email = email;
    if (relationship) contactData.relationship = relationship;

    const ref = await db.collection('contacts').add(contactData);
    const snap = await ref.get();
    console.log('[Contacts] Created contact:', ref.id, 'for user:', user_id);
    res.status(201).json({ id: ref.id, ...snap.data() });
  } catch (err) {
    console.error('[Contacts] Create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contacts/:user_id — List contacts for a user
router.get('/:user_id', async (req, res) => {
  try {
    const snap = await db.collection('contacts').where('user_id', '==', req.params.user_id).get();
    const contacts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(contacts);
  } catch (err) {
    console.error('[Contacts] List error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/contacts/:id — Delete a contact by doc ID (admin SDK)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.collection('contacts').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    await ref.delete();
    console.log('[Contacts] Deleted contact:', id);
    res.json({ success: true, id });
  } catch (err) {
    console.error('[Contacts] Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;