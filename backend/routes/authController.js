const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Local user vault fallback JSON file mapping path
const usersDbPath = path.join(__dirname, '../database_users_vault.json');

// Helper to safely fetch local users data array packet
const readUsersFromFile = () => {
    try {
        if (!fs.existsSync(usersDbPath)) {
            fs.writeFileSync(usersDbPath, '[]', 'utf8');
            return [];
        }
        const data = fs.readFileSync(usersDbPath, 'utf8');
        return JSON.parse(data || '[]');
    } catch (err) {
        console.error("[RIE AUTH DB ERROR] Failed reading user vault structures:", err.message);
        return [];
    }
};

// Helper to write users safely back to local environment storage matrix
const writeUsersToFile = (users) => {
    try {
        fs.writeFileSync(usersDbPath, JSON.stringify(users, null, 2), 'utf8');
    } catch (err) {
        console.error("[RIE AUTH DB ERROR] Storage dump failure:", err.message);
    }
};

// Action A: New User Account Registration Entry Controller
const registerAccountUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Username and password matrices required, bro!" });
        }

        const users = readUsersFromFile();
        const userExists = users.find(u => u.username.toLowerCase() === username.toLowerCase());

        if (userExists) {
            return res.status(400).json({ success: false, message: "Identity collision: User blueprint already registered." });
        }

        // Salt and hash the plaintext password configuration string
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newAccountNode = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            username: username,
            password: hashedPassword,
            registeredAt: new Date().toISOString()
        };

        users.push(newAccountNode);
        writeUsersToFile(users);

        return res.status(201).json({ success: true, message: "User security account initialized successfully!" });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Internal server fault during account allocation loop." });
    }
};

// Action B: Identity Verification & JWT Issuance Key Controller
const loginAccountUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Credentials tracking array fields required." });
        }

        const users = readUsersFromFile();
        const targetedUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());

        if (!targetedUser) {
            return res.status(401).json({ success: false, message: "Authentication Failed: Invalid user configuration context." });
        }

        // Cross check hashed signatures
        const validPassword = await bcrypt.compare(password, targetedUser.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: "Authentication Failed: Access sequence key mismatch." });
        }

        // Sign parameters matrix using jwt token generation method
        const secretKeyToken = process.env.JWT_SECRET || 'rie_fallback_jwt_secret_key_2026';
        const signatureToken = jwt.sign(
            { id: targetedUser.id, username: targetedUser.username },
            secretKeyToken,
            { expiresIn: '8h' } // Token expires in 8 Hours loop window
        );

        return res.status(200).json({
            success: true,
            message: "Authentication Token Generated successfully.",
            token: signatureToken,
            username: targetedUser.username
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Failed generating identity token payload parameters." });
    }
};

module.exports = { registerAccountUser, loginAccountUser };