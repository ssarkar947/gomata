const fs = require('fs');
const path = require('path');

// Helper to parse .env file manually without external dependencies
function loadEnv() {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    console.log('Loading environment variables from .env file...');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach(line => {
      // Ignore comments and empty lines
      if (!line || line.startsWith('#') || !line.includes('=')) return;
      const [key, ...valueParts] = line.split('=');
      const val = valueParts.join('=').trim().replace(/^['"]|['"]$/g, ''); // strip quotes
      process.env[key.trim()] = val;
    });
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || 'https://xdwtsqdpvztbulhawsnp.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_veSbig5AS-Be4umDrMcRhQ_FwoQchfj';
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'YOUR_RAZORPAY_KEY_ID';

const configContent = `// GO MATA - Credentials Configuration (Automatically Generated)
const SUPABASE_CONFIG = {
  url: "${supabaseUrl}",
  anonKey: "${supabaseAnonKey}"
};

const RAZORPAY_CONFIG = {
  keyId: "${razorpayKeyId}"
};
`;

const configPath = path.resolve(__dirname, 'config.js');
fs.writeFileSync(configPath, configContent, 'utf-8');
console.log('Successfully generated config.js!');
