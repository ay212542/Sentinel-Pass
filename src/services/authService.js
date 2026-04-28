import jwt from 'jsonwebtoken';
import { User, LoginHistory } from '../models/User.js';

export const AuthService = {
  /**
   * Register a new user
   */
  async register(email, password, meta = {}) {
    const existingUser = User.findByEmail(email);
    if (existingUser) {
      LoginHistory.record({
        email,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        status: 'FAILED',
        reason: 'EMAIL_EXISTS'
      });
      return { success: false, error: 'EMAIL_EXISTS' };
    }

    try {
      const user = await User.create({ email, password });
      
      // In production, send verification email here
      console.log(`[DEV] Verification token for ${email}: ${user.verification_token}`);
      
      LoginHistory.record({
        userId: user.id,
        email,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        status: 'REGISTERED'
      });

      return { 
        success: true, 
        user: { id: user.id, email: user.email }
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'REGISTRATION_FAILED' };
    }
  },

  /**
   * Authenticate user and return JWT
   */
  async login(email, password, meta = {}) {
    const user = User.findByEmail(email);
    
    // Timing-safe: always hash even if user not found
    if (!user) {
      await User.verifyPassword(password, '$2b$12$dummy.hash.for.timing.attack.prevention');
      LoginHistory.record({
        email,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        status: 'FAILED',
        reason: 'USER_NOT_FOUND'
      });
      return { success: false, error: 'INVALID_CREDENTIALS' };
    }

    // Check if account is locked
    if (User.isLocked(user)) {
      const remainingTime = User.getLockTimeRemaining(user);
      const minutes = Math.ceil(remainingTime / 60);
      LoginHistory.record({
        userId: user.id,
        email,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        status: 'FAILED',
        reason: 'ACCOUNT_LOCKED'
      });
      return { 
        success: false, 
        error: 'ACCOUNT_LOCKED',
        lockTimeRemaining: remainingTime,
        message: `Account locked. Try again in ${minutes} minute(s).`
      };
    }

    // Verify password
    const isValid = await User.verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      const result = User.incrementFailedAttempts(user.id);
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
      const remaining = maxAttempts - result.attempts;
      
      LoginHistory.record({
        userId: user.id,
        email,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        status: 'FAILED',
        reason: result.locked ? 'ACCOUNT_LOCKED' : 'WRONG_PASSWORD'
      });

      if (result.locked) {
        return { 
          success: false, 
          error: 'ACCOUNT_LOCKED',
          message: 'Too many failed attempts. Account locked temporarily.'
        };
      }
      
      return { 
        success: false, 
        error: 'INVALID_CREDENTIALS',
        attemptsRemaining: remaining > 0 ? remaining : 0
      };
    }

    // Successful login
    User.resetFailedAttempts(user.id);

    LoginHistory.record({
      userId: user.id,
      email,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      status: 'SUCCESS'
    });

    const token = this.generateToken(user);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: Boolean(user.email_verified)
      }
    };
  },

  /**
   * Generate JWT token
   */
  generateToken(user) {
    const payload = {
      sub: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      algorithm: 'HS256'
    });
  },

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256']
      });
    } catch (error) {
      return null;
    }
  },

  /**
   * Request password reset
   */
  requestPasswordReset(email) {
    const result = User.createResetToken(email);
    if (result) {
      console.log(`[DEV] Reset token for ${email}: ${result.reset_token}`);
    }
    return { success: true };
  },

  /**
   * Complete password reset
   */
  async resetPassword(token, newPassword) {
    const result = await User.resetPassword(token, newPassword);
    if (!result) {
      return { success: false, error: 'INVALID_OR_EXPIRED_TOKEN' };
    }
    return { success: true };
  }
};
