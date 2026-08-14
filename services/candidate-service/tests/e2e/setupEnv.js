import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

// Load Gateway .env
dotenv.config({ path: path.resolve('../../api-gateway/.env') });

// Load Auth Service MONGO_URI to use the Atlas cluster, but target a test DB
const authEnvPath = path.resolve('../../auth-service/.env');
let mongoUri = 'mongodb://localhost:27017/hire1percent_e2e_test';

if (fs.existsSync(authEnvPath)) {
  const envContent = fs.readFileSync(authEnvPath, 'utf8');
  const match = envContent.match(/MONGO_URI=(.+)/);
  if (match && match[1]) {
    mongoUri = match[1].trim().replace('/talentechosystem', '/talentechosystem_e2e_test');
  }
}

process.env.MONGO_URI = mongoUri;
process.env.NODE_ENV = 'testing';

// Override ports for E2E testing to prevent EADDRINUSE conflicts
process.env.AUTH_SERVICE_URL = 'http://localhost:7601';
process.env.JOB_SERVICE_URL = 'http://localhost:7602';
process.env.CANDIDATE_SERVICE_URL = 'http://localhost:7603';
