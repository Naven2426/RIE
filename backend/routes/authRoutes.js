const express = require('express');
const router = express.Router();
const { registerAccountUser, loginAccountUser } = require('./authController');

// Define specific endpoint mappings for user routing configuration layers
router.post('/register', registerAccountUser);
router.post('/login', loginAccountUser);

module.exports = router;