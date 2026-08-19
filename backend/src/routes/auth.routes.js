const express = require('express');
const User = require('../models/User');
const { authenticate, signToken } = require('../middleware/auth');

const router = express.Router();

function authResponse(user) {
  return {
    token: signToken(user),
    user
  };
}

function validationFailed(res, details) {
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    details
  });
}

function validateEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function validateRegisterPayload(payload) {
  const details = {};
  const username = String(payload.username || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');

  if (!username) {
    details.username = 'Username is required';
  } else if (username.length < 3) {
    details.username = 'Username must be at least 3 characters';
  } else if (username.length > 60) {
    details.username = 'Username cannot exceed 60 characters';
  }

  if (!email) {
    details.email = 'Email is required';
  } else if (!validateEmail(email)) {
    details.email = 'Please provide a valid email';
  }

  if (!password.trim()) {
    details.password = 'Password is required';
  } else if (password.length < 6) {
    details.password = 'Password must be at least 6 characters';
  }

  if (Object.keys(details).length) {
    return { details };
  }

  return { sanitized: { username, email, password } };
}

function validateLoginPayload(payload) {
  const details = {};
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');

  if (!email) {
    details.email = 'Email is required';
  } else if (!validateEmail(email)) {
    details.email = 'Please provide a valid email';
  }

  if (!password.trim()) {
    details.password = 'Password is required';
  }

  if (Object.keys(details).length) {
    return { details };
  }

  return { sanitized: { email, password } };
}

router.post('/register', async (req, res, next) => {
  try {
    const { sanitized, details } = validateRegisterPayload(req.body);

    if (details) {
      return validationFailed(res, details);
    }

    const user = await User.create({
      username: sanitized.username,
      email: sanitized.email,
      password: sanitized.password,
      role: 'Employee',
      teamLead: null
    });

    res.status(201).json({ success: true, data: authResponse(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { sanitized, details } = validateLoginPayload(req.body);

    if (details) {
      return validationFailed(res, details);
    }

    const user = await User.findOne({ email: sanitized.email }).select('+password');

    if (!user || !(await user.comparePassword(sanitized.password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({ success: true, data: authResponse(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

module.exports = router;
