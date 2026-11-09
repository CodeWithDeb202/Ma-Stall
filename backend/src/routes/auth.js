const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const { OAuth2Client } = require('google-auth-library');
const uploadProfileImage = require('../middleware/uploadProfileImage');
const downloadGoogleProfileImage = require('../middleware/downloadGoogleProfileImage');
const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function setSessionCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('ma_stall_session', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
}

function createSessionToken(role = 'admin', userId = '') {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) throw new Error('SESSION_SECRET is missing');
  if (role !== 'admin' && role !== 'user') throw new Error('Invalid session role');
  const issuedAt = Date.now().toString();
  const nonce = crypto.randomUUID();
  const payload = `${issuedAt}.${nonce}.${role}.${userId || '-'}`;
  const signature = crypto.createHmac('sha256', sessionSecret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

async function createUniqueGoogleUsername(displayName) {
  const baseName = displayName.trim().slice(0, 80);
  let username = baseName;
  let suffix = 2;

  while (await User.exists({ username })) {
    const suffixText = ' ' + suffix;
    username = baseName.slice(0, 80 - suffixText.length) + suffixText;
    suffix += 1;
  }

  return username;
}

// Public user registration. Role is always user; client-supplied roles are ignored.
router.post('/register', async (req, res) => {
  try {
    const username =
      typeof req.body?.username === 'string'
        ? req.body.username.trim().toLowerCase()
        : '';
    const password =
      typeof req.body?.password === 'string' ? req.body.password : '';

    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3–30 characters using letters, numbers, or underscores.',
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Password must be between 8 and 128 characters.',
      });
    }

    const existingUser = await User.findOne({ username }).select('_id');

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'This username is already taken. Please choose another.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      username,
      password: hashedPassword,
      role: 'user',
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful. You can now log in.',
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This username is already taken. Please choose another.',
      });
    }

    console.error('[AUTH REGISTER] Registration failed', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to register right now. Please try again.',
    });
  }
});

// User login using username and password.
router.post('/login', async (req, res) => {
  try {
    const username =
      typeof req.body?.username === 'string'
        ? req.body.username.trim().toLowerCase()
        : '';
    const password =
      typeof req.body?.password === 'string' ? req.body.password : '';

    if (!/^[a-z0-9_]{3,30}$/.test(username) || !password || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid username and password.',
      });
    }

    const user = await User.findOne({ username }).select('+password username role');

    if (!user || user.role !== 'user' || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    setSessionCookie(res, createSessionToken("user", user._id.toString()));

    return res.json({
      success: true,
      message: 'Login successful.',
      user: {
        username: user.username,
        name: user.name || user.username,
        email: user.email || '',
        profileImage: user.profileImage || '',
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[AUTH LOGIN] Login failed', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to log in right now. Please try again.',
    });
  }
});

