const express = require('express');
const router = express.Router();

const publicRoutes = require('./public/routes/catalog.routes');

router.use('/', publicRoutes);

module.exports = router;
