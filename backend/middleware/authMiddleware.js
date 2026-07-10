const jwt = require('jsonwebtoken');

const verifySecureToken = (req, res, next) => {
    // Extract token from Authorization header (Format: Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: "Access Denied: Missing Cryptographic Security Token." });
    }

    try {
        // Verify token signature against secret key vector
        const verifiedUser = jwt.verify(token, process.env.JWT_SECRET || 'rie_fallback_jwt_secret_key_2026');
        req.user = verifiedUser;
        next(); // Pass control to the next route handler matrix
    } catch (err) {
        return res.status(403).json({ success: false, message: "Access Forbidden: Invalid or Expired Token." });
    }
};

module.exports = { verifySecureToken };