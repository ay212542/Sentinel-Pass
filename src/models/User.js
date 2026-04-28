import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

export const User = {
  /**
   * Create a new user with hashed password
   */
  async create({ email, password }) {
    const salt = bcrypt.genSaltSync(BCRYPT_ROUNDS);
    const password_hash = bcrypt.hashSync(password, salt);
    const verification_token = crypto.randomUUID();
    
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, verification_token)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(email.toLowerCase(), password_hash, verification_token);
    
    return {
      id: result.lastInsertRowid,
      email: email.toLowerCase(),
      verification_token
    };
  },

  /**
   * Find user by email
   */
  findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email.toLowerCase());
  },

  /**
   * Find user by ID
   */
  findById(id) {
    const stmt = db.prepare('SELECT id, email, email_verified, created_at FROM users WHERE id = ?');
    return stmt.get(id);
  },

  /**
   * Verify password against hash
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  },

  /**
   * Increment failed login attempts
   */
  incrementFailedAttempts(userId) {
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    const lockDuration = parseInt(process.env.LOCK_DURATION_MINUTES) || 10;
    
    const user = db.prepare('SELECT failed_attempts FROM users WHERE id = ?').get(userId);
    const newAttempts = (user?.failed_attempts || 0) + 1;
    
    let lockUntil = null;
    if (newAttempts >= maxAttempts) {
      lockUntil = Math.floor(Date.now() / 1000) + (lockDuration * 60);
    }
    
    const stmt = db.prepare(`
      UPDATE users 
      SET failed_attempts = ?, lock_until = ?, updated_at = unixepoch()
      WHERE id = ?
    `);
    stmt.run(newAttempts, lockUntil, userId);
    
    return { attempts: newAttempts, locked: lockUntil !== null };
  },

  /**
   * Reset failed attempts after successful login
   */
  resetFailedAttempts(userId) {
    const stmt = db.prepare(`
      UPDATE users 
      SET failed_attempts = 0, lock_until = NULL, updated_at = unixepoch()
      WHERE id = ?
    `);
    stmt.run(userId);
  },

  /**
   * Check if account is locked
   */
  isLocked(user) {
    if (!user.lock_until) return false;
    
    const now = Math.floor(Date.now() / 1000);
    if (now >= user.lock_until) {
      this.resetFailedAttempts(user.id);
      return false;
    }
    
    return true;
  },

  /**
   * Get remaining lock time in seconds
   */
  getLockTimeRemaining(user) {
    if (!user.lock_until) return 0;
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, user.lock_until - now);
  },

  /**
   * Verify email with token
   */
  verifyEmail(token) {
    const user = db.prepare('SELECT id FROM users WHERE verification_token = ?').get(token);
    
    if (!user) return null;
    
    const stmt = db.prepare(`
      UPDATE users 
      SET email_verified = 1, verification_token = NULL, updated_at = unixepoch()
      WHERE id = ?
    `);
    stmt.run(user.id);
    
    return user;
  },

  /**
   * Generate password reset token
   */
  createResetToken(email) {
    const user = this.findByEmail(email);
    if (!user) return null;
    
    const reset_token = crypto.randomUUID();
    const expires = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    
    const stmt = db.prepare(`
      UPDATE users 
      SET reset_token = ?, reset_token_expires = ?, updated_at = unixepoch()
      WHERE id = ?
    `);
    stmt.run(reset_token, expires, user.id);
    
    return { reset_token, email: user.email };
  },

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    const now = Math.floor(Date.now() / 1000);
    
    const user = db.prepare(`
      SELECT id FROM users 
      WHERE reset_token = ? AND reset_token_expires > ?
    `).get(token, now);
    
    if (!user) return null;
    
    const salt = bcrypt.genSaltSync(BCRYPT_ROUNDS);
    const password_hash = bcrypt.hashSync(newPassword, salt);
    
    const stmt = db.prepare(`
      UPDATE users 
      SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL,
          failed_attempts = 0, lock_until = NULL, updated_at = unixepoch()
      WHERE id = ?
    `);
    stmt.run(password_hash, user.id);
    
    return user;
  }
};

// ── Login History Model ─────────────────────────────────────────

export const LoginHistory = {
  /**
   * Record a login attempt
   */
  record({ userId, email, ipAddress, userAgent, status, reason }) {
    const stmt = db.prepare(`
      INSERT INTO login_history (user_id, email, ip_address, user_agent, status, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(userId || null, email.toLowerCase(), ipAddress, userAgent, status, reason || null);
  },

  /**
   * Get recent login history for a user
   */
  getForUser(userId, limit = 10) {
    const stmt = db.prepare(`
      SELECT id, ip_address, user_agent, status, reason, timestamp
      FROM login_history
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit);
  },

  /**
   * Get global attack stats (for admin/dashboard)
   */
  getStats() {
    const now = Math.floor(Date.now() / 1000);
    const last24h = now - 86400;
    const last1h = now - 3600;

    const totalFailed = db.prepare(`
      SELECT COUNT(*) as count FROM login_history 
      WHERE status = 'FAILED' AND timestamp > ?
    `).get(last24h).count;

    const totalSuccess = db.prepare(`
      SELECT COUNT(*) as count FROM login_history 
      WHERE status = 'SUCCESS' AND timestamp > ?
    `).get(last24h).count;

    const lockedAccounts = db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE lock_until > ?
    `).get(now).count;

    const recentAttacks = db.prepare(`
      SELECT COUNT(*) as count FROM login_history 
      WHERE status = 'FAILED' AND timestamp > ?
    `).get(last1h).count;

    return { totalFailed, totalSuccess, lockedAccounts, recentAttacks };
  },

  /**
   * Get recent global activity (last 20 events)
   */
  getRecent(limit = 20) {
    const stmt = db.prepare(`
      SELECT id, email, ip_address, status, reason, timestamp
      FROM login_history
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }
};
