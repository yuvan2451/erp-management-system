import { Router } from 'express';
import { loginController } from './auth.controller';

const router = Router();

/**
 * POST /api/auth/login
 *
 * Public endpoint used to authenticate a user and receive a JWT.
 */
router.post('/login', loginController);

export default router;