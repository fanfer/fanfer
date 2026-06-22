const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const args = process.argv.slice(2);
const envPath = path.resolve(__dirname, '..', '.env');

function readArg(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : '';
}

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter(line => line.trim() && !line.trim().startsWith('#'))
      .map(line => {
        const index = line.indexOf('=');
        if (index === -1) return [line.trim(), ''];
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      })
  );
}

function writeEnv(filePath, updates) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8').split(/\r?\n/) : [];
  const seen = new Set();
  const lines = existing.map(line => {
    const index = line.indexOf('=');
    if (index === -1) return line;
    const key = line.slice(0, index).trim();
    if (!(key in updates)) return line;
    seen.add(key);
    return `${key}=${updates[key]}`;
  });

  Object.entries(updates).forEach(([key, value]) => {
    if (!seen.has(key)) lines.push(`${key}=${value}`);
  });

  fs.writeFileSync(filePath, `${lines.filter((line, index, arr) => line || index < arr.length - 1).join('\n')}\n`);
}

if (args.includes('--help')) {
  console.log('Usage: npm run reset-password -- [--username admin] [--password value]');
  process.exit(0);
}

const current = readEnv(envPath);
const username = readArg('--username') || current.ADMIN_USERNAME || 'admin';
const password = readArg('--password') || crypto.randomBytes(18).toString('base64url');
const jwtSecret = current.JWT_SECRET || crypto.randomBytes(36).toString('base64url');
const hash = bcrypt.hashSync(password, 12);

writeEnv(envPath, {
  ADMIN_USERNAME: username,
  ADMIN_PASSWORD_HASH: hash,
  JWT_SECRET: jwtSecret,
});

console.log('Admin credentials reset locally.');
console.log(`ADMIN_USERNAME=${username}`);
console.log(`ADMIN_PASSWORD=${password}`);
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
console.log(`JWT_SECRET=${jwtSecret}`);
console.log('');
console.log('Set ADMIN_USERNAME, ADMIN_PASSWORD_HASH, and JWT_SECRET in Vercel to apply this reset in production.');
