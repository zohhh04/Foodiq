import { useState } from 'react';
import { Routes, Route, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { CartProvider, useCart } from './context/CartContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import HomePage from './pages/HomePage.jsx';
import MenuPage from './pages/MenuPage.jsx';
import CartPage from './pages/CartPage.jsx';
import QueuePage from './pages/QueuePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import VerifyOtpPage from './pages/VerifyOtpPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import LogoutPage from './pages/LogoutPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import FavoritesPage from './pages/FavoritesPage.jsx';
import RatingPage from './pages/RatingPage.jsx';
import LiveTrackingPage from './pages/LiveTrackingPage.jsx';
import NotificationBell from './components/NotificationBell.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import AiAssistant from './components/AiAssistant.jsx';
import AdminOrdersPage from './pages/AdminOrdersPage.jsx';
import AdminOrderReadyPage from './pages/AdminOrderReadyPage.jsx';
import AdminOrderCompletedPage from './pages/AdminOrderCompletedPage.jsx';
import AdminDemandPage from './pages/AdminDemandPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx';

function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);
  const handleLogout = (e) => {
    e.preventDefault();
    closeMenu();
    logout();
    navigate('/logout');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand" onClick={closeMenu}>
        <span className="brand-logo" aria-hidden="true">🍽️</span>
        Foodiq
      </Link>
      <button
        className={`nav-hamburger${menuOpen ? ' is-open' : ''}`}
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
      >
        <span />
        <span />
        <span />
      </button>
      <div className={`nav-links${menuOpen ? ' is-open' : ''}`}>
        {user ? (
          user.role === 'admin' ? (
            <>
              <NavLink to="/admin/orders" onClick={closeMenu}>Orders</NavLink>
              <NavLink to="/admin/order-ready" onClick={closeMenu}>Order Ready</NavLink>
              <NavLink to="/admin/order-completed" onClick={closeMenu}>Order Completed</NavLink>
              <NavLink to="/admin/demand" onClick={closeMenu}>Demand Analysis</NavLink>
              <div className="nav-tools">
                <ThemeToggle />
              </div>
              <a href="#logout" onClick={handleLogout}>
                Logout
              </a>
            </>
          ) : (
            <>
              <NavLink to="/menu" onClick={closeMenu}>Menu</NavLink>
              <NavLink to="/cart" className="cart-link" onClick={closeMenu}>
                Cart
                {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
              </NavLink>
              <NavLink to="/queue" onClick={closeMenu}>Queue</NavLink>
              <NavLink to="/orders" onClick={closeMenu}>Orders</NavLink>
              <NavLink to="/tracking" onClick={closeMenu}>Live Tracking</NavLink>
              <NavLink to="/favorites" onClick={closeMenu}>Favorites</NavLink>
              <div className="nav-tools">
                <NotificationBell />
                <ThemeToggle />
              </div>
              <a href="#logout" onClick={handleLogout}>
                Logout
              </a>
            </>
          )
        ) : (
          <>
            <NavLink to="/login" onClick={closeMenu}>Login</NavLink>
            <NavLink to="/register" onClick={closeMenu}>Register</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}

function AppRoutes() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isAuth = ['/login', '/register', '/verify-otp', '/forgot-password', '/reset-password'].includes(
    location.pathname
  );
  const mainClass = isHome
    ? 'content content-home'
    : isAuth
      ? 'content content-auth'
      : 'content';

  return (
    <div className="app">
      <Navbar />
      <main className={mainClass}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/logout" element={<LogoutPage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/favorites"
            element={
              <ProtectedRoute>
                <FavoritesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracking"
            element={
              <ProtectedRoute>
                <LiveTrackingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rate/:orderId"
            element={
              <ProtectedRoute>
                <RatingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AdminRoute>
                <AdminOrdersPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/order-ready"
            element={
              <AdminRoute>
                <AdminOrderReadyPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/order-completed"
            element={
              <AdminRoute>
                <AdminOrderCompletedPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/demand"
            element={
              <AdminRoute>
                <AdminDemandPage />
              </AdminRoute>
            }
          />
        </Routes>
      </main>
      <AiAssistant />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
