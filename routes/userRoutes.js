const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

router.use(authController.protect);

router.get('/images/:key', userController.getUserProfilePhoto);
router.patch('/updatePassword', authController.updatePassword);
router.patch(
  '/updateMe',
  userController.uploadPhoto,
  userController.resizeImg,
  userController.updateMe
);
router.get('/aboutMe', userController.aboutMe, userController.getOneUser);
router.delete('/deleteMe', userController.deleteMe);

module.exports = router;
