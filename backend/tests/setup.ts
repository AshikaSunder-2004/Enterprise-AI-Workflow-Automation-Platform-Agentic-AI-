// Test environment setup — mock env vars
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test_secret_at_least_32_characters_long_here';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_chars_here';
process.env.GEMINI_API_KEY = 'test_gemini_key';
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012'; // 32 chars
