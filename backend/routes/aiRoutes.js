const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); 

const { uploadMediaAsset, predictInferenceData, decryptDataPayload } = require('./aiController');
// Import the secure token interceptor matrix
const { verifySecureToken } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

router.post('/upload', upload.single('mediaAsset'), uploadMediaAsset);
router.post('/predict', predictInferenceData);

// SECURED ROUTE: Embedded verifySecureToken interceptor into the execution pipeline
router.get('/history', verifySecureToken, (req, res) => {
    try {
        const dbFilePath = path.join(__dirname, '../database_history_log.json');
        let logs = [];
        if (fs.existsSync(dbFilePath)) {
            const encryptedDataStr = fs.readFileSync(dbFilePath, 'utf8');
            if (encryptedDataStr && encryptedDataStr.trim().length > 0) {
                const decryptedRawString = decryptDataPayload(encryptedDataStr);
                logs = JSON.parse(decryptedRawString || '[]');
            }
        }
        return res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Failed parsing encrypted metrics arrays." });
    }
});

module.exports = router;