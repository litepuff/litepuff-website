import bcrypt from 'bcryptjs';
import { stdin, stdout } from 'node:process';
import readline from 'node:readline/promises';

const terminal = readline.createInterface({ input: stdin, output: stdout });

try {
  const password = await terminal.question('Enter the new admin password: ');
  if (password.length < 12) throw new Error('Admin password must contain at least 12 characters.');
  const confirmation = await terminal.question('Enter it again: ');
  if (password !== confirmation) throw new Error('Passwords do not match.');
  const hash = await bcrypt.hash(password, 12);
  stdout.write(`\nSet this value as ADMIN_PASSWORD_HASH in Hostinger:\n${hash}\n`);
} catch (error) {
  process.exitCode = 1;
  stdout.write(`\nUnable to generate hash: ${error.message}\n`);
} finally {
  terminal.close();
}
