import { Routes, Route, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { CartProvider, useCart } from './context/CartContext.jsx';
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
import NotificationsPage from './pages/NotificationsPage.jsx';
import FavoritesPage from './pages/FavoritesPage.jsx';
import AdminOrdersPage from './pages/AdminOrdersPage.jsx';
import AdminOrderReadyPage from './pages/AdminOrderReadyPage.jsx';
import AdminOrderCompletedPage from './pages/AdminOrderCompletedPage.jsx';
import AdminDemandPage from './pages/AdminDemandPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import NotificationBell from './components/NotificationBell.jsx';

function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="brand">Foodiq</Link>
      <div className="nav-links">
        {user ? (
          user.role === 'admin' ? (
            <>
              <NavLink to="/admin/orders">Orders</NavLink>
              <NavLink to="/admin/order-ready">Order Ready</NavLink>
              <NavLink to="/admin/order-completed">Order Completed</NavLink>
              <NavLink to="/admin/demand">Demand Analysis</NavLink>
              <a
                href="#logout"
                onClick={(e) => {
                  e.preventDefault();
                  logout();
                  navigate('/logout');
                }}
              >
                Logout
              </a>
            </>
          ) : (
            <>
              <NavLink to="/menu">Menu</NavLink>
              <NavLink to="/cart" className="cart-link">
                Cart
                {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
              </NavLink>
              <NavLink to="/queue">Queue</NavLink>
              <NotificationBell />
              <NavLink to="/orders">Orders</NavLink>
              <NavLink to="/favorites">Favorites</NavLink>
              <a
                href="#logout"
                onClick={(e) => {
                  e.preventDefault();
                  logout();
                  navigate('/logout');
                }}
              >
                Logout
              </a>
            </>
          )
        ) : (
          <>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register">Register</NavLink>
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
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
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
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
