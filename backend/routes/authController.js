const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register a Brand New User Identity Node
exports.registerUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Ingestion tracking checks inputs validation target bounds check
        if (!email || !password) {
            return res.status(400).json({ error: 'Payload configuration criteria invalid. Email and Password fields mandatory.' });
        }

        // Verify if user already persists mapping parameters tracking
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Identity conflict tracking threshold breached. User profile already maps database system registry.' });
        }

        // Cryptographic password secure hashing using bcrypt pipeline logic
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Instantiating structural model schema target mapping context instance record module setup
        const newUser = new User({
            email,
            password_hash,
            role: 'user' // Default access assignment gating validation rule matrix context
        });

        await newUser.save();
        return res.status(201).json({ message: 'User identity successfully created database persistence tracking context parameters secure active bounds.' });

    } catch (err) {
        return res.status(500).json({ error: 'Internal system fault sequence monitoring trace identity context execution crash.', details: err.message });
    }
};

// Login verification strategy tracking session token issuance processing parameters logic sequence execution standard route endpoint 
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Authentication challenge criteria verification missing dynamic parameter sets fields definitions empty mapping arrays.' });
        }

        // Check if authentication records maps identity key mapping tracking pointer context validation parameters framework sequence data
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Access identity validation criteria check failed. Security boundaries tracking validation match unauthorized.' });
        }

        // Validate hashed credentials checks parsing bounds execution context parameters security check layer
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Access identity validation criteria check failed. Security boundaries tracking validation match unauthorized.' });
        }

        // Secure token infrastructure tracking layer dynamic validation configuration issuance lifecycle process block mapping matrix
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Short-lived access validation session block configuration standard timeline trace parameter target lock boundary control settings window bounds parameter target mapping
        );

        return res.status(200).json({
            message: 'Authentication check successful context parameters token signature verification active pipeline.',
            token,
            user: { id: user._id, email: user.email, role: user.role }
        });

    } catch (err) {
        return res.status(500).json({ error: 'Internal server encryption handshake tracking parameters layer verification error context execution sequence fault.', details: err.message });
    }
};