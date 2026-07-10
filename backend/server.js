const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Week 4 Security Lockdown: Strict CORS Strategy Profile Configuration
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin like mobile apps or curl requests, or if origin is explicitly allowed
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('[RIE SECURITY DISALLOW] Cross-Origin Resource Access Denied by Gateway Filter Matrix.'));
        }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Injection of dynamic cross-origin policy parameters configuration
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static structural asset directories for file streams
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route Target Initializer Matrices
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);

// Fallback Status Heartbeat Check Route Engine
app.get('/api/auth/status', (req, res) => {
    res.status(200).json({ success: true, message: "Gateway engine online." });
});

app.listen(PORT, () => {
    console.log(`[RIE ENGINE] Secure Node API Gateway running successfully on port: ${PORT}`);
});