import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from './i18n/i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './components/Login';
import Register from './components/Register';
import PersonalPage from './components/PersonalPage';
import TemplatePage from './components/TemplatePage';
import CreateTemplatePage from './components/CreateTemplatePage';
import Header from './pages/Header';

function ProtectedRoute({ children }) {
  const { auth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth?.token) {
      navigate('/login');
    }
  }, [auth, navigate]);

  return auth?.token ? children : null;
}

function RedirectIfAuthenticated({ children }) {
  const { auth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth?.token) {
      navigate('/personal');
    }
  }, [auth, navigate]);

  return auth?.token ? null : children;
}

function App() {
  const { i18n } = useTranslation();

  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
      <div className="min-h-screen" style={{ backgroundColor: `var(--bg-color)`, color: `var(--text-color)` }}>
          <Header changeLanguage={(lang) => i18n.changeLanguage(lang)} />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/login"
              element={
                <RedirectIfAuthenticated>
                  <Login />
                </RedirectIfAuthenticated>
              }
            />
            <Route
              path="/register"
              element={
                <RedirectIfAuthenticated>
                  <Register />
                </RedirectIfAuthenticated>
              }
            />
            <Route
              path="/personal"
              element={
                <ProtectedRoute>
                  <PersonalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates/create"
              element={
                <ProtectedRoute>
                  <CreateTemplatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates/:id"
              element={
                <ProtectedRoute>
                  <TemplatePage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </I18nextProvider>
  );
}

export default App;
// import React, { useEffect } from 'react';
// import { Routes, Route, useNavigate } from 'react-router-dom';
// import { I18nextProvider, useTranslation } from 'react-i18next';
// import i18n from './i18n/i18n';
// import { AuthProvider, useAuth } from './context/AuthContext';
// import Home from './pages/Home';
// import Login from './components/Login';
// import Register from './components/Register';
// import PersonalPage from './components/PersonalPage';
// import TemplatePage from './components/TemplatePage';
// import CreateTemplatePage from './components/CreateTemplatePage';
// import Header from './pages/Header';

// function ProtectedRoute({ children }) {
//   const { auth } = useAuth();
//   const navigate = useNavigate();

//   useEffect(() => {
//     if (!auth?.token) {
//       navigate('/login');
//     }
//   }, [auth, navigate]);

//   return auth?.token ? children : null;
// }

// function RedirectIfAuthenticated({ children }) {
//   const { auth } = useAuth();
//   const navigate = useNavigate();

//   useEffect(() => {
//     if (auth?.token) {
//       navigate('/personal');
//     }
//   }, [auth, navigate]);

//   return auth?.token ? null : children;
// }

// function App() {
//   const { i18n } = useTranslation();

//   return (
//     <I18nextProvider i18n={i18n}>
//       <AuthProvider>
//         <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
//           <Header changeLanguage={(lang) => i18n.changeLanguage(lang)} />
//           <Routes>
//             <Route path="/" element={<Home />} />
//             <Route
//               path="/login"
//               element={
//                 <RedirectIfAuthenticated>
//                   <Login />
//                 </RedirectIfAuthenticated>
//               }
//             />
//             <Route
//               path="/register"
//               element={
//                 <RedirectIfAuthenticated>
//                   <Register />
//                 </RedirectIfAuthenticated>
//               }
//             />
//             <Route
//               path="/personal"
//               element={
//                 <ProtectedRoute>
//                   <PersonalPage />
//                 </ProtectedRoute>
//               }
//             />
//             <Route
//               path="/templates/create"
//               element={
//                 <ProtectedRoute>
//                   <CreateTemplatePage />
//                 </ProtectedRoute>
//               }
//             />
//             <Route
//               path="/templates/:id"
//               element={
//                 <ProtectedRoute>
//                   <TemplatePage />
//                 </ProtectedRoute>
//               }
//             />
//           </Routes>
//         </div>
//       </AuthProvider>
//     </I18nextProvider>
//   );
// }

// export default App;
