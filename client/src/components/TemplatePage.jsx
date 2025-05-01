import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { MDXEditor } from '@mdxeditor/editor';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

function SortableItem({ id, title, type, onDelete, t }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4 flex justify-between items-center"
    >
      <span className="text-gray-800 dark:text-gray-100">{title} - {t(`question_types.${type}`)}</span>
      <button
        onClick={() => onDelete(id)}
        className="text-red-500 hover:text-red-700 transition-colors"
        aria-label={t('template.delete')}
      >
        {t('template.delete')}
      </button>
    </div>
  );
}

function Notification({ message, type, onClose }) {
  return (
    <div
      className={`p-4 rounded-lg shadow-md mb-4 flex justify-between items-center ${
        type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="text-lg font-bold" aria-label="Close notification">
        ×
      </button>
    </div>
  );
}

function TemplatePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('settings');
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionType, setQuestionType] = useState('single_line');
  const [tags, setTags] = useState([]);
  const [answers, setAnswers] = useState({});
  const [comment, setComment] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [shareError, setShareError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
  const { auth } = useAuth();
  const navigate = useNavigate();
  const sensors = useSensors(useSensor(PointerSensor));

  // Valid topics to match backend validation
  const validTopics = ['Education', 'Quiz', 'Other'];

  // Use useRef to ensure fetch only happens once on mount
  const hasFetched = useRef(false);

  // Debounced fetch function for template data
  const fetchTemplate = useCallback(
    debounce(async () => {
      if (!auth?.token) {
        setError(t('header.login_required'));
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('header.login_required'), type: 'error' },
        ]);
        navigate('/login');
        return;
      }

      if (id === 'new') {
        navigate('/templates/create', { replace: true });
        return;
      }

      if (!/^\d+$/.test(id)) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('template.invalid_id'), type: 'error' },
        ]);
        navigate('/personal');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        console.log('Fetching template with headers:', { Authorization: `Bearer ${auth.token}` });
        const res = await axios.get(`http://localhost:5000/api/templates/${id}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        console.log('Template fetched:', res.data);
        setTemplate(res.data);
        setTags(res.data.tags.map(t => t.name));
      } catch (err) {
        console.error('Error fetching template:', err);
        if (err.response?.status === 401) {
          setNotifications((prev) => [
            ...prev,
            { id: Date.now(), message: t('header.session_expired'), type: 'error' },
          ]);
          navigate('/login');
        } else if (err.response?.status === 404) {
          setNotifications((prev) => [
            ...prev,
            { id: Date.now(), message: t('template.not_found'), type: 'error' },
          ]);
          navigate('/personal');
        } else if (err.response?.status === 403) {
          setNotifications((prev) => [
            ...prev,
            { id: Date.now(), message: t('template.no_access'), type: 'error' },
          ]);
          navigate('/personal');
        } else {
          const errorMessage = err.response?.data?.error || t('template.error_fetching_data');
          setError(errorMessage);
          setNotifications((prev) => [
            ...prev,
            { id: Date.now(), message: errorMessage, type: 'error' },
          ]);
        }
      } finally {
        setLoading(false);
        console.log('Loading state updated:', { loading: false });
      }
    }, 500),
    [id, auth?.token, t]
  );

  // Fetch template on mount
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    console.log('useEffect triggered');
    fetchTemplate();
  }, [fetchTemplate]);

  const removeNotification = id => setNotifications(prev => prev.filter(n => n.id !== id));

  const handleSaveSettings = async () => {
    if (!auth?.token) {
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('header.login_required'), type: 'error' },
      ]);
      navigate('/login');
      return;
    }
    setIsSavingSettings(true);
    try {
      // Ensure topic is valid; default to 'Other' if invalid or empty
      const validTopic = template.topic && validTopics.includes(template.topic) ? template.topic : 'Other';
      const updatedTemplate = {
        title: template.title || '', // Ensure title is not undefined
        description: template.description || '', // Ensure description is not undefined
        topic: validTopic,
        image_url: template.image_url || '',
        is_public: template.is_public || false, // Ensure is_public is not undefined
        tags: tags.filter(tag => tag.trim() !== ''),
        access: template.access ? template.access.map(a => a.user_id) : [], // Ensure access is not undefined
      };
      console.log('Saving settings with payload:', updatedTemplate); // Debug log
      await axios.put(
        `http://localhost:5000/api/templates/${id}`,
        updatedTemplate,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('template.template_saved'), type: 'success' },
      ]);
      const res = await axios.get(`http://localhost:5000/api/templates/${id}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setTemplate(res.data);
      setTags(res.data.tags.map(t => t.name));
    } catch (error) {
      console.error('Error saving settings:', error); // Debug log
      if (error.response?.status === 401) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('header.session_expired'), type: 'error' },
        ]);
        navigate('/login');
      } else if (error.response?.status === 403) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('template.no_access'), type: 'error' },
        ]);
      } else if (error.response?.status === 400) {
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            message: `${t('template.error_saving_settings')}: ${error.response?.data?.error || 'Invalid request'}`,
            type: 'error',
          },
        ]);
      } else {
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            message: `${t('template.error_saving_settings')}: ${error.response?.data?.error || t('error.unknown')}`,
            type: 'error',
          },
        ]);
      }
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!questionTitle) {
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('template.question_title_required'), type: 'error' },
      ]);
      return;
    }
    if (!auth?.token) {
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('header.login_required'), type: 'error' },
      ]);
      navigate('/login');
      return;
    }
    setIsAddingQuestion(true);
    const newQuestion = {
      type: questionType,
      title: questionTitle,
      description: '',
      order: template.questions.length,
      is_shown_in_table: true,
    };
    try {
      const res = await axios.post(
        `http://localhost:5000/api/templates/${id}/questions`,
        newQuestion,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setTemplate({ ...template, questions: [...template.questions, res.data] });
      setQuestionTitle('');
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('template.question_added'), type: 'success' },
      ]);
    } catch (error) {
      if (error.response?.status === 401) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('header.session_expired'), type: 'error' },
        ]);
        navigate('/login');
      } else if (error.response?.status === 403) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('template.no_access'), type: 'error' },
        ]);
      } else {
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            message: `${t('template.error_adding_question')}: ${error.response?.data?.error || t('error.unknown')}`,
            type: 'error',
          },
        ]);
      }
    } finally {
      setIsAddingQuestion(false);
    }
  };

  const handleDeleteQuestion = async questionId => {
    if (!auth?.token) {
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('header.login_required'), type: 'error' },
      ]);
      navigate('/login');
      return;
    }
    try {
      await axios.delete(`http://localhost:5000/api/templates/${id}/questions/${questionId}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setTemplate({
        ...template,
        questions: template.questions.filter(q => q.id !== questionId),
      });
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('template.question_deleted'), type: 'success' },
      ]);
    } catch (error) {
      if (error.response?.status === 401) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('header.session_expired'), type: 'error' },
        ]);
        navigate('/login');
      } else if (error.response?.status === 403) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('template.no_access'), type: 'error' },
        ]);
      } else {
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            message: `${t('template.error_deleting_question')}: ${error.response?.data?.error || t('error.unknown')}`,
            type: 'error',
          },
        ]);
      }
    }
  };

  const handleDragEnd = async event => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = template.questions.findIndex(q => q.id === active.id);
      const newIndex = template.questions.findIndex(q => q.id === over.id);
      const newQuestions = [...template.questions];
      const [movedItem] = newQuestions.splice(oldIndex, 1);
      newQuestions.splice(newIndex, 0, movedItem);
      setTemplate({ ...template, questions: newQuestions });
      if (!auth?.token) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('header.login_required'), type: 'error' },
        ]);
        navigate('/login');
        return;
      }
      try {
        await axios.put(
          `http://localhost:5000/api/templates/${id}/questions/order`,
          newQuestions.map((q, index) => ({ id: q.id, order: index })),
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('template.order_updated'), type: 'success' },
        ]);
      } catch (error) {
        if (error.response?.status === 401) {
          setNotifications((prev) => [
            ...prev,
            { id: Date.now(), message: t('header.session_expired'), type: 'error' },
          ]);
          navigate('/login');
        } else if (error.response?.status === 403) {
          setNotifications((prev) => [
            ...prev,
            { id: Date.now(), message: t('template.no_access'), type: 'error' },
          ]);
        } else {
          setNotifications((prev) => [
            ...prev,
            {
              id: Date.now(),
              message: `${t('template.error_updating_order')}: ${error.response?.data?.error || t('error.unknown')}`,
              type: 'error',
            },
          ]);
        }
      }
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value.toString() }));
    setFormErrors(prev => ({ ...prev, [questionId]: '' }));
  };

  const validateForm = () => {
    const errors = {};
    template.questions.forEach(q => {
      if (q.type === 'fixed_user' || q.type === 'fixed_date') return;
      if (q.type !== 'checkbox' && !answers[q.id]) {
        errors[q.id] = t('template.answer_required', { question: q.title });
      }
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async () => {
    if (!validateForm()) {
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('template.fill_required_fields'), type: 'error' },
      ]);
      return;
    }
    if (!auth?.token) {
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('header.login_required'), type: 'error' },
      ]);
      navigate('/login');
      return;
    }
    setIsSubmittingForm(true);
    const formattedAnswers = Object.entries(answers)
      .filter(([question_id]) => {
        const question = template.questions.find(q => q.id === parseInt(question_id));
        return question && question.type !== 'fixed_user' && question.type !== 'fixed_date';
      })
      .map(([question_id, value]) => ({
        question_id: parseInt(question_id),
        value,
      }));
    try {
      console.log('Submitting form with answers:', formattedAnswers); // Debug log
      await axios.post(
        `http://localhost:5000/api/templates/${id}/form`,
        { answers: formattedAnswers },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('template.answer_submitted'), type: 'success' },
      ]);
      setAnswers({});
      setFormErrors({});
      const updatedTemplate = await axios.get(`http://localhost:5000/api/templates/${id}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setTemplate(updatedTemplate.data);
    } catch (error) {
      console.error('Error submitting form:', error.response?.data || error.message); // Debug log
      if (error.response?.status === 401) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('header.session_expired'), type: 'error' },
        ]);
        navigate('/login');
      } else if (error.response?.status === 403) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('template.no_access'), type: 'error' },
        ]);
      } else {
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            message: `${t('template.error_submitting_form')}: ${error.response?.data?.error || t('error.unknown')}`,
            type: 'error',
          },
        ]);
      }
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) {
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('template.comment_empty'), type: 'error' },
      ]);
      return;
    }
    if (!auth?.token) {
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('header.login_required'), type: 'error' },
      ]);
      navigate('/login');
      return;
    }
    setIsAddingComment(true);
    try {
      const res = await axios.post(
        `http://localhost:5000/api/templates/${id}/comments`,
        { content: comment },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setTemplate({ ...template, comments: [...template.comments, res.data] });
      setComment('');
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('template.comment_added'), type: 'success' },
      ]);
    } catch (error) {
      if (error.response?.status === 401) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('header.session_expired'), type: 'error' },
        ]);
        navigate('/login');
      } else if (error.response?.status === 403) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('template.no_access'), type: 'error' },
        ]);
      } else {
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            message: `${t('template.error_adding_comment')}: ${error.response?.data?.error || t('error.unknown')}`,
            type: 'error',
          },
        ]);
      }
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleExportCSV = () => {
    if (!template.forms || template.forms.length === 0) {
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('template.no_submissions'), type: 'error' },
      ]);
      return;
    }
    setIsExportingCSV(true);
    const headers = [t('template.form_id'), t('template.submitted_by'), t('template.submitted_at'), ...template.questions.map(q => q.title)];
    const rows = template.forms.map(form => [
      form.id,
      form.user?.name || t('home.unknown_author'),
      new Date(form.createdAt).toISOString(),
      ...template.questions.map(q => form.answers.find(a => a.question_id === q.id)?.value || ''),
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${template.title}_responses.csv`;
    link.click();
    setNotifications((prev) => [
      ...prev,
      { id: Date.now(), message: t('template.csv_exported'), type: 'success' },
    ]);
    setIsExportingCSV(false);
  };

  const handleShare = async () => {
    if (!shareEmail.trim()) {
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('template.email_required'), type: 'error' },
      ]);
      return;
    }
    if (!auth?.token) {
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('header.login_required'), type: 'error' },
      ]);
      navigate('/login');
      return;
    }
    setIsSharing(true);
    try {
      await axios.post(
        `http://localhost:5000/api/templates/${id}/share`,
        { email: shareEmail },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('template.template_shared', { email: shareEmail }), type: 'success' },
      ]);
      setShareEmail('');
      setShareError('');
      const res = await axios.get(`http://localhost:5000/api/templates/${id}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setTemplate(res.data);
    } catch (error) {
      setShareError(error.response?.data?.error || t('template.error_sharing'));
      if (error.response?.status === 401) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('header.session_expired'), type: 'error' },
        ]);
        navigate('/login');
      } else if (error.response?.status === 403) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('template.no_access'), type: 'error' },
        ]);
      } else {
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            message: `${t('template.error_sharing')}: ${error.response?.data?.error || t('error.unknown')}`,
            type: 'error',
          },
        ]);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!auth?.token) {
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('header.login_required'), type: 'error' },
      ]);
      navigate('/login');
      return;
    }
    if (!window.confirm(t('template.confirm_delete_template')))
      return;
    setIsDeletingTemplate(true);
    try {
      await axios.delete(`http://localhost:5000/api/templates/${id}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: t('template.template_deleted'), type: 'success' },
      ]);
      navigate('/personal');
    } catch (error) {
      if (error.response?.status === 401) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('header.session_expired'), type: 'error' },
        ]);
        navigate('/login');
      } else if (error.response?.status === 403) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('template.no_access'), type: 'error' },
        ]);
      } else if (error.response?.status === 404) {
        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), message: t('template.not_found'), type: 'error' },
        ]);
        navigate('/personal');
      } else {
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            message: `${t('template.error_deleting_template')}: ${error.response?.data?.error || t('error.unknown')}`,
            type: 'error',
          },
        ]);
      }
    } finally {
      setIsDeletingTemplate(false);
    }
  };

  // Log loading state changes only when they occur
  useEffect(() => {
    console.log('Loading state:', { loading });
  }, [loading]);

  if (loading) {
    return <div className="text-center text-gray-600 dark:text-gray-400">{t('loading')}</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  if (!template) {
    return <div className="text-center text-gray-600 dark:text-gray-400">{t('template.not_found')}</div>;
  }

  const isCreator = template.created_by === auth?.user?.id;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{template.title}</h1>
        {isCreator && (
          <button
            onClick={handleDeleteTemplate}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow disabled:bg-red-400"
            disabled={isDeletingTemplate}
            aria-label={t('template.delete_template')}
          >
            {isDeletingTemplate ? t('loading') : t('template.delete_template')}
          </button>
        )}
      </div>
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
          {notifications.map(n => (
            <Notification
              key={n.id}
              message={n.message}
              type={n.type}
              onClose={() => removeNotification(n.id)}
            />
          ))}
        </div>
      )}
      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
        {isCreator
          ? ['settings', 'questions', 'aggregation', 'comments'].map(tabName => (
              <button
                key={tabName}
                onClick={() => setTab(tabName)}
                className={`pb-2 px-4 text-lg font-medium ${
                  tab === tabName
                    ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400'
                } transition-colors`}
                aria-label={`Switch to ${tabName} tab`}
              >
                {t(`template.${tabName}`)}
              </button>
            ))
          : ['submit', 'comments'].map(tabName => (
              <button
                key={tabName}
                onClick={() => setTab(tabName)}
                className={`pb-2 px-4 text-lg font-medium ${
                  tab === tabName
                    ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400'
                } transition-colors`}
                aria-label={`Switch to ${tabName} tab`}
              >
                {t(`template.${tabName}`)}
              </button>
            ))}
      </div>
      {tab === 'settings' && isCreator && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
          <input
            value={template.title}
            onChange={e => setTemplate({ ...template, title: e.target.value })}
            placeholder={t('template.title')}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 shadow-sm"
            aria-label={t('template.title')}
          />
          <MDXEditor
            markdown={template.description || ''}
            onChange={md => setTemplate({ ...template, description: md })}
            className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 shadow-sm"
            placeholder={t('template.description')}
          />
          <input
            type="text"
            value={tags.join(', ')}
            onChange={e => setTags(e.target.value.split(',').map(t => t.trim()))}
            placeholder={t('template.tags_placeholder')}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 shadow-sm"
            aria-label={t('template.tags_placeholder')}
          />
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={template.is_public}
              onChange={e => setTemplate({ ...template, is_public: e.target.checked })}
              className="h-5 w-5 text-blue-600 focus:ring-blue-400"
              aria-label={t('template.public')}
            />
            <span className="text-gray-800 dark:text-gray-100">{t('template.public')}</span>
          </label>
          <div className="space-y-2">
            <input
              type="email"
              value={shareEmail}
              onChange={e => setShareEmail(e.target.value)}
              placeholder={t('template.add_user')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 shadow-sm"
              aria-label={t('template.add_user')}
            />
            <button
              onClick={handleShare}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow disabled:bg-purple-400"
              disabled={isSharing}
              aria-label={t('template.share_template')}
            >
              {isSharing ? t('loading') : t('template.share_template')}
            </button>
            {shareError && <p className="text-red-600">{shareError}</p>}
            {template.access.length > 0 && (
              <div>
                <p className="text-gray-800 dark:text-gray-100 font-medium">{t('template.shared_with')}</p>
                <ul className="mt-2 space-y-1">
                  {template.access.map(a => (
                    <li key={a.user_id} className="text-gray-600 dark:text-gray-400">
                      {a.user.email}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button
            onClick={handleSaveSettings}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow disabled:bg-blue-400"
            disabled={isSavingSettings}
            aria-label={t('template.save_settings')}
          >
            {isSavingSettings ? t('loading') : t('template.save_settings')}
          </button>
        </div>
      )}
      {tab === 'questions' && isCreator && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
            <input
              value={questionTitle}
              onChange={e => setQuestionTitle(e.target.value)}
              placeholder={t('template.question_title')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 shadow-sm"
              aria-label={t('template.question_title')}
            />
            <select
              value={questionType}
              onChange={e => setQuestionType(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 shadow-sm"
              aria-label="Select question type"
            >
              <option value="single_line">{t('question_types.single_line')}</option>
              <option value="multi_line">{t('question_types.multi_line')}</option>
              <option value="positive_integer">{t('question_types.positive_integer')}</option>
              <option value="checkbox">{t('question_types.checkbox')}</option>
            </select>
            <button
              onClick={handleAddQuestion}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors shadow disabled:bg-green-400"
              disabled={isAddingQuestion}
              aria-label={t('template.add_question')}
            >
              {isAddingQuestion ? t('loading') : t('template.add_question')}
            </button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={template.questions.map(q => q.id)}
              strategy={verticalListSortingStrategy}
            >
              {template.questions.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">{t('template.no_questions')}</p>
              ) : (
                template.questions.map(q => (
                  <SortableItem
                    key={q.id}
                    id={q.id}
                    title={q.title}
                    type={q.type}
                    onDelete={handleDeleteQuestion}
                    t={t}
                  />
                ))
              )}
            </SortableContext>
          </DndContext>
        </div>
      )}
      {tab === 'submit' && !isCreator && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{t('template.submit_form_title')}</h2>
            {template.questions
              .filter(q => q.type !== 'fixed_user' && q.type !== 'fixed_date')
              .map(q => (
                <div key={q.id} className="space-y-2">
                  <label className="block text-gray-800 dark:text-gray-100 font-medium">
                    {q.title} {q.type !== 'checkbox' && <span className="text-red-500">*</span>}
                  </label>
                  {(q.type === 'single_line' || q.type === 'multi_line') && (
                    <input
                      type="text"
                      value={answers[q.id] || ''}
                      onChange={e => handleAnswerChange(q.id, e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 shadow-sm ${
                        formErrors[q.id] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      aria-label={`${q.title} input`}
                    />
                  )}
                  {q.type === 'positive_integer' && (
                    <input
                      type="number"
                      value={answers[q.id] || ''}
                      onChange={e => handleAnswerChange(q.id, e.target.value)}
                      className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 shadow-sm ${
                        formErrors[q.id] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      min="0"
                      aria-label={`${q.title} number input`}
                    />
                  )}
                  {q.type === 'checkbox' && (
                    <input
                      type="checkbox"
                      checked={answers[q.id] === 'true'}
                      onChange={e => handleAnswerChange(q.id, e.target.checked ? 'true' : 'false')}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-400"
                      aria-label={`${q.title} checkbox`}
                    />
                  )}
                  {formErrors[q.id] && <p className="text-red-600 text-sm">{formErrors[q.id]}</p>}
                </div>
              ))}
            <button
              onClick={handleSubmitForm}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow disabled:bg-blue-400"
              disabled={isSubmittingForm}
              aria-label={t('template.submit_form')}
            >
              {isSubmittingForm ? t('loading') : t('template.submit_form')}
            </button>
          </div>
        </div>
      )}
      {tab === 'comments' && (
        <div className="space-y-6">
          {!isCreator && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4 space-y-4">
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={t('template.add_comment')}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 shadow-sm"
                aria-label={t('template.add_comment')}
              />
              <button
                onClick={handleAddComment}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors shadow disabled:bg-green-400"
                disabled={isAddingComment}
                aria-label={t('template.submit_comment')}
              >
                {isAddingComment ? t('loading') : t('template.submit_comment')}
              </button>
            </div>
          )}
          {isCreator && (
            <p className="text-gray-600 dark:text-gray-400">{t('template.creator_cannot_comment')}</p>
          )}
          {template.comments.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">{t('template.no_comments')}</p>
          ) : (
            template.comments.map(c => (
              <div
                key={c.id}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4"
              >
                <p className="text-gray-800 dark:text-gray-100">{c.content}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t('template.by')} {c.user.name} {t('template.at')} {new Date(c.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
      {tab === 'aggregation' && isCreator && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{t('template.form_analytics')}</h2>
            <p className="text-gray-800 dark:text-gray-100">{t('template.total_submissions')}: {template.forms?.length || 0}</p>
            <button
              onClick={handleExportCSV}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow disabled:bg-blue-400"
              disabled={isExportingCSV}
              aria-label={t('template.export_csv')}
            >
              {isExportingCSV ? t('loading') : t('template.export_csv')}
            </button>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {t('template.previous_submissions')}
            </h3>
            {!template.forms || template.forms.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">{t('template.no_submissions')}</p>
            ) : (
              template.forms.map(form => (
                <div
                  key={form.id}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4"
                >
                  <p className="text-gray-800 dark:text-gray-100">{t('template.submitted_by')}: {form.user?.name || t('home.unknown_author')}</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('template.submitted_at')}: {new Date(form.createdAt).toLocaleString()}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {form.answers.map(a => (
                      <li key={a.id} className="text-gray-600 dark:text-gray-400">
                        {a.question?.title || t('template.unknown_question')}: {a.value}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {t('template.answer_breakdown')}
            </h3>
            {template.questions.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">{t('template.no_questions')}</p>
            ) : (
              template.questions.map(q => {
                const agg = template.aggregation?.find(agg => agg.question_id === q.id);
                return (
                  <div
                    key={q.id}
                    className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4"
                  >
                    <p className="font-medium text-gray-800 dark:text-gray-100">{q.title}</p>
                    {(q.type === 'single_line' || q.type === 'multi_line' || q.type === 'positive_integer') ? (
                      <ul className="mt-2 space-y-1">
                        {template.forms
                          ?.map(f => f.answers.find(a => a.question_id === q.id)?.value)
                          .filter(v => v)
                          .map((value, idx) => (
                            <li key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                              {value}
                            </li>
                          )) || <li className="text-sm text-gray-600 dark:text-gray-400">{t('template.no_answers')}</li>}
                      </ul>
                    ) : q.type === 'checkbox' ? (
                      <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {t('yes')}: {' '}
                        {template.forms?.filter(f =>
                          f.answers.find(a => a.question_id === q.id)?.value === 'true'
                        ).length || 0}{' '}
                        | {t('no')}: {' '}
                        {template.forms?.filter(f =>
                          f.answers.find(a => a.question_id === q.id)?.value === 'false'
                        ).length || 0}
                      </p>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400 mt-2">{t('template.no_data')}</p>
                    )}
                    {q.type === 'positive_integer' && agg && (
                      <div className="mt-2">
                        <p className="text-gray-600 dark:text-gray-400">
                          {t('template.count')}: {agg._count?.value || 0}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {t('template.average')}: {agg._avg ? agg._avg.toFixed(2) : 'N/A'}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {t('template.max')}: {agg._max || 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplatePage;


// import { useEffect, useState, useCallback, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import { useTranslation } from 'react-i18next';
// import axios from 'axios';
// import { MDXEditor } from '@mdxeditor/editor';
// import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
// import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
// import { CSS } from '@dnd-kit/utilities';

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

// function SortableItem({ id, title, type, onDelete, t }) {
//   const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
//   const style = { transform: CSS.Transform.toString(transform), transition };
//   return (
//     <div
//       ref={setNodeRef}
//       style={style}
//       {...attributes}
//       {...listeners}
//       className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4 flex justify-between items-center"
//     >
//       <span className="text-gray-800 dark:text-gray-100">{title} - {t(`question_types.${type}`)}</span>
//       <button
//         onClick={() => onDelete(id)}
//         className="text-red-500 hover:text-red-700 transition-colors"
//         aria-label={t('template.delete')}
//       >
//         {t('template.delete')}
//       </button>
//     </div>
//   );
// }

// function Notification({ message, type, onClose }) {
//   return (
//     <div
//       className={`p-4 rounded-lg shadow-md mb-4 flex justify-between items-center ${
//         type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
//       }`}
//     >
//       <span>{message}</span>
//       <button onClick={onClose} className="text-lg font-bold" aria-label="Close notification">
//         ×
//       </button>
//     </div>
//   );
// }

// function TemplatePage() {
//   const { t } = useTranslation();
//   const { id } = useParams();
//   const [template, setTemplate] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [tab, setTab] = useState('settings');
//   const [questionTitle, setQuestionTitle] = useState('');
//   const [questionType, setQuestionType] = useState('single_line');
//   const [tags, setTags] = useState([]);
//   const [answers, setAnswers] = useState({});
//   const [comment, setComment] = useState('');
//   const [shareEmail, setShareEmail] = useState('');
//   const [shareError, setShareError] = useState('');
//   const [formErrors, setFormErrors] = useState({});
//   const [notifications, setNotifications] = useState([]);
//   const [isSavingSettings, setIsSavingSettings] = useState(false);
//   const [isAddingQuestion, setIsAddingQuestion] = useState(false);
//   const [isSubmittingForm, setIsSubmittingForm] = useState(false);
//   const [isAddingComment, setIsAddingComment] = useState(false);
//   const [isExportingCSV, setIsExportingCSV] = useState(false);
//   const [isSharing, setIsSharing] = useState(false);
//   const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
//   const { auth, addNotification } = useAuth();
//   const navigate = useNavigate();
//   const sensors = useSensors(useSensor(PointerSensor));

//   // Valid topics to match backend validation
//   const validTopics = ['Education', 'Quiz', 'Other'];

//   // Use useRef to ensure fetch only happens once on mount
//   const hasFetched = useRef(false);

//   // Debounced fetch function for template data
//   const fetchTemplate = useCallback(
//     debounce(async () => {
//       if (!auth?.token) {
//         setError(t('header.login_required'));
//         addNotification(t('header.login_required'), 'error');
//         navigate('/login');
//         return;
//       }

//       if (id === 'new') {
//         navigate('/templates/create', { replace: true });
//         return;
//       }

//       if (!/^\d+$/.test(id)) {
//         addNotification(t('template.invalid_id'), 'error');
//         navigate('/personal');
//         return;
//       }

//       setLoading(true);
//       setError(null);
//       try {
//         console.log('Fetching template with headers:', { Authorization: `Bearer ${auth.token}` });
//         const res = await axios.get(`http://localhost:5000/api/templates/${id}`, {
//           headers: { Authorization: `Bearer ${auth.token}` },
//         });
//         console.log('Template fetched:', res.data);
//         setTemplate(res.data);
//         setTags(res.data.tags.map(t => t.name));
//       } catch (err) {
//         console.error('Error fetching template:', err);
//         if (err.response?.status === 401) {
//           addNotification(t('header.session_expired'), 'error');
//           navigate('/login');
//         } else if (err.response?.status === 404) {
//           addNotification(t('template.not_found'), 'error');
//           navigate('/personal');
//         } else if (err.response?.status === 403) {
//           addNotification(t('template.no_access'), 'error');
//           navigate('/personal');
//         } else {
//           const errorMessage = err.response?.data?.error || t('template.error_fetching_data');
//           setError(errorMessage);
//           addNotification(errorMessage, 'error');
//         }
//       } finally {
//         setLoading(false);
//         console.log('Loading state updated:', { loading: false });
//       }
//     }, 500),
//     [id, auth?.token, t]
//   );

//   // Fetch template on mount
//   useEffect(() => {
//     if (hasFetched.current) return;
//     hasFetched.current = true;

//     console.log('useEffect triggered');
//     fetchTemplate();
//   }, [fetchTemplate]);

//   const removeNotification = id => setNotifications(prev => prev.filter(n => n.id !== id));

  

//   const handleSaveSettings = async () => {
//     if (!auth?.token) {
//       addNotification(t('header.login_required'), 'error');
//       navigate('/login');
//       return;
//     }
//     setIsSavingSettings(true);
//     try {
//       // Ensure topic is valid; default to 'Other' if invalid or empty
//       const validTopic = template.topic && validTopics.includes(template.topic) ? template.topic : 'Other';
//       const updatedTemplate = {
//         title: template.title || '', // Ensure title is not undefined
//         description: template.description || '', // Ensure description is not undefined
//         topic: validTopic,
//         image_url: template.image_url || '',
//         is_public: template.is_public || false, // Ensure is_public is not undefined
//         tags: tags.filter(tag => tag.trim() !== ''),
//         access: template.access ? template.access.map(a => a.user_id) : [], // Ensure access is not undefined
//       };
//       console.log('Saving settings with payload:', updatedTemplate); // Debug log
//       await axios.put(
//         `http://localhost:5000/api/templates/${id}`,
//         updatedTemplate,
//         { headers: { Authorization: `Bearer ${auth.token}` } }
//       );
//       addNotification(t('template.template_saved'), 'success');
//       const res = await axios.get(`http://localhost:5000/api/templates/${id}`, {
//         headers: { Authorization: `Bearer ${auth.token}` },
//       });
//       setTemplate(res.data);
//       setTags(res.data.tags.map(t => t.name));
//     } catch (error) {
//       console.error('Error saving settings:', error); // Debug log
//       if (error.response?.status === 401) {
//         addNotification(t('header.session_expired'), 'error');
//         navigate('/login');
//       } else if (error.response?.status === 403) {
//         addNotification(t('template.no_access'), 'error');
//       } else if (error.response?.status === 400) {
//         addNotification(
//           `${t('template.error_saving_settings')}: ${error.response?.data?.error || 'Invalid request'}`,
//           'error'
//         );
//       } else {
//         addNotification(
//           `${t('template.error_saving_settings')}: ${error.response?.data?.error || t('error.unknown')}`,
//           'error'
//         );
//       }
//     } finally {
//       setIsSavingSettings(false);
//     }
//   };

//   const handleAddQuestion = async () => {
//     if (!questionTitle) {
//       addNotification(t('template.question_title_required'), 'error');
//       return;
//     }
//     if (!auth?.token) {
//       addNotification(t('header.login_required'), 'error');
//       navigate('/login');
//       return;
//     }
//     setIsAddingQuestion(true);
//     const newQuestion = {
//       type: questionType,
//       title: questionTitle,
//       description: '',
//       order: template.questions.length,
//       is_shown_in_table: true,
//     };
//     try {
//       const res = await axios.post(
//         `http://localhost:5000/api/templates/${id}/questions`,
//         newQuestion,
//         { headers: { Authorization: `Bearer ${auth.token}` } }
//       );
//       setTemplate({ ...template, questions: [...template.questions, res.data] });
//       setQuestionTitle('');
//       addNotification(t('template.question_added'), 'success');
//     } catch (error) {
//       if (error.response?.status === 401) {
//         addNotification(t('header.session_expired'), 'error');
//         navigate('/login');
//       } else if (error.response?.status === 403) {
//         addNotification(t('template.no_access'), 'error');
//       } else {
//         addNotification(
//           `${t('template.error_adding_question')}: ${error.response?.data?.error || t('error.unknown')}`,
//           'error'
//         );
//       }
//     } finally {
//       setIsAddingQuestion(false);
//     }
//   };

//   const handleDeleteQuestion = async questionId => {
//     if (!auth?.token) {
//       addNotification(t('header.login_required'), 'error');
//       navigate('/login');
//       return;
//     }
//     try {
//       await axios.delete(`http://localhost:5000/api/templates/${id}/questions/${questionId}`, {
//         headers: { Authorization: `Bearer ${auth.token}` },
//       });
//       setTemplate({
//         ...template,
//         questions: template.questions.filter(q => q.id !== questionId),
//       });
//       addNotification(t('template.question_deleted'), 'success');
//     } catch (error) {
//       if (error.response?.status === 401) {
//         addNotification(t('header.session_expired'), 'error');
//         navigate('/login');
//       } else if (error.response?.status === 403) {
//         addNotification(t('template.no_access'), 'error');
//       } else {
//         addNotification(
//           `${t('template.error_deleting_question')}: ${error.response?.data?.error || t('error.unknown')}`,
//           'error'
//         );
//       }
//     }
//   };

//   const handleDragEnd = async event => {
//     const { active, over } = event;
//     if (active.id !== over.id) {
//       const oldIndex = template.questions.findIndex(q => q.id === active.id);
//       const newIndex = template.questions.findIndex(q => q.id === over.id);
//       const newQuestions = [...template.questions];
//       const [movedItem] = newQuestions.splice(oldIndex, 1);
//       newQuestions.splice(newIndex, 0, movedItem);
//       setTemplate({ ...template, questions: newQuestions });
//       if (!auth?.token) {
//         addNotification(t('header.login_required'), 'error');
//         navigate('/login');
//         return;
//       }
//       try {
//         await axios.put(
//           `http://localhost:5000/api/templates/${id}/questions/order`,
//           newQuestions.map((q, index) => ({ id: q.id, order: index })),
//           { headers: { Authorization: `Bearer ${auth.token}` } }
//         );
//         addNotification(t('template.order_updated'), 'success');
//       } catch (error) {
//         if (error.response?.status === 401) {
//           addNotification(t('header.session_expired'), 'error');
//           navigate('/login');
//         } else if (error.response?.status === 403) {
//           addNotification(t('template.no_access'), 'error');
//         } else {
//           addNotification(
//             `${t('template.error_updating_order')}: ${error.response?.data?.error || t('error.unknown')}`,
//             'error'
//           );
//         }
//       }
//     }
//   };

//   const handleAnswerChange = (questionId, value) => {
//     setAnswers(prev => ({ ...prev, [questionId]: value.toString() }));
//     setFormErrors(prev => ({ ...prev, [questionId]: '' }));
//   };

//   const validateForm = () => {
//     const errors = {};
//     template.questions.forEach(q => {
//       if (q.type === 'fixed_user' || q.type === 'fixed_date') return;
//       if (q.type !== 'checkbox' && !answers[q.id]) {
//         errors[q.id] = t('template.answer_required', { question: q.title });
//       }
//     });
//     setFormErrors(errors);
//     return Object.keys(errors).length === 0;
//   };

//   // const handleSubmitForm = async () => {
//   //   if (!validateForm()) {
//   //     addNotification(t('template.fill_required_fields'), 'error');
//   //     return;
//   //   }
//   //   if (!auth?.token) {
//   //     addNotification(t('header.login_required'), 'error');
//   //     navigate('/login');
//   //     return;
//   //   }
//   //   setIsSubmittingForm(true);
//   //   const formattedAnswers = Object.entries(answers)
//   //     .filter(([question_id]) => {
//   //       const question = template.questions.find(q => q.id === parseInt(question_id));
//   //       return question && question.type !== 'fixed_user' && question.type !== 'fixed_date';
//   //     })
//   //     .map(([question_id, value]) => ({
//   //       question_id: parseInt(question_id),
//   //       value,
//   //     }));
//   //   try {
//   //     const res = await axios.post(
//   //       `http://localhost:5000/api/templates/${id}/form`,
//   //       { answers: formattedAnswers },
//   //       { headers: { Authorization: `Bearer ${auth.token}` } }
//   //     );
//   //     addNotification(t('template.form_submitted', { id: res.data.id }), 'success');
//   //     setAnswers({});
//   //     setFormErrors({});
//   //     const updatedTemplate = await axios.get(`http://localhost:5000/api/templates/${id}`, {
//   //       headers: { Authorization: `Bearer ${auth.token}` },
//   //     });
//   //     setTemplate(updatedTemplate.data);
//   //   } catch (error) {
//   //     if (error.response?.status === 401) {
//   //       addNotification(t('header.session_expired'), 'error');
//   //       navigate('/login');
//   //     } else if (error.response?.status === 403) {
//   //       addNotification(t('template.no_access'), 'error');
//   //     } else {
//   //       addNotification(
//   //         `${t('template.error_submitting_form')}: ${error.response?.data?.error || t('error.unknown')}`,
//   //         'error'
//   //       );
//   //     }
//   //   } finally {
//   //     setIsSubmittingForm(false);
//   //   }
//   // };
//   const handleSubmitForm = async () => {
//     if (!validateForm()) {
//       addNotification(t('template.fill_required_fields'), 'error');
//       return;
//     }
//     if (!auth?.token) {
//       addNotification(t('header.login_required'), 'error');
//       navigate('/login');
//       return;
//     }
//     setIsSubmittingForm(true);
//     const formattedAnswers = Object.entries(answers)
//       .filter(([question_id]) => {
//         const question = template.questions.find(q => q.id === parseInt(question_id));
//         return question && question.type !== 'fixed_user' && question.type !== 'fixed_date';
//       })
//       .map(([question_id, value]) => ({
//         question_id: parseInt(question_id),
//         value,
//       }));
//     try {
//       const res = await axios.post(
//         `http://localhost:5000/api/templates/${id}/form`,
//         { answers: formattedAnswers },
//         { headers: { Authorization: `Bearer ${auth.token}` } }
//       );
//       addNotification(t('template.answer_submitted'), 'success'); // New notification
//       setAnswers({});
//       setFormErrors({});
//       const updatedTemplate = await axios.get(`http://localhost:5000/api/templates/${id}`, {
//         headers: { Authorization: `Bearer ${auth.token}` },
//       });
//       setTemplate(updatedTemplate.data);
//     } catch (error) {
//       if (error.response?.status === 401) {
//         addNotification(t('header.session_expired'), 'error');
//         navigate('/login');
//       } else if (error.response?.status === 403) {
//         addNotification(t('template.no_access'), 'error');
//       } else {
//         addNotification(
//           `${t('template.error_submitting_form')}: ${error.response?.data?.error || t('error.unknown')}`,
//           'error'
//         );
//       }
//     } finally {
//       setIsSubmittingForm(false);
//     }
//   };

//   const handleAddComment = async () => {
//     if (!comment.trim()) {
//       addNotification(t('template.comment_empty'), 'error');
//       return;
//     }
//     if (!auth?.token) {
//       addNotification(t('header.login_required'), 'error');
//       navigate('/login');
//       return;
//     }
//     setIsAddingComment(true);
//     try {
//       const res = await axios.post(
//         `http://localhost:5000/api/templates/${id}/comments`,
//         { content: comment },
//         { headers: { Authorization: `Bearer ${auth.token}` } }
//       );
//       setTemplate({ ...template, comments: [...template.comments, res.data] });
//       setComment('');
//       addNotification(t('template.comment_added'), 'success');
//     } catch (error) {
//       if (error.response?.status === 401) {
//         addNotification(t('header.session_expired'), 'error');
//         navigate('/login');
//       } else if (error.response?.status === 403) {
//         addNotification(t('template.no_access'), 'error');
//       } else {
//         addNotification(
//           `${t('template.error_adding_comment')}: ${error.response?.data?.error || t('error.unknown')}`,
//           'error'
//         );
//       }
//     } finally {
//       setIsAddingComment(false);
//     }
//   };

//   const handleExportCSV = () => {
//     if (!template.forms || template.forms.length === 0) {
//       addNotification(t('template.no_submissions'), 'error');
//       return;
//     }
//     setIsExportingCSV(true);
//     const headers = [t('template.form_id'), t('template.submitted_by'), t('template.submitted_at'), ...template.questions.map(q => q.title)];
//     const rows = template.forms.map(form => [
//       form.id,
//       form.user?.name || t('home.unknown_author'),
//       new Date(form.createdAt).toISOString(),
//       ...template.questions.map(q => form.answers.find(a => a.question_id === q.id)?.value || ''),
//     ]);
//     const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//     const link = document.createElement('a');
//     link.href = URL.createObjectURL(blob);
//     link.download = `${template.title}_responses.csv`;
//     link.click();
//     addNotification(t('template.csv_exported'), 'success');
//     setIsExportingCSV(false);
//   };

//   const handleShare = async () => {
//     if (!shareEmail.trim()) {
//       addNotification(t('template.email_required'), 'error');
//       return;
//     }
//     if (!auth?.token) {
//       addNotification(t('header.login_required'), 'error');
//       navigate('/login');
//       return;
//     }
//     setIsSharing(true);
//     try {
//       await axios.post(
//         `http://localhost:5000/api/templates/${id}/share`,
//         { email: shareEmail },
//         { headers: { Authorization: `Bearer ${auth.token}` } }
//       );
//       addNotification(t('template.template_shared', { email: shareEmail }), 'success');
//       setShareEmail('');
//       setShareError('');
//       const res = await axios.get(`http://localhost:5000/api/templates/${id}`, {
//         headers: { Authorization: `Bearer ${auth.token}` },
//       });
//       setTemplate(res.data);
//     } catch (error) {
//       setShareError(error.response?.data?.error || t('template.error_sharing'));
//       if (error.response?.status === 401) {
//         addNotification(t('header.session_expired'), 'error');
//         navigate('/login');
//       } else if (error.response?.status === 403) {
//         addNotification(t('template.no_access'), 'error');
//       } else {
//         addNotification(
//           `${t('template.error_sharing')}: ${error.response?.data?.error || t('error.unknown')}`,
//           'error'
//         );
//       }
//     } finally {
//       setIsSharing(false);
//     }
//   };

//   const handleDeleteTemplate = async () => {
//     if (!auth?.token) {
//       addNotification(t('header.login_required'), 'error');
//       navigate('/login');
//       return;
//     }
//     if (!window.confirm(t('template.confirm_delete_template')))
//       return;
//     setIsDeletingTemplate(true);
//     try {
//       await axios.delete(`http://localhost:5000/api/templates/${id}`, {
//         headers: { Authorization: `Bearer ${auth.token}` },
//       });
//       addNotification(t('template.template_deleted'), 'success');
//       navigate('/personal');
//     } catch (error) {
//       if (error.response?.status === 401) {
//         addNotification(t('header.session_expired'), 'error');
//         navigate('/login');
//       } else if (error.response?.status === 403) {
//         addNotification(t('template.no_access'), 'error');
//       } else if (error.response?.status === 404) {
//         addNotification(t('template.not_found'), 'error');
//         navigate('/personal');
//       } else {
//         addNotification(
//           `${t('template.error_deleting_template')}: ${error.response?.data?.error || t('error.unknown')}`,
//           'error'
//         );
//       }
//     } finally {
//       setIsDeletingTemplate(false);
//     }
//   };

//   // Log loading state changes only when they occur
//   useEffect(() => {
//     console.log('Loading state:', { loading });
//   }, [loading]);

//   if (loading) {
//     return <div className="text-center text-gray-600 dark:text-gray-400">{t('loading')}</div>;
//   }

//   if (error) {
//     return <div className="text-center text-red-500">{error}</div>;
//   }

//   if (!template) {
//     return <div className="text-center text-gray-600 dark:text-gray-400">{t('template.not_found')}</div>;
//   }

//   const isCreator = template.created_by === auth?.user?.id;

//   return (
//     <div className="space-y-6">
//       <div className="flex justify-between items-center">
//         <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{template.title}</h1>
//         {isCreator && (
//           <button
//             onClick={handleDeleteTemplate}
//             className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow disabled:bg-red-400"
//             disabled={isDeletingTemplate}
//             aria-label={t('template.delete_template')}
//           >
//             {isDeletingTemplate ? t('loading') : t('template.delete_template')}
//           </button>
//         )}
//       </div>
//       {notifications.length > 0 && (
//         <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
//           {notifications.map(n => (
//             <Notification
//               key={n.id}
//               message={n.message}
//               type={n.type}
//               onClose={() => removeNotification(n.id)}
//             />
//           ))}
//         </div>
//       )}
//       <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
//         {isCreator
//           ? ['settings', 'questions', 'aggregation', 'comments'].map(tabName => (
//               <button
//                 key={tabName}
//                 onClick={() => setTab(tabName)}
//                 className={`pb-2 px-4 text-lg font-medium ${
//                   tab === tabName
//                     ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
//                     : 'text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400'
//                 } transition-colors`}
//                 aria-label={`Switch to ${tabName} tab`}
//               >
//                 {t(`template.${tabName}`)}
//               </button>
//             ))
//           : ['submit', 'comments'].map(tabName => (
//               <button
//                 key={tabName}
//                 onClick={() => setTab(tabName)}
//                 className={`pb-2 px-4 text-lg font-medium ${
//                   tab === tabName
//                     ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
//                     : 'text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400'
//                 } transition-colors`}
//                 aria-label={`Switch to ${tabName} tab`}
//               >
//                 {t(`template.${tabName}`)}
//               </button>
//             ))}
//       </div>
//       {tab === 'settings' && isCreator && (
//         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
//           <input
//             value={template.title}
//             onChange={e => setTemplate({ ...template, title: e.target.value })}
//             placeholder={t('template.title')}
//             className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 shadow-sm"
//             aria-label={t('template.title')}
//           />
//           <MDXEditor
//             markdown={template.description || ''}
//             onChange={md => setTemplate({ ...template, description: md })}
//             className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 shadow-sm"
//             placeholder={t('template.description')}
//           />
//           <input
//             type="text"
//             value={tags.join(', ')}
//             onChange={e => setTags(e.target.value.split(',').map(t => t.trim()))}
//             placeholder={t('template.tags_placeholder')}
//             className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 shadow-sm"
//             aria-label={t('template.tags_placeholder')}
//           />
//           <label className="flex items-center space-x-2">
//             <input
//               type="checkbox"
//               checked={template.is_public}
//               onChange={e => setTemplate({ ...template, is_public: e.target.checked })}
//               className="h-5 w-5 text-blue-600 focus:ring-blue-400"
//               aria-label={t('template.public')}
//             />
//             <span className="text-gray-800 dark:text-gray-100">{t('template.public')}</span>
//           </label>
//           <div className="space-y-2">
//             <input
//               type="email"
//               value={shareEmail}
//               onChange={e => setShareEmail(e.target.value)}
//               placeholder={t('template.add_user')}
//               className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 shadow-sm"
//               aria-label={t('template.add_user')}
//             />
//             <button
//               onClick={handleShare}
//               className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow disabled:bg-purple-400"
//               disabled={isSharing}
//               aria-label={t('template.share_template')}
//             >
//               {isSharing ? t('loading') : t('template.share_template')}
//             </button>
//             {shareError && <p className="text-red-600">{shareError}</p>}
//             {template.access.length > 0 && (
//               <div>
//                 <p className="text-gray-800 dark:text-gray-100 font-medium">{t('template.shared_with')}</p>
//                 <ul className="mt-2 space-y-1">
//                   {template.access.map(a => (
//                     <li key={a.user_id} className="text-gray-600 dark:text-gray-400">
//                       {a.user.email}
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             )}
//           </div>
//           <button
//             onClick={handleSaveSettings}
//             className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow disabled:bg-blue-400"
//             disabled={isSavingSettings}
//             aria-label={t('template.save_settings')}
//           >
//             {isSavingSettings ? t('loading') : t('template.save_settings')}
//           </button>
//         </div>
//       )}
//       {tab === 'questions' && isCreator && (
//         <div className="space-y-6">
//           <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
//             <input
//               value={questionTitle}
//               onChange={e => setQuestionTitle(e.target.value)}
//               placeholder={t('template.question_title')}
//               className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 shadow-sm"
//               aria-label={t('template.question_title')}
//             />
//             <select
//               value={questionType}
//               onChange={e => setQuestionType(e.target.value)}
//               className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 shadow-sm"
//               aria-label="Select question type"
//             >
//               <option value="single_line">{t('question_types.single_line')}</option>
//               <option value="multi_line">{t('question_types.multi_line')}</option>
//               <option value="positive_integer">{t('question_types.positive_integer')}</option>
//               <option value="checkbox">{t('question_types.checkbox')}</option>
//             </select>
//             <button
//               onClick={handleAddQuestion}
//               className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors shadow disabled:bg-green-400"
//               disabled={isAddingQuestion}
//               aria-label={t('template.add_question')}
//             >
//               {isAddingQuestion ? t('loading') : t('template.add_question')}
//             </button>
//           </div>
//           <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
//             <SortableContext
//               items={template.questions.map(q => q.id)}
//               strategy={verticalListSortingStrategy}
//             >
//               {template.questions.length === 0 ? (
//                 <p className="text-gray-600 dark:text-gray-400">{t('template.no_questions')}</p>
//               ) : (
//                 template.questions.map(q => (
//                   <SortableItem
//                     key={q.id}
//                     id={q.id}
//                     title={q.title}
//                     type={q.type}
//                     onDelete={handleDeleteQuestion}
//                     t={t}
//                   />
//                 ))
//               )}
//             </SortableContext>
//           </DndContext>
//         </div>
//       )}
//       {tab === 'submit' && !isCreator && (
//         <div className="space-y-6">
//           <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
//             <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{t('template.submit_form_title')}</h2>
//             {template.questions
//               .filter(q => q.type !== 'fixed_user' && q.type !== 'fixed_date')
//               .map(q => (
//                 <div key={q.id} className="space-y-2">
//                   <label className="block text-gray-800 dark:text-gray-100 font-medium">
//                     {q.title} {q.type !== 'checkbox' && <span className="text-red-500">*</span>}
//                   </label>
//                   {(q.type === 'single_line' || q.type === 'multi_line') && (
//                     <input
//                       type="text"
//                       value={answers[q.id] || ''}
//                       onChange={e => handleAnswerChange(q.id, e.target.value)}
//                       className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 shadow-sm ${
//                         formErrors[q.id] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
//                       }`}
//                       aria-label={`${q.title} input`}
//                     />
//                   )}
//                   {q.type === 'positive_integer' && (
//                     <input
//                       type="number"
//                       value={answers[q.id] || ''}
//                       onChange={e => handleAnswerChange(q.id, e.target.value)}
//                       className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 shadow-sm ${
//                         formErrors[q.id] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
//                       }`}
//                       min="0"
//                       aria-label={`${q.title} number input`}
//                     />
//                   )}
//                   {q.type === 'checkbox' && (
//                     <input
//                       type="checkbox"
//                       checked={answers[q.id] === 'true'}
//                       onChange={e => handleAnswerChange(q.id, e.target.checked ? 'true' : 'false')}
//                       className="h-5 w-5 text-blue-600 focus:ring-blue-400"
//                       aria-label={`${q.title} checkbox`}
//                     />
//                   )}
//                   {formErrors[q.id] && <p className="text-red-600 text-sm">{formErrors[q.id]}</p>}
//                 </div>
//               ))}
//             <button
//               onClick={handleSubmitForm}
//               className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow disabled:bg-blue-400"
//               disabled={isSubmittingForm}
//               aria-label={t('template.submit_form')}
//             >
//               {isSubmittingForm ? t('loading') : t('template.submit_form')}
//             </button>
//           </div>
//         </div>
//       )}
//       {tab === 'comments' && (
//         <div className="space-y-6">
//           {!isCreator && (
//             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4 space-y-4">
//               <textarea
//                 value={comment}
//                 onChange={e => setComment(e.target.value)}
//                 placeholder={t('template.add_comment')}
//                 className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 shadow-sm"
//                 aria-label={t('template.add_comment')}
//               />
//               <button
//                 onClick={handleAddComment}
//                 className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors shadow disabled:bg-green-400"
//                 disabled={isAddingComment}
//                 aria-label={t('template.submit_comment')}
//               >
//                 {isAddingComment ? t('loading') : t('template.submit_comment')}
//               </button>
//             </div>
//           )}
//           {isCreator && (
//             <p className="text-gray-600 dark:text-gray-400">{t('template.creator_cannot_comment')}</p>
//           )}
//           {template.comments.length === 0 ? (
//             <p className="text-gray-600 dark:text-gray-400">{t('template.no_comments')}</p>
//           ) : (
//             template.comments.map(c => (
//               <div
//                 key={c.id}
//                 className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4"
//               >
//                 <p className="text-gray-800 dark:text-gray-100">{c.content}</p>
//                 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
//                   {t('template.by')} {c.user.name} {t('template.at')} {new Date(c.createdAt).toLocaleString()}
//                 </p>
//               </div>
//             ))
//           )}
//         </div>
//       )}
//       {tab === 'aggregation' && isCreator && (
//         <div className="space-y-6">
//           <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
//             <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{t('template.form_analytics')}</h2>
//             <p className="text-gray-800 dark:text-gray-100">{t('template.total_submissions')}: {template.forms?.length || 0}</p>
//             <button
//               onClick={handleExportCSV}
//               className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow disabled:bg-blue-400"
//               disabled={isExportingCSV}
//               aria-label={t('template.export_csv')}
//             >
//               {isExportingCSV ? t('loading') : t('template.export_csv')}
//             </button>
//           </div>
//           <div>
//             <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
//               {t('template.previous_submissions')}
//             </h3>
//             {!template.forms || template.forms.length === 0 ? (
//               <p className="text-gray-600 dark:text-gray-400">{t('template.no_submissions')}</p>
//             ) : (
//               template.forms.map(form => (
//                 <div
//                   key={form.id}
//                   className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4"
//                 >
//                   <p className="text-gray-800 dark:text-gray-100">{t('template.submitted_by')}: {form.user?.name || t('home.unknown_author')}</p>
//                   <p className="text-gray-600 dark:text-gray-400">
//                     {t('template.submitted_at')}: {new Date(form.createdAt).toLocaleString()}
//                   </p>
//                   <ul className="mt-2 space-y-1">
//                     {form.answers.map(a => (
//                       <li key={a.id} className="text-gray-600 dark:text-gray-400">
//                         {a.question?.title || t('template.unknown_question')}: {a.value}
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//               ))
//             )}
//           </div>
//           <div>
//             <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
//               {t('template.answer_breakdown')}
//             </h3>
//             {template.questions.length === 0 ? (
//               <p className="text-gray-600 dark:text-gray-400">{t('template.no_questions')}</p>
//             ) : (
//               template.questions.map(q => {
//                 const agg = template.aggregation?.find(agg => agg.question_id === q.id);
//                 return (
//                   <div
//                     key={q.id}
//                     className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4"
//                   >
//                     <p className="font-medium text-gray-800 dark:text-gray-100">{q.title}</p>
//                     {(q.type === 'single_line' || q.type === 'multi_line' || q.type === 'positive_integer') ? (
//                       <ul className="mt-2 space-y-1">
//                         {template.forms
//                           ?.map(f => f.answers.find(a => a.question_id === q.id)?.value)
//                           .filter(v => v)
//                           .map((value, idx) => (
//                             <li key={idx} className="text-sm text-gray-600 dark:text-gray-400">
//                               {value}
//                             </li>
//                           )) || <li className="text-sm text-gray-600 dark:text-gray-400">{t('template.no_answers')}</li>}
//                       </ul>
//                     ) : q.type === 'checkbox' ? (
//                       <p className="text-gray-600 dark:text-gray-400 mt-2">
//                         {t('yes')}: {' '}
//                         {template.forms?.filter(f =>
//                           f.answers.find(a => a.question_id === q.id)?.value === 'true'
//                         ).length || 0}{' '}
//                         | {t('no')}: {' '}
//                         {template.forms?.filter(f =>
//                           f.answers.find(a => a.question_id === q.id)?.value === 'false'
//                         ).length || 0}
//                       </p>
//                     ) : (
//                       <p className="text-gray-600 dark:text-gray-400 mt-2">{t('template.no_data')}</p>
//                     )}
//                     {q.type === 'positive_integer' && agg && (
//                       <div className="mt-2">
//                         <p className="text-gray-600 dark:text-gray-400">
//                           {t('template.count')}: {agg._count?.value || 0}
//                         </p>
//                         <p className="text-gray-600 dark:text-gray-400">
//                           {t('template.average')}: {agg._avg ? agg._avg.toFixed(2) : 'N/A'}
//                         </p>
//                         <p className="text-gray-600 dark:text-gray-400">
//                           {t('template.max')}: {agg._max || 'N/A'}
//                         </p>
//                       </div>
//                     )}
//                   </div>
//                 );
//               })
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default TemplatePage;

// const handleSaveSettings = async () => {
  //   if (!auth?.token) {
  //     addNotification(t('header.login_required'), 'error');
  //     navigate('/login');
  //     return;
  //   }
  //   setIsSavingSettings(true);
  //   try {
  //     // Ensure topic is valid; default to 'Other' if invalid or empty
  //     const validTopic = template.topic && validTopics.includes(template.topic) ? template.topic : 'Other';
  //     const updatedTemplate = {
  //       title: template.title,
  //       description: template.description,
  //       topic: validTopic,
  //       image_url: template.image_url || '',
  //       is_public: template.is_public,
  //       tags: tags.filter(tag => tag.trim() !== ''),
  //       access: template.access.map(a => a.user_id),
  //     };
  //     await axios.put(
  //       `http://localhost:5000/api/templates/${id}`,
  //       updatedTemplate,
  //       { headers: { Authorization: `Bearer ${auth.token}` } }
  //     );
  //     addNotification(t('template.settings_saved'), 'success');
  //     const res = await axios.get(`http://localhost:5000/api/templates/${id}`, {
  //       headers: { Authorization: `Bearer ${auth.token}` },
  //     });
  //     setTemplate(res.data);
  //     setTags(res.data.tags.map(t => t.name));
  //   } catch (error) {
  //     if (error.response?.status === 401) {
  //       addNotification(t('header.session_expired'), 'error');
  //       navigate('/login');
  //     } else if (error.response?.status === 403) {
  //       addNotification(t('template.no_access'), 'error');
  //     } else {
  //       addNotification(
  //         `${t('template.error_saving_settings')}: ${error.response?.data?.error || t('error.unknown')}`,
  //         'error'
  //       );
  //     }
  //   } finally {
  //     setIsSavingSettings(false);
  //   }
  // };