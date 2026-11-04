#!/usr/bin/env node
// Makes the value for "adminPasswordHash" in a hotel's JSON file.
// Usage: npm run hash-password -- "the hotel's password"
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Give a password of at least 8 characters: npm run hash-password -- "their password"');
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 32).toString("hex");
console.log(`scrypt$${salt}$${hash}`);
