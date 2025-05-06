import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
      return;
    }
    hasFetched.current = true;

    setLoading(true);
    setError(null);

    let userTemplates = [];
    let sharedTemplates = [];
    let userForms = [];

    try {
      // Fetch user-created templates
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
      // Fetch templates shared with the user
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
      // Fetch forms submitted by the user
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

    // Combine and set items
    const combinedItems = [...userTemplates, ...sharedTemplates, ...userForms];
    setItems(combinedItems);

    setLoading(false);
    hasFetched.current = false;
  }, []);

  // Debounced fetch function
  const debouncedFetchData = useCallback(debounce(fetchData, 300), [fetchData]);

  // Fetch data on mount
  useEffect(() => {
    if (!authRef.current.token || !authRef.current.user.id) return;
    debouncedFetchData();
  }, [debouncedFetchData]);

  // Delete item (template or form)
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

  return (
    <div className="container mx-auto p-6 min-h-screen">
      <div className="mb-8">
        <h2
          // style={{
          //   color: `var(--text-color)`,
          //   backgroundColor: `var(--card-bg)`,
          // }}
          className="text-lg md:text-xl font-semibold rounded-lg p-3 inline-block "
          style={{
            color: `var(--header-text)`,
          }}
        >
          {t('personal.logged_in_as')}: {auth.user.name}
        </h2>
      </div>

      <header className="text-center mb-10">
        <h1
          style={{
            color: `var(--text-white)`,
            backgroundImage: `linear-gradient(to right, var(--table-header-from), var(--table-header-to))`,
          }}
          className="text-3xl md:text-4xl font-extrabold bg-clip-text animate-fade-in "
        >
          {t('personal.title')}
        </h1>
      </header>

      <div className="mb-8 flex justify-center">
        {/* Create Template Button */}
        <Link
          to="/templates/create"
          style={{
            backgroundColor: `var(--table-header-from)`,
            color: '#ffffff',
          }}
          className="inline-block px-6 py-3 rounded-full hover:opacity-80 transition-colors shadow-lg transform hover:-translate-y-1"
        >
          {t('personal.create_template')}
        </Link>
      </div>

      <section className="mb-12">
        <h2
          style={{ borderColor: `var(--table-header-from)` }}
          className="text-2xl font-semibold text-center mb-6 border-b-2 pb-2"
        >
          {t('personal.templates')}
        </h2>
        {loading && (
          <p className="text-lg animate-pulse text-center">{t('loading')}</p>
        )}
        {error && (
          <p
            style={{ color: '#ef4444' }}
            className="text-lg font-medium rounded-lg p-4 text-center"
          >
            {error}
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="text-center text-lg">{t('personal.no_templates')}</p>
        )}
        {!loading && !error && items.length > 0 && (
          <>
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
                    <th
                      className="p-4 text-left font-medium cursor-pointer"
                      onClick={() => handleSort('title')}
                    >
                      {t('template.title')}{' '}
                      {sortConfig.field === 'title' && (
                        <span className="ml-1">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th
                      className="p-4 text-left font-medium cursor-pointer"
                      onClick={() => handleSort('createdAt')}
                    >
                      {t('personal.created_at')}{' '}
                      {sortConfig.field === 'createdAt' && (
                        <span className="ml-1">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th className="p-4 text-left font-medium">{t('personal.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => (
                    <tr
                      key={`${item.type}-${item.id}`}
                      className="hover:bg-gray-100 transition-colors"
                    >
                      <td className="p-4 border-b">
                        <Link
                          to={
                            item.type === 'shared_template'
                              ? `/templates/${item.id}`
                              : `/templates/${item.template?.id || item.id}`
                          }
                          style={{
                            color: `var(--accent-color)`,
                          }}
                          className="hover:underline font-medium"
                        >
                          {item.title || t('personal.unknown_template')}
                        </Link>
                      </td>
                      <td
                        style={{ color: `var(--card-description)` }}
                        className="p-4 border-b "
                      >
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString()
                          : t('personal.unknown_date')}
                      </td>
                      <td className="p-4 border-b">
                        <button
                          onClick={() => handleDelete(item)}
                          style={{
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                          }}
                          className="text-sm px-4 py-2 rounded-full hover:opacity-80 transition-colors shadow-md transform hover:-translate-y-1"
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
              <span className="font-medium">Page :</span>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    backgroundColor: currentPage === page ? `var(--table-header-from)` : `var(--card-bg)`,
                    color: currentPage === page ? '#ffffff' : `var(--text-color)`,
                  }}
                  className="px-4 py-2 rounded-full mx-1 transition-colors duration-300 shadow-md hover:opacity-80"
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
//     if (!authRef.current.token || !authRef.current.user.id) return;
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
//     <div className="container mx-auto p-6 min-h-screen">
//       <div className="mb-8">
//         <h2
//           // style={{
//           //   color: `var(--text-color)`,
//           //   backgroundColor: `var(--card-bg)`,
//           // }}
//           className="text-lg md:text-xl font-semibold rounded-lg p-3 inline-block text-white"
//         >
//           {t('personal.logged_in_as')}: {auth.user.name}
//         </h2>
//       </div>

//       <header className="text-center mb-10">
//         <h1
//           style={{
//             color: `var(--text-white)`,
//             backgroundImage: `linear-gradient(to right, var(--table-header-from), var(--table-header-to))`,
//           }}
//           className="text-3xl md:text-4xl font-extrabold bg-clip-text animate-fade-in "
//         >
//           {t('personal.title')}
//         </h1>
//       </header>

//       <div className="mb-8 flex justify-center">
//         <Link
//           to="/templates/create"
//           style={{
//             backgroundColor: `var(--table-header-from)`,
//             color: '#ffffff',
//           }}
//           className="inline-block px-6 py-3 rounded-full hover:opacity-80 transition-colors shadow-lg transform hover:-translate-y-1"
//         >
//           {t('personal.create_template')}
//         </Link>
//       </div>

//       <section className="mb-12">
//         <h2
//           style={{ borderColor: `var(--table-header-from)` }}
//           className="text-2xl font-semibold text-center mb-6 border-b-2 pb-2"
//         >
//           {t('personal.templates')}
//         </h2>
//         {loading && (
//           <p className="text-lg animate-pulse text-center">{t('loading')}</p>
//         )}
//         {error && (
//           <p
//             style={{ color: '#ef4444' }}
//             className="text-lg font-medium rounded-lg p-4 text-center"
//           >
//             {error}
//           </p>
//         )}
//         {!loading && !error && items.length === 0 && (
//           <p className="text-center text-lg">{t('personal.no_templates')}</p>
//         )}
//         {!loading && !error && items.length > 0 && (
//           <>
//             <div className="overflow-x-auto max-w-4xl mx-auto">
//               <table
//                 style={{ backgroundColor: `var(--card-bg)` }}
//                 className="w-full shadow-md rounded-lg overflow-hidden"
//               >
//                 <thead>
//                   <tr
//                     style={{
//                       background: `linear-gradient(to right, var(--table-header-from), var(--table-header-to))`,
//                     }}
//                     className="text-white"
//                   >
//                     <th
//                       className="p-4 text-left font-medium cursor-pointer"
//                       onClick={() => handleSort('title')}
//                     >
//                       {t('template.title')}{' '}
//                       {sortConfig.field === 'title' && (
//                         <span className="ml-1">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
//                       )}
//                     </th>
//                     <th
//                       className="p-4 text-left font-medium cursor-pointer"
//                       onClick={() => handleSort('createdAt')}
//                     >
//                       {t('personal.created_at')}{' '}
//                       {sortConfig.field === 'createdAt' && (
//                         <span className="ml-1">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
//                       )}
//                     </th>
//                     <th className="p-4 text-left font-medium">{t('personal.actions')}</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {paginatedItems.map((item) => (
//                     <tr
//                       key={`${item.type}-${item.id}`}
//                       className="hover:bg-gray-100 transition-colors"
//                     >
//                       <td className="p-4 border-b">
//                         <Link
//                           to={
//                             item.type === 'shared_template'
//                               ? `/templates/${item.id}`
//                               : `/templates/${item.template?.id || item.id}`
//                           }
//                           style={{
//                             color: `var(--accent-color)`,
//                           }}
//                           className="hover:underline font-medium"
//                         >
//                           {item.title || t('personal.unknown_template')}
//                         </Link>
//                       </td>
//                       <td
//                         style={{ color: `var(--card-description)` }}
//                         className="p-4 border-b "
//                       >
//                         {item.createdAt
//                           ? new Date(item.createdAt).toLocaleDateString()
//                           : t('personal.unknown_date')}
//                       </td>
//                       <td className="p-4 border-b">
//                         <button
//                           onClick={() => handleDelete(item)}
//                           style={{
//                             backgroundColor: '#ef4444',
//                             color: '#ffffff',
//                           }}
//                           className="text-sm px-4 py-2 rounded-full hover:opacity-80 transition-colors shadow-md transform hover:-translate-y-1"
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
//               <span className="font-medium">Page :</span>
//               {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
//                 <button
//                   key={page}
//                   onClick={() => setCurrentPage(page)}
//                   style={{
//                     backgroundColor: currentPage === page ? `var(--table-header-from)` : `var(--card-bg)`,
//                     color: currentPage === page ? '#ffffff' : `var(--text-color)`,
//                   }}
//                   className="px-4 py-2 rounded-full mx-1 transition-colors duration-300 shadow-md hover:opacity-80"
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
