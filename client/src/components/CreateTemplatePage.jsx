import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function CreateTemplatePage() {
  const { t } = useTranslation();
  const { auth, addNotification } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState([]);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddField = () => {
    setFields([...fields, { label: '', type: 'text', required: false }]);
  };

  const handleFieldChange = (index, key, value) => {
    const newFields = [...fields];
    newFields[index][key] = value;
    setFields(newFields);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!auth?.token) {
      setError(t('header.login_required'));
      addNotification(t('header.login_required'), 'error');
      navigate('/login');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    // Map frontend field types to backend question types
    const mappedFields = fields.map((field) => ({
      label: field.label,
      type:
        field.type === 'textarea'
          ? 'multi_line'
          : field.type === 'number'
          ? 'positive_integer'
          : field.type, // 'text' becomes 'single_line', 'checkbox' remains
      required: field.required,
    }));

    const payload = {
      title: title.trim(),
      description: description || '',
      topic: 'Other', // Default topic
      image_url: '', // Default empty
      is_public: false, // Default to private
      tags: [], // Default empty
      access: [], // Default empty
      fields: mappedFields,
    };

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/templates`,
        payload,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      addNotification(t('create_template.success'), 'success');
      navigate(`/templates/${response.data.id}`);
    } catch (err) {
      console.error('Failed to create template:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = t('create_template.error_creating_template', {
        error: err.response?.data?.details || err.response?.data?.error || err.message,
      });
      setError(errorMessage);
      addNotification(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-black min-h-screen">
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 animate-fade-in text-center mb-8">
        {t('create_template.title')}
      </h1>
      {error && (
        <p className="text-red-500 text-lg font-medium bg-red-50 dark:bg-red-900/50 rounded-lg p-4 mb-6 text-center max-w-2xl mx-auto">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg space-y-4 border border-gray-200 dark:border-gray-600">
          <div>
            <label className="block text-gray-800 dark:text-gray-100 font-semibold mb-2">
              {t('create_template.title_label')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 shadow-sm transition-all duration-300"
              required
            />
          </div>
          <div>
            <label className="block text-gray-800 dark:text-gray-100 font-semibold mb-2">
              {t('create_template.description_label')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 shadow-sm transition-all duration-300 min-h-[120px]"
            />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg space-y-4 border border-gray-200 dark:border-gray-600">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 border-b-2 border-blue-500 pb-2">
            {t('create_template.fields')}
          </h2>
          {fields.map((field, index) => (
            <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <input
                type="text"
                placeholder={t('create_template.field_label')}
                value={field.label}
                onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                className="w-full sm:flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 shadow-sm transition-all duration-300"
                required
              />
              <select
                value={field.type}
                onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                className="w-full sm:w-40 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 shadow-sm transition-all duration-300"
              >
                <option value="text">{t('create_template.text')}</option>
                <option value="number">{t('create_template.number')}</option>
                <option value="textarea">{t('create_template.textarea')}</option>
                <option value="checkbox">{t('create_template.checkbox')}</option>
              </select>
              <label className="flex items-center text-gray-700 dark:text-gray-300 space-x-2">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded"
                />
                <span className="font-medium">{t('create_template.required')}</span>
              </label>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddField}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors shadow-lg transform hover:-translate-y-1"
          >
            {t('create_template.add_field')}
          </button>
        </div>
        <div className="text-center">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`bg-green-600 text-white px-8 py-3 rounded-full hover:bg-green-700 transition-colors shadow-lg transform hover:-translate-y-1 disabled:bg-green-400 disabled:cursor-not-allowed disabled:transform-none`}
          >
            {isSubmitting ? t('create_template.creating') : t('create_template.create')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateTemplatePage;
// import React, { useState } from 'react';
// import { useTranslation } from 'react-i18next';
// import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import axios from 'axios';

// function CreateTemplatePage() {
//   const { t } = useTranslation();
//   const { auth, addNotification } = useAuth();
//   const navigate = useNavigate();
//   const [title, setTitle] = useState('');
//   const [description, setDescription] = useState('');
//   const [fields, setFields] = useState([]);
//   const [error, setError] = useState(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const handleAddField = () => {
//     setFields([...fields, { label: '', type: 'text', required: false }]);
//   };

//   const handleFieldChange = (index, key, value) => {
//     const newFields = [...fields];
//     newFields[index][key] = value;
//     setFields(newFields);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!auth?.token) {
//       setError(t('header.login_required'));
//       addNotification(t('header.login_required'), 'error');
//       navigate('/login');
//       return;
//     }
//     setIsSubmitting(true);
//     setError(null);

//     // Map frontend field types to backend question types
//     const mappedFields = fields.map((field) => ({
//       label: field.label,
//       type:
//         field.type === 'textarea'
//           ? 'multi_line'
//           : field.type === 'number'
//           ? 'positive_integer'
//           : field.type, // 'text' becomes 'single_line', 'checkbox' remains
//       required: field.required,
//     }));

//     const payload = {
//       title: title.trim(),
//       description: description || '',
//       topic: 'Other', // Default topic
//       image_url: '', // Default empty
//       is_public: false, // Default to private
//       tags: [], // Default empty
//       access: [], // Default empty
//       fields: mappedFields,
//     };

//     try {
//       const response = await axios.post(
//         `${import.meta.env.VITE_API_URL}/api/templates`,
//         payload,
//         { headers: { Authorization: `Bearer ${auth.token}` } }
//       );
//       addNotification(t('create_template.success'), 'success');
//       navigate(`/templates/${response.data.id}`);
//     } catch (err) {
//       console.error('Failed to create template:', err);
//       console.error('Error response:', err.response?.data);
//       const errorMessage = t('create_template.error_creating_template', {
//         error: err.response?.data?.details || err.response?.data?.error || err.message,
//       });
//       setError(errorMessage);
//       addNotification(errorMessage, 'error');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <div className="container mx-auto p-4 bg-white dark:bg-gray-900 min-h-screen">
//       <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">{t('create_template.title')}</h1>
//       {error && <p className="text-red-500 mb-4">{error}</p>}
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <div>
//           <label className="block text-gray-700 dark:text-gray-300">{t('create_template.title_label')}</label>
//           <input
//             type="text"
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//             className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
//             required
//           />
//         </div>
//         <div>
//           <label className="block text-gray-700 dark:text-gray-300">{t('create_template.description_label')}</label>
//           <textarea
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//             className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
//           />
//         </div>
//         <div>
//           <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('create_template.fields')}</h2>
//           {fields.map((field, index) => (
//             <div key={index} className="flex space-x-2 mt-2">
//               <input
//                 type="text"
//                 placeholder={t('create_template.field_label')}
//                 value={field.label}
//                 onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
//                 className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
//                 required
//               />
//               <select
//                 value={field.type}
//                 onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
//                 className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
//               >
//                 <option value="text">{t('create_template.text')}</option>
//                 <option value="number">{t('create_template.number')}</option>
//                 <option value="textarea">{t('create_template.textarea')}</option>
//                 <option value="checkbox">{t('create_template.checkbox')}</option>
//               </select>
//               <label className="flex items-center text-gray-700 dark:text-gray-300">
//                 <input
//                   type="checkbox"
//                   checked={field.required}
//                   onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
//                   className="mr-2"
//                 />
//                 {t('create_template.required')}
//               </label>
//             </div>
//           ))}
//           <button
//             type="button"
//             onClick={handleAddField}
//             className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
//           >
//             {t('create_template.add_field')}
//           </button>
//         </div>
//         <button
//           type="submit"
//           disabled={isSubmitting}
//           className={`bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors ${
//             isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
//           }`}
//         >
//           {isSubmitting ? t('create_template.creating') : t('create_template.create')}
//         </button>
//       </form>
//     </div>
//   );
// }

// export default CreateTemplatePage;
