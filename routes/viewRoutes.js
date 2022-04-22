const express = require('express');
const viewController = require('../controllers/viewController');

router = express.Router();

router.get('/', viewController.getOverview);

module.exports = router;
