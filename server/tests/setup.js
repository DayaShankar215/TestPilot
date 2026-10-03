process.env.NODE_ENV = 'test'
process.env.DATABASE_URL ??= 'mysql://testpilot:testpilot@127.0.0.1:3306/testpilot_test'
process.env.AI_PROVIDER = 'mock'
process.env.AUTOMATION_ENABLED = 'false'
// Tests use the lowest work factor bcrypt allows to keep the suite fast.
process.env.BCRYPT_ROUNDS = '8'