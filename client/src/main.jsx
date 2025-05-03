import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/i18n';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

// Initialize language from localStorage or default to 'en'
const savedLanguage = localStorage.getItem('language') || 'en';
i18n.changeLanguage(savedLanguage);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nextProvider>
    </BrowserRouter>
  </React.StrictMode>
);
// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import { BrowserRouter } from 'react-router-dom'; // Add BrowserRouter
// import { I18nextProvider } from 'react-i18next';
// import i18n from './i18n/i18n';
// import { AuthProvider } from './context/AuthContext';
// import App from './App';
// import './index.css';

// ReactDOM.createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <BrowserRouter>
//       <I18nextProvider i18n={i18n}>
//         <AuthProvider>
//           <App />
//         </AuthProvider>
//       </I18nextProvider>
//     </BrowserRouter>
//   </React.StrictMode>
// );
