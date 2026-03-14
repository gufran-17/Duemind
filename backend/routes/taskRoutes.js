const express  = require('express');
const { body } = require('express-validator');
const router   = express.Router();
const tc       = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

// All task routes are protected
router.use(protect);

router.get('/stats',     tc.getStats);
router.get('/analytics', tc.getAnalytics);
router.get('/completed', tc.getCompleted);

router.get('/',    tc.getTasks);
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('due_datetime').isISO8601().withMessage('Valid due date required')
], tc.createTask);

router.get   ('/:id',          tc.getTask);
router.put   ('/:id',          tc.updateTask);
router.delete('/:id',          tc.deleteTask);
router.patch ('/:id/complete', tc.completeTask);
router.patch ('/:id/restore',  tc.restoreTask);
router.patch ('/:id/snooze',   tc.snoozeTask);

module.exports = router;