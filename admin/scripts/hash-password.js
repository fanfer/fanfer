const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Enter password to hash: ', (password) => {
  const hash = bcrypt.hashSync(password, 10);
  console.log('\nBcrypt hash:');
  console.log(hash);
  console.log('\nAdd this to your .env file:');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  rl.close();
});
