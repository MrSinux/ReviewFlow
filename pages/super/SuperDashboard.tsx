import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../../services/dataService';
import { authService } from '../../services/authService';
import type { Business } from '../../types';
import { getPublicOrigin } from '../../services/publicUrl';
import { Plus, Search, Eye, Users, LayoutDashboard, LogOut, Menu, X, Trash2, ShieldCheck, Star } from 'lucide-react';
import DevelopedByFooter from '../../components/DevelopedByFooter';

const SuperDashboard: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnboard, setShowOnboard] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);

  const [totalScans, setTotalScans] = useState(0);
  const [totalRedirects, setTotalRedirects] = useState(0);
  const [totalIntercepted, setTotalIntercepted] = useState(0);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
  document.body.style.overflow = mobileOpen ? 'hidden' : '';
  return () => {
    document.body.style.overflow = '';
  };
}, [mobileOpen]);


  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await dataService.getBusinesses();
        if (!mounted) return;
        setBusinesses(list);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const allEvents = await dataService.getRatingEvents();
        if (!mounted) return;
        setTotalScans(allEvents.length);
        setTotalRedirects(allEvents.filter((e) => e.wasRedirected).length);
        setTotalIntercepted(allEvents.filter((e) => !e.wasRedirected).length);
      } catch {
        if (!mounted) return;
        setTotalScans(0);
        setTotalRedirects(0);
        setTotalIntercepted(0);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [businesses.length]);

  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    if (!s) return businesses;
    return businesses.filter(
      (b) => b.name.toLowerCase().includes(s) || (b.slug ?? '').toLowerCase().includes(s)
    );
  }, [businesses, searchTerm]);

  const handleImpersonate = (b: Business) => {
    navigate(`/p/${b.slug}/admin?impersonate=1`);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await dataService.deleteBusiness(deleteTarget.id);
      setBusinesses((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleOnboard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOnboardError(null);
    setOnboarding(true);

    try {
      const formData = new FormData(e.currentTarget);
      const name = (formData.get('name') as string | null)?.trim() ?? '';
      if (!name) throw new Error('Business name is required.');

      const slug = name.toLowerCase().replace(/\s+/g, '-');

      const newBiz: Business = {
        id: crypto.randomUUID(),
        name,
        slug,
        status: 'Active',
        timezone: 'UTC',
        thresholdRating: 4,
        googleReviewUrl: '',
        redirectUrl: undefined,
        entryPoints: [],
        feedbackQuestions: [],
        theme: {
          accentColor: '#3b82f6',
          pageBg: '#f8fafc',
          adminBg: '#f1f5f9',
          cardBg: '#ffffff',
        },
        contactSettings: { enabled: false },
        createdAt: new Date().toISOString(),
        updatedAt: undefined,
      };

      const saved = await dataService.saveBusiness(newBiz);
      setBusinesses((prev) => [saved, ...prev]);
      setShowOnboard(false);
    } catch (err: any) {
      setOnboardError(err?.message ?? 'Failed to onboard client');
    } finally {
      setOnboarding(false);
    }
  };

  const origin = getPublicOrigin();

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      {/* Sidebar (desktop fixed, mobile drawer) */}
      <aside
  className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 transform lg:translate-x-0 ${
    mobileOpen ? 'translate-x-0' : '-translate-x-full'
  }`}
>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck size={24} className="text-blue-400" /> Sinux Consortium
          </h1>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-slate-300 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 p-4 flex flex-col">
  <div className="space-y-2">
    <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 rounded-lg text-sm font-medium">
      <Users size={18} /> Client Gallery
    </button>
  </div>

  <div className="mt-auto pt-4">
    <button
      onClick={async () => {
        await authService.logout();
        navigate('/login');
      }}
      className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/40 rounded-lg transition-colors text-sm font-medium"
    >
      <LogOut size={18} /> Logout
    </button>
  </div>
</nav>
      </aside>
      
      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 h-screen">
        {/* Mobile header */}
        <header className="bg-white border-b border-gray-200 p-4 flex items-center gap-4 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-gray-700">
            <Menu size={22} />
          </button>
          <div className="truncate">
            <div className="font-bold text-slate-900">Control Center</div>
            <div className="text-xs text-slate-500 truncate">Managing {businesses.length} active client portals</div>
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 lg:p-10 gap-6 overflow-hidden">
          <header className="hidden lg:flex justify-between items-end flex-shrink-0">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Control Center</h2>
              <p className="text-slate-500 mt-1">Managing {businesses.length} active client portals</p>
            </div>
            <button
              onClick={() => setShowOnboard(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-shadow shadow-sm"
            >
              <Plus size={20} /> Onboard Client
            </button>
          </header>

          {/* Mobile onboard button */}
          <div className="lg:hidden flex-shrink-0">
            <button
              onClick={() => setShowOnboard(true)}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-shadow shadow-sm"
            >
              <Plus size={20} /> Onboard Client
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 flex-shrink-0">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total Clients</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{businesses.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total Scans</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{totalScans}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Redirects (Google)</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{totalRedirects}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Intercepted</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{totalIntercepted}</p>
            </div>
          </div>

          {/* Client Gallery */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center gap-4 flex-shrink-0">
              <Search className="text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search clients by Name"
                className="flex-1 border-none focus:ring-0 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 text-left">Client Name</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Rating Threshold</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((b) => {
                    const publicHref = `${origin}/r/${b.slug}`;
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 text-left">
                          <div className="font-semibold text-slate-900">{b.name}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center gap-1 font-medium">
                            {b.thresholdRating}+ <Star size={14} className="fill-yellow-400 text-yellow-400" />
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleImpersonate(b)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Manage Portal"
                            >
                              <LayoutDashboard size={18} />
                            </button>
                            <a
                              href={publicHref}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                              title="View Public Link"
                            >
                              <Eye size={18} />
                            </a>
                            <button
                              onClick={() => setDeleteTarget(b)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete Business"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        <DevelopedByFooter />

        {/* Delete confirmation modal */}
        {deleteTarget && (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6 z-50"
            onClick={() => { if (!deleting) setDeleteTarget(null); }}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-red-700">Delete Business?</h3>
                <p className="mt-2 text-sm text-slate-500">
                  This will permanently delete <strong>{deleteTarget.name}</strong> and all associated data — feedback, rating events, replies, and user profiles.
                </p>
              </div>
              <div className="px-6 py-4">
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                  This action cannot be undone.
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 pb-6">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="px-5 py-2.5 text-slate-500 font-medium hover:bg-slate-50 rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete Business'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Onboarding */}
        {showOnboard && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="text-xl font-bold">Onboard New Client</h3>
              </div>
              <form onSubmit={handleOnboard} className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Business Name</label>
                  <input
                    required
                    name="name"
                    type="text"
                    className="w-full mt-1 p-3 border rounded-lg"
                    placeholder="e.g. Demo Café"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This will create the business. You&apos;ll add the admin user in Supabase manually.
                  </p>
                </div>

                {onboardError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
                    {onboardError}
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowOnboard(false)}
                    className="px-5 py-2.5 text-slate-500 font-medium hover:bg-slate-50 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={onboarding}
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 disabled:opacity-60 text-white font-bold rounded-lg hover:bg-blue-700"
                  >
                    {onboarding ? 'Creating...' : 'Create Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperDashboard;
