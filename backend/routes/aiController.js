const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ExifParser = require('exif-parser');
const axios = require('axios');
const FormData = require('form-data');

const dbFilePath = path.join(__dirname, '../database_history_log.json');

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const SECRET_HEX_KEY = crypto.createHash('sha256').update('rie_secret_secure_key_2026').digest('hex').substring(0, 32);
const STATIC_IV_VECTOR = crypto.createHash('md5').update('rie_initialization_vector').digest('hex').substring(0, 16);

const encryptDataPayload = (plainText) => {
    try {
        const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, SECRET_HEX_KEY, STATIC_IV_VECTOR);
        let encrypted = cipher.update(plainText, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    } catch (err) { return plainText; }
};

const decryptDataPayload = (encryptedHex) => {
    try {
        const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, SECRET_HEX_KEY, STATIC_IV_VECTOR);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) { return "[]"; }
};

const uploadMediaAsset = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No media file stream payload captured." });
        }

        const operatorOwner = req.user ? req.user.username : 'anonymous';
        const filePath = req.file.path;
        const fileNameLower = req.file.originalname.toLowerCase();
        
        let gpsData = { latitude: null, longitude: null };
        let deviceMetadata = "Unknown Hardware Signature";
        let capturedTimestamp = new Date().toISOString();
        let hasNativeExif = false;
        let metadataScore = 20;

        // 1. Metadata Verification Layer Check
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const parser = ExifParser.create(fileBuffer);
            const exifResult = parser.parse();

            if (exifResult && exifResult.tags) {
                const tags = exifResult.tags;
                if (tags.Make || tags.Model) {
                    deviceMetadata = `${tags.Make || ''} ${tags.Model || ''}`.trim();
                    hasNativeExif = true;
                }
                if (tags.GPSLatitude && tags.GPSLongitude) {
                    gpsData.latitude = tags.GPSLatitude;
                    gpsData.longitude = tags.GPSLongitude;
                }
                if (tags.DateTimeOriginal || tags.CreateDate) {
                    const epoch = tags.DateTimeOriginal || tags.CreateDate;
                    capturedTimestamp = new Date(epoch * 1000).toISOString();
                }
            }
        } catch (exifError) { }

        // ==========================================
        // 🧠 FETCH TRUE AI INFERENCE FROM PYTHON SERVER
        // ==========================================
        let aiEngineResult = { success: false, forgery_detected: true, confidence_score: 0, analysis_msg: "AI Microservice Offline." };
        
        try {
            const pythonModelFormData = new FormData();
            pythonModelFormData.append('file', fs.createReadStream(filePath), req.file.originalname);

            const aiServerGatewayResponse = await axios.post('http://127.0.0.1:8000/api/v1/predict', pythonModelFormData, {
                headers: pythonModelFormData.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            if (aiServerGatewayResponse.data && aiServerGatewayResponse.data.success) {
                aiEngineResult = aiServerGatewayResponse.data;
            }
        } catch (pythonServerOfflineError) {
            console.error("[RIE ENGINE CRITICAL ERROR] Python Server offline.");
        }

        // 🎯 DYNAMIC METADATA SCORE ADJUSTMENT BASED ON IMAGE AUTHENTICITY
        if (gpsData.latitude) {
            metadataScore = 95; // GPS + Camera Data present
        } else if (hasNativeExif || aiEngineResult.forgery_detected === false) {
            metadataScore = 85; // Natural photo baseline without GPS parameters
        } else if (aiEngineResult.confidence_score < 50) {
            metadataScore = 15; // Anime or heavy forgery patterns down-rated
        }

        // Generate Cryptographic SHA-256 Signature
        let assetHash = "";
        try {
            const fileBuffer = fs.readFileSync(filePath);
            assetHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        } catch (hashError) { }

        // Calculate Final Blended Composite Score
        const pixelScore = Math.round(aiEngineResult.confidence_score);
        const blendedScore = Math.round((metadataScore * 0.3) + (pixelScore * 0.7));

        // Save Encrypted Database Records Matrix Log
        try {
            let existingLogs = [];
            if (fs.existsSync(dbFilePath)) {
                const encryptedFileData = fs.readFileSync(dbFilePath, 'utf8');
                if (encryptedFileData && encryptedFileData.trim().length > 0) {
                    const decryptedString = decryptDataPayload(encryptedFileData);
                    existingLogs = JSON.parse(decryptedString || '[]');
                }
            }

            const newLogEntry = {
                id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                owner: operatorOwner,
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                fileHash: assetHash,
                timestamp: capturedTimestamp,
                device: deviceMetadata,
                coordinates: gpsData,
                finalRealityScore: blendedScore,
                loggedAt: new Date().toISOString()
            };

            existingLogs.push(newLogEntry);
            const encryptedOutputHex = encryptDataPayload(JSON.stringify(existingLogs));
            fs.writeFileSync(dbFilePath, encryptedOutputHex, 'utf8');
        } catch (dbSaveError) { }

        return res.status(200).json({
            success: true,
            message: "Asset evaluated through integrated verification network.",
            data: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                hash: assetHash,
                timestamp: capturedTimestamp,
                device: deviceMetadata,
                coordinates: gpsData,
                environment: { status: "Awaiting Coordinates", temperature: "N/A", windspeed: "N/A" },
                ai_forensics: aiEngineResult
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal server fault." });
    }
};

const predictInferenceData = async (req, res) => { return res.status(200).json({ success: true }); };

module.exports = { uploadMediaAsset, predictInferenceData, decryptDataPayload };