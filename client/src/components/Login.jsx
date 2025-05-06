import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

function Notification({ message, type, onClose }) {
  return (
    <div
      className={`p-4 rounded-lg shadow-md mb-4 flex justify-between items-center ${
        type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      } transition-all duration-300`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="text-lg font-bold text-gray-600 hover:text-gray-800">×</button>
    </div>
  );
}

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, notifications } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      console.log('Attempting login with:', { email, password });
      await login(email, password);
    } catch (error) {
      console.error('Login failed:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const removeNotification = (id) => {
    // Notifications are managed in AuthContext; this is a placeholder for removal
  };

  return (
       <div 
       className="min-h-screen flex items-center justify-center" 
       style={{
        backgroundColor: `var(--bg-color)`,
        color: `var(--text-color)`,
        }}>
      <div className="w-full max-w-md p-8 rounded-2xl shadow-2xl transform transition-all duration-500 hover:shadow-3xl"
      style={{
        backgroundColor: `var(--authcard-bg)`, 
        }}>
        <h2 className="text-3xl font-bold mb-6 text-center"
        style={{
          color: `var(--authcard-text)`,
          }}
          >{t('login.title')}</h2>
        {notifications.length > 0 && (
          <div className="space-y-3 mb-6">
            {notifications.map((n) => (
              <Notification
                key={n.id}
                message={n.message}
                type={n.type}
                onClose={() => removeNotification(n.id)}
              />
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block  text-sm font-medium mb-2"
            style={{
          color: `var(--authcard-text)`,}}>{t('login.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-600 transition duration-300"
              required
            />
          </div>
          <div>
            <label className="block  text-sm font-medium mb-2"
            style={{
          color: `var(--authcard-text)`,
          }}>{t('login.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-600 transition duration-300"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#3E3232] hover:bg-[#503C3C] text-white py-3 rounded-lg  transition duration-300 transform hover:scale-105 disabled:bg-teal-400 disabled:cursor-not-allowed"
          >
            {isLoading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
        <p className="mt-6 text-center  text-sm"
        style={{
          color: `var(--bg-color)`,
          }}>
          {t('login.noAccount')}{' '}
          <Link to="/register" className=" hover:underline font-medium"
          style={{
            color: `var(--bg-color)`,
            }}>
            {t('login.register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
// import { useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import { useTranslation } from 'react-i18next';

// function Notification({ message, type, onClose }) {
//   return (
//     <div
//       className={`p-4 rounded-lg shadow-md mb-4 flex justify-between items-center ${
//         type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
//       } transition-all duration-300`}
//     >
//       <span>{message}</span>
//       <button onClick={onClose} className="text-lg font-bold text-gray-600 hover:text-gray-800">×</button>
//     </div>
//   );
// }

// export default function Login() {
//   const { t } = useTranslation();
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const { login, notifications } = useAuth();
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (isLoading) return;
//     setIsLoading(true);

//     try {
//       console.log('Attempting login with:', { email, password });
//       await login(email, password);
//     } catch (error) {
//       console.error('Login failed:', error.message);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const removeNotification = (id) => {
//     // Notifications are managed in AuthContext; this is a placeholder for removal
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
//       <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl transform transition-all duration-500 hover:shadow-3xl">
//         <h2 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">{t('login.title')}</h2>
//         {notifications.length > 0 && (
//           <div className="space-y-3 mb-6">
//             {notifications.map((n) => (
//               <Notification
//                 key={n.id}
//                 message={n.message}
//                 type={n.type}
//                 onClose={() => removeNotification(n.id)}
//               />
//             ))}
//           </div>
//         )}
//         <form onSubmit={handleSubmit} className="space-y-6">
//           <div>
//             <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">{t('login.email')}</label>
//             <input
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400 transition duration-300"
//               required
//             />
//           </div>
//           <div>
//             <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">{t('login.password')}</label>
//             <input
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400 transition duration-300"
//               required
//             />
//           </div>
//           <button
//             type="submit"
//             disabled={isLoading}
//             className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition duration-300 transform hover:scale-105 disabled:bg-teal-400 disabled:cursor-not-allowed"
//           >
//             {isLoading ? t('login.submitting') : t('login.submit')}
//           </button>
//         </form>
//         <p className="mt-6 text-center text-gray-600 dark:text-gray-400 text-sm">
//           {t('login.noAccount')}{' '}
//           <Link to="/register" className="text-teal-600 dark:text-teal-400 hover:underline font-medium">
//             {t('login.register')}
//           </Link>
//         </p>
//       </div>
//     </div>
//   );
// }

