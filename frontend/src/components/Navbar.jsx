import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Terminal, LayoutDashboard, History, LogOut, User as UserIcon } from 'lucide-react';
import axios from 'axios';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token) {
      axios.get('http://localhost:8000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setUser(res.data);
      })
      .catch(() => {
        // Token might have expired
        localStorage.removeItem('token');
        setUser(null);
      });
    }
  }, [token, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // Don't show full navbar on auth pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <nav className="sticky top-0 z-50 w-full px-6 py-4 border-b border-brand-border bg-brand-bg/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white hover:opacity-90 transition-opacity">
          <div className="bg-brand-glow/15 p-2 rounded-lg border border-brand-glow/30">
            <Terminal className="w-5 h-5 text-brand-glow" />
          </div>
          <span>CodeRun <span className="text-brand-glow">AI</span></span>
          <span className="w-2 h-2 rounded-full bg-brand-emerald animate-pulse"></span>
        </Link>

        {/* Navigation Tabs (Visible only if logged in and not on login page) */}
        {token && !isAuthPage && (
          <div className="hidden md:flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-brand-border">
            <Link
              to="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive('/')
                  ? 'bg-brand-glow/15 text-brand-glow border border-brand-glow/30'
                  : 'text-gray-400 hover:text-white border border-transparent'
              }`}
            >
              <Terminal className="w-4 h-4" />
              Editor Workspace
            </Link>
            <Link
              to="/dashboard"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive('/dashboard')
                  ? 'bg-brand-glow/15 text-brand-glow border border-brand-glow/30'
                  : 'text-gray-400 hover:text-white border border-transparent'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              to="/history"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive('/history')
                  ? 'bg-brand-glow/15 text-brand-glow border border-brand-glow/30'
                  : 'text-gray-400 hover:text-white border border-transparent'
              }`}
            >
              <History className="w-4 h-4" />
              Execution History
            </Link>
          </div>
        )}

        {/* User profile & Actions */}
        <div className="flex items-center gap-4">
          {token && user && !isAuthPage ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-brand-border">
                <UserIcon className="w-4 h-4 text-brand-glow" />
                <span className="text-sm font-medium text-gray-300">{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-brand-rose bg-white/5 border border-brand-border hover:bg-brand-rose/10 hover:border-brand-rose/40 transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            !isAuthPage && (
              <Link to="/login" className="glass-btn-primary py-1.5 px-4 text-sm">
                Sign In
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
