import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SnackbarProvider } from './context/SnackbarContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import POSLayout from './layouts/POSLayout';

// Public Pages
import HomePage from './pages/public/HomePage';
import ShopPage from './pages/public/ShopPage';
import ProductPage from './pages/public/ProductPage';
import CartPage from './pages/public/CartPage';
import CheckoutPage from './pages/public/CheckoutPage';
import OrderConfirmationPage from './pages/public/OrderConfirmationPage';
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';
import CateringPage from './pages/public/CateringPage';
import FAQPage from './pages/public/FAQPage';
import PoliciesPage from './pages/public/PoliciesPage';
import KnowledgeBasePage from './pages/public/KnowledgeBasePage';
import KBArticlePage from './pages/public/KBArticlePage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import AccountPage from './pages/public/AccountPage';
import OrderHistoryPage from './pages/public/OrderHistoryPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import AdminProducts from './pages/admin/AdminProducts';
import AdminProductEdit from './pages/admin/AdminProductEdit';
import AdminCategories from './pages/admin/AdminCategories';
import AdminInventory from './pages/admin/AdminInventory';
import AdminScheduling from './pages/admin/AdminScheduling';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminPromos from './pages/admin/AdminPromos';
import AdminKnowledgeBase from './pages/admin/AdminKnowledgeBase';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminSettings from './pages/admin/AdminSettings';
import AdminAI from './pages/admin/AdminAI';

// POS
import POSScreen from './pages/pos/POSScreen';

// Guards
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                {/* Public Routes */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/shop/:category" element={<ShopPage />} />
                  <Route path="/product/:slug" element={<ProductPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/catering" element={<CateringPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/policies" element={<PoliciesPage />} />
                  <Route path="/policies/:slug" element={<PoliciesPage />} />
                  <Route path="/kb" element={<KnowledgeBasePage />} />
                  <Route path="/kb/:slug" element={<KBArticlePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
                  <Route path="/orders" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={<ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN', 'MANAGER']}><AdminLayout /></ProtectedRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="orders/:id" element={<AdminOrderDetail />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="products/new" element={<AdminProductEdit />} />
                  <Route path="products/:id/edit" element={<AdminProductEdit />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="inventory" element={<AdminInventory />} />
                  <Route path="scheduling" element={<AdminScheduling />} />
                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="promos" element={<AdminPromos />} />
                  <Route path="knowledge-base" element={<AdminKnowledgeBase />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="ai" element={<AdminAI />} />
                </Route>

                {/* POS Routes */}
                <Route path="/pos" element={<POSLayout />}>
                  <Route index element={<POSScreen />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
