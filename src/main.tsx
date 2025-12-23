import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clear authentication tokens on app startup to ensure login screen is shown
// This ensures users see the login page when opening the app
localStorage.removeItem('authToken');
localStorage.removeItem('currentUser');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
