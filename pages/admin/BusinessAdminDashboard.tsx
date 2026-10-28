import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, ExternalLink, QrCode, Sparkles, Star } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Business, RatingEvent, FeedbackStatus } from '../../types';

const StatCard = ({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: React.ReactNode }) => (
  <div className="bg-[var(--card-bg)] p-5 rounded-xl border border-gray-100 shadow-sm flex-1">
    <div className="flex justify-between items-start mb-3">
      <div className="text-gray-500 text-sm font-medium">{label}</div>
      <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
  </div>
);

const BusinessAdminDashboard: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [events, setEvents] = useState<RatingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadReviews, setUnreadReviews] = useState(0);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const b = await dataService.getBusinessBySlug(slug);
      setBusiness(b);
      if (b?.id) {
        const evts = await dataService.getRatingEvents(b.id);
        setEvents(evts);
        const fb = await dataService.getFeedback(b.id);
        setUnreadReviews(fb.filter((f) => f.status === FeedbackStatus.NEW).length);
      } else {
        setEvents([]);
        setUnreadReviews(0);
      }
      setLoading(false);
    })();
  }, [slug]);

  const styleVars = useMemo(() => {
    if (!business) return {};
    return {
      '--brand': business.theme.accentColor,
      '--card-bg': business.theme.cardBg || '#ffffff',
    } as React.CSSProperties;
  }, [business]);

  const stats = useMemo(() => {
    const total = events.length;
    const redirectCount = events.filter(e => e.wasRedirected).length;
    const interceptedCount = events.filter(e => !e.wasRedirected).length;
    const avgRating = total > 0 ? (events.reduce((acc, e) => acc + e.stars, 0) / total).toFixed(1) : '0.0';
    const redirectPct = total > 0 ? `${((redirectCount / total) * 100).toFixed(0)}%` : '0%';
    return { total, redirectCount, interceptedCount, avgRating, redirectPct };
  }, [events]);

  const sortedEvents = useMemo(
    () => events.slice().sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),
    [events]
  );

  if (loading) return <div className="p-8 text-sm text-gray-500">Loading dashboard...</div>;
  if (!business) return <div className="p-8 text-sm text-gray-500">Loading dashboard...</div>;

  return (
    <div className="flex flex-col gap-5 lg:h-full" style={styleVars as any}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Welcome Back, {business.name}</h2>
          <p className="text-slate-500">Here's how your customer feedback looks today.</p>
        </div>
        <div className="text-sm text-gray-400">Last 30 days</div>
      </div>

      {/* Stat cards */}
      <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
        <StatCard label="Avg Rating"         value={stats.avgRating}        icon={<Star         className="text-yellow-400" size={18} />} />
        <StatCard label="Total Scans"        value={stats.total}            icon={<QrCode       className="text-blue-500"   size={18} />} />
        <StatCard label="Redirects (Google)" value={stats.redirectCount}    sub={stats.redirectPct}   icon={<ExternalLink className="text-green-500"  size={18} />} />
        <StatCard label="Intercepted"        value={stats.interceptedCount} sub="Feedback caught"     icon={<AlertCircle  className="text-orange-500" size={18} />} />
        <StatCard label="Unread Reviews"     value={unreadReviews}          sub="Needs attention"     icon={<AlertCircle  className="text-purple-600" size={18} />} />
      </div>

      {/* Main content: stacks on mobile, side-by-side on desktop clamped to remaining height */}
      <div className="flex flex-col lg:flex-row gap-6 lg:flex-1 lg:min-h-0">

        {/* Recent Activity — fixed 5-row height on mobile, fills remaining space on desktop */}
        <div className="flex flex-col lg:flex-1 lg:min-h-0">
          <h3 className="font-semibold text-gray-800 mb-3 leading-6 flex-shrink-0">Recent Activity</h3>
          <div className="bg-[var(--card-bg)] rounded-xl border border-gray-200 overflow-y-auto h-[280px] lg:h-auto lg:flex-1 lg:min-h-0">
            {sortedEvents.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No activity yet</div>
            ) : (
              sortedEvents.map((evt) => (
                <div key={evt.id} className="p-4 border-b border-gray-100 last:border-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${evt.wasRedirected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-medium text-gray-900">{evt.stars} Stars</span>
                    <span className="text-gray-400 text-sm hidden sm:inline">
                      • {new Date(evt.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                    {evt.wasRedirected ? 'Redirected' : 'Internal'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column — constrained to same height as activity column on desktop */}
        <div className="flex flex-col gap-5 w-full lg:w-64 flex-shrink-0 lg:min-h-0">

          {/* System Health */}
          <div className="flex-shrink-0">
            <h3 className="font-semibold text-gray-800 mb-3 leading-6">System Health</h3>
            <div className="bg-[var(--card-bg)] rounded-xl border border-gray-200 p-4 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Threshold Strategy</span>
                <span className="font-medium text-blue-600">{business.thresholdRating}+ Stars</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Google Link</span>
                <span className="font-medium text-green-600 flex items-center gap-1">
                  <CheckCircle size={14} /> Active
                </span>
              </div>
            </div>
          </div>

          {/* AI Analytics — grows to fill remaining right-column height on desktop */}
          <div className="flex flex-col lg:flex-1 lg:min-h-0">
            <h3 className="font-semibold text-gray-800 mb-3 leading-6 flex-shrink-0">AI Analytics</h3>
            <div className="relative bg-[var(--card-bg)] rounded-xl border border-violet-100 p-5 overflow-hidden lg:flex-1">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50 opacity-70 pointer-events-none" />
              <div className="relative space-y-3">

                {/* Badge on its own line so title never wraps */}
                <span className="inline-block whitespace-nowrap text-[9px] font-bold uppercase tracking-wider bg-violet-100 text-violet-600 px-2.5 py-1 rounded-full">
                  Coming Soon
                </span>

                <div className="flex items-center gap-2">
                  <div className="p-2 bg-violet-100 rounded-lg flex-shrink-0">
                    <Sparkles size={16} className="text-violet-600" />
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">AI-Powered Insights</span>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  Insights and recommendations generated directly from your customer feedback.
                </p>

                <ul className="space-y-1.5">
                  {[
                    'Sentiment scoring per review',
                    'Weekly trend summaries',
                    'Smart reply suggestions'
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs text-gray-400">
                      <div className="w-1 h-1 rounded-full bg-violet-300 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  disabled
                  className="w-full mt-1 py-2 rounded-lg bg-violet-100 text-violet-400 text-xs font-semibold cursor-not-allowed"
                >
                  Notify me when available
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BusinessAdminDashboard;
