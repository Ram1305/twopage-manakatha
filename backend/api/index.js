require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
// Increased limit for large base64 signatures
app.use(express.json({ limit: '10mb' }));

// ── Storage: MongoDB ONLY (no JSON fallback) ──────────────────────────────────
function validateMongoUri(uri) {
  if (!uri) return 'MONGODB_URI is not set.';
  const s = String(uri);
  // Common placeholder patterns (avoid silent misconfig)
  if (s.includes('username:password')) return 'MONGODB_URI contains placeholder "username:password".';
  if (s.includes('<username>') || s.includes('<password>')) return 'MONGODB_URI contains placeholder "<username>/<password>".';
  if (s.includes('cluster.mongodb.net') && s.includes('username')) return 'MONGODB_URI looks like a placeholder (contains "username").';
  return '';
}

let mongoReady = false;
const MONGODB_URI = process.env.MONGODB_URI;
const mongoUriError = validateMongoUri(MONGODB_URI);
if (mongoUriError) {
  console.error(`❌ ${mongoUriError} MongoDB is required; refusing to start.`);
  process.exit(1);
}

// Some corporate DNS setups allow `nslookup` but block Node's SRV resolver (c-ares),
// which breaks `mongodb+srv://...` URIs. Allow overriding DNS servers at runtime.
// Example (Windows PowerShell):
//   setx MONGODB_DNS_SERVERS "8.8.8.8,1.1.1.1"
//   npm start
if (process.env.MONGODB_DNS_SERVERS) {
  const servers = String(process.env.MONGODB_DNS_SERVERS)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (servers.length > 0) {
    dns.setServers(servers);
    console.log('🔧 Using custom DNS servers for MongoDB SRV:', servers.join(', '));
  }
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    mongoReady = true;
    console.log('✅ MongoDB connected successfully');
  })
  .catch((err) => {
    mongoReady = false;
    console.error('❌ MongoDB connection failed. MongoDB is required; refusing to start.', err.message);
    process.exit(1);
  });

// ── Schema & Model ────────────────────────────────────────────────────────────
const SHAREHOLDER_NAMES = [
  'N. Thiruchelvam',
  'T. Gnanaraj',
  'T.Palanivel',
  'S. Lavatheepan',
  'P. Gopalakrishnan',
  'S. Balenthiran',
  'S. Balarajan',
  'A.Navajeevan',
  'S. Srirenganathan',
  'T. Krishnarajh',
  'T. Kumararasan',
  'S. Manimaran',
];

function nameForIndex(index) {
  const n = Number(index);
  if (Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n < SHAREHOLDER_NAMES.length) {
    return SHAREHOLDER_NAMES[n];
  }
  return `Shareholder #${String(index)}`;
}

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

// ── Archive: store every signature event ──────────────────────────────────────
const signatureArchiveSchema = new mongoose.Schema(
  {
    index: { type: String, required: true },
    name: { type: String, required: true },
    signature: { type: String, default: '' }, // data URL
    event: { type: String, enum: ['saved', 'cleared'], required: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

signatureArchiveSchema.index({ index: 1, createdAt: -1 });

const SignatureArchive = mongoose.model('signature_archives', signatureArchiveSchema);

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
    if (!mongoReady || mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'MongoDB not connected' });
    }

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

    if (!mongoReady || mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'MongoDB not connected' });
    }

    const doc = await getDoc();

    if (doc.submitted) {
      return res.status(403).json({ success: false, error: 'Resolution already submitted. No changes allowed.' });
    }

    const name = nameForIndex(key);
    const isClearing = !signature || signature === '';

    if (!signature || signature === '') {
      doc.signatures.delete(key);
    } else {
      doc.signatures.set(key, signature);
    }

    doc.lastUpdated = new Date();
    doc.markModified('signatures'); // Required for Mongoose Map to detect changes
    await doc.save();

    // Archive every event (even clears) for recovery/audit.
    await SignatureArchive.create({
      index: key,
      name,
      signature: isClearing ? '' : signature,
      event: isClearing ? 'cleared' : 'saved',
    });

    // Return plain object
    const signatures = {};
    for (const [k, v] of doc.signatures.entries()) {
      if (v) signatures[k] = v;
    }

    console.log(`[save-signature] Saved index=${key}, total signed=${Object.keys(signatures).length}`);
    return res.json({ success: true, data: { signatures, submitted: doc.submitted, date: doc.date } });
  } catch (err) {
    console.error('[POST /api/save-signature]', err.message);
    res.status(500).json({ success: false, error: 'Failed to save signature' });
  }
});

// POST /api/signatures — final submit
app.post('/api/signatures', async (req, res) => {
  try {
    const { date, signatures, timestamp } = req.body;

    if (!mongoReady || mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'MongoDB not connected' });
    }

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
  } catch (err) {
    console.error('[POST /api/signatures]', err.message);
    res.status(500).json({ success: false, error: 'Failed to submit resolution' });
  }
});

// DELETE /api/signatures/reset — reset everything (admin use)
app.delete('/api/signatures/reset', async (req, res) => {
  try {
    if (!mongoReady || mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'MongoDB not connected' });
    }

    // NOTE: We intentionally do NOT touch the archive collection here.
    await Signature.deleteMany({});
    await Signature.create({});
    console.log('[reset] Signatures reset (MongoDB)');
    return res.json({ success: true, message: 'Reset complete' });
  } catch (err) {
    console.error('[DELETE /api/signatures/reset]', err.message);
    res.status(500).json({ success: false, error: 'Reset failed' });
  }
});

// POST /api/signatures/recover-latest — restore current signatures from archive
app.post('/api/signatures/recover-latest', async (req, res) => {
  try {
    if (!mongoReady || mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'MongoDB not connected' });
    }

    const doc = await getDoc();

    if (doc.submitted) {
      return res.status(403).json({ success: false, error: 'Resolution already submitted. Recovery is blocked.' });
    }

    const next = {};
    for (let i = 0; i < SHAREHOLDER_NAMES.length; i++) {
      const latest = await SignatureArchive.findOne({
        index: String(i),
        event: 'saved',
        signature: { $ne: '' },
      }).sort({ createdAt: -1 });
      if (latest?.signature) {
        next[String(i)] = latest.signature;
      }
    }

    doc.signatures = new Map(Object.entries(next));
    doc.submitted = false;
    doc.lastUpdated = new Date();
    doc.markModified('signatures');
    await doc.save();

    return res.json({
      success: true,
      data: {
        signatures: next,
        submitted: doc.submitted,
        date: doc.date,
        lastUpdated: doc.lastUpdated,
      },
    });
  } catch (err) {
    console.error('[POST /api/signatures/recover-latest]', err.message);
    res.status(500).json({ success: false, error: 'Recovery failed' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
