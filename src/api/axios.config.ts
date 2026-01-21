import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and CSRF token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token if present in session storage
    const csrfToken = sessionStorage.getItem('csrfToken');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and CSRF token extraction
axiosInstance.interceptors.response.use(
  (response) => {
    // Extract CSRF token from response headers if present
    const csrfToken = response.headers['x-csrf-token'];
    if (csrfToken) {
      sessionStorage.setItem('csrfToken', csrfToken);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Skip redirect for login requests - let the login form handle the error
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        // Token expired or invalid - redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = '/';
      }
    }
    if (error.response?.status === 403) {
      // CSRF token might be invalid
      sessionStorage.removeItem('csrfToken');
      // Optionally refresh the page to get a new CSRF token
      // window.location.reload();
    }
    return Promise.reject(error);
  }
);
