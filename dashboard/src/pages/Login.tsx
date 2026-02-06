import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { totpApi } from '../api/client';
import { AlertCircle, Loader2, Github, Shield, ArrowLeft } from 'lucide-react';

export default function Login() {
  const { login, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // TOTP state
  const [showTotp, setShowTotp] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [pendingToken, setPendingToken] = useState('');

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
    }
  }, [searchParams]);

  const API_URL = window.location.origin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (showTotp) {
      // Step 2: Verify TOTP code
      const response = await totpApi.verifyLogin(pendingToken, totpCode);
      if (response.success && response.data) {
        const result = await loginWithToken(response.data.token);
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.error || 'Login failed');
        }
      } else {
        setError(response.error?.message || 'Invalid verification code');
      }
    } else {
      // Step 1: Email/password
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else if (result.requires_totp && result.pending_token) {
        setPendingToken(result.pending_token);
        setShowTotp(true);
      } else {
        setError(result.error || 'Login failed');
      }
    }

    setLoading(false);
  };

  const handleBackToLogin = () => {
    setShowTotp(false);
    setTotpCode('');
    setPendingToken('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-n2f-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-n2f-accent">cl-n8n-mcp</h1>
          <p className="text-n2f-text-secondary mt-2">Sign in to your account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="error-message">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {showTotp ? (
              /* TOTP Verification Step */
              <div className="space-y-4">
                <div className="text-center">
                  <Shield className="h-12 w-12 text-n2f-accent mx-auto mb-3" />
                  <h2 className="text-lg font-semibold text-n2f-text">Two-Factor Authentication</h2>
                  <p className="text-sm text-n2f-text-secondary mt-1">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
                <div>
                  <input
                    type="text"
                    className="input text-center text-2xl tracking-widest"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || totpCode.length !== 6}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verify
                </button>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full flex items-center justify-center gap-2 text-sm text-n2f-text-secondary hover:text-n2f-text transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </button>
              </div>
            ) : (
              /* Email/Password Step */
              <>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="label">Password</label>
                  <input
                    type="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sign in
                </button>
              </>
            )}
          </form>

          {!showTotp && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-n2f-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-n2f-surface px-2 text-n2f-text-muted">or continue with</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { window.location.href = `${API_URL}/api/auth/oauth/github`; }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-n2f-border bg-n2f-elevated text-n2f-text hover:bg-n2f-border transition-colors"
                >
                  <Github className="h-5 w-5" />
                  GitHub
                </button>
                <button
                  type="button"
                  onClick={() => { window.location.href = `${API_URL}/api/auth/oauth/google`; }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-n2f-border bg-n2f-elevated text-n2f-text hover:bg-n2f-border transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>
              </div>

              <div className="mt-6 text-center text-sm text-n2f-text-secondary">
                Don't have an account?{' '}
                <Link to="/register" className="link">
                  Sign up
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
