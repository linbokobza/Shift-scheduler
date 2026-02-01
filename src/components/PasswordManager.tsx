import React, { useState } from 'react';
import { Key, Eye, EyeOff, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface PasswordManagerProps {
  onClose: () => void;
}

const PasswordManager: React.FC<PasswordManagerProps> = ({ onClose }) => {
  const { user, updatePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('הסיסמאות החדשות אינן תואמות');
      return;
    }

    // Password validation: min 8 chars, 1 uppercase, 1 lowercase, 1 digit
    if (newPassword.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('הסיסמה חייבת להכיל לפחות אות גדולה אחת באנגלית');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setError('הסיסמה חייבת להכיל לפחות אות קטנה אחת באנגלית');
      return;
    }
    if (!/\d/.test(newPassword)) {
      setError('הסיסמה חייבת להכיל לפחות ספרה אחת');
      return;
    }

    setIsLoading(true);

    try {
      const success = await updatePassword(currentPassword, newPassword);
      if (success) {
        setSuccess('הסיסמה שונתה בהצלחה!');
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError('הסיסמה הנוכחית שגויה');
      }
    } catch (error) {
      setError('אירעה שגיאה בשינוי הסיסמה');
    }

    setIsLoading(false);
  };

  const generateRandomPassword = () => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const all = upper + lower + digits;

    // Guarantee at least one of each required type
    let password =
      upper.charAt(Math.floor(Math.random() * upper.length)) +
      lower.charAt(Math.floor(Math.random() * lower.length)) +
      digits.charAt(Math.floor(Math.random() * digits.length));

    // Fill remaining with random chars (total 12 chars for good strength)
    for (let i = 0; i < 9; i++) {
      password += all.charAt(Math.floor(Math.random() * all.length));
    }

    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    setNewPassword(password);
    setConfirmPassword(password);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 lg:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full modal-container">
        <div className="flex items-center mb-6">
          <Key className="w-6 h-6 text-blue-600 ml-2" />
          <h3 className="text-lg font-semibold text-gray-900">שינוי סיסמה</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-2">
              סיסמה נוכחית
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                id="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-10"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
              סיסמה חדשה
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-10"
                required
                disabled={isLoading}
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={generateRandomPassword}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center"
              disabled={isLoading}
            >
              <RefreshCw className="w-3 h-3 ml-1" />
              צור סיסמה אקראית
            </button>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
              אישור סיסמה חדשה
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-10"
                required
                disabled={isLoading}
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
              {success}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors ml-3"
              disabled={isLoading}
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-1" />
              ) : (
                <Save className="w-4 h-4 ml-1" />
              )}
              {isLoading ? 'שומר...' : 'שמור סיסמה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordManager;