import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      try {
        setAuth({ token, user: JSON.parse(user) });
      } catch (error) {
        console.error('Failed to parse user from localStorage:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const addNotification = (message, type = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setAuth({ token, user });
      addNotification('Login successful!', 'success');
      navigate('/personal');
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to login. Please try again.';
      addNotification(errorMessage, 'error');
      throw new Error(errorMessage);
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', { name, email, password });
      const { token, user } = res.data;
      // Do not log in automatically; just show a success message and redirect to login
      addNotification('Registration successful! Please log in.', 'success');
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to register. Please try again.';
      addNotification(errorMessage, 'error');
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth(null);
    addNotification('Logged out successfully!', 'success');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ auth, login, register, logout, loading, notifications, addNotification }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);