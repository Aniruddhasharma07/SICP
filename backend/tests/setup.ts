process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://sicp:sicp_pass@localhost:5432/sicp_test?schema=public';
process.env.JWT_SECRET = 'sicp_test_secret_must_be_at_least_32_characters_long_for_security!';
process.env.PORT = '5001';
process.env.AI_SERVICE_URL = 'http://localhost:9999';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';