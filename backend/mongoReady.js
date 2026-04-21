const mongoose = require('mongoose');

const CONNECT_OPTIONS = {
    bufferCommands: false,
    serverSelectionTimeoutMS: 2000, // Reduced for faster failure fallback
    socketTimeoutMS: 30000,
};

let connectionPromise = null;
let lastAttemptTime = 0;
const RETRY_INTERVAL = 60000; // Only retry every 60 seconds to avoid hanging

/**
 * True only when MONGODB_URI is set and Mongoose is connected.
 * Returns false if connection fails, allowing fallback to local storage.
 */
async function ensureMongoReady() {
    const uri = process.env.MONGODB_URI;
    
    // Check if URI is a placeholder or missing
    const isPlaceholder = uri && (uri.includes('username:password') || (uri.includes('cluster.mongodb.net') && uri.includes('username')));
    if (!uri || isPlaceholder) {
        if (isPlaceholder && Math.random() < 0.01) { // Log occasionally if it's a placeholder
             console.log('[MongoDB] Placeholder URI detected. Using local fallback.');
        }
        return false;
    }

    if (mongoose.connection.readyState === 1) return true;
    if (mongoose.connection.readyState === 2) return false; // Already connecting

    // Throttle reconnection attempts
    const now = Date.now();
    if (now - lastAttemptTime < RETRY_INTERVAL && !connectionPromise) {
        return false;
    }

    lastAttemptTime = now;

    try {
        if (!connectionPromise) {
            console.log('[MongoDB] Attempting to connect...');
            connectionPromise = mongoose.connect(uri, CONNECT_OPTIONS);
        }
        await connectionPromise;
        connectionPromise = null;
        return mongoose.connection.readyState === 1;
    } catch (err) {
        console.error('[MongoDB] Connection failed:', err.message);
        connectionPromise = null;
        return false;
    }
}

module.exports = { ensureMongoReady, CONNECT_OPTIONS };
