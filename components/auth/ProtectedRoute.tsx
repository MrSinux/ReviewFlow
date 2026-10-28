import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import type { AuthSession } from '../../services/authService';
import type { UserRole } from '../../types';

type Props = {
  children: React.ReactNode;
  allow?: UserRole[]; // if omitted, any authenticated user is allowed
};

const ProtectedRoute: React.FC<Props> = ({ children, allow }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await authService.getCurrentSession();
        if (!mounted) return;
        setSession(s);
      } catch {
        if (!mounted) return;
        setSession(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-700" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allow && allow.length > 0 && !allow.includes(session.profile.role)) {
    // Role mismatch — send to appropriate landing
    if (session.profile.role === 'super') return <Navigate to="/super" replace />;
    if (session.profile.businessSlug) return <Navigate to={`/p/${session.profile.businessSlug}/admin`} replace />;
    return <Navigate to="/" replace />;
  }

  // Extra guard: admin can only access their own slug
  const slug = (params as any).slug as string | undefined;
  if (slug && session.profile.role === 'admin') {
    if ((session.profile.businessSlug ?? '').toLowerCase() !== slug.toLowerCase()) {
      return <Navigate to={`/p/${session.profile.businessSlug ?? ''}/admin`} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
