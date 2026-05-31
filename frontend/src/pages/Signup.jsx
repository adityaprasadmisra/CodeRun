import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Terminal, ArrowRight } from 'lucide-react';
import axios from 'axios';

const Signup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/api/auth/signup', {
        name,
        email,
        password
      });
      localStorage.setItem('token', response.data.access_token);
      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        'Failed to sign up. Email address may already be in use.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 relative select-none">
      {/* Background radial accent glows */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-violet/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-brand-glow/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel p-8 relative overflow-hidden">
        {/* Glow border overlay */}
        <div className="absolute -inset-px border border-brand-glow/10 rounded-xl pointer-events-none"></div>

        {/* Top Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-violet/10 p-3.5 rounded-xl border border-brand-violet/20 mb-3 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
            <Terminal className="w-6 h-6 text-brand-violet animate-pulse-slow" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create your Account</h2>
          <p className="text-xs text-gray-400 mt-1.5">Sign up to compile, execute, and review code with AI</p>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="mb-5 p-3.5 rounded-lg border border-brand-rose/25 bg-brand-rose/10 text-brand-rose text-xs font-medium">
            {error}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aditya Prasad"
                className="w-full glass-input pl-10 pr-4 text-sm"
              />
            </div>
          </div>

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
                placeholder="•••••••• (Min 6 chars)"
                className="w-full glass-input pl-10 pr-4 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glass-btn-primary py-2.5 mt-2 font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
          >
            {loading ? 'Creating Account...' : 'Get Started'}
            {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-8 text-center text-xs text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-glow hover:underline font-semibold transition-colors">
            Sign In Instead
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
