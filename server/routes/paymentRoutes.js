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
import { optionalCheckoutCustomer, paymentOwner, protectCustomerRoute, requireOwnership, requirePermission } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { PERMISSIONS } from "../config/auth.js";

const router = express.Router();
const handle = (controller) => (request, response, next) =>
  Promise.resolve(controller(request, response, next)).catch(next);

router.post(
  "/create-order",
  optionalCheckoutCustomer,
  createPaymentValidators,
  validate,
  handle(createPaymentOrder),
);
router.post(
  "/cash-on-delivery",
  optionalCheckoutCustomer,
  createPaymentValidators,
  validate,
  handle(createCashOnDeliveryOrder),
);
router.post(
  "/verify",
  paymentOwner,
  verifyPaymentValidators,
  validate,
  handle(verifyPayment),
);
router.post(
  "/failure",
  paymentOwner,
  failurePaymentValidators,
  validate,
  handle(recordPaymentFailure),
);
router.get("/:paymentId", protectCustomerRoute, requirePermission(PERMISSIONS.CUSTOMER_ORDERS_READ), requireOwnership('payment', (request) => request.params.paymentId), handle(getPayment));

export default router;
