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
    return localStorage.getItem('theme') || 'light';
  });
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });
  const [error, setError] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const memoizedNavigate = useCallback(navigate, []);
  const memoizedLogout = useCallback(logout, []);

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
  }, [theme]);

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
        document.body.classList.toggle('dark', fetchedTheme === 'dark');
        localStorage.setItem('theme', fetchedTheme);
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
      document.body.classList.toggle('dark', newTheme === 'dark');
      localStorage.setItem('theme', newTheme);

      if (auth?.token) {
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
        setLanguage(lang);
        i18n.changeLanguage(lang);
        localStorage.setItem('language', lang);
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
    <header
      style={{
        background: `linear-gradient(to right, var(--header-bg-from), var(--header-bg-to))`,
        color: `var(--header-text)`,
      }}
      className="shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <h1 className="text-3xl font-bold tracking-wide">{t('app.title')}✓</h1>

          {error && (
            <p
              style={{ backgroundColor: 'rgba(220, 38, 38, 0.5)', color: '#fee2e2' }}
              className="text-sm absolute top-6 right-6 p-2 rounded"
            >
              {error}
            </p>
          )}

          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/" className="hover:opacity-80 transition duration-300 font-semibold">
                {t('header.home')}
              </Link>
              {auth?.token ? (
                <>
                  <Link to="/personal" className="hover:opacity-80 transition duration-300 font-semibold">
                    {t('header.personal')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{ color: '#f87171' }}
                    className="hover:opacity-80 transition duration-300 font-semibold"
                  >
                    {t('header.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    style={{ color: `var(--accent-color)` }}
                    className="hover:opacity-80 transition duration-300 font-semibold"
                  >
                    {t('header.login')}
                  </Link>
                  <Link
                    to="/register"
                    style={{ color: `var(--accent-color)` }}
                    className="hover:opacity-80 transition duration-300 font-semibold"
                  >
                    {t('header.register')}
                  </Link>
                </>
              )}
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                style={{
                  backgroundColor: `color-mix(in srgb, var(--header-bg-from) 90%, black)`,
                  borderColor: `var(--border-color)`,
                  color: `var(--header-text)`,
                }}
                className="px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition duration-300"
              >
                <option
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--header-bg-from) 90%, black)`,
                    color: `var(--header-text)`,
                  }}
                  value="en"
                >
                  {t('header.english')}
                </option>
                <option
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--header-bg-from) 90%, black)`,
                    color: `var(--header-text)`,
                  }}
                  value="es"
                >
                  {t('header.spanish')}
                </option>
              </select>
              <button
                onClick={toggleTheme}
                style={{
                  backgroundColor: `color-mix(in srgb, var(--header-bg-from) 90%, black)`,
                }}
                className="p-2 rounded-lg hover:opacity-80 transition duration-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
                aria-label={theme === 'light' ? t('header.switch_to_dark_mode') : t('header.switch_to_light_mode')}
              >
                {theme === 'light' ? (
                  <svg className="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
              </button>
            </nav>

            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="focus:outline-none">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            </div>

            {isMenuOpen && (
              <div
                style={{
                  backgroundColor: `color-mix(in srgb, var(--header-bg-from) 90%, black)`,
                  color: `var(--header-text)`,
                }}
                className="absolute top-20 right-4 w-48 rounded-lg shadow-lg p-4 md:hidden z-50"
              >
                <Link
                  to="/"
                  className="block px-4 py-2 hover:opacity-80 rounded text-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('header.home')}
                </Link>
                {auth?.token ? (
                  <>
                    <Link
                      to="/personal"
                      className="block px-4 py-2 hover:opacity-80 rounded text-sm"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('header.personal')}
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      style={{ backgroundColor: '#b91c1c', color: '#ffffff' }}
                      className="block w-full text-left px-4 py-2 hover:opacity-80 rounded text-sm"
                    >
                      {t('header.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="block px-4 py-2 hover:opacity-80 rounded text-sm"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('header.login')}
                    </Link>
                    <Link
                      to="/register"
                      className="block px-4 py-2 hover:opacity-80 rounded text-sm"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('header.register')}
                    </Link>
                  </>
                )}
                <select
                  value={language}
                  onChange={(e) => {
                    handleLanguageChange(e.target.value);
                    setIsMenuOpen(false);
                  }}
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--header-bg-from) 95%, black)`,
                    borderColor: `var(--border-color)`,
                    color: `var(--header-text)`,
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                  }}
                  className="mt-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition duration-300"
                >
                  <option
                    style={{
                      backgroundColor: `color-mix(in srgb, var(--header-bg-from) 95%, black)`,
                      color: `var(--header-text)`,
                    }}
                    value="en"
                  >
                    {t('header.english')}
                  </option>
                  <option
                    style={{
                      backgroundColor: `color-mix(in srgb, var(--header-bg-from) 95%, black)`,
                      color: `var(--header-text)`,
                    }}
                    value="es"
                  >
                    {t('header.spanish')}
                  </option>
                </select>
                <button
                  onClick={() => {
                    toggleTheme();
                    setIsMenuOpen(false);
                  }}
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--header-bg-from) 90%, black)`,
                    color: `var(--header-text)`,
                    width: '100%',
                    padding: '0.5rem',
                  }}
                  className="mt-2 rounded-lg hover:opacity-80 transition duration-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  aria-label={theme === 'light' ? t('header.switch_to_dark_mode') : t('header.switch_to_light_mode')}
                >
                  {theme === 'light' ? (
                    <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                      />
                    </svg>
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
//   const [theme, setTheme] = useState(() => {
//     return localStorage.getItem('theme') || 'light';
//   });
//   const [language, setLanguage] = useState(() => {
//     return localStorage.getItem('language') || 'en';
//   });
//   const [error, setError] = useState(null);
//   const [isMenuOpen, setIsMenuOpen] = useState(false);

//   const memoizedNavigate = useCallback(navigate, []);
//   const memoizedLogout = useCallback(logout, []);

//   useEffect(() => {
//     document.body.classList.toggle('dark', theme === 'dark');
//   }, [theme]);

//   const fetchProfile = useCallback(
//     debounce(async () => {
//       try {
//         const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
//           headers: { Authorization: `Bearer ${auth.token}` },
//         });
//         const fetchedTheme = res.data.theme_preference || 'light';
//         const fetchedLanguage = res.data.language_preference || 'en';
//         setTheme(fetchedTheme);
//         setLanguage(fetchedLanguage);
//         i18n.changeLanguage(fetchedLanguage);
//         document.body.classList.toggle('dark', fetchedTheme === 'dark');
//         localStorage.setItem('theme', fetchedTheme);
//         localStorage.setItem('language', fetchedLanguage);
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
//       const newTheme = theme === 'light' ? 'dark' : 'light';
//       setTheme(newTheme);
//       document.body.classList.toggle('dark', newTheme === 'dark');
//       localStorage.setItem('theme', newTheme);

//       if (auth?.token) {
//         try {
//           await axios.put(
//             `${import.meta.env.VITE_API_URL}/api/auth/profile`,
//             { theme_preference: newTheme },
//             { headers: { Authorization: `Bearer ${auth.token}` } }
//           );
//         } catch (err) {
//           console.error('Failed to update theme preference:', err.response?.data?.error || err.message);
//           setError(t('header.error_updating_theme', { error: err.response?.data?.error || err.message }));
//           if (err.response?.status === 401) {
//             memoizedLogout();
//             memoizedNavigate('/login');
//           }
//         }
//       }
//     }, 500),
//     [auth?.token, theme, memoizedNavigate, memoizedLogout, t]
//   );

//   const handleLanguageChange = useCallback(
//     debounce(async (lang) => {
//       if (auth?.token) {
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
//         setLanguage(lang);
//         i18n.changeLanguage(lang);
//         localStorage.setItem('language', lang);
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
//     <header
//       style={{
//         background: `linear-gradient(to right, var(--header-bg-from), var(--header-bg-to))`,
//         color: `var(--header-text)`,
//       }}
//       className="shadow-lg"
//     >
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex justify-between items-center h-20">
//           <h1 className="text-3xl font-bold tracking-wide">{t('app.title')}✓</h1>

//           {error && (
//             <p
//               style={{ backgroundColor: 'rgba(220, 38, 38, 0.5)', color: '#fee2e2' }}
//               className="text-sm absolute top-6 right-6 p-2 rounded"
//             >
//               {error}
//             </p>
//           )}

//           <div className="flex items-center space-x-6">
//             <nav className="hidden md:flex items-center space-x-6">
//               <Link to="/" className="hover:opacity-80 transition duration-300 font-semibold">
//                 {t('header.home')}
//               </Link>
//               {auth?.token ? (
//                 <>
//                   <Link to="/personal" className="hover:opacity-80 transition duration-300 font-semibold">
//                     {t('header.personal')}
//                   </Link>
//                   <button
//                     onClick={handleLogout}
//                     style={{ color: '#f87171' }}
//                     className="hover:opacity-80 transition duration-300 font-semibold"
//                   >
//                     {t('header.logout')}
//                   </button>
//                 </>
//               ) : (
//                 <>
//                   <Link
//                     to="/login"
//                     style={{ color: `var(--accent-color)` }}
//                     className="hover:opacity-80 transition duration-300 font-semibold"
//                   >
//                     {t('header.login')}
//                   </Link>
//                   <Link
//                     to="/register"
//                     style={{ color: `var(--accent-color)` }}
//                     className="hover:opacity-80 transition duration-300 font-semibold"
//                   >
//                     {t('header.register')}
//                   </Link>
//                 </>
//               )}
//               <select
//                 value={language}
//                 onChange={(e) => handleLanguageChange(e.target.value)}
//                 style={{
//                   backgroundColor: `color-mix(in srgb, var(--header-bg-from) 90%, black)`,
//                   borderColor: `var(--border-color)`,
//                   color: `var(--header-text)`,
//                 }}
//                 className="px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition duration-300"
//               >
//                 <option
//                   style={{
//                     backgroundColor: `color-mix(in srgb, var(--header-bg-from) 90%, black)`,
//                     color: `var(--header-text)`,
//                   }}
//                   value="en"
//                 >
//                   {t('header.english')}
//                 </option>
//                 <option
//                   style={{
//                     backgroundColor: `color-mix(in srgb, var(--header-bg-from) 90%, black)`,
//                     color: `var(--header-text)`,
//                   }}
//                   value="es"
//                 >
//                   {t('header.spanish')}
//                 </option>
//               </select>
//               <button
//                 onClick={toggleTheme}
//                 style={{
//                   backgroundColor: `color-mix(in srgb, var(--header-bg-from) 90%, black)`,
//                 }}
//                 className="p-2 rounded-lg hover:opacity-80 transition duration-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
//                 aria-label={theme === 'light' ? t('header.switch_to_dark_mode') : t('header.switch_to_light_mode')}
//               >
//                 {theme === 'light' ? (
//                   <svg className="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={2}
//                       d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
//                     />
//                   </svg>
//                 ) : (
//                   <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={2}
//                       d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
//                     />
//                   </svg>
//                 )}
//               </button>
//             </nav>

//             <div className="md:hidden">
//               <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="focus:outline-none">
//                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
//                 </svg>
//               </button>
//             </div>

//             {isMenuOpen && (
//               <div
//                 style={{
//                   backgroundColor: `color-mix(in srgb, var(--header-bg-from) 90%, black)`,
//                 }}
//                 className="absolute top-20 right-4 w-48 rounded-lg shadow-lg p-4 md:hidden z-50"
//               >
//                 <Link
//                   to="/"
//                   className="block px-4 py-2 hover:opacity-80 rounded"
//                   onClick={() => setIsMenuOpen(false)}
//                 >
//                   {t('header.home')}
//                 </Link>
//                 {auth?.token ? (
//                   <>
//                     <Link
//                       to="/personal"
//                       className="block px-4 py-2 hover:opacity-80 rounded"
//                       onClick={() => setIsMenuOpen(false)}
//                     >
//                       {t('header.personal')}
//                     </Link>
//                     <button
//                       onClick={() => {
//                         handleLogout();
//                         setIsMenuOpen(false);
//                       }}
//                       style={{ backgroundColor: '#b91c1c' }}
//                       className="block w-full text-left px-4 py-2 hover:opacity-80 rounded"
//                     >
//                       {t('header.logout')}
//                     </button>
//                   </>
//                 ) : (
//                   <>
//                     <Link
//                       to="/login"
//                       className="block px-4 py-2 hover:opacity-80 rounded"
//                       onClick={() => setIsMenuOpen(false)}
//                     >
//                       {t('header.login')}
//                     </Link>
//                     <Link
//                       to="/register"
//                       className="block px-4 py-2 hover:opacity-80 rounded"
//                       onClick={() => setIsMenuOpen(false)}
//                     >
//                       {t('header.register')}
//                     </Link>
//                   </>
//                 )}
//                 <select
//                   value={language}
//                   onChange={(e) => {
//                     handleLanguageChange(e.target.value);
//                     setIsMenuOpen(false);
//                   }}
//                   style={{
//                     backgroundColor: `color-mix(in srgb, var(--header-bg-from) 95%, black)`,
//                     borderColor: `var(--border-color)`,
//                     color: `var(--header-text)`,
//                   }}
//                   className="w-full px-4 py-2 mt-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
//                 >
//                   <option
//                     style={{
//                       backgroundColor: `color-mix(in srgb, var(--header-bg-from) 95%, black)`,
//                       color: `var(--header-text)`,
//                     }}
//                     value="en"
//                   >
//                     {t('header.⁁english')}
//                   </option>
//                   <option
//                     style={{
//                       backgroundColor: `color-mix(in srgb, var(--header-bg-from) 95%, black)`,
//                       color: `var(--header-text)`,
//                     }}
//                     value="es"
//                   >
//                     {t('header.spanish')}
//                   </option>
//                 </select>
//                 <button
//                   onClick={() => {
//                     toggleTheme();
//                     setIsMenuOpen(false);
//                   }}
//                   style={{
//                     backgroundColor: `color-mix(in srgb, var(--header-bg-from) 90%, black)`,
//                   }}
//                   className="w-full flex items-center px-4 py-2 mt-2 rounded-lg hover:opacity-80 transition duration-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
//                   aria-label={theme === 'light' ? t('header.switch_to_dark_mode') : t('header.switch_to_light_mode')}
//                 >
//                   {theme === 'light' ? (
//                     <>
//                       <svg className="w-6 h-6 text-yellow-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path
//                           strokeLinecap="round"
//                           strokeLinejoin="round"
//                           strokeWidth={2}
//                           d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
//                         />
//                       </svg>
//                       {t('header.switch_to_dark_mode')}
//                     </>
//                   ) : (
//                     <>
//                       <svg className="w-6 h-6 text-gray-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path
//                           strokeLinecap="round"
//                           strokeLinejoin="round"
//                           strokeWidth={2}
//                           d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
//                         />
//                       </svg>
//                       {t('header.switch_to_light_mode')}
//                     </>
//                   )}
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </header>
//   );
// }

// export default Header;
