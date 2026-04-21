require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
// Increased limit for large base64 signatures
app.use(express.json({ limit: '10mb' }));

// ── Storage: MongoDB (preferred) with local JSON fallback ─────────────────────
const SIGNATURES_FILE = path.join(__dirname, '..', 'signatures.json');

function isMongoUriConfigured(uri) {
  if (!uri) return false;
  const s = String(uri);
  // Common placeholder patterns (avoid trying to connect and hanging/crashing)
  if (s.includes('username:password')) return false;
  if (s.includes('<username>') || s.includes('<password>')) return false;
  if (s.includes('cluster.mongodb.net') && s.includes('username')) return false;
  return true;
}

async function readFileState() {
  try {
    if (!fs.existsSync(SIGNATURES_FILE)) {
      const initial = { signatures: {}, submitted: false, date: '', timestamp: '', lastUpdated: new Date().toISOString() };
      fs.writeFileSync(SIGNATURES_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(SIGNATURES_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return {
      signatures: parsed.signatures && typeof parsed.signatures === 'object' ? parsed.signatures : {},
      submitted: !!parsed.submitted,
      date: typeof parsed.date === 'string' ? parsed.date : '',
      timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : '',
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch (err) {
    console.error('[file-store] Failed reading signatures.json:', err.message);
    return { signatures: {}, submitted: false, date: '', timestamp: '', lastUpdated: new Date().toISOString() };
  }
}

async function writeFileState(nextState) {
  const toWrite = {
    signatures: nextState.signatures && typeof nextState.signatures === 'object' ? nextState.signatures : {},
    submitted: !!nextState.submitted,
    date: typeof nextState.date === 'string' ? nextState.date : '',
    timestamp: typeof nextState.timestamp === 'string' ? nextState.timestamp : '',
    lastUpdated: nextState.lastUpdated || new Date().toISOString(),
  };
  fs.writeFileSync(SIGNATURES_FILE, JSON.stringify(toWrite, null, 2), 'utf8');
  return toWrite;
}

let mongoReady = false;
const MONGODB_URI = process.env.MONGODB_URI;
if (isMongoUriConfigured(MONGODB_URI)) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      mongoReady = true;
      console.log('✅ MongoDB connected successfully');
    })
    .catch((err) => {
      mongoReady = false;
      console.error('❌ MongoDB connection failed (using local JSON fallback):', err.message);
    });
} else {
  console.warn('⚠️ MONGODB_URI not set (or placeholder). Using local JSON fallback at:', SIGNATURES_FILE);
}

// ── Schema & Model ────────────────────────────────────────────────────────────
const signatureSchema = new mongoose.Schema({
  signatures: {
    type: Map,
    of: String,
    default: {}
  },
  submitted: { type: Boolean, default: false },
  date: { type: String, default: '' },
  timestamp: { type: String, default: '' },
  lastUpdated: { type: Date, default: Date.now }
});

const Signature = mongoose.model('signatures', signatureSchema);

// ── Helper: get or create the single document ─────────────────────────────────
async function getDoc() {
  let doc = await Signature.findOne();
  if (!doc) {
    doc = await Signature.create({});
    console.log('[DB] Created new signatures document');
  }
  return doc;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/signatures/latest — load current state
app.get('/api/signatures/latest', async (req, res) => {
  try {
    if (mongoReady && mongoose.connection.readyState === 1) {
      const doc = await getDoc();

      // Convert Map to plain object for frontend
      const signatures = {};
      if (doc.signatures) {
        for (const [k, v] of doc.signatures.entries()) {
          if (v) signatures[k] = v;
        }
      }

      return res.json({
        success: true,
        data: {
          signatures,
          submitted: doc.submitted,
          date: doc.date,
          lastUpdated: doc.lastUpdated,
        },
      });
    }

    const state = await readFileState();
    return res.json({
      success: true,
      data: {
        signatures: state.signatures || {},
        submitted: !!state.submitted,
        date: state.date || '',
        lastUpdated: state.lastUpdated || '',
      },
    });
  } catch (err) {
    console.error('[GET /api/signatures/latest]', err.message);
    res.status(500).json({ success: false, error: 'Failed to load signatures' });
  }
});

// POST /api/save-signature — save a single signature immediately
app.post('/api/save-signature', async (req, res) => {
  try {
    const { index, signature } = req.body;

    if (index === undefined || index === null) {
      return res.status(400).json({ success: false, error: 'Missing index' });
    }

    const key = String(index);

    if (mongoReady && mongoose.connection.readyState === 1) {
      const doc = await getDoc();

      if (doc.submitted) {
        return res.status(403).json({ success: false, error: 'Resolution already submitted. No changes allowed.' });
      }

      if (!signature || signature === '') {
        doc.signatures.delete(key);
      } else {
        doc.signatures.set(key, signature);
      }

      doc.lastUpdated = new Date();
      doc.markModified('signatures'); // Required for Mongoose Map to detect changes
      await doc.save();

      // Return plain object
      const signatures = {};
      for (const [k, v] of doc.signatures.entries()) {
        if (v) signatures[k] = v;
      }

      console.log(`[save-signature] Saved index=${key}, total signed=${Object.keys(signatures).length}`);
      return res.json({ success: true, data: { signatures, submitted: doc.submitted, date: doc.date } });
    }

    const state = await readFileState();
    if (state.submitted) {
      return res.status(403).json({ success: false, error: 'Resolution already submitted. No changes allowed.' });
    }

    const next = { ...state, signatures: { ...(state.signatures || {}) } };
    if (!signature || signature === '') delete next.signatures[key];
    else next.signatures[key] = String(signature);
    next.lastUpdated = new Date().toISOString();

    const written = await writeFileState(next);
    console.log(`[file-store save-signature] Saved index=${key}, total signed=${Object.keys(written.signatures || {}).length}`);
    return res.json({ success: true, data: { signatures: written.signatures || {}, submitted: !!written.submitted, date: written.date || '' } });
  } catch (err) {
    console.error('[POST /api/save-signature]', err.message);
    res.status(500).json({ success: false, error: 'Failed to save signature' });
  }
});

// POST /api/signatures — final submit
app.post('/api/signatures', async (req, res) => {
  try {
    const { date, signatures, timestamp } = req.body;

    if (mongoReady && mongoose.connection.readyState === 1) {
      const doc = await getDoc();

      if (doc.submitted) {
        return res.status(403).json({ success: false, error: 'Resolution already submitted.' });
      }

      // Merge incoming signatures into the Map
      if (signatures && typeof signatures === 'object') {
        for (const [k, v] of Object.entries(signatures)) {
          if (v) doc.signatures.set(String(k), v);
        }
      }

      doc.submitted = true;
      doc.date = date || new Date().toLocaleString('en-GB');
      doc.timestamp = timestamp || new Date().toISOString();
      doc.lastUpdated = new Date();
      doc.markModified('signatures');
      await doc.save();

      console.log(`[submit] Resolution submitted at ${doc.date}`);
      return res.json({ success: true, data: { submitted: doc.submitted, date: doc.date } });
    }

    const state = await readFileState();
    if (state.submitted) {
      return res.status(403).json({ success: false, error: 'Resolution already submitted.' });
    }

    const merged = { ...(state.signatures || {}) };
    if (signatures && typeof signatures === 'object') {
      for (const [k, v] of Object.entries(signatures)) {
        if (v) merged[String(k)] = String(v);
      }
    }

    const next = {
      ...state,
      signatures: merged,
      submitted: true,
      date: date || new Date().toLocaleString('en-GB'),
      timestamp: timestamp || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    const written = await writeFileState(next);
    console.log(`[file-store submit] Resolution submitted at ${written.date}`);
    return res.json({ success: true, data: { submitted: true, date: written.date } });
  } catch (err) {
    console.error('[POST /api/signatures]', err.message);
    res.status(500).json({ success: false, error: 'Failed to submit resolution' });
  }
});

// DELETE /api/signatures/reset — reset everything (admin use)
app.delete('/api/signatures/reset', async (req, res) => {
  try {
    if (mongoReady && mongoose.connection.readyState === 1) {
      await Signature.deleteMany({});
      await Signature.create({});
      console.log('[reset] Signatures reset (MongoDB)');
      return res.json({ success: true, message: 'Reset complete' });
    }

    await writeFileState({ signatures: {}, submitted: false, date: '', timestamp: '', lastUpdated: new Date().toISOString() });
    console.log('[reset] Signatures reset (file-store)');
    return res.json({ success: true, message: 'Reset complete' });
  } catch (err) {
    console.error('[DELETE /api/signatures/reset]', err.message);
    res.status(500).json({ success: false, error: 'Reset failed' });
  }
});

// --- Static Files & SPA Routing ---
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(distPath));

// For any other request, send the index.html (SPA support)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, error: 'API route not found' });
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // Fallback for dev or missing dist
        res.status(404).send('Not found');
    }
});

// ── Start ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
