import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Authenticates a user and creates a signed JWT.
 *
 * Password verification happens against the bcrypt hash stored in the
 * database. The plaintext password is never returned or placed in the JWT.
 */
export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Use the same generic error for unknown users and incorrect passwords.
  // This avoids revealing whether a particular email exists.
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new Error('Invalid credentials');
  }

  /**
   * The JWT contains only identity/authorization information.
   * Passwords and password hashes must never be included in tokens.
   */
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    env.jwtSecret,
    {
      expiresIn: '1h',
    },
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}