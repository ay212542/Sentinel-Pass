import { AuthService } from '../services/authService.js';
import { User } from '../models/User.js';

/**
 * Middleware to protect routes requiring authentication
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  const decoded = AuthService.verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Invalid or expired token'
    });
  }

  // Attach user to request
  const user = User.findById(decoded.sub);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'User no longer exists'
    });
  }

  req.user = user;
  req.tokenPayload = decoded;
  next();
}

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = AuthService.verifyToken(token);
    
    if (decoded) {
      req.user = User.findById(decoded.sub);
      req.tokenPayload = decoded;
    }
  }

  next();
}

/**
 * Require email verification
 */
export function requireVerifiedEmail(req, res, next) {
  if (!req.user.email_verified) {
    return res.status(403).json({
      success: false,
      error: 'EMAIL_NOT_VERIFIED',
      message: 'Please verify your email address'
    });
  }
  next();
}
