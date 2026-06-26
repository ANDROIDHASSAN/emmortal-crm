import bcrypt from 'bcryptjs';
import { User } from '../../models/User.js';
import { env } from '../../config/env.js';

export const hashPassword = (plain) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

// Create the admin account from env on first boot (idempotent).
export async function ensureSeedAdmin() {
  const existing = await User.findOne({ email: env.SEED_ADMIN_EMAIL.toLowerCase() });
  if (existing) return existing;
  const user = await User.create({
    name: env.SEED_ADMIN_NAME,
    email: env.SEED_ADMIN_EMAIL.toLowerCase(),
    passwordHash: await hashPassword(env.SEED_ADMIN_PASSWORD),
    role: 'admin',
    active: true,
  });
  console.log(`[auth] seeded admin: ${user.email}`);
  return user;
}

export async function createUser({ name, email, password, role }) {
  const passwordHash = await hashPassword(password);
  return User.create({ name, email: email.toLowerCase(), passwordHash, role });
}
