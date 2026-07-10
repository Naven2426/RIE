const mongoose = require('mongoose');

const VerificationLogSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    fileHash: { type: String, required: true, index: true }, // SHA-256 Signature Seal
    timestamp: { type: Date, default: Date.now },
    device: { type: String, default: "Unknown Hardware Signature" },
    coordinates: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null }
    },
    aiForensics: {
        forgeryDetected: { type: Boolean, required: true },
        confidenceScore: { type: Number, required: true },
        analysisMsg: { type: String, required: true }
    },
    finalRealityScore: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('VerificationLog', VerificationLogSchema);