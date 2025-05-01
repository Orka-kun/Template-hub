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
        'http://localhost:5000/api/templates',
        payload,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      addNotification(t('create_template.success'), 'success');
      navigate(`/templates/${response.data.id}`);
    } catch (err) {
      console.error('Failed to create template:', err);
      console.error('Error response:', err.response?.data); // Log the full error response
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
    <div className="container mx-auto p-4 bg-white dark:bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">{t('create_template.title')}</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 dark:text-gray-300">{t('create_template.title_label')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 dark:text-gray-300">{t('create_template.description_label')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('create_template.fields')}</h2>
          {fields.map((field, index) => (
            <div key={index} className="flex space-x-2 mt-2">
              <input
                type="text"
                placeholder={t('create_template.field_label')}
                value={field.label}
                onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
                required
              />
              <select
                value={field.type}
                onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
              >
                <option value="text">{t('create_template.text')}</option>
                <option value="number">{t('create_template.number')}</option>
                <option value="textarea">{t('create_template.textarea')}</option>
                <option value="checkbox">{t('create_template.checkbox')}</option>
              </select>
              <label className="flex items-center text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                  className="mr-2"
                />
                {t('create_template.required')}
              </label>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddField}
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            {t('create_template.add_field')}
          </button>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors ${
            isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? t('create_template.creating') : t('create_template.create')}
        </button>
      </form>
    </div>
  );
}

export default CreateTemplatePage;