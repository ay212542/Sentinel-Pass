import validator from 'validator';

/**
 * Password validation rules
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

/**
 * Validate registration input
 */
export function validateRegistration(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  // Email validation
  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else if (!validator.isEmail(email)) {
    errors.push('Invalid email format');
  } else if (email.length > 254) {
    errors.push('Email is too long');
  }

  // Password validation
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else {
    if (password.length < PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      errors.push(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);
    }
    // Check for password strength
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      success: false,
      error: 'VALIDATION_ERROR',
      details: errors 
    });
  }

  // Sanitize email
  req.body.email = validator.normalizeEmail(email, {
    gmail_remove_dots: false,
    gmail_remove_subaddress: false
  });

  next();
}

/**
 * Validate login input
 */
export function validateLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string' || !validator.isEmail(email)) {
    errors.push('Valid email is required');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      success: false,
      error: 'VALIDATION_ERROR',
      details: errors 
    });
  }

  req.body.email = email.toLowerCase().trim();
  next();
}

/**
 * Validate password reset request
 */
export function validateResetRequest(req, res, next) {
  const { email } = req.body;

  if (!email || typeof email !== 'string' || !validator.isEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      details: ['Valid email is required']
    });
  }

  req.body.email = email.toLowerCase().trim();
  next();
}

/**
 * Validate password reset completion
 */
export function validateResetPassword(req, res, next) {
  const { token, password } = req.body;
  const errors = [];

  if (!token || typeof token !== 'string') {
    errors.push('Reset token is required');
  }

  if (!password || typeof password !== 'string') {
    errors.push('New password is required');
  } else {
    if (password.length < PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      errors.push(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      details: errors
    });
  }

  next();
}
