import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
// submit
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
  const [items, setItems] = useState([]); // Unified state for templates and forms
  const [sortConfig, setSortConfig] = useState({ field: 'createdAt', order: 'desc' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const hasFetched = useRef(false);

  // Memoize auth to prevent unnecessary re-renders
  const authRef = useRef(auth);
  useEffect(() => {
    authRef.current = auth;
    console.log('auth updated:', auth);
  }, [auth]);

  // Memoize addNotification, t, and navigate
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

  // Redirect if not logged in
  useEffect(() => {
    if (!authRef.current.token) {
      addNotificationRef.current(tRef.current('header.login_required'), 'error');
      navigateRef.current('/login');
    }
  }, []);

  // Fetch templates (user-created and shared) and forms
  const fetchData = useCallback(async () => {
    if (!authRef.current.token || !authRef.current.user?.id) return;
    if (hasFetched.current) {
      console.log('fetchData skipped: already fetched');
      return;
    }
    hasFetched.current = true;

    console.log('Starting fetchData');
    setLoading(true);
    setError(null);

    let userTemplates = [];
    let sharedTemplates = [];
    let userForms = [];

    try {
      // Fetch user-created templates
      console.log('Fetching user-created templates for user_id:', authRef.current.user.id);
      const templatesResponse = await axios.get('http://localhost:5000/api/templates', {
        headers: { Authorization: `Bearer ${authRef.current.token}` },
      });
      console.log('Raw templates response:', templatesResponse.data);
      userTemplates = templatesResponse.data
        .filter((template) => template.created_by === authRef.current.user.id)
        .map((template) => ({
          ...template,
          type: 'template',
          createdAt: template.createdAt || new Date().toISOString(),
        }));
      console.log('Fetched user-created templates:', userTemplates);
    } catch (err) {
      console.error('Error fetching user-created templates:', err.response?.data || err.message);
      addNotificationRef.current('Error fetching user templates', 'error');
    }

    try {
      // Fetch templates shared with the user
      console.log('Fetching shared templates for user_id:', authRef.current.user.id);
      const sharedTemplatesResponse = await axios.get('http://localhost:5000/api/templates/shared', {
        headers: { Authorization: `Bearer ${authRef.current.token}` },
        params: { user_id: authRef.current.user.id },
      });
      console.log('Raw shared templates response:', sharedTemplatesResponse.data);
      sharedTemplates = sharedTemplatesResponse.data
        .filter((template) => template.created_by !== authRef.current.user.id)
        .map((template) => ({
          ...template,
          type: 'shared_template',
          createdAt: template.createdAt || new Date().toISOString(),
        }));
      console.log('Fetched shared templates:', sharedTemplates);
    } catch (err) {
      console.error('Error fetching shared templates:', err.response?.data || err.message);
      addNotificationRef.current('Error fetching shared templates', 'error');
    }

    try {
      // Fetch forms submitted by the user
      console.log(`Fetching all forms for user_id: ${authRef.current.user.id}`);
      const formsResponse = await axios.get('http://localhost:5000/api/forms', {
        headers: { Authorization: `Bearer ${authRef.current.token}` },
        params: { user_id: authRef.current.user.id },
        timeout: 10000,
      });
      console.log('Raw forms response:', formsResponse.data);
      userForms = formsResponse.data
        .filter((form) => {
          const matches = form.user_id === authRef.current.user.id;
          console.log(`Form user_id: ${form.user_id}, user_id: ${authRef.current.user.id}, matches: ${matches}`);
          return matches;
        })
        .map((form) => ({
          ...form,
          type: 'form',
          title: form.template?.title || tRef.current('personal.unknown_template'),
          template_id: form.template_id,
          createdAt: form.createdAt || new Date().toISOString(),
        }));
      console.log('Fetched user forms:', userForms);
    } catch (err) {
      console.error('Error fetching forms:', err.response?.data || err.message);
      addNotificationRef.current('Error fetching forms', 'error');
    }

    // Combine and set items
    const combinedItems = [...userTemplates, ...sharedTemplates, ...userForms];
    console.log('Setting items:', combinedItems);
    setItems(combinedItems);
    console.log('Items state after setItems:', combinedItems);

    setLoading(false);
    hasFetched.current = false;
  }, []);

  // Debounced fetch function
  const debouncedFetchData = useCallback(debounce(fetchData, 300), [fetchData]);

  // Fetch data on mount
  useEffect(() => {
    console.log('useEffect triggered with auth:', authRef.current);
    if (!authRef.current.token || !authRef.current.user?.id) return;
    debouncedFetchData();
  }, [debouncedFetchData]);

  // Delete item (template or form)
  const handleDelete = async (item) => {
    try {
      const url =
        item.type === 'template' || item.type === 'shared_template'
          ? `http://localhost:5000/api/templates/${item.id}`
          : `http://localhost:5000/api/forms/${item.id}`;
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

  // Sorting function
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

  // Handle sort
  const handleSort = (field) => {
    setSortConfig((prev) => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Pagination
  const paginate = (data, page) => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  };

  const sortedItems = sortData(items, sortConfig);
  const paginatedItems = paginate(sortedItems, currentPage);
  const totalPages = Math.ceil(items.length / itemsPerPage);

  if (!auth.token) return null;

  console.log('Rendering PersonalPage with items:', items, 'loading:', loading);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">
          {t('personal.logged_in_as')}: {auth.user.name}
        </h2>
      </div>

      <h1 className="text-3xl font-bold mb-6">{t('personal.title')}</h1>

      <div className="mb-6">
        <Link
          to="/templates/create"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {t('personal.create_template')}
        </Link>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">{t('personal.templates')}</h2>
        {loading && <p>{t('loading')}</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p>{t('personal.no_templates')}</p>
        )}
        {!loading && !error && items.length > 0 && (
          <>
            <div className="overflow-x-auto rounded shadow-md">
              <table className="w-full border-collapse text-sm bg-white dark:bg-gray-900">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
                    <th
                      className="border-b p-3 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                      onClick={() => handleSort('title')}
                    >
                      {t('template.title')}{' '}
                      {sortConfig.field === 'title' && (
                        <span>{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th
                      className="border-b p-3 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                      onClick={() => handleSort('createdAt')}
                    >
                      {t('personal.created_at')}{' '}
                      {sortConfig.field === 'createdAt' && (
                        <span>{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th className="border-b p-3 text-left text-gray-900 dark:text-white">
                      {t('personal.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => (
                    <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <td className="border-b p-3 text-blue-600 dark:text-blue-400">
                        <Link
                          to={
                            item.type === 'shared_template'
                              ? `/templates/${item.id}`
                              : `/templates/${item.template?.id || item.id}`
                          }
                          className="hover:underline"
                        >
                          {item.title || t('personal.unknown_template')}
                        </Link>
                      </td>
                      <td className="border-b p-3 text-gray-800 dark:text-gray-300">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString()
                          : t('personal.unknown_date')}
                      </td>
                      <td className="border-b p-3">
                        <button
                          onClick={() => handleDelete(item)}
                          className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded transition"
                        >
                          {t('personal.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center space-x-2 py-6">
              Page :
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-2 rounded mx-1 ${
                    currentPage === page ? 'bg-black text-white' : 'bg-gray-200'
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
//   const isMounted = useRef(true);
//   const hasFetched = useRef(false); // Prevent multiple fetches
//   const cancelTokenSource = useRef(null); // For canceling Axios requests

//   // Memoize addNotification to prevent recreation
//   const addNotificationRef = useRef(addNotification);
//   useEffect(() => {
//     addNotificationRef.current = addNotification;
//   }, [addNotification]);

//   // Memoize t and navigate to ensure stability
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
//     if (!auth.token) {
//       addNotificationRef.current(tRef.current('header.login_required'), 'error');
//       navigateRef.current('/login');
//     }
//   }, [auth.token]);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       console.log('Component unmounting, setting isMounted to false');
//       isMounted.current = false;
//       if (cancelTokenSource.current) {
//         console.log('Canceling ongoing Axios requests');
//         cancelTokenSource.current.cancel('Component unmounted');
//       }
//     };
//   }, []);

//   // Fetch templates and forms
//   const fetchData = useCallback(async () => {
//     if (!auth.token || !auth.user?.id) return;
//     if (hasFetched.current) {
//       console.log('fetchData skipped: already fetched');
//       return;
//     }
//     hasFetched.current = true;

//     console.log('Starting fetchData');
//     setLoading(true);
//     setError(null);

//     // Create a cancel token for Axios requests
//     cancelTokenSource.current = axios.CancelToken.source();

//     try {
//       // Fetch templates
//       const templatesResponse = await axios.get('http://localhost:5000/api/templates', {
//         headers: { Authorization: `Bearer ${auth.token}` },
//         cancelToken: cancelTokenSource.current.token,
//       });
//       const userTemplates = templatesResponse.data
//         .filter((template) => template.created_by === auth.user.id)
//         .map((template) => ({
//           ...template,
//           type: 'template',
//         }));

//       console.log('Fetched templates for user:', userTemplates);

//       // Fetch all forms submitted by the user
//       console.log(`Fetching all forms for user_id: ${auth.user.id}`);
//       const formsResponse = await axios.get('http://localhost:5000/api/forms', {
//         headers: { Authorization: `Bearer ${auth.token}` },
//         params: { user_id: auth.user.id.toString() },
//         timeout: 10000, // 10-second timeout
//         cancelToken: cancelTokenSource.current.token,
//       });
//       console.log('Forms fetched for user:', formsResponse.data);
//       const userForms = formsResponse.data.map((form) => ({
//         ...form,
//         type: 'form',
//         title: form.template?.title || tRef.current('personal.unknown_template'),
//         template_id: form.template_id, // Assuming the form data includes template_id
//       }));

//       console.log('isMounted.current before setting state:', isMounted.current);
//       if (isMounted.current) {
//         console.log('Setting items:', [...userTemplates, ...userForms]);
//         setItems([...userTemplates, ...userForms]);
//       } else {
//         console.log('Component unmounted, skipping setItems');
//       }
//     } catch (err) {
//       if (axios.isCancel(err)) {
//         console.log('Fetch canceled:', err.message);
//         return;
//       }
//       console.error('Error fetching data:', err.response?.data || err.message);
//       if (isMounted.current) {
//         if (err.response?.status === 429) {
//           setError(tRef.current('personal.rate_limit_exceeded'));
//           addNotificationRef.current(tRef.current('personal.rate_limit_exceeded'), 'error');
//         } else if (err.response?.status === 401) {
//           setError(tRef.current('header.session_expired'));
//           addNotificationRef.current(tRef.current('header.session_expired'), 'error');
//           navigateRef.current('/login');
//         } else if (err.response?.status === 400) {
//           const errorMessage = err.response?.data?.error || tRef.current('personal.error_fetching_forms');
//           setError(errorMessage);
//           addNotificationRef.current(errorMessage, 'error');
//         } else {
//           setError(tRef.current('personal.error_loading_data'));
//           addNotificationRef.current(tRef.current('personal.error_loading_data'), 'error');
//         }
//       } else {
//         console.log('Component unmounted, skipping error handling');
//       }
//     } finally {
//       console.log('isMounted.current in finally:', isMounted.current);
//       if (isMounted.current) {
//         console.log('Setting loading to false');
//         setLoading(false);
//         hasFetched.current = false; // Reset to allow retry if needed
//       } else {
//         console.log('Component unmounted, skipping setLoading');
//       }
//     }
//   }, [auth.token, auth.user?.id]);

//   // Debounced fetch function
//   const debouncedFetchData = useCallback(debounce(fetchData, 300), [fetchData]);

//   // Fetch data on mount and when auth changes
//   useEffect(() => {
//     console.log('useEffect triggered with auth:', auth);
//     if (!auth.token || !auth.user?.id) return;
//     debouncedFetchData();
//   }, [auth.token, auth.user?.id, debouncedFetchData]);

//   // Delete item (template or form)
//   const handleDelete = async (item) => {
//     try {
//       const url =
//         item.type === 'template'
//           ? `http://localhost:5000/api/templates/${item.id}`
//           : `http://localhost:5000/api/templates/forms/${item.id}`;
//       await axios.delete(url, {
//         headers: { Authorization: `Bearer ${auth.token}` },
//       });
//       setItems((prev) => prev.filter((i) => i.id !== item.id || i.type !== item.type));
//       addNotificationRef.current(
//         item.type === 'template' ? tRef.current('personal.template_deleted') : tRef.current('personal.form_deleted'),
//         'success'
//       );
//     } catch (err) {
//       addNotificationRef.current(
//         item.type === 'template' ? tRef.current('personal.error_deleting_template') : tRef.current('personal.error_deleting_form'),
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

//       // Handle dates
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

//   console.log('Rendering PersonalPage with items:', items, 'loading:', loading);

//   return (
//     <div className="container mx-auto p-4">
//       {/* Display logged-in user */}
//       <div className="mb-6">
//         <h2 className="text-xl font-semibold">
//           {t('personal.logged_in_as')}: {auth.user.name}
//         </h2>
//       </div>

//       <h1 className="text-3xl font-bold mb-6">{t('personal.title')}</h1>

//       {/* Create Template Button */}
//       <div className="mb-6">
//         <Link
//           to="/templates/create"
//           className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
//         >
//           {t('personal.create_template')}
//         </Link>
//       </div>

//       {/* Unified Templates Section */}
//       <section className="mb-12">
//         <h2 className="text-2xl font-semibold mb-4">{t('personal.templates')}</h2>
//         {loading && <p>{t('loading')}</p>}
//         {error && <p className="text-red-500">{error}</p>}
//         {!loading && !error && items.length === 0 && (
//           <p>{t('personal.no_templates')}</p>
//         )}
//         {!loading && !error && items.length > 0 && (
//           <>
//             <table className="w-full border-collapse mb-4">
//               <thead>
//                 <tr className="bg-gray-200">
//                   <th
//                     className="border p-2 cursor-pointer"
//                     onClick={() => handleSort('title')}
//                   >
//                     {t('template.title')} {sortConfig.field === 'title' && (sortConfig.order === 'asc' ? '↑' : '↓')}
//                   </th>
//                   <th
//                     className="border p-2 cursor-pointer"
//                     onClick={() => handleSort('createdAt')}
//                   >
//                     {t('personal.created_at')} {sortConfig.field === 'createdAt' && (sortConfig.order === 'asc' ? '↑' : '↓')}
//                   </th>
//                   <th className="border p-2">{t('personal.actions')}</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {paginatedItems.map((item) => (
//                   <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-100">
//                     <td className="border p-2">
//                       <Link to={`/templates/${item.template?.id || item.id}`} className="text-blue-500 hover:underline">
//                         {item.title || t('personal.unknown_template')}
//                       </Link>
//                     </td>
//                     <td className="border p-2">
//                       {item.createdAt
//                         ? new Date(item.createdAt).toLocaleDateString()
//                         : t('personal.unknown_date')}
//                     </td>
//                     <td className="border p-2">
//                       <button
//                         onClick={() => handleDelete(item)}
//                         className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
//                       >
//                         {t('personal.delete')}
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//             {/* Pagination */}
//             <div className="flex justify-center space-x-2">
//               {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
//                 <button
//                   key={page}
//                   onClick={() => setCurrentPage(page)}
//                   className={`px-3 py-1 rounded ${
//                     currentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-200'
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
