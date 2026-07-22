import express from 'express';
import {
  adminLogin,
  adminLogout,
  createAdminBlog,
  createAdminCoupon,
  createAdminProduct,
  deleteAdminBlog,
  deleteAdminContactMessage,
  deleteAdminCoupon,
  deleteAdminNewsletterSubscriber,
  deleteAdminProduct,
  deleteAdminReview,
  duplicateAdminProduct,
  exportAdminNewsletter,
  getAdminBlogs,
  getAdminContactMessages,
  getAdminCoupons,
  getAdminCustomerById,
  getAdminCustomers,
  getAdminDashboard,
  getAdminInventory,
  getAdminNewsletter,
  getAdminOrderById,
  getAdminOrders,
  getAdminProducts,
  getAdminProfile,
  getAdminReviews,
  updateAdminBlog,
  updateAdminContactMessage,
  updateAdminCoupon,
  updateAdminCustomerStatus,
  updateAdminInventory,
  updateAdminOrderStatus,
  updateAdminProduct,
  updateAdminProfile,
  updateAdminReview
} from '../controllers/adminController.js';
import { protectAdminRoute, requirePermission } from '../middleware/authMiddleware.js';
import { activityLogger } from '../services/activityLogService.js';
import { authLimiter } from '../middleware/securityMiddleware.js';
import { adminCancelShipment, adminCreateShipment, adminTrackShipment } from '../controllers/shippingController.js';
import { PERMISSIONS } from '../config/auth.js';

const router = express.Router();
const handle = (controller) => (request, response, next) => Promise.resolve(controller(request, response, next)).catch(next);

router.post('/login', authLimiter, handle(adminLogin));
router.post('/logout', protectAdminRoute, handle(adminLogout));
router.get('/profile', protectAdminRoute, handle(getAdminProfile));
router.put('/profile', protectAdminRoute, handle(updateAdminProfile));

router.use(protectAdminRoute);

router.get('/dashboard', requirePermission(PERMISSIONS.ADMIN_DASHBOARD_VIEW), handle(getAdminDashboard));

router.get('/products', requirePermission(PERMISSIONS.ADMIN_PRODUCTS_READ), handle(getAdminProducts));
router.post('/products', requirePermission(PERMISSIONS.ADMIN_PRODUCTS_CREATE), activityLogger('Product Added', 'Products'), handle(createAdminProduct));
router.put('/products/:id', requirePermission(PERMISSIONS.ADMIN_PRODUCTS_UPDATE), activityLogger('Product Updated', 'Products', (request) => ({ id: request.params.id })), handle(updateAdminProduct));
router.delete('/products/:id', requirePermission(PERMISSIONS.ADMIN_PRODUCTS_DELETE), activityLogger('Product Deleted', 'Products', (request) => ({ id: request.params.id })), handle(deleteAdminProduct));
router.post('/products/:id/duplicate', requirePermission(PERMISSIONS.ADMIN_PRODUCTS_CREATE), activityLogger('Product Duplicated', 'Products', (request) => ({ id: request.params.id })), handle(duplicateAdminProduct));

router.get('/orders', requirePermission(PERMISSIONS.ADMIN_ORDERS_READ), handle(getAdminOrders));
router.get('/orders/:id', requirePermission(PERMISSIONS.ADMIN_ORDERS_READ), handle(getAdminOrderById));
router.put('/orders/:id/status', requirePermission(PERMISSIONS.ADMIN_ORDERS_MANAGE), activityLogger('Order Updated', 'Orders', (request) => ({ id: request.params.id, status: request.body.status })), handle(updateAdminOrderStatus));
router.post('/orders/:orderId/shipment', requirePermission(PERMISSIONS.ADMIN_SHIPPING_MANAGE), activityLogger('Shipment Created', 'Shipping'), handle(adminCreateShipment));
router.get('/orders/:orderId/shipment', requirePermission(PERMISSIONS.ADMIN_SHIPPING_MANAGE), handle(adminTrackShipment));
router.delete('/orders/:orderId/shipment', requirePermission(PERMISSIONS.ADMIN_SHIPPING_MANAGE), activityLogger('Shipment Cancelled', 'Shipping'), handle(adminCancelShipment));

