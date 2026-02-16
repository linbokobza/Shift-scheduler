import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '../types';
import { authAPI } from '../api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('currentUser');

      if (token && storedUser) {
        // Restore user from localStorage immediately so reload doesn't flash login
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // corrupted data
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
          setUser(null);
          setIsLoading(false);
          return;
        }
        setIsLoading(false);

        // Validate token in the background
        try {
          const response = await authAPI.getMe();
          setUser(response.user);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
        } catch (error: any) {
          if (error.response?.status === 401) {
            // Token truly expired/invalid - log out
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            setUser(null);
          }
          // For network errors, keep the user logged in with cached data
        }
      } else {
        setUser(null);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await authAPI.login(email, password);

      // Store token
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('currentUser', JSON.stringify(response.user));

      setUser(response.user);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await authAPI.updatePassword(currentPassword, newPassword);
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.error || 'אירעה שגיאה בשינוי הסיסמה';
      return { success: false, error: message };
    }
  };

  return { user, login, logout, updatePassword, isLoading };
};

export { AuthContext };
