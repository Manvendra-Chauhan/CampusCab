const express = require('express');
const { getUsers, getRides, deleteUser, suspendDriver, getStats } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/users', getUsers);
router.get('/rides', getRides);
router.delete('/user/:id', deleteUser);
router.put('/suspend/:id', suspendDriver);
router.get('/stats', getStats);

module.exports = router;
