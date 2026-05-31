import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Terminal, ArrowRight } from 'lucide-react';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/api/auth/login', {
        email,
        password
      });
      localStorage.setItem('token', response.data.access_token);
      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        'Failed to log in. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 relative select-none">
      {/* Background radial accent glows */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-glow/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-brand-violet/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel p-8 relative overflow-hidden">
        {/* Glow border overlay */}
        <div className="absolute -inset-px border border-brand-glow/10 rounded-xl pointer-events-none"></div>

        {/* Top Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-glow/10 p-3.5 rounded-xl border border-brand-glow/20 mb-3 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
            <Terminal className="w-6 h-6 text-brand-glow animate-pulse-slow" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Welcome to CodeRun AI</h2>
          <p className="text-xs text-gray-400 mt-1.5">Sign in to compile code and receive AI-generated reviews</p>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="mb-5 p-3.5 rounded-lg border border-brand-rose/25 bg-brand-rose/10 text-brand-rose text-xs font-medium">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@coderun.ai"
                className="w-full glass-input pl-10 pr-4 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full glass-input pl-10 pr-4 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glass-btn-primary py-2.5 mt-2 font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
          >
            {loading ? 'Signing In...' : 'Sign In'}
            {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
          </button>
        </form>

        {/* Registration Link */}
        <div className="mt-8 text-center text-xs text-gray-400">
          New to the platform?{' '}
          <Link to="/signup" className="text-brand-glow hover:underline font-semibold transition-colors">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
