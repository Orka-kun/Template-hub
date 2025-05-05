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
  const [theme, setTheme] = useState(() => {
    // Initialize theme from localStorage for unauthenticated users
    return localStorage.getItem('theme') || 'light';
  });
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });
  const [error, setError] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // For mobile menu toggle

  // Memoize navigate and logout
  const memoizedNavigate = useCallback(navigate, []);
  const memoizedLogout = useCallback(logout, []);

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Debounced fetchProfile function
  const fetchProfile = useCallback(
    debounce(async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        const fetchedTheme = res.data.theme_preference || 'light';
        const fetchedLanguage = res.data.language_preference || 'en';
        setTheme(fetchedTheme);
        setLanguage(fetchedLanguage);
        i18n.changeLanguage(fetchedLanguage);
        document.documentElement.classList.toggle('dark', fetchedTheme === 'dark');
        localStorage.setItem('theme', fetchedTheme); // Sync localStorage with server
        localStorage.setItem('language', fetchedLanguage);
      } catch (err) {
        console.error('Failed to fetch profile:', err.response?.data?.error || err.message);
        setError(t('header.error_fetching_profile', { error: err.response?.data?.error || err.message }));
        if (err.response?.status === 401) {
          memoizedLogout();
          memoizedNavigate('/login');
        }
      }
    }, 500),
    [auth?.token, i18n, memoizedNavigate, memoizedLogout, t]
  );

  useEffect(() => {
    if (!auth?.token) return;

    fetchProfile();
  }, [auth?.token, fetchProfile]);

  const toggleTheme = useCallback(
    debounce(async () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      localStorage.setItem('theme', newTheme); // Persist theme for all users

      if (auth?.token) {
        // For authenticated users, update via API
        try {
          await axios.put(
            `${import.meta.env.VITE_API_URL}/api/auth/profile`,
            { theme_preference: newTheme },
            { headers: { Authorization: `Bearer ${auth.token}` } }
          );
        } catch (err) {
          console.error('Failed to update theme preference:', err.response?.data?.error || err.message);
          setError(t('header.error_updating_theme', { error: err.response?.data?.error || err.message }));
          if (err.response?.status === 401) {
            memoizedLogout();
            memoizedNavigate('/login');
          }
        }
      }
    }, 500),
    [auth?.token, theme, memoizedNavigate, memoizedLogout, t]
  );

  const handleLanguageChange = useCallback(
    debounce(async (lang) => {
      if (auth?.token) {
        // For authenticated users, update via API
        try {
          await axios.put(
            `${import.meta.env.VITE_API_URL}/api/auth/profile`,
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
      } else {
        // For unauthenticated users, change locally and persist
        setLanguage(lang);
        i18n.changeLanguage(lang);
        localStorage.setItem('language', lang); // Persist language choice
        if (changeLanguage) changeLanguage(lang);
      }
    }, 500),
    [auth?.token, i18n, changeLanguage, memoizedNavigate, memoizedLogout, t]
  );

  const handleLogout = () => {
    memoizedLogout();
    memoizedNavigate('/login');
  };

  return (
    <header className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-700 dark:to-gray-600 text-white dark:text-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <h1 className="text-3xl font-bold tracking-wide text-teal-300 dark:text-teal-200">{t('app.title')}✓</h1>

          {error && <p className="text-red-300 text-sm absolute top-6 right-6 bg-red-900/50 dark:bg-red-800/50 p-2 rounded">{error}</p>}

          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/" className="hover:text-teal-300 dark:hover:text-teal-200 transition duration-300 font-semibold">{t('header.home')}</Link>
              {auth?.token ? (
                <>
                  <Link to="/personal" className="hover:text-teal-300 dark:hover:text-teal-200 transition duration-300 font-semibold">{t('header.personal')}</Link>
                  <button
                    onClick={handleLogout}
                    className="hover:text-red-300 dark:hover:text-red-200 transition duration-300 font-semibold"
                  >
                    {t('header.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="hover:text-blue-300 dark:hover:text-blue-200 transition duration-300 font-semibold">{t('header.login')}</Link>
                  <Link to="/register" className="hover:text-blue-300 dark:hover:text-blue-200 transition duration-300 font-semibold">{t('header.register')}</Link>
                </>
              )}
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-gray-800 dark:bg-gray-600 text-white dark:text-gray-200 px-4 py-2 rounded-lg border border-gray-700 dark:border-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400 transition duration-300"
              >
                <option value="en" className="bg-gray-800 dark:bg-gray-600">{t('header.english')}</option>
                <option value="es" className="bg-gray-800 dark:bg-gray-600">{t('header.spanish')}</option>
              </select>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-700 dark:bg-gray-500 hover:bg-gray-600 dark:hover:bg-gray-400 transition duration-300 focus:outline-none focus:ring-2 focus:ring-teal-400"
                aria-label={theme === 'light' ? t('header.switch_to_dark_mode') : t('header.switch_to_light_mode')}
              >
                {theme === 'light' ? (
                  <svg className="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-white dark:text-gray-200 focus:outline-none"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
              <div className="absolute top-20 right-4 w-48 bg-gray-800 dark:bg-gray-600 rounded-lg shadow-lg p-4 md:hidden z-50">
                <Link to="/" className="block px-4 py-2 hover:bg-gray-700 dark:hover:bg-gray-500 rounded text-white dark:text-gray-200" onClick={() => setIsMenuOpen(false)}>{t('header.home')}</Link>
                {auth?.token ? (
                  <>
                    <Link to="/personal" className="block px-4 py-2 hover:bg-gray-700 dark:hover:bg-gray-500 rounded text-white dark:text-gray-200" onClick={() => setIsMenuOpen(false)}>{t('header.personal')}</Link>
                    <button
                      onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                      className="block w-full text-left px-4 py-2 hover:bg-red-700 dark:hover:bg-red-600 rounded text-white dark:text-gray-200"
                    >
                      {t('header.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="block px-4 py-2 hover:bg-gray-700 dark:hover:bg-gray-500 rounded text-white dark:text-gray-200" onClick={() => setIsMenuOpen(false)}>{t('header.login')}</Link>
                    <Link to="/register" className="block px-4 py-2 hover:bg-gray-700 dark:hover:bg-gray-500 rounded text-white dark:text-gray-200" onClick={() => setIsMenuOpen(false)}>{t('header.register')}</Link>
                  </>
                )}
                <select
                  value={language}
                  onChange={(e) => { handleLanguageChange(e.target.value); setIsMenuOpen(false); }}
                  className="w-full bg-gray-700 dark:bg-gray-500 text-white dark:text-gray-200 px-4 py-2 mt-2 rounded-lg border border-gray-600 dark:border-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="en" className="bg-gray-700 dark:bg-gray-500">{t('header.english')}</option>
                  <option value="es" className="bg-gray-700 dark:bg-gray-500">{t('header.spanish')}</option>
                </select>
                <button
                  onClick={() => { toggleTheme(); setIsMenuOpen(false); }}
                  className="w-full flex items-center px-4 py-2 mt-2 rounded-lg bg-gray-700 dark:bg-gray-500 hover:bg-gray-600 dark:hover:bg-gray-400 transition duration-300 focus:outline-none focus:ring-2 focus:ring-teal-400 text-white dark:text-gray-200"
                  aria-label={theme === 'light' ? t('header.switch_to_dark_mode') : t('header.switch_to_light_mode')}
                >
                  {theme === 'light' ? (
                    <>
                      <svg className="w-6 h-6 text-yellow-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {t('header.switch_to_dark_mode')}
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 text-gray-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      {t('header.switch_to_light_mode')}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
// import React, { useState, useEffect, useCallback } from 'react';
// import { useTranslation } from 'react-i18next';
// import { Link, useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import axios from 'axios';

// // Debounce utility to prevent rapid API calls
// const debounce = (func, delay) => {
//   let timeoutId;
//   return (...args) => {
//     clearTimeout(timeoutId);
//     return new Promise((resolve) => {
//       timeoutId = setTimeout(async () => {
//         const result = await func(...args);
//         resolve(result);
//       }, delay);
//     });
//   };
// };

// function Header({ changeLanguage }) {
//   const { t, i18n } = useTranslation();
//   const { auth, logout } = useAuth();
//   const navigate = useNavigate();
//   const [theme, setTheme] = useState('light');
//   const [language, setLanguage] = useState('en');
//   const [error, setError] = useState(null);
//   const [isMenuOpen, setIsMenuOpen] = useState(false); // For mobile menu toggle

//   // Memoize navigate and logout
//   const memoizedNavigate = useCallback(navigate, []);
//   const memoizedLogout = useCallback(logout, []);

//   // Debounced fetchProfile function
//   const fetchProfile = useCallback(
//     debounce(async () => {
//       try {
//         const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
//           headers: { Authorization: `Bearer ${auth.token}` },
//         });
//         setTheme(res.data.theme_preference || 'light');
//         setLanguage(res.data.language_preference || 'en');
//         i18n.changeLanguage(res.data.language_preference || 'en');
//         document.documentElement.classList.toggle('dark', res.data.theme_preference === 'dark');
//       } catch (err) {
//         console.error('Failed to fetch profile:', err.response?.data?.error || err.message);
//         setError(t('header.error_fetching_profile', { error: err.response?.data?.error || err.message }));
//         if (err.response?.status === 401) {
//           memoizedLogout();
//           memoizedNavigate('/login');
//         }
//       }
//     }, 500),
//     [auth?.token, i18n, memoizedNavigate, memoizedLogout, t]
//   );

//   useEffect(() => {
//     if (!auth?.token) return;

//     fetchProfile();
//   }, [auth?.token, fetchProfile]);

//   const toggleTheme = useCallback(
//     debounce(async () => {
//       if (!auth?.token) {
//         memoizedNavigate('/login');
//         return;
//       }
//       const newTheme = theme === 'light' ? 'dark' : 'light';
//       try {
//         await axios.put(
//           `${import.meta.env.VITE_API_URL}/api/auth/profile`,
//           { theme_preference: newTheme },
//           { headers: { Authorization: `Bearer ${auth.token}` } }
//         );
//         setTheme(newTheme);
//         document.documentElement.classList.toggle('dark', newTheme === 'dark');
//       } catch (err) {
//         console.error('Failed to update theme preference:', err.response?.data?.error || err.message);
//         setError(t('header.error_updating_theme', { error: err.response?.data?.error || err.message }));
//         if (err.response?.status === 401) {
//           memoizedLogout();
//           memoizedNavigate('/login');
//         }
//       }
//     }, 500),
//     [auth?.token, theme, memoizedNavigate, memoizedLogout, t]
//   );

//   const handleLanguageChange = useCallback(
//     debounce(async (lang) => {
//       if (auth?.token) {
//         // For authenticated users, update via API
//         try {
//           await axios.put(
//             `${import.meta.env.VITE_API_URL}/api/auth/profile`,
//             { language_preference: lang },
//             { headers: { Authorization: `Bearer ${auth.token}` } }
//           );
//           setLanguage(lang);
//           i18n.changeLanguage(lang);
//           changeLanguage(lang);
//         } catch (err) {
//           console.error('Failed to update language preference:', err.response?.data?.error || err.message);
//           setError(t('header.error_updating_language', { error: err.response?.data?.error || err.message }));
//           if (err.response?.status === 401) {
//             memoizedLogout();
//             memoizedNavigate('/login');
//           }
//         }
//       } else {
//         // For unauthenticated users, change locally and persist
//         setLanguage(lang);
//         i18n.changeLanguage(lang);
//         localStorage.setItem('language', lang); // Persist language choice
//         if (changeLanguage) changeLanguage(lang);
//       }
//     }, 500),
//     [auth?.token, i18n, changeLanguage, memoizedNavigate, memoizedLogout, t]
//   );

//   const handleLogout = () => {
//     memoizedLogout();
//     memoizedNavigate('/login');
//   };

//   return (
//     <header className="bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex justify-between items-center h-20">
//           <h1 className="text-3xl font-bold tracking-wide text-teal-300">{t('app.title')}✓</h1>

//           {error && <p className="text-red-300 text-sm absolute top-6 right-6 bg-red-900/50 p-2 rounded">{error}</p>}

//           <div className="flex items-center space-x-6">
//             <nav className="hidden md:flex items-center space-x-6">
//               <Link to="/" className="hover:text-teal-300 transition duration-300 font-semibold">{t('header.home')}</Link>
//               {auth?.token ? (
//                 <>
//                   <Link to="/personal" className="hover:text-teal-300 transition duration-300 font-semibold">{t('header.personal')}</Link>
//                   <button
//                     onClick={handleLogout}
//                     className="hover:text-red-300 transition duration-300 font-semibold"
//                   >
//                     {t('header.logout')}
//                   </button>
//                 </>
//               ) : (
//                 <>
//                   <Link to="/login" className="hover:text-blue-300 transition duration-300 font-semibold">{t('header.login')}</Link>
//                   <Link to="/register" className="hover:text-blue-300 transition duration-300 font-semibold">{t('header.register')}</Link>
//                 </>
//               )}
//               <select
//                 value={language}
//                 onChange={(e) => handleLanguageChange(e.target.value)}
//                 className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 transition duration-300"
//               >
//                 <option value="en" className="bg-gray-800">{t('header.english')}</option>
//                 <option value="es" className="bg-gray-800">{t('header.spanish')}</option>
//               </select>
//             </nav>

//             {/* Mobile Menu Button */}
//             <div className="md:hidden">
//               <button
//                 onClick={() => setIsMenuOpen(!isMenuOpen)}
//                 className="text-white focus:outline-none"
//               >
//                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
//                 </svg>
//               </button>
//             </div>

//             {/* Mobile Menu */}
//             {isMenuOpen && (
//               <div className="absolute top-20 right-4 w-48 bg-gray-800 rounded-lg shadow-lg p-4 md:hidden z-50">
//                 <Link to="/" className="block px-4 py-2 hover:bg-gray-700 rounded text-white" onClick={() => setIsMenuOpen(false)}>{t('header.home')}</Link>
//                 {auth?.token ? (
//                   <>
//                     <Link to="/personal" className="block px-4 py-2 hover:bg-gray-700 rounded text-white" onClick={() => setIsMenuOpen(false)}>{t('header.personal')}</Link>
//                     <button
//                       onClick={() => { handleLogout(); setIsMenuOpen(false); }}
//                       className="block w-full text-left px-4 py-2 hover:bg-red-700 rounded text-white"
//                     >
//                       {t('header.logout')}
//                     </button>
//                   </>
//                 ) : (
//                   <>
//                     <Link to="/login" className="block px-4 py-2 hover:bg-gray-700 rounded text-white" onClick={() => setIsMenuOpen(false)}>{t('header.login')}</Link>
//                     <Link to="/register" className="block px-4 py-2 hover:bg-gray-700 rounded text-white" onClick={() => setIsMenuOpen(false)}>{t('header.register')}</Link>
//                   </>
//                 )}
//                 <select
//                   value={language}
//                   onChange={(e) => { handleLanguageChange(e.target.value); setIsMenuOpen(false); }}
//                   className="w-full bg-gray-700 text-white px-4 py-2 mt-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400"
//                 >
//                   <option value="en" className="bg-gray-700">{t('header.english')}</option>
//                   <option value="es" className="bg-gray-700">{t('header.spanish')}</option>
//                 </select>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </header>
//   );
// }

// export default Header;
