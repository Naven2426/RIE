const express = require('express');
const router = express.Router();
const aiController = require('./aiController');
const authMiddleware = require('../middleware/authMiddleware');

// Route protected by JWT middleware boundary guard gate
router.post('/predict', authMiddleware, aiController.processAIInference);

module.exports = router;