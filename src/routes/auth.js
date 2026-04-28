import { Router } from 'express';
import { AuthService } from '../services/authService.js';
import { LoginHistory } from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { 
  validateRegistration, 
  validateLogin, 
  validateResetRequest,
  validateResetPassword 
} from '../middleware/validation.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Helper to extract IP/UA metadata
function getMeta(req) {
  return {
    ip: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
}

/**
 * POST /auth/register
 */
router.post('/register', authLimiter, validateRegistration, async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.register(email, password, getMeta(req));
  
  if (!result.success) {
    const statusCode = result.error === 'EMAIL_EXISTS' ? 409 : 500;
    return res.status(statusCode).json({
      success: false,
      error: result.error,
      message: result.error === 'EMAIL_EXISTS' 
        ? 'An account with this email already exists'
        : 'Registration failed. Please try again.'
    });
  }
  
  res.status(201).json({
    success: true,
    message: 'Account created successfully. You can now log in.',
    user: result.user
  });
});

/**
 * POST /auth/login
 */
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password, getMeta(req));
  
  if (!result.success) {
    let statusCode = 401;
    let message = 'Invalid email or password';
    
    if (result.error === 'ACCOUNT_LOCKED') {
      statusCode = 423;
      message = result.message;
    }
    
    const response = { success: false, error: result.error, message };
    if (result.attemptsRemaining !== undefined && result.error !== 'ACCOUNT_LOCKED') {
      response.attemptsRemaining = result.attemptsRemaining;
    }
    if (result.lockTimeRemaining) {
      response.lockTimeRemaining = result.lockTimeRemaining;
    }
    
    return res.status(statusCode).json(response);
  }
  
  res.json({
    success: true,
    message: 'Login successful',
    token: result.token,
    user: result.user
  });
});

/**
 * POST /auth/forgot-password
 */
router.post('/forgot-password', passwordResetLimiter, validateResetRequest, (req, res) => {
  const { email } = req.body;
  AuthService.requestPasswordReset(email);
  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.'
  });
});

/**
 * POST /auth/reset-password
 */
router.post('/reset-password', passwordResetLimiter, validateResetPassword, async (req, res) => {
  const { token, password } = req.body;
  const result = await AuthService.resetPassword(token, password);
  
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error,
      message: 'Invalid or expired reset token'
    });
  }
  
  res.json({ success: true, message: 'Password reset successful.' });
});

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

/**
 * GET /auth/history
 * Get login history for the authenticated user
 */
router.get('/history', authenticate, (req, res) => {
  const history = LoginHistory.getForUser(req.user.id, 20);
  res.json({ success: true, history });
});

/**
 * GET /auth/security-stats
 * Get real-time security statistics (for dashboard)
 */
router.get('/security-stats', authenticate, (req, res) => {
  const stats = LoginHistory.getStats();
  res.json({ success: true, stats });
});

/**
 * GET /auth/recent-activity
 * Get recent global login activity (for dashboard)
 */
router.get('/recent-activity', authenticate, (req, res) => {
  const activity = LoginHistory.getRecent(15);
  res.json({ success: true, activity });
});

export default router;
