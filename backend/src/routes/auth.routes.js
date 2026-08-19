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

router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const user = await User.create({
      username,
      email,
      password,
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
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
