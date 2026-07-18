"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv = __importStar(require("dotenv"));
const zod_1 = require("zod");
dotenv.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().default('4000').transform(Number),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
    JWT_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    GEMINI_API_KEY: zod_1.z.string().min(1, 'GEMINI_API_KEY is required'),
    ENCRYPTION_KEY: zod_1.z.string().length(32, 'ENCRYPTION_KEY must be exactly 32 chars'),
    FRONTEND_URL: zod_1.z.string().default('http://localhost:3000'),
    // Optional connectors
    SLACK_CLIENT_ID: zod_1.z.string().optional(),
    SLACK_CLIENT_SECRET: zod_1.z.string().optional(),
    GMAIL_CLIENT_ID: zod_1.z.string().optional(),
    GMAIL_CLIENT_SECRET: zod_1.z.string().optional(),
    JIRA_HOST: zod_1.z.string().optional(),
    SERPER_API_KEY: zod_1.z.string().optional(),
    WORKER_MODE: zod_1.z.string().optional(),
});
const result = envSchema.safeParse(process.env);
if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
}
exports.config = result.data;
//# sourceMappingURL=env.js.map