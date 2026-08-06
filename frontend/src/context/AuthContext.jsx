import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client.js';
import { reconnectSocket, disconnectSocket } from '../socket.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.data);
        setFavorites((res.data.data.favorites || []).map((id) => String(id)));
      })
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const setAuth = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setFavorites((userData.favorites || []).map((id) => String(id)));
    reconnectSocket();
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  };

  const verifyOtp = async (email, otp) => {
    const { data } = await api.post('/auth/verify-otp', { email, otp });
    return data;
  };

  const resendOtp = async (email) => {
    const { data } = await api.post('/auth/resend-otp', { email });
    return data;
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuth(data.data.token, data.data.user);
    return data.data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    disconnectSocket();
    setUser(null);
    setFavorites([]);
  };

  const toggleFavorite = async (foodItemId) => {
    const id = String(foodItemId);
    const isFav = favorites.includes(id);
    // optimistic update
    setFavorites((prev) =>
      isFav ? prev.filter((f) => f !== id) : [...prev, id]
    );
    try {
      const { data } = await api.post(`/auth/favorites/${id}`);
      setFavorites((data.data || []).map((f) => String(f)));
    } catch {
      // roll back on failure
      setFavorites((prev) =>
        isFav ? [...prev, id] : prev.filter((f) => f !== id)
      );
    }
  };

  const isFavorite = (foodItemId) => favorites.includes(String(foodItemId));

  return (
    <AuthContext.Provider
      value={{ user, loading, register, verifyOtp, resendOtp, login, logout, favorites, toggleFavorite, isFavorite }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
