import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  TrendingUp,
  MessageSquare,
  QrCode,
  Settings,
  LogOut,
  ArrowLeft,
  Eye,
  Menu,
  X,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { dataService } from '../../services/dataService';
import { supabase } from '../../services/supabaseClient';
import { getPublicOrigin } from '../../services/publicUrl';
import { Business, FeedbackStatus } from '../../types';
import DevelopedByFooter from '../DevelopedByFooter';

const SidebarItem = ({
  to,
  label,
  icon,
  badge,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}) => {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-gray-100 text-gray-900'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`
      }
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {typeof badge === 'number' && badge > 0 && (
        <span className="ml-auto text-xs font-bold bg-blue-600 text-white rounded-full px-2 py-0.5">
          {badge}
        </span>
      )}
    </NavLink>
  );
};

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [auth, setAuth] = useState<import('../../services/authService').AuthSession | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  
useEffect(() => {
  document.body.style.overflow = mobileOpen ? 'hidden' : '';
  return () => {
    document.body.style.overflow = '';
  };
}, [mobileOpen]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await authService.getCurrentSession();
      if (!mounted) return;
      setAuth(s);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const isSuper = auth?.profile.role === 'super';
  const qs = new URLSearchParams(location.search);
  const isImpersonating = isSuper && qs.get('impersonate') === '1';

  useEffect(() => {
    if (!isSuper || !slug) return;
    if (!location.pathname.startsWith(`/p/${slug}/admin`)) return;
    if (qs.get('impersonate') === '1') return;
    navigate(`${location.pathname}?impersonate=1`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuper, slug, location.pathname]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const b = await dataService.getBusinessBySlug(slug);
      setBusiness(b);
      if (b?.id) {
        const fb = await dataService.getFeedback(b.id);
        setUnreadCount(fb.filter((f) => f.status === FeedbackStatus.NEW).length);
      } else {
        setUnreadCount(0);
      }
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (!business?.id) return;
    (async () => {
      const fb = await dataService.getFeedback(business.id);
      setUnreadCount(fb.filter((f) => f.status === FeedbackStatus.NEW).length);
    })();
  }, [business?.id, children]);

  // Realtime: keep the sidebar badge in sync without needing a full re-fetch.
  useEffect(() => {
    // No realtime in demo mode (no Supabase client).
    if (!business?.id || !supabase) return;
    const client = supabase;

    const channel = client
      .channel(`layout-feedback:${business.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedback', filter: `business_id=eq.${business.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if ((payload.new as any).status === FeedbackStatus.NEW) {
              setUnreadCount((n) => n + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            const wasNew = (payload.old as any).status === FeedbackStatus.NEW;
            const isNew = (payload.new as any).status === FeedbackStatus.NEW;
            if (wasNew && !isNew) setUnreadCount((n) => Math.max(0, n - 1));
            else if (!wasNew && isNew) setUnreadCount((n) => n + 1);
          } else if (payload.eventType === 'DELETE') {
            if ((payload.old as any).status === FeedbackStatus.NEW) {
              setUnreadCount((n) => Math.max(0, n - 1));
            }
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [business?.id]);
  
  const handleLogout = async () => {
    if (isSuper) {
      navigate('/super');
      return;
    }

    await authService.logout();
    navigate('/login');
  };

  const publicHref = `${getPublicOrigin()}/r/${slug}`;
  const imp = isSuper ? '?impersonate=1' : '';
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading portal...</div>;
  }
  
  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: business?.theme.adminBg || '#f1f5f9' }}>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
  className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 transform lg:translate-x-0 ${
    mobileOpen ? 'translate-x-0' : '-translate-x-full'
  }`}
>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
            <TrendingUp />
            <span>ReviewFlow</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-gray-500">
            <X size={24} />
          </button>
        </div>

        <div className="mt-2 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Business Portal</div>

        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem to={`/p/${slug}/admin${imp}`} icon={<TrendingUp size={20} />} label="Dashboard" />
          <SidebarItem to={`/p/${slug}/admin/feedback${imp}`} icon={<MessageSquare size={20} />} label="Inbox" badge={unreadCount} />
          <SidebarItem to={`/p/${slug}/admin/links${imp}`} icon={<QrCode size={20} />} label="Links & QR" />
          <SidebarItem to={`/p/${slug}/admin/settings${imp}`} icon={<Settings size={20} />} label="Settings" />
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
          <a
            href={publicHref}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 text-gray-600 hover:text-emerald-700 transition-colors w-full p-2 rounded-lg hover:bg-emerald-50"
          >
            <Eye size={20} />
            <span className="text-sm font-medium">View Public Link</span>
          </a>

          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 transition-colors w-full p-2 rounded-lg ${
              isSuper
                ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
            }`}
          >
            {isSuper ? <ArrowLeft size={20} /> : <LogOut size={20} />}
            <span className="text-sm font-medium">
              {isSuper ? 'Exit Impersonation' : 'Log Out'}
            </span>
          </button>
        </div>
      </aside>
      
      <div className="flex-1 flex flex-col min-w-0 h-screen lg:ml-64 overflow-hidden">
        {isImpersonating && (
          <div className="bg-amber-600 text-white text-[11px] font-bold py-2 text-center uppercase tracking-widest sticky top-0 z-10 lg:z-20">
            Impersonation Mode Active: Editing {business?.name}
          </div>
        )}
        
        <header className="bg-white border-b border-gray-200 p-4 flex items-center gap-4 lg:hidden flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-gray-600">
            <Menu size={24} />
          </button>
          <div className="truncate">
            <div className="font-bold text-lg text-blue-600">ReviewFlow</div>
            <div className="text-xs text-gray-400 truncate">{business?.name}</div>
          </div>
        </header>
        
        <main className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-8">{children}</main>
        <DevelopedByFooter />
      </div>
    </div>
  );
};

export default AdminLayout;
