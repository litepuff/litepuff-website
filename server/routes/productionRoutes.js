import express from 'express';
import {
  backupController,
  createShipmentController,
  downloadBackupController,
  exportReportController,
  getAdminPaymentController,
  listBackupsController,
  liveTrackingController,
  refundPlaceholder,
  restoreBackupController,
} from '../controllers/productionController.js';
import { protectAdminRoute, protectCustomerRoute, requireOwnership, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../config/auth.js';

const router = express.Router();
const handle = (controller) => (request, response, next) => Promise.resolve(controller(request, response, next)).catch(next);

router.get('/shipping/tracking/:orderId', protectCustomerRoute, requirePermission(PERMISSIONS.CUSTOMER_ORDERS_READ), requireOwnership('order', (request) => request.params.orderId), handle(liveTrackingController));

router.use('/admin', protectAdminRoute);
router.post('/admin/shipments/:orderId', requirePermission(PERMISSIONS.ADMIN_SHIPPING_MANAGE), handle(createShipmentController));
router.post('/admin/payments/:orderId/refund', requirePermission(PERMISSIONS.ADMIN_ORDERS_MANAGE), handle(refundPlaceholder));
router.get('/admin/payments/:id', requirePermission(PERMISSIONS.ADMIN_ORDERS_READ), handle(getAdminPaymentController));
router.get('/admin/reports/:type', requirePermission(PERMISSIONS.ADMIN_REPORTS_VIEW), handle(exportReportController));
router.post('/admin/backups', requirePermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE), handle(backupController));
router.get('/admin/backups', requirePermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE), handle(listBackupsController));
router.get('/admin/backups/:fileName', requirePermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE), handle(downloadBackupController));
router.post('/admin/backups/:fileName/restore', requirePermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE), handle(restoreBackupController));

export default router;
