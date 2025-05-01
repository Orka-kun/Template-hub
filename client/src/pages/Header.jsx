import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

// Debounce utility to prevent rapid API calls
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    return new Promise((resolve) => {
      timeoutId = setTimeout(async () => {
        const result = await func(...args);
        resolve(result);
      }, delay);
    });
  };
};

function Header({ changeLanguage }) {
  const { t, i18n } = useTranslation();
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');
  const [error, setError] = useState(null);

  // Memoize navigate and logout
  const memoizedNavigate = useCallback(navigate, []);
  const memoizedLogout = useCallback(logout, []);

  // Debounced fetchProfile function
  const fetchProfile = useCallback(
    debounce(async () => {
      try {
        const res = await axios.get('/api/auth/profile', {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        setTheme(res.data.theme_preference || 'light');
        setLanguage(res.data.language_preference || 'en');
        i18n.changeLanguage(res.data.language_preference || 'en');
        document.documentElement.classList.toggle('dark', res.data.theme_preference === 'dark');
      } catch (err) {
        console.error('Failed to fetch profile:', err.response?.data?.error || err.message);
        setError(t('header.error_fetching_profile', { error: err.response?.data?.error || err.message }));
        if (err.response?.status === 401) {
          memoizedLogout();
          memoizedNavigate('/login');
        }
      }
    }, 500), // 500ms debounce delay
    [auth?.token, i18n, memoizedNavigate, memoizedLogout, t]
  );

  useEffect(() => {
    if (!auth?.token) return;

    fetchProfile();
  }, [auth?.token, fetchProfile]);

  const toggleTheme = useCallback(
    debounce(async () => {
      if (!auth?.token) {
        memoizedNavigate('/login');
        return;
      }
      const newTheme = theme === 'light' ? 'dark' : 'light';
      try {
        await axios.put(
          '/api/auth/profile',
          { theme_preference: newTheme },
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
        setTheme(newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
      } catch (err) {
        console.error('Failed to update theme preference:', err.response?.data?.error || err.message);
        setError(t('header.error_updating_theme', { error: err.response?.data?.error || err.message }));
        if (err.response?.status === 401) {
          memoizedLogout();
          memoizedNavigate('/login');
        }
      }
    }, 500),
    [auth?.token, theme, memoizedNavigate, memoizedLogout, t]
  );

  const handleLanguageChange = useCallback(
    debounce(async (lang) => {
      if (!auth?.token) {
        memoizedNavigate('/login');
        return;
      }
      try {
        await axios.put(
          '/api/auth/profile',
          { language_preference: lang },
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
        setLanguage(lang);
        i18n.changeLanguage(lang);
        changeLanguage(lang);
      } catch (err) {
        console.error('Failed to update language preference:', err.response?.data?.error || err.message);
        setError(t('header.error_updating_language', { error: err.response?.data?.error || err.message }));
        if (err.response?.status === 401) {
          memoizedLogout();
          memoizedNavigate('/login');
        }
      }
    }, 500),
    [auth?.token, i18n, changeLanguage, memoizedNavigate, memoizedLogout, t]
  );

  const handleLogout = () => {
    memoizedLogout();
    memoizedNavigate('/login');
  };

  return (
    <header className="bg-gray-900 text-white shadow-md">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between items-center h-16">
      <h1 className="text-2xl font-semibold tracking-wide">{t('app.title')}</h1>

      {error && <p className="text-red-400 text-sm absolute top-4 right-4">{error}</p>}

      <nav className="flex items-center space-x-4">
        <Link to="/" className="hover:text-gray-300 transition">{t('header.home')}</Link>

        {auth?.token ? (
          <>
            <Link to="/personal" className="hover:text-gray-300 transition">{t('header.personal')}</Link>
            <button
              onClick={handleLogout}
              className="hover:text-red-400 transition"
            >
              {t('header.logout')}
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:text-blue-300 transition">{t('header.login')}</Link>
            <Link to="/register" className="hover:text-blue-300 transition">{t('header.register')}</Link>
          </>
        )}

        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="bg-gray-800 text-white px-2 py-1 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="en">{t('header.english')}</option>
          <option value="es">{t('header.spanish')}</option>
        </select>

        {/* Uncomment this for theme toggle if needed */}
        {/* 
        <button
          onClick={toggleTheme}
          className="ml-2 bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600 transition"
        >
          {theme === 'dark' ? t('header.light') : t('header.dark')}
        </button> 
        */}
      </nav>
    </div>
  </div>
</header>


  );
}

export default Header;