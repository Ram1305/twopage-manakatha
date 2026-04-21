const mongoose = require('mongoose');

const SignatureSchema = new mongoose.Schema({
    date: { type: String, default: '' },
    signatures: { type: Object, default: {} },
    shareholderData: { type: Array, default: [] },
    timestamp: { type: String, default: '' },
    submitted: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Static method to get or create the signature document
SignatureSchema.statics.getOrCreate = async function() {
    let signature = await this.findOne().sort({ lastUpdated: -1 });
    if (!signature) {
        signature = new this({ signatures: {}, submitted: false });
        await signature.save();
    }
    return signature;
};

module.exports = mongoose.models.Signature || mongoose.model('Signatures', SignatureSchema);
