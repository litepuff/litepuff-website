import MainLayout from '../layouts/MainLayout.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import { Navigate } from 'react-router-dom';
import { lazy } from 'react';
import CustomerProtectedRoute from './CustomerProtectedRoute.jsx';

const Home = lazy(() => import('../pages/Home.jsx'));
const AboutPage = lazy(() => import('../pages/AboutPage.jsx'));
const ProductsRoute = lazy(() => import('../pages/ProductsRoute.jsx'));
const Shop = lazy(() => import('../pages/Shop.jsx'));
const ProductDetailsPage = lazy(() => import('../pages/ProductDetailsPage.jsx'));
const Contact = lazy(() => import('../pages/Contact.jsx'));
const PrivacyPolicyPage = lazy(() => import('../pages/PrivacyPolicyPage.jsx'));
const ShippingPolicyPage = lazy(() => import('../pages/ShippingPolicyPage.jsx'));
const ReturnsPolicyPage = lazy(() => import('../pages/ReturnsPolicyPage.jsx'));
const TermsPage = lazy(() => import('../pages/TermsPage.jsx'));
const RefundPolicyPage = lazy(() => import('../pages/RefundPolicyPage.jsx'));
const FAQPage = lazy(() => import('../pages/FAQPage.jsx'));
const Journal = lazy(() => import('../pages/Journal.jsx'));
const BlogDetails = lazy(() => import('../pages/BlogDetails.jsx'));
const Cart = lazy(() => import('../pages/Cart.jsx'));
const Checkout = lazy(() => import('../pages/Checkout.jsx'));
const OrderSuccess = lazy(() => import('../pages/OrderSuccess.jsx'));
const OrderTracking = lazy(() => import('../pages/OrderTracking.jsx'));
const LoginPage = lazy(() => import('../pages/LoginPage.jsx'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword.jsx'));
const Profile = lazy(() => import('../pages/Profile.jsx'));
const AdminLoginPage = lazy(() => import('../pages/admin/AdminLoginPage.jsx'));
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage.jsx'));
const AdminProductsPage = lazy(() => import('../pages/admin/AdminProductsPage.jsx'));
const AdminBlogsPage = lazy(() => import('../pages/admin/AdminBlogsPage.jsx'));
const AdminOrdersPage = lazy(() => import('../pages/admin/AdminOrdersPage.jsx'));
const AdminCustomersPage = lazy(() => import('../pages/admin/AdminCustomersPage.jsx'));
const AdminInventoryPage = lazy(() => import('../pages/admin/AdminInventoryPage.jsx'));
const AdminReviewsPage = lazy(() => import('../pages/admin/AdminReviewsPage.jsx'));
const AdminCouponsPage = lazy(() => import('../pages/admin/AdminCouponsPage.jsx'));
const AdminContactMessagesPage = lazy(() => import('../pages/admin/AdminContactMessagesPage.jsx'));
const AdminNewsletterPage = lazy(() => import('../pages/admin/AdminNewsletterPage.jsx'));
const AdminAnalyticsPage = lazy(() => import('../pages/admin/AdminAnalyticsPage.jsx'));
const AdminProfilePage = lazy(() => import('../pages/admin/AdminProfilePage.jsx'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx'));

export const appRoutes = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'products', element: <ProductsRoute /> },
      { path: 'shop', element: <Shop /> },
      { path: 'our-snacks', element: <Navigate to="/shop" replace /> },
      { path: 'products/:slug', element: <ProductDetailsPage /> },
      { path: 'contact', element: <Contact /> },
      { path: 'privacy-policy', element: <PrivacyPolicyPage /> },
      { path: 'shipping-policy', element: <ShippingPolicyPage /> },
      { path: 'returns-policy', element: <ReturnsPolicyPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'refund-policy', element: <RefundPolicyPage /> },
      { path: 'faq', element: <FAQPage /> },
      { path: 'blog', element: <Journal /> },
      { path: 'blog/:slug', element: <BlogDetails /> },
      { path: 'cart', element: <Cart /> },
      { path: 'checkout', element: <Checkout /> },
      { path: 'order-success/:orderId', element: <CustomerProtectedRoute><OrderSuccess /></CustomerProtectedRoute> },
      { path: 'orders/:orderId', element: <CustomerProtectedRoute><OrderTracking /></CustomerProtectedRoute> },
      { path: 'login', element: <LoginPage /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'profile', element: <CustomerProtectedRoute><Profile /></CustomerProtectedRoute> }
    ]
  },
  { path: '/admin-login', element: <Navigate to="/admin/login" replace /> },
  { path: '/admin/login', element: <AdminLoginPage /> },
  {
    path: '/admin',
    element: <ProtectedRoute><AdminLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'products', element: <AdminProductsPage /> },
      { path: 'blogs', element: <AdminBlogsPage /> },
      { path: 'orders', element: <AdminOrdersPage /> },
      { path: 'customers', element: <AdminCustomersPage /> },
      { path: 'inventory', element: <AdminInventoryPage /> },
      { path: 'reviews', element: <AdminReviewsPage /> },
      { path: 'coupons', element: <AdminCouponsPage /> },
      { path: 'contact-messages', element: <AdminContactMessagesPage /> },
      { path: 'newsletter', element: <AdminNewsletterPage /> },
      { path: 'analytics', element: <AdminAnalyticsPage /> },
      { path: 'profile', element: <AdminProfilePage /> }
    ]
  },
  { path: '*', element: <NotFoundPage /> }
];
