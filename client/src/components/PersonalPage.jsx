import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/Auth merchandisingContext';
import axios from 'axios';

// Debounce utility to prevent rapid API calls
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    return new Promise((resolve) => {
      timeoutId = setTimeout(async () => {
        const result = await func(...args);
        resolve(result);
      }, delay);
    });
  };
};

function PersonalPage() {
  const { t } = useTranslation();
  const { auth, addNotification } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [sortConfig, setSortConfig] = useState({ field: 'createdAt', order: 'desc' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const hasFetched = useRef(false);

  const authRef = useRef(auth);
  useEffect(() => {
    authRef.current = auth;
  }, [auth]);

  const addNotificationRef = useRef(addNotification);
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);

  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    if (!authRef.current.token) {
      addNotificationRef.current(tRef.current('header.login_required'), 'error');
      navigateRef.current('/login');
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!authRef.current.token || !authRef.current.user?.id) return;
    if (hasFetched.current) {
      return;
    }
    hasFetched.current = true;

    setLoading(true);
    setError(null);

    let userTemplates = [];
    let sharedTemplates = [];
    let userForms = [];

    try {
      const templatesResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates`, {
        headers: { Authorization: `Bearer ${authRef.current.token}` },
      });
      userTemplates = templatesResponse.data
        .filter((template) => template.created_by === authRef.current.user.id)
        .map((template) => ({
          ...template,
          type: 'template',
          createdAt: template.createdAt || new Date().toISOString(),
        }));
    } catch (err) {
      console.error('Error fetching user-created templates:', err.response?.data || err.message);
      addNotificationRef.current('Error fetching user templates', 'error');
    }

    try {
      const sharedTemplatesResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates/shared`, {
        headers: { Authorization: `Bearer ${authRef.current.token}` },
        params: { user_id: authRef.current.user.id },
      });
      sharedTemplates = sharedTemplatesResponse.data
        .filter((template) => template.created_by !== authRef.current.user.id)
        .map((template) => ({
          ...template,
          type: 'shared_template',
          createdAt: template.createdAt || new Date().toISOString(),
        }));
    } catch (err) {
      console.error('Error fetching shared templates:', err.response?.data || err.message);
      addNotificationRef.current('Error fetching shared templates', 'error');
    }

    try {
      const formsResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/forms`, {
        headers: { Authorization: `Bearer ${authRef.current.token}` },
        params: { user_id: authRef.current.user.id },
        timeout: 10000,
      });
      userForms = formsResponse.data
        .filter((form) => form.user_id === authRef.current.user.id)
        .map((form) => ({
          ...form,
          type: 'form',
          title: form.template?.title || tRef.current('personal.unknown_template'),
          template_id: form.template_id,
          createdAt: form.createdAt || new Date().toISOString(),
        }));
    } catch (err) {
      console.error('Error fetching forms:', err.response?.data || err.message);
      addNotificationRef.current('Error fetching forms', 'error');
    }

    const combinedItems = [...userTemplates, ...sharedTemplates, ...userForms];
    setItems(combinedItems);

    setLoading(false);
    hasFetched.current = false;
  }, []);

  const debouncedFetchData = useCallback(debounce(fetchData, 300), [fetchData]);

  useEffect(() => {
    if (!authRef.current.token || !authRef.current.user?.id) return;
    debouncedFetchData();
  }, [debouncedFetchData]);

  const handleDelete = async (item) => {
    try {
      const url =
        item.type === 'template' || item.type === 'shared_template'
          ? `${import.meta.env.VITE_API_URL}/api/templates/${item.id}`
          : `${import.meta.env.VITE_API_URL}/api/forms/${item.id}`;
      await axios.delete(url, {
        headers: { Authorization: `Bearer ${authRef.current.token}` },
      });
      setItems((prev) => prev.filter((i) => i.id !== item.id || i.type !== item.type));
      addNotificationRef.current(
        item.type === 'template' || item.type === 'shared_template'
          ? tRef.current('personal.template_deleted')
          : tRef.current('personal.form_deleted'),
        'success'
      );
    } catch (err) {
      addNotificationRef.current(
        item.type === 'template' || item.type === 'shared_template'
          ? tRef.current('personal.error_deleting_template')
          : tRef.current('personal.error_deleting_form'),
        'error'
      );
      console.error(`Error deleting ${item.type}:`, err);
    }
  };

  const sortData = (data, sortConfig) => {
    return [...data].sort((a, b) => {
      let aValue = sortConfig.field === 'title' ? a.title : a.createdAt;
      let bValue = sortConfig.field === 'title' ? b.title : b.createdAt;

      if (sortConfig.field === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (aValue < bValue) return sortConfig.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (field) => {
    setSortConfig((prev) => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const paginate = (data, page) => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  };

  const sortedItems = sortData(items, sortConfig);
  const paginatedItems = paginate(sortedItems, currentPage);
  const totalPages = Math.ceil(items.length / itemsPerPage);

  if (!auth.token) return null;

  return (
    <div className="container mx-auto p-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h2 className="text-lg md:text-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-800 rounded-lg p-3 inline-block">
          {t('personal.logged_in_as')}: {auth.user.name}
        </h2>
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-100 bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 animate-fade-in mb-8">
        {t('personal.title')}
      </h1>

      <div className="mb-8">
        <Link
          to="/templates/create"
          className="inline-block bg-blue-600 dark:bg-blue-500 text-white dark:text-gray-100 px-6 py-3 rounded-full hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-lg transform hover:-translate-y-1"
        >
          {t('personal.create_template')}
        </Link>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 border-b-2 border-blue-500 dark:border-blue-400 pb-2 mb-6">
          {t('personal.templates')}
        </h2>
        {loading && (
          <p className="text-lg text-gray-600 dark:text-gray-300 animate-pulse text-center">
            {t('loading')}
          </p>
        )}
        {error && (
          <p className="text-red-500 dark:text-red-400 text-lg font-medium bg-red-50 dark:bg-red-900/50 rounded-lg p-4 text-center">
            {error}
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="text-gray-600 dark:text-gray-400 text-lg text-center">
            {t('personal.no_templates')}
          </p>
        )}
        {!loading && !error && items.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl shadow-lg">
              <table className="w-full border-collapse text-sm bg-white dark:bg-gray-800">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <th
                      className="border-b border-gray-200 dark:border-gray-600 p-4 text-left cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300"
                      onClick={() => handleSort('title')}
                    >
                      {t('template.title')}{' '}
                      {sortConfig.field === 'title' && (
                        <span className="ml-1">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th
                      className="border-b border-gray-200 dark:border-gray-600 p-4 text-left cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300"
                      onClick={() => handleSort('createdAt')}
                    >
                      {t('personal.created_at')}{' '}
                      {sortConfig.field === 'createdAt' && (
                        <span className="ml-1">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th className="border-b border-gray-200 dark:border-gray-600 p-4 text-left text-gray-900 dark:text-gray-100">
                      {t('personal.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => (
                    <tr
                      key={`${item.type}-${item.id}`}
                      className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-300"
                    >
                      <td className="border-b border-gray-200 dark:border-gray-600 p-4 text-blue-600 dark:text-blue-400">
                        <Link
                          to={
                            item.type === 'shared_template'
                              ? `/templates/${item.id}`
                              : `/templates/${item.template?.id || item.id}`
                          }
                          className="hover:underline font-medium"
                        >
                          {item.title || t('personal.unknown_template')}
                        </Link>
                      </td>
                      <td className="border-b border-gray-200 dark:border-gray-600 p-4 text-gray-800 dark:text-gray-300">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString()
                          : t('personal.unknown_date')}
                      </td>
                      <td className="border-b border-gray-200 dark:border-gray-600 p-4">
                        <button
                          onClick={() => handleDelete(item)}
                          className="bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white dark:text-gray-100 text-sm px-4 py-2 rounded-full transition-colors shadow-md transform hover:-translate-y-1"
                        >
                          {t('personal.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center items-center space-x-2 py-6">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Page:</span>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-full mx-1 transition-colors duration-300 ${
                    currentPage === page
                      ? 'bg-blue-600 dark:bg-blue-500 text-white dark:text-gray-100 shadow-lg'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default PersonalPage;

// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { useTranslation } from 'react-i18next';
// import { Link, useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import axios from 'axios';

// // Debounce utility to prevent rapid API calls
// const debounce = (func, delay) => {
//   let timeoutId;
//   return (...args) => {
//     if (timeoutId) clearTimeout(timeoutId);
//     return new Promise((resolve) => {
//       timeoutId = setTimeout(async () => {
//         const result = await func(...args);
//         resolve(result);
//       }, delay);
//     });
//   };
// };

// function PersonalPage() {
//   const { t } = useTranslation();
//   const { auth, addNotification } = useAuth();
//   const navigate = useNavigate();
//   const [items, setItems] = useState([]); // Unified state for templates and forms
//   const [sortConfig, setSortConfig] = useState({ field: 'createdAt', order: 'desc' });
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;
//   const hasFetched = useRef(false);

//   // Memoize auth to prevent unnecessary re-renders
//   const authRef = useRef(auth);
//   useEffect(() => {
//     authRef.current = auth;
//   }, [auth]);

//   // Memoize addNotification, t, and navigate
//   const addNotificationRef = useRef(addNotification);
//   useEffect(() => {
//     addNotificationRef.current = addNotification;
//   }, [addNotification]);

//   const tRef = useRef(t);
//   useEffect(() => {
//     tRef.current = t;
//   }, [t]);

//   const navigateRef = useRef(navigate);
//   useEffect(() => {
//     navigateRef.current = navigate;
//   }, [navigate]);

//   // Redirect if not logged in
//   useEffect(() => {
//     if (!authRef.current.token) {
//       addNotificationRef.current(tRef.current('header.login_required'), 'error');
//       navigateRef.current('/login');
//     }
//   }, []);

//   // Fetch templates (user-created and shared) and forms
//   const fetchData = useCallback(async () => {
//     if (!authRef.current.token || !authRef.current.user?.id) return;
//     if (hasFetched.current) {
//       return;
//     }
//     hasFetched.current = true;

//     setLoading(true);
//     setError(null);

//     let userTemplates = [];
//     let sharedTemplates = [];
//     let userForms = [];

//     try {
//       // Fetch user-created templates
//       const templatesResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates`, {
//         headers: { Authorization: `Bearer ${authRef.current.token}` },
//       });
//       userTemplates = templatesResponse.data
//         .filter((template) => template.created_by === authRef.current.user.id)
//         .map((template) => ({
//           ...template,
//           type: 'template',
//           createdAt: template.createdAt || new Date().toISOString(),
//         }));
//     } catch (err) {
//       console.error('Error fetching user-created templates:', err.response?.data || err.message);
//       addNotificationRef.current('Error fetching user templates', 'error');
//     }

//     try {
//       // Fetch templates shared with the user
//       const sharedTemplatesResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates/shared`, {
//         headers: { Authorization: `Bearer ${authRef.current.token}` },
//         params: { user_id: authRef.current.user.id },
//       });
//       sharedTemplates = sharedTemplatesResponse.data
//         .filter((template) => template.created_by !== authRef.current.user.id)
//         .map((template) => ({
//           ...template,
//           type: 'shared_template',
//           createdAt: template.createdAt || new Date().toISOString(),
//         }));
//     } catch (err) {
//       console.error('Error fetching shared templates:', err.response?.data || err.message);
//       addNotificationRef.current('Error fetching shared templates', 'error');
//     }

//     try {
//       // Fetch forms submitted by the user
//       const formsResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/forms`, {
//         headers: { Authorization: `Bearer ${authRef.current.token}` },
//         params: { user_id: authRef.current.user.id },
//         timeout: 10000,
//       });
//       userForms = formsResponse.data
//         .filter((form) => form.user_id === authRef.current.user.id)
//         .map((form) => ({
//           ...form,
//           type: 'form',
//           title: form.template?.title || tRef.current('personal.unknown_template'),
//           template_id: form.template_id,
//           createdAt: form.createdAt || new Date().toISOString(),
//         }));
//     } catch (err) {
//       console.error('Error fetching forms:', err.response?.data || err.message);
//       addNotificationRef.current('Error fetching forms', 'error');
//     }

//     // Combine and set items
//     const combinedItems = [...userTemplates, ...sharedTemplates, ...userForms];
//     setItems(combinedItems);

//     setLoading(false);
//     hasFetched.current = false;
//   }, []);

//   // Debounced fetch function
//   const debouncedFetchData = useCallback(debounce(fetchData, 300), [fetchData]);

//   // Fetch data on mount
//   useEffect(() => {
//     if (!authRef.current.token || !authRef.current.user?.id) return;
//     debouncedFetchData();
//   }, [debouncedFetchData]);

//   // Delete item (template or form)
//   const handleDelete = async (item) => {
//     try {
//       const url =
//         item.type === 'template' || item.type === 'shared_template'
//           ? `${import.meta.env.VITE_API_URL}/api/templates/${item.id}`
//           : `${import.meta.env.VITE_API_URL}/api/forms/${item.id}`;
//       await axios.delete(url, {
//         headers: { Authorization: `Bearer ${authRef.current.token}` },
//       });
//       setItems((prev) => prev.filter((i) => i.id !== item.id || i.type !== item.type));
//       addNotificationRef.current(
//         item.type === 'template' || item.type === 'shared_template'
//           ? tRef.current('personal.template_deleted')
//           : tRef.current('personal.form_deleted'),
//         'success'
//       );
//     } catch (err) {
//       addNotificationRef.current(
//         item.type === 'template' || item.type === 'shared_template'
//           ? tRef.current('personal.error_deleting_template')
//           : tRef.current('personal.error_deleting_form'),
//         'error'
//       );
//       console.error(`Error deleting ${item.type}:`, err);
//     }
//   };

//   // Sorting function
//   const sortData = (data, sortConfig) => {
//     return [...data].sort((a, b) => {
//       let aValue = sortConfig.field === 'title' ? a.title : a.createdAt;
//       let bValue = sortConfig.field === 'title' ? b.title : b.createdAt;

//       if (sortConfig.field === 'createdAt') {
//         aValue = new Date(aValue);
//         bValue = new Date(bValue);
//       }

//       if (aValue < bValue) return sortConfig.order === 'asc' ? -1 : 1;
//       if (aValue > bValue) return sortConfig.order === 'asc' ? 1 : -1;
//       return 0;
//     });
//   };

//   // Handle sort
//   const handleSort = (field) => {
//     setSortConfig((prev) => ({
//       field,
//       order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
//     }));
//   };

//   // Pagination
//   const paginate = (data, page) => {
//     const start = (page - 1) * itemsPerPage;
//     const end = start + itemsPerPage;
//     return data.slice(start, end);
//   };

//   const sortedItems = sortData(items, sortConfig);
//   const paginatedItems = paginate(sortedItems, currentPage);
//   const totalPages = Math.ceil(items.length / itemsPerPage);

//   if (!auth.token) return null;

//   return (
//     <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-black min-h-screen">
//       <div className="mb-8">
//         <h2 className="text-lg md:text-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg p-3 inline-block">
//           {t('personal.logged_in_as')}: {auth.user.name}
//         </h2>
//       </div>

//       <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 animate-fade-in mb-8">
//         {t('personal.title')}
//       </h1>

//       <div className="mb-8">
//         <Link
//           to="/templates/create"
//           className="inline-block bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors shadow-lg transform hover:-translate-y-1"
//         >
//           {t('personal.create_template')}
//         </Link>
//       </div>

//       <section className="mb-12">
//         <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 border-b-2 border-blue-500 pb-2 mb-6">
//           {t('personal.templates')}
//         </h2>
//         {loading && (
//           <p className="text-lg text-gray-600 dark:text-gray-300 animate-pulse text-center">
//             {t('loading')}
//           </p>
//         )}
//         {error && (
//           <p className="text-red-500 text-lg font-medium bg-red-50 dark:bg-red-900/50 rounded-lg p-4 text-center">
//             {error}
//           </p>
//         )}
//         {!loading && !error && items.length === 0 && (
//           <p className="text-gray-600 dark:text-gray-400 text-lg text-center">
//             {t('personal.no_templates')}
//           </p>
//         )}
//         {!loading && !error && items.length > 0 && (
//           <>
//             <div className="overflow-x-auto rounded-xl shadow-lg">
//               <table className="w-full border-collapse text-sm bg-white dark:bg-gray-800">
//                 <thead>
//                   <tr className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
//                     <th
//                       className="border-b border-gray-200 dark:border-gray-600 p-4 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-300"
//                       onClick={() => handleSort('title')}
//                     >
//                       {t('template.title')}{' '}
//                       {sortConfig.field === 'title' && (
//                         <span className="ml-1">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
//                       )}
//                     </th>
//                     <th
//                       className="border-b border-gray-200 dark:border-gray-600 p-4 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-300"
//                       onClick={() => handleSort('createdAt')}
//                     >
//                       {t('personal.created_at')}{' '}
//                       {sortConfig.field === 'createdAt' && (
//                         <span className="ml-1">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
//                       )}
//                     </th>
//                     <th className="border-b border-gray-200 dark:border-gray-600 p-4 text-left text-gray-900 dark:text-gray-100">
//                       {t('personal.actions')}
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {paginatedItems.map((item) => (
//                     <tr
//                       key={`${item.type}-${item.id}`}
//                       className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-300"
//                     >
//                       <td className="border-b border-gray-200 dark:border-gray-600 p-4 text-blue-600 dark:text-blue-400">
//                         <Link
//                           to={
//                             item.type === 'shared_template'
//                               ? `/templates/${item.id}`
//                               : `/templates/${item.template?.id || item.id}`
//                           }
//                           className="hover:underline font-medium"
//                         >
//                           {item.title || t('personal.unknown_template')}
//                         </Link>
//                       </td>
//                       <td className="border-b border-gray-200 dark:border-gray-600 p-4 text-gray-800 dark:text-gray-300">
//                         {item.createdAt
//                           ? new Date(item.createdAt).toLocaleDateString()
//                           : t('personal.unknown_date')}
//                       </td>
//                       <td className="border-b border-gray-200 dark:border-gray-600 p-4">
//                         <button
//                           onClick={() => handleDelete(item)}
//                           className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-full transition-colors shadow-md transform hover:-translate-y-1"
//                         >
//                           {t('personal.delete')}
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             <div className="flex justify-center items-center space-x-2 py-6">
//               <span className="text-gray-700 dark:text-gray-300 font-medium">Page:</span>
//               {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
//                 <button
//                   key={page}
//                   onClick={() => setCurrentPage(page)}
//                   className={`px-4 py-2 rounded-full mx-1 transition-colors duration-300 ${
//                     currentPage === page
//                       ? 'bg-blue-600 text-white shadow-lg'
//                       : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
//                   }`}
//                 >
//                   {page}
//                 </button>
//               ))}
//             </div>
//           </>
//         )}
//       </section>
//     </div>
//   );
// }

// export default PersonalPage;



// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { useTranslation } from 'react-i18next';
// import { Link, useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import axios from 'axios';

// // Debounce utility to prevent rapid API calls
// const debounce = (func, delay) => {
//   let timeoutId;
//   return (...args) => {
//     if (timeoutId) clearTimeout(timeoutId);
//     return new Promise((resolve) => {
//       timeoutId = setTimeout(async () => {
//         const result = await func(...args);
//         resolve(result);
//       }, delay);
//     });
//   };
// };

// function PersonalPage() {
//   const { t } = useTranslation();
//   const { auth, addNotification } = useAuth();
//   const navigate = useNavigate();
//   const [items, setItems] = useState([]); // Unified state for templates and forms
//   const [sortConfig, setSortConfig] = useState({ field: 'createdAt', order: 'desc' });
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;
//   const hasFetched = useRef(false);

//   // Memoize auth to prevent unnecessary re-renders
//   const authRef = useRef(auth);
//   useEffect(() => {
//     authRef.current = auth;
//   }, [auth]);

//   // Memoize addNotification, t, and navigate
//   const addNotificationRef = useRef(addNotification);
//   useEffect(() => {
//     addNotificationRef.current = addNotification;
//   }, [addNotification]);

//   const tRef = useRef(t);
//   useEffect(() => {
//     tRef.current = t;
//   }, [t]);

//   const navigateRef = useRef(navigate);
//   useEffect(() => {
//     navigateRef.current = navigate;
//   }, [navigate]);

//   // Redirect if not logged in
//   useEffect(() => {
//     if (!authRef.current.token) {
//       addNotificationRef.current(tRef.current('header.login_required'), 'error');
//       navigateRef.current('/login');
//     }
//   }, []);

//   // Fetch templates (user-created and shared) and forms
//   const fetchData = useCallback(async () => {
//     if (!authRef.current.token || !authRef.current.user?.id) return;
//     if (hasFetched.current) {
//       return;
//     }
//     hasFetched.current = true;

//     setLoading(true);
//     setError(null);

//     let userTemplates = [];
//     let sharedTemplates = [];
//     let userForms = [];

//     try {
//       // Fetch user-created templates
//       const templatesResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates`, {
//         headers: { Authorization: `Bearer ${authRef.current.token}` },
//       });
//       userTemplates = templatesResponse.data
//         .filter((template) => template.created_by === authRef.current.user.id)
//         .map((template) => ({
//           ...template,
//           type: 'template',
//           createdAt: template.createdAt || new Date().toISOString(),
//         }));
//     } catch (err) {
//       console.error('Error fetching user-created templates:', err.response?.data || err.message);
//       addNotificationRef.current('Error fetching user templates', 'error');
//     }

//     try {
//       // Fetch templates shared with the user
//       const sharedTemplatesResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates/shared`, {
//         headers: { Authorization: `Bearer ${authRef.current.token}` },
//         params: { user_id: authRef.current.user.id },
//       });
//       sharedTemplates = sharedTemplatesResponse.data
//         .filter((template) => template.created_by !== authRef.current.user.id)
//         .map((template) => ({
//           ...template,
//           type: 'shared_template',
//           createdAt: template.createdAt || new Date().toISOString(),
//         }));
//     } catch (err) {
//       console.error('Error fetching shared templates:', err.response?.data || err.message);
//       addNotificationRef.current('Error fetching shared templates', 'error');
//     }

//     try {
//       // Fetch forms submitted by the user
//       const formsResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/forms`, {
//         headers: { Authorization: `Bearer ${authRef.current.token}` },
//         params: { user_id: authRef.current.user.id },
//         timeout: 10000,
//       });
//       userForms = formsResponse.data
//         .filter((form) => form.user_id === authRef.current.user.id)
//         .map((form) => ({
//           ...form,
//           type: 'form',
//           title: form.template?.title || tRef.current('personal.unknown_template'),
//           template_id: form.template_id,
//           createdAt: form.createdAt || new Date().toISOString(),
//         }));
//     } catch (err) {
//       console.error('Error fetching forms:', err.response?.data || err.message);
//       addNotificationRef.current('Error fetching forms', 'error');
//     }

//     // Combine and set items
//     const combinedItems = [...userTemplates, ...sharedTemplates, ...userForms];
//     setItems(combinedItems);

//     setLoading(false);
//     hasFetched.current = false;
//   }, []);

//   // Debounced fetch function
//   const debouncedFetchData = useCallback(debounce(fetchData, 300), [fetchData]);

//   // Fetch data on mount
//   useEffect(() => {
//     if (!authRef.current.token || !authRef.current.user?.id) return;
//     debouncedFetchData();
//   }, [debouncedFetchData]);

//   // Delete item (template or form)
//   const handleDelete = async (item) => {
//     try {
//       const url =
//         item.type === 'template' || item.type === 'shared_template'
//           ? `${import.meta.env.VITE_API_URL}/api/templates/${item.id}`
//           : `${import.meta.env.VITE_API_URL}/api/forms/${item.id}`;
//       await axios.delete(url, {
//         headers: { Authorization: `Bearer ${authRef.current.token}` },
//       });
//       setItems((prev) => prev.filter((i) => i.id !== item.id || i.type !== item.type));
//       addNotificationRef.current(
//         item.type === 'template' || item.type === 'shared_template'
//           ? tRef.current('personal.template_deleted')
//           : tRef.current('personal.form_deleted'),
//         'success'
//       );
//     } catch (err) {
//       addNotificationRef.current(
//         item.type === 'template' || item.type === 'shared_template'
//           ? tRef.current('personal.error_deleting_template')
//           : tRef.current('personal.error_deleting_form'),
//         'error'
//       );
//       console.error(`Error deleting ${item.type}:`, err);
//     }
//   };

//   // Sorting function
//   const sortData = (data, sortConfig) => {
//     return [...data].sort((a, b) => {
//       let aValue = sortConfig.field === 'title' ? a.title : a.createdAt;
//       let bValue = sortConfig.field === 'title' ? b.title : b.createdAt;

//       if (sortConfig.field === 'createdAt') {
//         aValue = new Date(aValue);
//         bValue = new Date(bValue);
//       }

//       if (aValue < bValue) return sortConfig.order === 'asc' ? -1 : 1;
//       if (aValue > bValue) return sortConfig.order === 'asc' ? 1 : -1;
//       return 0;
//     });
//   };

//   // Handle sort
//   const handleSort = (field) => {
//     setSortConfig((prev) => ({
//       field,
//       order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
//     }));
//   };

//   // Pagination
//   const paginate = (data, page) => {
//     const start = (page - 1) * itemsPerPage;
//     const end = start + itemsPerPage;
//     return data.slice(start, end);
//   };

//   const sortedItems = sortData(items, sortConfig);
//   const paginatedItems = paginate(sortedItems, currentPage);
//   const totalPages = Math.ceil(items.length / itemsPerPage);

//   if (!auth.token) return null;

//   return (
//     <div className="container mx-auto p-4">
//       <div className="mb-6">
//         <h2 className="text-xl font-semibold">
//           {t('personal.logged_in_as')}: {auth.user.name}
//         </h2>
//       </div>

//       <h1 className="text-3xl font-bold mb-6">{t('personal.title')}</h1>

//       <div className="mb-6">
//         <Link
//           to="/templates/create"
//           className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
//         >
//           {t('personal.create_template')}
//         </Link>
//       </div>

//       <section className="mb-12">
//         <h2 className="text-2xl font-semibold mb-4">{t('personal.templates')}</h2>
//         {loading && <p>{t('loading')}</p>}
//         {error && <p className="text-red-500">{error}</p>}
//         {!loading && !error && items.length === 0 && (
//           <p>{t('personal.no_templates')}</p>
//         )}
//         {!loading && !error && items.length > 0 && (
//           <>
//             <div className="overflow-x-auto rounded shadow-md">
//               <table className="w-full border-collapse text-sm bg-white dark:bg-gray-900">
//                 <thead>
//                   <tr className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
//                     <th
//                       className="border-b p-3 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition"
//                       onClick={() => handleSort('title')}
//                     >
//                       {t('template.title')}{' '}
//                       {sortConfig.field === 'title' && (
//                         <span>{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
//                       )}
//                     </th>
//                     <th
//                       className="border-b p-3 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition"
//                       onClick={() => handleSort('createdAt')}
//                     >
//                       {t('personal.created_at')}{' '}
//                       {sortConfig.field === 'createdAt' && (
//                         <span>{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
//                       )}
//                     </th>
//                     <th className="border-b p-3 text-left text-gray-900 dark:text-white">
//                       {t('personal.actions')}
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {paginatedItems.map((item) => (
//                     <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
//                       <td className="border-b p-3 text-blue-600 dark:text-blue-400">
//                         <Link
//                           to={
//                             item.type === 'shared_template'
//                               ? `/templates/${item.id}`
//                               : `/templates/${item.template?.id || item.id}`
//                           }
//                           className="hover:underline"
//                         >
//                           {item.title || t('personal.unknown_template')}
//                         </Link>
//                       </td>
//                       <td className="border-b p-3 text-gray-800 dark:text-gray-300">
//                         {item.createdAt
//                           ? new Date(item.createdAt).toLocaleDateString()
//                           : t('personal.unknown_date')}
//                       </td>
//                       <td className="border-b p-3">
//                         <button
//                           onClick={() => handleDelete(item)}
//                           className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded transition"
//                         >
//                           {t('personal.delete')}
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             <div className="flex justify-center space-x-2 py-6">
//               Page :
//               {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
//                 <button
//                   key={page}
//                   onClick={() => setCurrentPage(page)}
//                   className={`px-2 rounded mx-1 ${
//                     currentPage === page ? 'bg-black text-white' : 'bg-gray-200'
//                   }`}
//                 >
//                   {page}
//                 </button>
//               ))}
//             </div>
//           </>
//         )}
//       </section>
//     </div>
//   );
// }

// export default PersonalPage;
