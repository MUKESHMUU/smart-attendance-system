// Usage: npm run create-teacher            (asks questions)
//    or: npm run create-teacher -- "Name" teacher@example.com username "Password123"
require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const db = require('../utils/jsonDb');

const ask = (rl, q) => new Promise((res) => rl.question(q, res));

(async () => {
  await db.init();
  let [name, email, username, password] = process.argv.slice(2);
  if (!(name && email && username && password)) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    name = await ask(rl, 'Teacher name: ');
    email = await ask(rl, 'Email: ');
    username = await ask(rl, 'Username: ');
    password = await ask(rl, 'Password (min 8 chars): ');
    rl.close();
  }
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !username || password.length < 8) {
    console.error('Invalid input. Need a name, valid email, username, and a password of 8+ characters.');
    process.exit(1);
  }
  const users = await db.getAll('users');
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase())) {
    console.error('A user with that email or username already exists.');
    process.exit(1);
  }
  await db.add('users', { name, email: email.toLowerCase(), username, passwordHash: await bcrypt.hash(password, 10), role: 'teacher' });
  console.log(`Teacher "${username}" created. You can now log in.`);
})();
