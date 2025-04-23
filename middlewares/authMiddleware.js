const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const tokenHeaderKey = process.env.TOKEN_HEADER_KEY;
const jwtSecretKey = process.env.JWT_SECRET_KEY;

const authenticateToken = (req, res, next) => {
    try {
        const token = req.header(tokenHeaderKey);
        if (!token) {
            return res.status(401).json({ success: false, message: 'Access Denied: No token provided.' });
        }

        const verified = jwt.verify(token, jwtSecretKey);
        if (!verified) {
            return res.status(401).json({ success: false, message: 'Access Denied: Invalid token.' });
        }

        // Attach the verified token's payload to the request for use in controllers
        req.user = verified;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Access Denied: Token verification failed.', error: error.message });
    }
};

module.exports = authenticateToken;
