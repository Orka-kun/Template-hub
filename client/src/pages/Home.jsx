import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

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
    }, 500), // 500ms debounce delay
    [auth?.token, t, memoizedNavigate, memoizedAddNotification]
  );

  useEffect(() => {
    if (!isFetchCalled.current) {
      isFetchCalled.current = true; // Ensure fetchData is only called once
      fetchData();
    }
  }, [fetchData]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 bg-white dark:bg-gray-900 min-h-screen">
        <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 bg-white dark:bg-gray-900 min-h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-white dark:bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">{t('home.title')} ✓</h1>
      <section className="mb-8 max-w-xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4 text-center text-gray-900 dark:text-white">
          {t('home.latest')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-items-center">
          {latestTemplates.length > 0 ? (
            latestTemplates.map((template) => (
              <Link
                to={`/templates/${template.id}`}
                key={template.id}
                className="w-full max-w-xs border p-4 rounded bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-center"
              >
                {/* Uncomment image if needed */}
                {/* <img
                  src={template.image_url || 'https://placehold.co/150x150'}
                  alt={template.title}
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/150x150';
                  }}
                  className="w-full h-32 object-cover mb-2 rounded"
                /> */}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                  {template.title}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-1">
                  {template.description}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('home.author')}: {template.user?.name || t('home.unknown_author')}
                </p>
              </Link>
            ))
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-400">
              {t('home.no_templates')}
            </p>
          )}
        </div>
      </section>
      <section className="mb-8">
        <h2 className="text-2xl mb-6 text-gray-900 dark:text-white text-center">{t('home.top')}</h2>
        
        <div className="overflow-x-auto max-w-xl mx-auto">
          <table className="min-w-full border border-gray-300 dark:border-gray-700 text-center">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="p-2 align-middle font-medium border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                  {t('home.tableName')}
                </th>
                <th className="p-2 align-middle font-medium border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                  {t('home.tableSubmissions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {topTemplates.length > 0 ? (
                topTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2 align-middle border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                      <Link to={`/templates/${template.id}`} className="text-blue-600 hover:underline">
                        {template.title}
                      </Link>
                    </td>
                    <td className="p-2 align-middle border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                      {template.forms?.length || 0}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="2"
                    className="p-2 align-middle border-b border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400"
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
        {/* <h2 className="text-2xl mb-2 text-gray-900 dark:text-white">{t('home.tags')}</h2>
        <div className="flex flex-wrap gap-2">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <span
                key={tag.id}
                className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-white"
              >
                {tag.name}
              </span>
            ))
          ) : (
            <p className="text-gray-600 dark:text-gray-400">{t('home.no_tags')}</p>
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
//         console.log('Fetching data with headers:', headers); // This will now log only once

//         // Use relative URL if proxy is set up in vite.config.js
//         const [templatesRes, tagsRes] = await Promise.all([
//           axios.get('/api/templates', { headers }),
//           axios.get('/api/tags', { headers }),
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
//       <div className="container mx-auto p-4 bg-white dark:bg-gray-900 min-h-screen">
//         <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="container mx-auto p-4 bg-white dark:bg-gray-900 min-h-screen">
//         <p className="text-red-500">{error}</p>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto p-4 bg-white dark:bg-gray-900 min-h-screen">
//       <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">{t('home.title')} ✓</h1>
//       <section className="mb-8 max-w-xl mx-auto">
//     <h2 className="text-2xl font-semibold mb-4 text-center text-gray-900 dark:text-white">
//       {t('home.latest')}
//     </h2>

//     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-items-center">
//       {latestTemplates.length > 0 ? (
//         latestTemplates.map((template) => (
//           <Link
//             to={`/templates/${template.id}`}
//             key={template.id}
//             className="w-full max-w-xs border p-4 rounded bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-center"
//           >
//             {/* Uncomment image if needed */}
//             {/* <img
//               src={template.image_url || 'https://placehold.co/150x150'}
//               alt={template.title}
//               onError={(e) => {
//                 e.target.src = 'https://placehold.co/150x150';
//               }}
//               className="w-full h-32 object-cover mb-2 rounded"
//             /> */}
//             <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
//               {template.title}
//             </h3>
//             <p className="text-gray-700 dark:text-gray-300 mb-1">
//               {template.description}
//             </p>
//             <p className="text-gray-600 dark:text-gray-400">
//               {t('home.author')}: {template.user?.name || t('home.unknown_author')}
//             </p>
//           </Link>
//         ))
//       ) : (
//         <p className="text-center text-gray-600 dark:text-gray-400">
//           {t('home.no_templates')}
//         </p>
//       )}
//     </div>
//   </section>
//       <section className="mb-8">
//         <h2 className="text-2xl mb-6 text-gray-900 dark:text-white text-center">{t('home.top')}</h2>
        
//         <div className="overflow-x-auto max-w-xl mx-auto">
//   <table className="min-w-full border border-gray-300 dark:border-gray-700 text-center">
//     <thead>
//       <tr className="bg-gray-100 dark:bg-gray-800">
//         <th className="p-2 align-middle font-medium border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
//           {t('home.tableName')}
//         </th>
//         <th className="p-2 align-middle font-medium border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
//           {t('home.tableSubmissions')}
//         </th>
//         {/* <th className="p-2 align-middle font-medium border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
//           Templates
//         </th>
//         <th className="p-2 align-middle font-medium border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
//           Submissions
//         </th> */}
//       </tr>
//     </thead>
//     <tbody>
//       {topTemplates.length > 0 ? (
//         topTemplates.map((template) => (
//           <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
//             <td className="p-2 align-middle border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
//               <Link to={`/templates/${template.id}`} className="text-blue-600 hover:underline">
//                 {template.title}
//               </Link>
//             </td>
//             <td className="p-2 align-middle border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
//               {template.forms?.length || 0}
//             </td>
//           </tr>
//         ))
//       ) : (
//         <tr>
//           <td
//             colSpan="2"
//             className="p-2 align-middle border-b border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400"
//           >
//             {t('home.no_templates')}
//           </td>
//         </tr>
//       )}
//     </tbody>
//   </table>
// </div>

//       </section>
//       <section>
//         {/* <h2 className="text-2xl mb-2 text-gray-900 dark:text-white">{t('home.tags')}</h2>
//         <div className="flex flex-wrap gap-2">
//           {tags.length > 0 ? (
//             tags.map((tag) => (
//               <span
//                 key={tag.id}
//                 className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-white"
//               >
//                 {tag.name}
//               </span>
//             ))
//           ) : (
//             <p className="text-gray-600 dark:text-gray-400">{t('home.no_tags')}</p>
//           )}
//         </div> */}
//       </section>
//     </div>
//   );
// }

// export default Home;
