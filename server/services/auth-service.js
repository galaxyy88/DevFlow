import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { pool } from "../database/pool.js";
import { ApiError } from "../utils/api-error.js";

const SALT_ROUNDS = 12;

function createToken(user) {
  return jwt.sign({ version: user.token_version }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN
  });
}

export async function registerUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, token_version, created_at`,
    [name, email, passwordHash]
  );
  const user = rows[0];

  return {
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.created_at },
    token: createToken(user)
  };
}

export async function loginUser({ email, password }) {
  const { rows } = await pool.query(
    "SELECT id, name, email, password_hash, token_version, created_at FROM users WHERE email = $1",
    [email]
  );
  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(401, "Email ou senha incorretos.", "INVALID_CREDENTIALS");
  }

  return {
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.created_at },
    token: createToken(user)
  };
}

export async function logoutUser(userId) {
  await pool.query("UPDATE users SET token_version = token_version + 1 WHERE id = $1", [userId]);
}
