import React from 'react';
import { LogOut, Calendar, User, Key, Menu } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import PasswordManager from './PasswordManager';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
  const { user, logout } = useAuth();
  const [showPasswordManager, setShowPasswordManager] = React.useState(false);

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto container-mobile">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-blue-600 rounded-lg p-2 ml-3">
                <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              </div>
              <h1 className="mobile-text-lg font-bold text-gray-900 mr-3">מערכת ניהול משמרות</h1>
            </div>

            {/* Desktop User Info */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="flex items-center text-gray-700">
                <User className="w-5 h-5 ml-2" />
                <div className="text-right">
                  <div className="text-sm font-medium">{user?.name}</div>
                  <div className="text-xs text-gray-500">
                    {user?.role === 'manager' ? 'מנהל' : 'עובד'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowPasswordManager(true)}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100"
                title="שינוי סיסמה"
              >
                <Key className="w-5 h-5" />
              </button>

              <button
                onClick={logout}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100"
                title="התנתקות"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            {user?.role === 'manager' && onMobileMenuToggle && (
              <button
                onClick={onMobileMenuToggle}
                className="lg:hidden flex items-center text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100"
                title="תפריט"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}

            {/* Mobile Quick Actions (Employee) */}
            {user?.role !== 'manager' && (
              <div className="lg:hidden flex items-center gap-2">
                <button
                  onClick={() => setShowPasswordManager(true)}
                  className="flex items-center text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100"
                  title="שינוי סיסמה"
                >
                  <Key className="w-5 h-5" />
                </button>

                <button
                  onClick={logout}
                  className="flex items-center text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100"
                  title="התנתקות"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showPasswordManager && (
        <PasswordManager onClose={() => setShowPasswordManager(false)} />
      )}
    </>
  );
};

export default Header;