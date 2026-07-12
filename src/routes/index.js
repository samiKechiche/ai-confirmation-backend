const express = require('express');
const orderRoutes = require('./orderRoutes');

const router = express.Router();

/**
 * Mount all API routes under /api/v1
 */
router.use('/orders', orderRoutes);

module.exports = router;