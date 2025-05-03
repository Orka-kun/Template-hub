import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

function Notification({ message, type, onClose }) {
  return (
    <div
      className={`p-4 rounded-lg shadow-md mb-4 flex justify-between items-center ${
        type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="text-lg font-bold">×</button>
    </div>
  );
}

export default function Register() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, notifications, addNotification } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await register(name, email, password);
    } catch (error) {
      console.error('Registration failed:', error.message);
    }
  };

  const removeNotification = id => {
    addNotification('', ''); // Trigger re-render; ideally, manage in AuthContext
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">{t('register.title')}</h2>
        {notifications.length > 0 && (
          <div className="space-y-2 mb-4">
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-gray-700 dark:text-gray-300">{t('register.name')}</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-gray-700 dark:text-gray-300">{t('register.email')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-700 dark:text-gray-300">{t('register.password')}</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('register.submit')}
          </button>
        </form>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            Login
          </Link>
        </p>
{/*         <p className="mt-4 text-gray-600 dark:text-gray-400">
          {t('register.haveAccount')}{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            {t('register.login')}
          </Link>
        </p> */}
      </div>
    </div>
  );
}