// Google Sign-In. Existing local accounts are never linked by email alone.
router.post('/google', async (req, res) => {
  try {
    const credential = typeof req.body?.credential === 'string' ? req.body.credential : '';
    if (!credential || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({ success: false, message: 'Google sign-in is not configured correctly.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({ success: false, message: 'Google account verification failed.' });
    }

    let user = await User.findOne({ googleId: payload.sub }).select('+password');

    if (user && user.role !== 'user') {
      return res.status(403).json({ success: false, message: 'This account cannot sign in here.' });
    }

    if (!user) {
      const displayName = typeof payload.name === 'string' && payload.name.trim()
        ? payload.name.trim()
        : payload.email.split('@')[0];
      const username = await createUniqueGoogleUsername(displayName);
      let profileImage = '';
      let profileImagePublicId = '';

      if (typeof payload.picture === 'string' && payload.picture) {
        try {
          const imageBuffer = await downloadGoogleProfileImage(payload.picture);
          const uploadedImage = await uploadProfileImage(imageBuffer);
          profileImage = uploadedImage.url;
          profileImagePublicId = uploadedImage.publicId;
        } catch (imageError) {
          console.error('[AUTH GOOGLE] Profile image upload failed:', imageError.message);
        }
      }

      user = await User.create({
        username,
        googleId: payload.sub,
        email: payload.email,
        name: displayName,
        profileImage,
        profileImagePublicId,
        role: 'user',
      });
    } else if (!user.profileImage && typeof payload.picture === 'string' && payload.picture) {
      try {
        const imageBuffer = await downloadGoogleProfileImage(payload.picture);
        const uploadedImage = await uploadProfileImage(imageBuffer);
        user.profileImage = uploadedImage.url;
        user.profileImagePublicId = uploadedImage.publicId;
        await user.save();
      } catch (imageError) {
        console.error('[AUTH GOOGLE] Profile image upload failed:', imageError.message);
      }
    }

    setSessionCookie(res, createSessionToken('user', user._id.toString()));
    return res.json({
      success: true,
      message: 'Google sign-in successful.',
      user: {
        id: user._id,
        username: user.username,
        name: user.name || user.username,
        email: user.email,
        profileImage: user.profileImage || '',
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[AUTH GOOGLE] Sign-in failed:', error.message);
    return res.status(401).json({ success: false, message: 'Unable to sign in with this Google account.' });
  }
});

// Existing admin secret-code login, kept compatible with current sessions.
router.post('/verify', (req, res) => {
  const { secretCode } = req.body || {};
  const expectedCode = process.env.ACCESS_CODE;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!expectedCode || !sessionSecret) {
    return res.status(500).json({
      success: false,
      message: 'Authentication is not configured',
    });
  }

  if (typeof secretCode !== 'string' || secretCode.length > 200) {
    return res.status(400).json({ success: false });
  }

  const supplied = Buffer.from(secretCode);
  const expected = Buffer.from(expectedCode);

  if (
    supplied.length !== expected.length ||
    !crypto.timingSafeEqual(supplied, expected)
  ) {
    return res.status(401).json({
      success: false,
      message: 'Invalid secret code.',
    });
  }

  try {
    setSessionCookie(res, createSessionToken("admin"));
    return res.json({ success: true });
  } catch (error) {
    console.error('[AUTH VERIFY] Session creation failed', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication is not configured',
    });
  }
});

router.get('/session', require('../middleware/requireAuth'), (req, res) => {
  res.json({ success: true, authenticated: true, role: req.auth.role, userId: req.auth.userId });
});


// Logout: clear the browser's session cookie.
router.post('/logout', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie('ma_stall_session', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });

  return res.json({ success: true, message: 'Logged out successfully.' });
});

// All account-management routes require an authenticated normal user.
const requireAuth = require('../middleware/requireAuth');

function requireUser(req, res, next) {
  if (req.auth?.role !== 'user' || !req.auth?.userId) {
    return res.status(403).json({
      success: false,
      message: 'User account access required.',
    });
  }
  next();
}


// Return the authenticated user's own account details.
router.get('/account', requireAuth, requireUser, async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.auth.userId,
      role: 'user',
    }).select('username name email profileImage role');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    return res.json({
      success: true,
      user: {
        username: user.username,
        name: user.name || user.username,
        email: user.email || '',
        profileImage: user.profileImage || '',
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[AUTH ACCOUNT FETCH] Failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load your account right now.',
    });
  }
});

// Update the authenticated user's username and/or password.
router.patch('/account', requireAuth, requireUser, async (req, res) => {
  try {
    const currentPassword =
      typeof req.body?.currentPassword === 'string'
        ? req.body.currentPassword
        : '';
    const username =
      typeof req.body?.username === 'string'
        ? req.body.username.trim().toLowerCase()
        : '';
    const newPassword =
      typeof req.body?.newPassword === 'string'
        ? req.body.newPassword
        : '';

    if (!currentPassword || currentPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Enter your current password.',
      });
    }

    if (username && !/^[a-z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3–30 characters using letters, numbers, or underscores.',
      });
    }

    if (newPassword && (newPassword.length < 8 || newPassword.length > 128)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be between 8 and 128 characters.',
      });
    }

    if (!username && !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Provide a new username or a new password.',
      });
    }

    const user = await User.findOne({
      _id: req.auth.userId,
      role: 'user',
    }).select('+password username role');

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    if (username && username !== user.username) {
      const existingUser = await User.findOne({
        username,
        _id: { $ne: user._id },
      }).select('_id');

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'This username is already taken.',
        });
      }

      user.username = username;
    }

    if (newPassword) {
      user.password = await bcrypt.hash(newPassword, 12);
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Account updated successfully.',
      user: { username: user.username, role: user.role },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This username is already taken.',
      });
    }

    console.error('[AUTH ACCOUNT UPDATE] Failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to update your account right now.',
    });
  }
});

// Delete only the authenticated user's own account.
router.delete('/account', requireAuth, requireUser, async (req, res) => {
  try {
    const currentPassword =
      typeof req.body?.currentPassword === 'string'
        ? req.body.currentPassword
        : '';

    const user = await User.findOne({
      _id: req.auth.userId,
      role: 'user',
    }).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    // Google-authenticated users do not have a password.
    // Password-based users must verify their current password.
    if (!user.googleId) {
      if (!currentPassword || currentPassword.length > 128) {
        return res.status(400).json({
          success: false,
          message: 'Enter your current password to delete your account.',
        });
      }

      if (!user.password || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect.',
        });
      }
    }

    await User.deleteOne({ _id: user._id, role: 'user' });

    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('ma_stall_session', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });

    return res.json({
      success: true,
      message: 'Your account has been deleted.',
    });
  } catch (error) {
    console.error('[AUTH ACCOUNT DELETE] Failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to delete your account right now.',
    });
  }
});

module.exports = router;
