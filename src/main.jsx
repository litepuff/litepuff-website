import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { CustomerAuthProvider } from './context/CustomerAuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import MetaPixelProvider from './analytics/MetaPixelProvider.jsx';
import './assets/styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <MetaPixelProvider>
          <AuthProvider>
            <CustomerAuthProvider>
              <ToastProvider><CartProvider><App /></CartProvider></ToastProvider>
            </CustomerAuthProvider>
          </AuthProvider>
        </MetaPixelProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
