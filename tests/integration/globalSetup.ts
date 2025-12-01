/**
 * Global Setup for Integration Tests
 * ===================================
 * 
 * This file runs before any integration tests.
 * It loads environment variables and validates the test configuration.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables
// Priority: .env.test.local > .env.test > .env
config({ path: resolve(process.cwd(), '.env.test.local') });
config({ path: resolve(process.cwd(), '.env.test') });
config({ path: resolve(process.cwd(), '.env') });

// Validate required environment variables
const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

const optionalVars = [
  'VITE_SUPABASE_TEST_URL',
  'VITE_SUPABASE_TEST_ANON_KEY',
  'VITE_SUPABASE_TEST_SERVICE_ROLE_KEY',
];

// Check for test-specific or fallback variables
const supabaseUrl = process.env.VITE_SUPABASE_TEST_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_TEST_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  ❌ INTEGRATION TEST CONFIGURATION ERROR                         ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Missing required Supabase credentials.                          ║
║                                                                   ║
║  Create .env.test.local with:                                    ║
║    VITE_SUPABASE_TEST_URL=https://your-project.supabase.co       ║
║    VITE_SUPABASE_TEST_ANON_KEY=your-anon-key                     ║
║    VITE_SUPABASE_TEST_SERVICE_ROLE_KEY=your-service-key          ║
║                                                                   ║
║  Or ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY          ║
║  are set in your environment.                                    ║
║                                                                   ║
║  See tests/integration/README.md for details.                    ║
╚══════════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

// Warn if using production credentials
if (!process.env.VITE_SUPABASE_TEST_URL) {
  console.warn(`
╔══════════════════════════════════════════════════════════════════╗
║  ⚠️  WARNING: Using production Supabase credentials               ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  No test-specific credentials found.                             ║
║  Tests will run against your production database!                ║
║                                                                   ║
║  For safety, create a separate test project and set:             ║
║    VITE_SUPABASE_TEST_URL                                        ║
║    VITE_SUPABASE_TEST_ANON_KEY                                   ║
║    VITE_SUPABASE_TEST_SERVICE_ROLE_KEY                           ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

// Warn if service role key is missing
if (!process.env.VITE_SUPABASE_TEST_SERVICE_ROLE_KEY) {
  console.warn(`
╔══════════════════════════════════════════════════════════════════╗
║  ⚠️  WARNING: Service role key not configured                     ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Some test operations will not work:                             ║
║    - User creation without email verification                    ║
║    - Data cleanup bypassing RLS policies                         ║
║    - Cross-user data verification                                ║
║                                                                   ║
║  Set VITE_SUPABASE_TEST_SERVICE_ROLE_KEY for full functionality. ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  🧪 Integration Test Environment                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  Supabase URL: ${supabaseUrl.substring(0, 40).padEnd(40)}       ║
║  Service Role: ${process.env.VITE_SUPABASE_TEST_SERVICE_ROLE_KEY ? '✓ Configured' : '✗ Not configured'}                               ║
╚══════════════════════════════════════════════════════════════════╝
`);
