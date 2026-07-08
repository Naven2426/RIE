const express = require('express');
const router = express.Router();
const authController = require('./authController');

// Map inbound registration requests to backend logic controller
router.post('/register', authController.registerUser);

// Map inbound authentication login requests to backend logic token issuer
router.post('/login', authController.loginUser);

module.exports = router;