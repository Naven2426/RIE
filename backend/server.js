const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Standard Middleware
app.use(cors());
app.use(express.json());

// Authentication Routes Ingestion Boundary Integration Layer
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Base Server Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'active', message: 'RIE Backend Server running smoothly' });
});

// Start Server Listening
app.listen(PORT, () => {
    console.log(`[RIE SERVER] Node Backend application active and listening on port ${PORT}`);
});