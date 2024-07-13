const express = require('express');
const { getUsers, registerUser, deleteUser, updateUser, getUserProfile } = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/').get(protect, admin, getUsers).post(protect, admin, registerUser);
router.route('/:id').delete(protect, admin, deleteUser).put(protect, admin, updateUser);
router.route('/profile').get(protect, getUserProfile);

module.exports = router;
