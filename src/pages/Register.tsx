import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Shield, Lock, User as UserIcon, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await api.post('/auth/register', {
        username: username.trim(),
        password,
      });
      setSuccess('Account created successfully! Redirecting to sign in...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: unknown) {
      let message = 'An error occurred during account creation. Please try again.';
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
            Create Vault Account
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Set up credentials for your distributed cloud storage workspace
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

          {success && (
            <div
              role="status"
              className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-start gap-2.5 text-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              id="register-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a vault username"
              helperText="Minimum 3 characters"
              leftIcon={<UserIcon className="w-4 h-4" />}
            />

            <Input
              label="Password"
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              helperText="Minimum 6 characters"
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
              disabled={Boolean(success)}
              className="w-full mt-2"
              rightIcon={<UserPlus className="w-4 h-4" />}
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5 text-center text-xs text-slate-400">
            Already have a vault?{' '}
            <Link
              to="/login"
              className="font-medium text-blue-400 hover:text-blue-300 transition-colors focus:outline-none focus:underline"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Security Microcopy */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          Zero-knowledge architecture • Encrypted chunk deduplication
        </p>
      </div>
    </div>
  );
};
