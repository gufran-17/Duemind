const express  = require('express');
const { body } = require('express-validator');
const router   = express.Router();
const auth     = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], auth.register);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], auth.login);

router.get('/me', protect, auth.getMe);
router.put('/change-password', protect, auth.changePassword);

module.exports = router;