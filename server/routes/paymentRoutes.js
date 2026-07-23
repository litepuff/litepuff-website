import express from "express";
import {
  createCashOnDeliveryOrder,
  createPaymentOrder,
  createPaymentValidators,
  failurePaymentValidators,
  getPayment,
  recordPaymentFailure,
  verifyPayment,
  verifyPaymentValidators,
} from "../controllers/paymentController.js";
import { protectCustomerRoute, requireOwnership, requirePermission } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { PERMISSIONS } from "../config/auth.js";

const router = express.Router();
const handle = (controller) => (request, response, next) =>
  Promise.resolve(controller(request, response, next)).catch(next);

router.post(
  "/create-order",
  protectCustomerRoute,
  createPaymentValidators,
  validate,
  handle(createPaymentOrder),
);
router.post(
  "/cash-on-delivery",
  protectCustomerRoute,
  createPaymentValidators,
  validate,
  handle(createCashOnDeliveryOrder),
);
router.post(
  "/verify",
  protectCustomerRoute,
  requirePermission(PERMISSIONS.CUSTOMER_ORDERS_READ),
  verifyPaymentValidators,
  validate,
  handle(verifyPayment),
);
router.post(
  "/failure",
  protectCustomerRoute,
  requirePermission(PERMISSIONS.CUSTOMER_ORDERS_READ),
  failurePaymentValidators,
  validate,
  handle(recordPaymentFailure),
);
router.get("/:paymentId", protectCustomerRoute, requirePermission(PERMISSIONS.CUSTOMER_ORDERS_READ), requireOwnership('payment', (request) => request.params.paymentId), handle(getPayment));

export default router;
