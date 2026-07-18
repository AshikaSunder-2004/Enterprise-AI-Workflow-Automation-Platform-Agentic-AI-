"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.generateApiKey = generateApiKey;
exports.hashApiKey = hashApiKey;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
function signAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, env_1.config.JWT_SECRET, {
        expiresIn: env_1.config.JWT_EXPIRES_IN,
    });
}
function signRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, env_1.config.JWT_REFRESH_SECRET, {
        expiresIn: env_1.config.JWT_REFRESH_EXPIRES_IN,
    });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, env_1.config.JWT_SECRET);
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, env_1.config.JWT_REFRESH_SECRET);
}
async function hashPassword(password) {
    return bcryptjs_1.default.hash(password, 12);
}
async function verifyPassword(password, hash) {
    return bcryptjs_1.default.compare(password, hash);
}
function generateApiKey() {
    const key = `aiwf_${crypto_1.default.randomBytes(32).toString('hex')}`;
    const hash = crypto_1.default.createHash('sha256').update(key).digest('hex');
    return { key, hash };
}
function hashApiKey(key) {
    return crypto_1.default.createHash('sha256').update(key).digest('hex');
}
//# sourceMappingURL=jwt.js.map