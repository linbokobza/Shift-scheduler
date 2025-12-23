import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { authAPI } from '../api/auth.api';

interface ForgotPasswordModalProps {
  onClose: () => void;
  onBackToLogin: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('אנא הכנסו את כתובת האימייל שלכם');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.forgotPassword(email);
      setSuccess(true);
      if (response.resetToken) {
        setResetToken(response.resetToken);
      }
      if (response.resetLink) {
        setResetLink(response.resetLink);
      }
    } catch (err: any) {
      setError('שגיאה בשליחת בקשת איפוס הסיסמה. אנא נסו שוב.');
      console.error('Forgot password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">בקשה נשלחה בהצלחה</h3>
            <p className="text-gray-600 text-sm mb-6">
              אם כתובת האימייל קיימת במערכת, תקבלו הודעת דוא"ל עם קישור לאיפוס הסיסמה.
            </p>

            {resetToken && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-xs text-gray-600 mb-2">
                  (מצב פיתוח - קישור בדוא"ל):
                </p>
                <a
                  href={resetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 break-all"
                >
                  {resetLink}
                </a>
                <p className="text-xs text-gray-500 mt-2">
                  או העתיקו את הטוקן:
                </p>
                <code className="text-xs bg-gray-100 p-2 block mt-1 break-all rounded">
                  {resetToken}
                </code>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={onBackToLogin}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 ml-2" />
                חזרה להתחברות
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center mb-6">
          <Mail className="w-6 h-6 text-blue-600 ml-2" />
          <h3 className="text-lg font-semibold text-gray-900">איפוס סיסמה</h3>
        </div>

        <p className="text-gray-600 text-sm mb-6">
          הכניסו את כתובת האימייל המשוייכת לחשבון שלכם, ואנחנו נשלח לכם קישור לאיפוס הסיסמה.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-2">
              כתובת אימייל
            </label>
            <input
              type="email"
              id="forgot-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
              required
              disabled={isLoading}
              dir="ltr"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onBackToLogin}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center"
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              חזרה
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-1" />
              ) : (
                <Mail className="w-4 h-4 ml-1" />
              )}
              {isLoading ? 'שולח...' : 'שלח קישור'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
