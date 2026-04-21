const Signature = require('../models/Signature');
const { ensureMongoReady } = require('../mongoReady');

class SignatureController {
    static async rejectIfMongoDown(res) {
        const ok = await ensureMongoReady();
        if (ok) return true;
        res.status(503).json({ success: false, error: 'MongoDB unavailable' });
        return false;
    }

    static parseIndex(raw) {
        if (raw === undefined || raw === null) return { ok: false, error: 'Missing or invalid index' };
        const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
        if (!Number.isFinite(n) || !Number.isInteger(n)) return { ok: false, error: 'Missing or invalid index' };
        // Current app has 12 shareholders (0..11). Keep this strict to avoid unbounded object growth.
        if (n < 0 || n > 11) return { ok: false, error: 'Index out of range' };
        return { ok: true, index: n };
    }

    static normalizeSignature(raw) {
        // Empty string / null means "clear"
        if (raw === undefined || raw === null) return { ok: true, signature: '' };
        const s = String(raw);
        if (s.trim() === '') return { ok: true, signature: '' };
        // Expect a data URL like "data:image/jpeg;base64,..."
        if (!s.startsWith('data:image/')) return { ok: false, error: 'Invalid signature format' };
        if (!s.includes('base64,')) return { ok: false, error: 'Invalid signature format' };
        return { ok: true, signature: s };
    }

    // Get all signatures
    static async getSignatures(req, res) {
        try {
            if (!(await SignatureController.rejectIfMongoDown(res))) return;

            const signature = await Signature.getOrCreate();
            console.log('Loaded signatures from MongoDB Atlas:', Object.keys(signature.signatures || {}).length, 'signatures');
            res.json({ 
                success: true, 
                data: { 
                    signatures: signature.signatures || {}, 
                    submitted: signature.submitted || false,
                    date: signature.date || ''
                } 
            });
        } catch (err) {
            console.error('Error loading signatures:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // Save individual signature
    static async saveSignature(req, res) {
        const { index: rawIndex, signature: rawSignature } = req.body || {};

        const parsedIndex = SignatureController.parseIndex(rawIndex);
        if (!parsedIndex.ok) {
            return res.status(400).json({ success: false, error: parsedIndex.error });
        }
        const parsedSignature = SignatureController.normalizeSignature(rawSignature);
        if (!parsedSignature.ok) {
            return res.status(400).json({ success: false, error: parsedSignature.error });
        }
        const index = String(parsedIndex.index);
        const signature = parsedSignature.signature;

        try {
            if (!(await SignatureController.rejectIfMongoDown(res))) return;

            const updateQuery = {
                $set: { 
                    submitted: false, 
                    lastUpdated: new Date() 
                }
            };

            if (signature && signature.trim() !== '') {
                updateQuery.$set[`signatures.${index}`] = signature.trim();
            } else {
                updateQuery.$unset = { [`signatures.${index}`]: "" };
            }

            const signatureDoc = await Signature.findOneAndUpdate(
                {}, 
                updateQuery,
                { sort: { lastUpdated: -1 }, upsert: true, new: true }
            );
            
            console.log(`[MongoDB] Signature ${signature ? 'saved' : 'cleared'} for index ${index}. Total signatures: ${Object.keys(signatureDoc.signatures || {}).length}`);
            res.json({
                success: true,
                data: {
                    signatures: signatureDoc.signatures || {},
                    submitted: signatureDoc.submitted || false,
                    date: signatureDoc.date || ''
                }
            });
        } catch (err) {
            console.error('Error saving signature:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // Save all signatures (bulk save)
    static async saveAllSignatures(req, res) {
        const { signatures, date, shareholderData, timestamp } = req.body;
        if (!signatures) {
            return res.status(400).json({ success: false, error: 'Missing signatures' });
        }

        try {
            if (!(await SignatureController.rejectIfMongoDown(res))) return;

            const signatureDoc = await Signature.findOneAndUpdate(
                {},
                {
                    $set: {
                        signatures: signatures,
                        date: date || '',
                        shareholderData: shareholderData || [],
                        timestamp: timestamp || '',
                        submitted: true,
                        lastUpdated: new Date()
                    }
                },
                { sort: { lastUpdated: -1 }, upsert: true, new: true }
            );
            
            console.log(`All signatures saved to MongoDB Atlas on ${date}`);
            res.json({ 
                success: true, 
                storedInMongo: true, 
                signatures,
                id: signatureDoc._id
            });
        } catch (err) {
            console.error('Error saving signatures:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // Update existing signature
    static async updateSignature(req, res) {
        const { id } = req.params;
        const { signatures, date, shareholderData, timestamp } = req.body;

        try {
            if (!(await SignatureController.rejectIfMongoDown(res))) return;

            const signatureDoc = await Signature.findById(id);
            if (!signatureDoc) {
                return res.status(404).json({ success: false, error: 'Signature document not found' });
            }

            if (signatures !== undefined) signatureDoc.signatures = signatures;
            if (date !== undefined) signatureDoc.date = date;
            if (shareholderData !== undefined) signatureDoc.shareholderData = shareholderData;
            if (timestamp !== undefined) signatureDoc.timestamp = timestamp;
            
            signatureDoc.lastUpdated = new Date();
            await signatureDoc.save();

            res.json({ 
                success: true, 
                message: 'Signature updated successfully',
                data: signatureDoc
            });
        } catch (err) {
            console.error('Error updating signature:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // Get signature by ID
    static async getSignatureById(req, res) {
        const { id } = req.params;

        try {
            if (!(await SignatureController.rejectIfMongoDown(res))) return;

            const signature = await Signature.findById(id);
            if (!signature) {
                return res.status(404).json({ success: false, error: 'Signature not found' });
            }
            res.json({ success: true, data: signature });
        } catch (err) {
            console.error('Error getting signature:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // Delete signature
    static async deleteSignature(req, res) {
        const { id } = req.params;

        try {
            if (!(await SignatureController.rejectIfMongoDown(res))) return;

            const deletedSignature = await Signature.findByIdAndDelete(id);
            if (!deletedSignature) {
                return res.status(404).json({ success: false, error: 'Signature not found' });
            }

            res.json({ 
                success: true, 
                message: 'Signature deleted successfully' 
            });
        } catch (err) {
            console.error('Error deleting signature:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // Reset all signatures
    static async resetSignatures(req, res) {
        try {
            if (!(await SignatureController.rejectIfMongoDown(res))) return;

            await Signature.deleteMany({});
            const newSignature = new Signature({ signatures: {}, submitted: false });
            await newSignature.save();
            res.json({ success: true, message: 'All signatures reset successfully', data: newSignature });
        } catch (err) {
            console.error('Error resetting signatures:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // Get all signature documents (for admin purposes)
    static async getAllSignatureDocuments(req, res) {
        try {
            if (!(await SignatureController.rejectIfMongoDown(res))) return;

            const signatures = await Signature.find().sort({ lastUpdated: -1 });
            res.json({ success: true, data: signatures, count: signatures.length });
        } catch (err) {
            console.error('Error getting all signature documents:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = SignatureController;
