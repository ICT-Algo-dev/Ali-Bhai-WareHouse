const os = require('node:os');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-signing-secret-that-is-at-least-32-characters';
process.env.PRIVACY_POLICY_VERSION = 'test-policy-1';
process.env.INQUIRY_RETENTION_DAYS = '730';
process.env.FRONTEND_DIST_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'frontend-dist');
process.env.MONGOMS_DOWNLOAD_DIR = path.join(os.tmpdir(), 'warehouse-mongodb-binaries');
