// scripts/generate-supabase-config.mjs
// Build-time script to generate supabase-config.js from environment variables
// This script is designed to run during Vercel deployment

import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

try {
  // Read environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  // Validate environment variables
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!supabasePublishableKey) {
    throw new Error('SUPABASE_PUBLISHABLE_KEY environment variable is required');
  }

  // Generate the config file content
  const configContent = `window.SUPABASE_CONFIG = {
  url: "${supabaseUrl}",
  anonKey: "${supabasePublishableKey}"
};
`;

  // Write the config file to the root directory
  const configPath = join(rootDir, 'supabase-config.js');
  await writeFile(configPath, configContent, 'utf8');

  console.log('✅ supabase-config.js generated successfully');
  console.log('📁 Location:', configPath);

} catch (error) {
  console.error('❌ Error generating supabase-config.js:', error.message);
  process.exit(1);
}