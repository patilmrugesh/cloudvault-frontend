import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import { Shield, Lock, User as UserIcon, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide both username and password.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', {
        username: username.trim(),
        password,
      });
      login(response.data);
      navigate('/');
    } catch (err: unknown) {
      let message = 'Unable to sign in. Please check your credentials.';
      const errObj = err as { response?: { data?: unknown } };
      if (typeof errObj.response?.data === 'string' && errObj.response.data.trim()) {
        message = errObj.response.data;
      } else if (
        errObj.response?.data &&
        typeof (errObj.response.data as { message?: string }).message === 'string'
      ) {
        message = (errObj.response.data as { message: string }).message;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D13] text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 mb-3.5 shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            CloudVault
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sign in to access your encrypted distributed vault
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-[#131724] border border-white/10 p-6 sm:p-7 shadow-xl shadow-black/40">
          {error && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-2.5 text-xs"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              id="login-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your vault username"
              leftIcon={<UserIcon className="w-4 h-4" />}
            />

            <Input
              label="Password"
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5 text-center text-xs text-slate-400">
            Don&apos;t have a vault account?{' '}
            <Link
              to="/register"
              className="font-medium text-blue-400 hover:text-blue-300 transition-colors focus:outline-none focus:underline"
            >
              Create one
            </Link>
          </div>
        </div>

        {/* Security Microcopy */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          Protected by end-to-end tokenized authorization & AES-256 chunk encryption
        </p>
      </div>
    </div>
  );
};
