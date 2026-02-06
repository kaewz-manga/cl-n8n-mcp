import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      return;
    }

    if (!token) {
      setError('No authentication token received');
      return;
    }

    // Store token and redirect to dashboard
    loginWithToken(token).then((result) => {
      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error || 'Authentication failed');
      }
    });
  }, [searchParams, navigate, loginWithToken]);

  if (error) {
    return (
      <div className="min-h-screen bg-n2f-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-n2f-text mb-2">Authentication Failed</h2>
            <p className="text-n2f-text-secondary mb-6">{error}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="btn-primary"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-n2f-bg flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-n2f-accent mx-auto mb-4" />
        <p className="text-n2f-text-secondary">Completing sign in...</p>
      </div>
    </div>
  );
}
