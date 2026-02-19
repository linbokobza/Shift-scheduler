import React, { useState, useEffect } from 'react';
import { LogIn, Loader2, User, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { axiosInstance } from '../api/axios.config';
import ForgotPasswordModal from './ForgotPasswordModal';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login, isLoading } = useAuth();
  const [quickLoginUsers, setQuickLoginUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);

  useEffect(() => {
    axiosInstance.get('/auth/quick-login-users')
      .then(res => {
        setQuickLoginUsers(res.data.users.map((u: any) => ({
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role === 'manager' ? 'מנהל' : 'עובד',
        })));
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = await login(email, password);
    if (!success) {
      setError('אימייל או סיסמה שגויים');
    }
  };

  const handleQuickLogin = async (userEmail: string) => {
    const quickPassword = 'Password1';
    setError('');
    setEmail(userEmail);
    setPassword(quickPassword);

    setTimeout(async () => {
      const success = await login(userEmail, quickPassword);
      if (!success) {
        setError('אימייל או סיסמה שגויים');
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-3 lg:p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="ShiftLock" className="w-16 h-16 mx-auto mb-4" />
          <img src="/name.png" alt="ShiftLock" className="h-8 mx-auto mb-2" />
          <p className="text-gray-600">היכנסו עם הפרטים שלכם</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              אימייל
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="your@email.com"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              סיסמה
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              שכחתי סיסמה?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5 ml-2" />
                התחברות
              </>
            )}
          </button>
        </form>

        <div className="mt-8 border-t pt-6">
          <p className="text-sm text-gray-600 mb-4 text-center font-medium">התחברות מהירה:</p>
          <div className="space-y-2 max-h-48 lg:max-h-64 overflow-y-auto">
            {quickLoginUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleQuickLogin(user.email)}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 rounded-lg p-3 transition-all border border-gray-200 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed text-right"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${user.role === 'מנהל' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                      {user.role === 'מנהל' ? (
                        <Shield className="w-4 h-4 text-purple-600" />
                      ) : (
                        <User className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  <div className={`text-xs px-3 py-1 rounded-full font-medium ${
                    user.role === 'מנהל'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            לחץ על פרטי משתמש למילוי אוטומטי של השדות
          </p>
        </div>
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal
          onClose={() => setShowForgotPassword(false)}
          onBackToLogin={() => setShowForgotPassword(false)}
        />
      )}
    </div>
  );
};

export default LoginForm;