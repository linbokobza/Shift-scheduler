import React from 'react';
import { LogOut, User, Key } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import PasswordManager from './PasswordManager';

interface HeaderProps {}

const Header: React.FC<HeaderProps> = () => {
  const { user, logout } = useAuth();
  const [showPasswordManager, setShowPasswordManager] = React.useState(false);

  return (
    <>
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto container-mobile">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src="/logo.png" alt="ShiftLock" className="w-8 h-8 lg:w-10 lg:h-10 ml-2" />
              <img src="/name.png" alt="ShiftLock" className="h-5 lg:h-6" />
            </div>

            {/* Desktop User Info */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="flex items-center text-slate-700">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center ml-2 text-blue-600 text-xs font-semibold">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{user?.name}</div>
                  <div className="text-xs text-slate-500">
                    {user?.role === 'manager' ? 'מנהל' : 'עובד'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowPasswordManager(true)}
                className="flex items-center text-slate-500 hover:text-slate-700 transition-colors p-2 rounded-lg hover:bg-slate-100"
              >
                <Key className="w-5 h-5" />
              </button>

              <button
                onClick={logout}
                className="flex items-center text-slate-500 hover:text-slate-700 transition-colors p-2 rounded-lg hover:bg-slate-100"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Quick Actions (All Users) */}
            <div className="lg:hidden flex items-center gap-2">
              <button
                onClick={() => setShowPasswordManager(true)}
                className="flex items-center text-slate-500 hover:text-slate-700 transition-colors p-2 rounded-lg hover:bg-slate-100"
              >
                <Key className="w-5 h-5" />
              </button>

              <button
                onClick={logout}
                className="flex items-center text-slate-500 hover:text-slate-700 transition-colors p-2 rounded-lg hover:bg-slate-100"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
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