import { Request, Response } from 'express';
import { login } from './auth.service';

/**
 * Handles POST /api/auth/login.
 *
 * The controller is responsible for HTTP input/output.
 * Authentication logic remains inside auth.service.ts.
 */
export async function loginController(
  req: Request,
  res: Response,
): Promise<void> {
  const { email, password } = req.body;

  // Basic request validation before calling the authentication service.
  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {
    res.status(400).json({
      success: false,
      message: 'Email and password are required',
    });
    return;
  }

  try {
    const result = await login(email.trim().toLowerCase(), password);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    // Authentication failures intentionally use a generic message.
    // We don't reveal whether an email exists in the database.
    if (error instanceof Error && error.message === 'Invalid credentials') {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    // Unexpected errors should not expose internal details to the client.
    console.error('Login error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}