router.get('/customers', requirePermission(PERMISSIONS.ADMIN_CUSTOMERS_READ), handle(getAdminCustomers));
router.get('/customers/:id', requirePermission(PERMISSIONS.ADMIN_CUSTOMERS_READ), handle(getAdminCustomerById));
router.put('/customers/:id/status', requirePermission(PERMISSIONS.ADMIN_CUSTOMERS_MANAGE), activityLogger('Customer Status Updated', 'Customers', (request) => ({ id: request.params.id, status: request.body.status })), handle(updateAdminCustomerStatus));

router.get('/inventory', requirePermission(PERMISSIONS.ADMIN_INVENTORY_READ), handle(getAdminInventory));
router.put('/inventory/:id', requirePermission(PERMISSIONS.ADMIN_INVENTORY_MANAGE), activityLogger('Inventory Updated', 'Inventory', (request) => ({ id: request.params.id })), handle(updateAdminInventory));

router.get('/reviews', requirePermission(PERMISSIONS.ADMIN_REVIEWS_MANAGE), handle(getAdminReviews));
router.put('/reviews/:id', requirePermission(PERMISSIONS.ADMIN_REVIEWS_MANAGE), activityLogger('Review Moderated', 'Reviews', (request) => ({ id: request.params.id, status: request.body.status })), handle(updateAdminReview));
router.delete('/reviews/:id', requirePermission(PERMISSIONS.ADMIN_REVIEWS_MANAGE), activityLogger('Review Deleted', 'Reviews', (request) => ({ id: request.params.id })), handle(deleteAdminReview));

router.get('/blogs', requirePermission(PERMISSIONS.ADMIN_BLOGS_READ), handle(getAdminBlogs));
router.post('/blogs', requirePermission(PERMISSIONS.ADMIN_BLOGS_MANAGE), activityLogger('Blog Created', 'Blogs'), handle(createAdminBlog));
router.put('/blogs/:id', requirePermission(PERMISSIONS.ADMIN_BLOGS_MANAGE), activityLogger('Blog Updated', 'Blogs', (request) => ({ id: request.params.id })), handle(updateAdminBlog));
router.delete('/blogs/:id', requirePermission(PERMISSIONS.ADMIN_BLOGS_MANAGE), activityLogger('Blog Deleted', 'Blogs', (request) => ({ id: request.params.id })), handle(deleteAdminBlog));

router.get('/coupons', requirePermission(PERMISSIONS.ADMIN_COUPONS_READ), handle(getAdminCoupons));
router.post('/coupons', requirePermission(PERMISSIONS.ADMIN_COUPONS_MANAGE), activityLogger('Coupon Created', 'Coupons'), handle(createAdminCoupon));
router.put('/coupons/:id', requirePermission(PERMISSIONS.ADMIN_COUPONS_MANAGE), activityLogger('Coupon Updated', 'Coupons', (request) => ({ id: request.params.id })), handle(updateAdminCoupon));
router.delete('/coupons/:id', requirePermission(PERMISSIONS.ADMIN_COUPONS_MANAGE), activityLogger('Coupon Deleted', 'Coupons', (request) => ({ id: request.params.id })), handle(deleteAdminCoupon));

router.get('/contact', requirePermission(PERMISSIONS.ADMIN_CONTACT_MANAGE), handle(getAdminContactMessages));
router.put('/contact/:id/read', requirePermission(PERMISSIONS.ADMIN_CONTACT_MANAGE), handle(updateAdminContactMessage));
router.delete('/contact/:id', requirePermission(PERMISSIONS.ADMIN_CONTACT_MANAGE), handle(deleteAdminContactMessage));

router.get('/newsletter/export', requirePermission(PERMISSIONS.ADMIN_NEWSLETTER_MANAGE), handle(exportAdminNewsletter));
router.get('/newsletter', requirePermission(PERMISSIONS.ADMIN_NEWSLETTER_MANAGE), handle(getAdminNewsletter));
router.delete('/newsletter/:id', requirePermission(PERMISSIONS.ADMIN_NEWSLETTER_MANAGE), handle(deleteAdminNewsletterSubscriber));

export default router;
