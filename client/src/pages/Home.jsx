import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Utility to strip HTML tags
const stripHtmlTags = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '');
};

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

function Home() {
  const { t } = useTranslation();
  const { auth, addNotification } = useAuth();
  const navigate = useNavigate();
  const [latestTemplates, setLatestTemplates] = useState([]);
  const [topTemplates, setTopTemplates] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize navigate and addNotification to ensure they are stable
  const memoizedNavigate = useCallback(navigate, []);
  const memoizedAddNotification = useCallback(addNotification, []);

  // Ref to ensure fetchData is only called once
  const isFetchCalled = useRef(false);

  // Debounced fetch function
  const fetchData = useCallback(
    debounce(async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
        console.log('Fetching data with headers:', headers);

        // Use VITE_API_URL for backend API calls
        const [templatesRes, tagsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/templates`, { headers }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/tags`, { headers }),
        ]);

        setLatestTemplates(templatesRes.data.slice(0, 6) || []);
        const sorted = templatesRes.data.sort((a, b) => (b.forms?.length || 0) - (a.forms?.length || 0));
        setTopTemplates(sorted.slice(0, 5) || []);
        setTags(tagsRes.data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.response?.status === 401) {
          console.log('Unauthorized, redirecting to login');
          memoizedAddNotification(t('header.session_expired'), 'error');
          memoizedNavigate('/login');
        } else if (err.response?.status === 429) {
          const errorMessage = t('home.rate_limit_exceeded');
          setError(errorMessage);
          memoizedAddNotification(errorMessage, 'error');
        } else {
          const errorMessage = err.response?.data?.error || t('home.error_fetching_data');
          setError(errorMessage);
          memoizedAddNotification(errorMessage, 'error');
        }
      } finally {
        setLoading(false);
      }
    }, 500),
    [auth?.token, t, memoizedNavigate, memoizedAddNotification]
  );

  useEffect(() => {
    if (!isFetchCalled.current) {
      isFetchCalled.current = true;
      fetchData();
    }
  }, [fetchData]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 min-h-screen flex items-center justify-center">
        <p className="text-lg animate-pulse">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 min-h-screen flex items-center justify-center">
        <p style={{ color: '#ef4444' }} className="text-lg font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 min-h-screen">
      <header className="text-center mb-10">
        <h1
          style={{
            color: `var(--text-white)`,
            backgroundImage: `linear-gradient(to right, var(--table-header-from), var(--table-header-to))`,
          }}
          className="text-4xl md:text-5xl font-extrabold bg-clip-text animate-fade-in"
        >
          {t('home.title')} ✓
        </h1>
      </header>

      <section className="mb-12">
        <h2
          style={{ borderColor: `var(--table-header-from)` }}
          className="text-2xl md:text-3xl font-semibold text-center mb-6 border-b-2 pb-2"
        >
          {t('home.latest')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
          {latestTemplates.length > 0 ? (
            latestTemplates.map((template) => (
              <Link
                to={`/templates/${template.id}`}
                key={template.id}
                style={{
                  backgroundColor: `var(--card-bg)`,
                  color: `var(--text-color)`,
                }}
                className="w-full max-w-xs shadow-lg rounded-xl p-6 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 transform border"
              >
                <h3
                  style={{ color: `var(--card-text)` }}
                  className="text-xl font-semibold mb-2 line-clamp-2"
                >
                  {template.title}
                </h3>
                <p
                  style={{ color: `var(--card-description)` }}
                  className="text-sm mb-4 line-clamp-3"
                >
                  {stripHtmlTags(template.description)}
                </p>
                <p
                  style={{ color: `var(--card-description)` }}
                  className="text-sm"
                >
                  {t('home.author')}: {template.user?.name || t('home.unknown_author')}
                </p>
              </Link>
            ))
          ) : (
            <p className="text-center text-lg">{t('home.no_templates')}</p>
          )}
        </div>
      </section>

      <section className="mb-12">
        <h2
          style={{ borderColor: `var(--table-header-to)` }}
          className="text-2xl md:text-3xl font-semibold text-center mb-6 border-b-2 pb-2"
        >
          {t('home.top')}
        </h2>

        <div className="overflow-x-auto max-w-4xl mx-auto">
          <table
            style={{ backgroundColor: `var(--card-bg)` }}
            className="w-full shadow-md rounded-lg overflow-hidden"
          >
            <thead>
              <tr
                style={{
                  background: `linear-gradient(to right, var(--table-header-from), var(--table-header-to))`,
                }}
                className="text-white"
              >
                <th className="p-4 text-left font-medium">{t('home.tableName')}</th>
                <th className="p-4 text-left font-medium">{t('home.tableSubmissions')}</th>
              </tr>
            </thead>
            <tbody>
              {topTemplates.length > 0 ? (
                topTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-100 transition-colors">
                    <td className="p-4 border-b">
                      <Link
                        to={`/templates/${template.id}`}
                        style={{
                          color: `var(--accent-color)`,
                        }}
                        className="hover:underline"
                      >
                        {template.title}
                      </Link>
                    </td>
                    <td className="p-4 border-b">{template.forms?.length || 0}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    style={{ color: `var(--card-description)` }}
                    colSpan="2"
                    className="p-4 text-center"
                  >
                    {t('home.no_templates')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        {/* <h2
          style={{ borderColor: '#22c55e' }}
          className="text-2xl md:text-3xl font-semibold text-center mb-6 border-b-2 pb-2"
        >
          {t('home.tags')}
        </h2>
        <div className="flex flex-wrap gap-3 justify-center">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <span
                style={{
                  backgroundColor: '#fce7f3',
                  color: `var(--accent-color)`,
                }}
                key={tag.id}
                className="px-3 py-1 rounded-full text-sm font-medium hover:bg-pink-200 transition-colors"
              >
                {tag.name}
              </span>
            ))
          ) : (
            <p className="text-center text-lg">{t('home.no_tags')}</p>
          )}
        </div> */}
      </section>
    </div>
  );
}

export default Home;
// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { useTranslation } from 'react-i18next';
// import { Link, useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import { useAuth } from '../context/AuthContext';

// // Utility to strip HTML tags
// const stripHtmlTags = (html) => {
//   if (!html) return '';
//   return html.replace(/<[^>]+>/g, '');
// };

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

// function Home() {
//   const { t } = useTranslation();
//   const { auth, addNotification } = useAuth();
//   const navigate = useNavigate();
//   const [latestTemplates, setLatestTemplates] = useState([]);
//   const [topTemplates, setTopTemplates] = useState([]);
//   const [tags, setTags] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Memoize navigate and addNotification to ensure they are stable
//   const memoizedNavigate = useCallback(navigate, []);
//   const memoizedAddNotification = useCallback(addNotification, []);

//   // Ref to ensure fetchData is only called once
//   const isFetchCalled = useRef(false);

//   // Debounced fetch function
//   const fetchData = useCallback(
//     debounce(async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const headers = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
//         console.log('Fetching data with headers:', headers);

//         // Use VITE_API_URL for backend API calls
//         const [templatesRes, tagsRes] = await Promise.all([
//           axios.get(`${import.meta.env.VITE_API_URL}/api/templates`, { headers }),
//           axios.get(`${import.meta.env.VITE_API_URL}/api/tags`, { headers }),
//         ]);

//         setLatestTemplates(templatesRes.data.slice(0, 6) || []);
//         const sorted = templatesRes.data.sort((a, b) => (b.forms?.length || 0) - (a.forms?.length || 0));
//         setTopTemplates(sorted.slice(0, 5) || []);
//         setTags(tagsRes.data || []);
//       } catch (err) {
//         console.error('Error fetching data:', err);
//         if (err.response?.status === 401) {
//           console.log('Unauthorized, redirecting to login');
//           memoizedAddNotification(t('header.session_expired'), 'error');
//           memoizedNavigate('/login');
//         } else if (err.response?.status === 429) {
//           const errorMessage = t('home.rate_limit_exceeded');
//           setError(errorMessage);
//           memoizedAddNotification(errorMessage, 'error');
//         } else {
//           const errorMessage = err.response?.data?.error || t('home.error_fetching_data');
//           setError(errorMessage);
//           memoizedAddNotification(errorMessage, 'error');
//         }
//       } finally {
//         setLoading(false);
//       }
//     }, 500), // 500ms debounce delay
//     [auth?.token, t, memoizedNavigate, memoizedAddNotification]
//   );

//   useEffect(() => {
//     if (!isFetchCalled.current) {
//       isFetchCalled.current = true; // Ensure fetchData is only called once
//       fetchData();
//     }
//   }, [fetchData]);

//   if (loading) {
//     return (
//       <div className="container mx-auto p-6 bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center">
//         <p className="text-lg text-gray-600 dark:text-gray-300 animate-pulse">{t('loading')}</p>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="container mx-auto p-6 bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center">
//         <p className="text-red-500 text-lg font-medium">{error}</p>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-black min-h-screen">
//       <header className="text-center mb-10">
//         <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 animate-fade-in">
//           {t('home.title')} ✓
//         </h1>
//       </header>

//       <section className="mb-12">
//         <h2 className="text-2xl md:text-3xl font-semibold text-center text-gray-800 dark:text-gray-200 mb-6 border-b-2 border-blue-500 pb-2">
//           {t('home.latest')}
//         </h2>

//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
//           {latestTemplates.length > 0 ? (
//             latestTemplates.map((template) => (
//               <Link
//                 to={`/templates/${template.id}`}
//                 key={template.id}
//                 className="w-full max-w-xs bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 transform border border-gray-200 dark:border-gray-700"
//               >
//                 {/* Uncomment and enhance image if needed */}
//                 {/* <img
//                   src={template.image_url || 'https://placehold.co/150x150'}
//                   alt={template.title}
//                   onError={(e) => { e.target.src = 'https://placehold.co/150x150'; }}
//                   className="w-full h-40 object-cover rounded-lg mb-4"
//                 /> */}
//                 <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
//                   {template.title}
//                 </h3>
//                 <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
//                   {stripHtmlTags(template.description)}
//                 </p>
//                 <p className="text-gray-500 dark:text-gray-400 text-sm">
//                   {t('home.author')}: {template.user?.name || t('home.unknown_author')}
//                 </p>
//               </Link>
//             ))
//           ) : (
//             <p className="text-center text-gray-600 dark:text-gray-400 text-lg">{t('home.no_templates')}</p>
//           )}
//         </div>
//       </section>

//       <section className="mb-12">
//         <h2 className="text-2xl md:text-3xl font-semibold text-center text-gray-800 dark:text-gray-200 mb-6 border-b-2 border-purple-500 pb-2">
//           {t('home.top')}
//         </h2>

//         <div className="overflow-x-auto max-w-4xl mx-auto">
//           <table className="w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
//             <thead>
//               <tr className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
//                 <th className="p-4 text-left font-medium">{t('home.tableName')}</th>
//                 <th className="p-4 text-left font-medium">{t('home.tableSubmissions')}</th>
//               </tr>
//             </thead>
//             <tbody>
//               {topTemplates.length > 0 ? (
//                 topTemplates.map((template) => (
//                   <tr key={template.id} className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
//                     <td className="p-4 border-b border-gray-200 dark:border-gray-700">
//                       <Link to={`/templates/${template.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
//                         {template.title}
//                       </Link>
//                     </td>
//                     <td className="p-4 border-b border-gray-200 dark:border-gray-700">
//                       {template.forms?.length || 0}
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan="2" className="p-4 text-center text-gray-600 dark:text-gray-400">
//                     {t('home.no_templates')}
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </section>

//       <section>
//         {/* Commented out tags section - Uncomment and style if needed */}
//         {/* <h2 className="text-2xl md:text-3xl font-semibold text-center text-gray-800 dark:text-gray-200 mb-6 border-b-2 border-green-500 pb-2">
//           {t('home.tags')}
//         </h2>
//         <div className="flex flex-wrap gap-3 justify-center">
//           {tags.length > 0 ? (
//             tags.map((tag) => (
//               <span
//                 key={tag.id}
//                 className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
//               >
//                 {tag.name}
//               </span>
//             ))
//           ) : (
//             <p className="text-center text-gray-600 dark:text-gray-400 text-lg">{t('home.no_tags')}</p>
//           )}
//         </div> */}
//       </section>
//     </div>
//   );
// }

// export default Home;
