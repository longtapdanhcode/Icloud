const { Router } = require('express');
const productsController = require('./products.controller');

// Module: products — phụ trách: Người 1
const router = Router();

router.get('/', productsController.getProducts);
router.get('/:id', productsController.getProductById);

module.exports = router;
