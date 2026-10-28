import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { authService } from '../services/authService';
import { isDemoMode } from '../services/supabaseClient';
import { DEMO_ACCOUNTS } from '../services/demo/authService';
import DevelopedByFooter from '../components/DevelopedByFooter';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const signIn = async (loginEmail: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const session = await authService.login(loginEmail, password);

      if (session.profile.role === 'super') {
        navigate('/super');
        return;
      }

      if (session.profile.role === 'admin') {
        if (!session.profile.businessSlug) {
          throw new Error('This admin account is not linked to a business yet.');
        }
        navigate(`/p/${session.profile.businessSlug}/admin`);
        return;
      }

      throw new Error('This account does not have portal access.');
    } catch (err: any) {
      setError(err?.message ?? 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    signIn(email, pass);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center gap-2 text-blue-600 mb-6">
                <TrendingUp size={28} />
                <span className="text-2xl font-bold">ReviewFlow</span>
              </div>
              <h1 className="text-lg font-semibold text-slate-800">Portal Login</h1>
              <p className="text-sm text-slate-500 mt-1">Sign in to access your dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                placeholder="Email address"
                autoComplete="email"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
              />

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {isDemoMode && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                  Try the demo
                </p>
                <div className="mt-3 space-y-2">
                  {DEMO_ACCOUNTS.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      disabled={loading}
                      onClick={() => signIn(account.email, account.password)}
                      className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-60"
                    >
                      <div className="text-sm font-semibold text-slate-800">Sign in as {account.label}</div>
                      <div className="text-xs text-slate-500">{account.description}</div>
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-xs text-slate-500 text-center">
                  Or rate a visit as a customer:{' '}
                  <Link to="/r/demo-cafe?src=table_3" className="text-blue-600 hover:underline">
                    Demo Café review page
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <DevelopedByFooter />
    </div>
  );
};

export default LoginPage;
