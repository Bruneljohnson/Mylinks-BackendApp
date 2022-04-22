const express = require('express');
const shortUrlController = require('../controllers/urlController');
const authController = require('../controllers/authController');

const router = express.Router();

//TOP 5 USED LINKS
router
  .route('/mytop5')
  .get(
    authController.protect,
    shortUrlController.top5visited,
    shortUrlController.getAllUrlShorts
  );

router
  .route('/')
  .get(
    authController.protect,
    authController.restrictTo('user', 'admin'),
    shortUrlController.getAllUrlShorts
  )
  .post(
    authController.protect,
    shortUrlController.setUserId,
    shortUrlController.createNewUrlShort
  );

router
  .route('/:myurl')
  .get(shortUrlController.getSingleShortUrl)
  .delete(
    authController.protect,
    authController.restrictTo('user', 'admin'),
    shortUrlController.deleteShortUrl
  );

module.exports = router;
