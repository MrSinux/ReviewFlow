import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Flag, Trash2, Mail, RefreshCw, X } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { isDemoMode, supabase } from '../../services/supabaseClient';
import { Business, Feedback, FeedbackStatus } from '../../types';

const Button: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  onClick?: () => void;
}> = ({ children, variant = 'secondary', disabled, onClick }) => {
  const base = 'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors';
  if (variant === 'primary') {
    return (
      <button
        disabled={disabled}
        onClick={onClick}
        className={`${base} bg-[var(--brand)] text-white hover:opacity-90 disabled:opacity-50`}
      >
        {children}
      </button>
    );
  }
  if (variant === 'ghost') {
    return (
      <button
        disabled={disabled}
        onClick={onClick}
        className={`${base} text-gray-600 hover:bg-gray-50 disabled:opacity-50`}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`${base} bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50`}
    >
      {children}
    </button>
  );
};

const Stars: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[...Array(5)].map((_, i) => (
      <span key={i} className={`text-xs ${i < rating ? 'text-yellow-400' : 'text-gray-200'}`}>
        ★
      </span>
    ))}
  </div>
);

const BusinessAdminFeedback: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [business, setBusiness] = useState<Business | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [filter, setFilter] = useState<'all' | 'new' | 'flagged' | 'resolved'>('all');
  const [srcFilter, setSrcFilter] = useState<string>('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [replyTo, setReplyTo] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySentOpen, setReplySentOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' } | null>(null);

  const showToast = (message: string) => {
    setToast({ message, type: 'error' });
    setTimeout(() => setToast(null), 3500);
  };
  
  useEffect(() => {
  if (!slug) return;

  (async () => {
    try {
      setLoading(true);
      const b = await dataService.getBusinessBySlug(slug);
      setBusiness(b);
    } finally {
      setLoading(false);
    }
  })();
}, [slug]);

useEffect(() => {
  if (!deleteModalOpen) return;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeDeleteModal();
    }
  };

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, [deleteModalOpen, deleting]);

useEffect(() => {
  if (!previewImage) return;
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setPreviewImage(null);
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, [previewImage]);

const loadFeedbacks = async (bizId: string, showSpinner = false) => {
  try {
    if (showSpinner) setLoading(true);

    const rows = await dataService.getFeedback(bizId);
    setFeedbacks(rows);
  } finally {
    if (showSpinner) setLoading(false);
  }
};

const refreshFeedbacks = async () => {
  if (!business?.id) return;

  try {
    setRefreshing(true);
    await loadFeedbacks(business.id, false);
  } finally {
    setRefreshing(false);
  }
};

useEffect(() => {
  if (!business?.id) return;
  loadFeedbacks(business.id, false);
}, [business?.id]);

useEffect(() => {
  // No realtime in demo mode (no Supabase client); the Refresh button reloads the list.
  if (!business?.id || !supabase) return;
  const client = supabase;

  const channel = client
    .channel(`feedback:${business.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'feedback',
        filter: `business_id=eq.${business.id}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as Record<string, any>;
          const incoming: Feedback = {
            id: row.id,
            businessId: row.business_id,
            rating: row.rating,
            comment: row.comment ?? '',
            answers: row.answers ?? undefined,
            name: row.name ?? undefined,
            email: row.email ?? undefined,
            photos: row.photos ?? undefined,
            ratingEventId: row.rating_event_id ?? undefined,
            src: row.src ?? undefined,
            createdAt: row.created_at,
            status: row.status as FeedbackStatus,
          };
          setFeedbacks((prev) =>
            prev.some((f) => f.id === incoming.id) ? prev : [incoming, ...prev]
          );
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as Record<string, any>;
          setFeedbacks((prev) =>
            prev.map((f) =>
              f.id === row.id ? { ...f, status: row.status as FeedbackStatus } : f
            )
          );
        } else if (payload.eventType === 'DELETE') {
          const row = payload.old as Record<string, any>;
          setFeedbacks((prev) => prev.filter((f) => f.id !== row.id));
        }
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}, [business?.id]);

  const styleVars = useMemo(() => {
    if (!business) return {};
    return {
      '--brand': business.theme.accentColor,
      '--card-bg': business.theme.cardBg || '#ffffff',
    } as React.CSSProperties;
  }, [business]);

  const unreadCount = useMemo(
    () => feedbacks.filter((f) => f.status === FeedbackStatus.NEW).length,
    [feedbacks]
  );

  const filteredFeedbacks = useMemo(() => {
    let result: Feedback[] = feedbacks;
    if (filter === 'new') result = result.filter((f: Feedback) => f.status === FeedbackStatus.NEW);
    else if (filter === 'flagged') result = result.filter((f: Feedback) => f.status === FeedbackStatus.FLAGGED);
    else if (filter === 'resolved') result = result.filter((f: Feedback) => f.status === FeedbackStatus.RESOLVED);
    if (srcFilter !== 'all') {
      result = srcFilter === '__direct__'
        ? result.filter((f: Feedback) => !f.src)
        : result.filter((f: Feedback) => f.src === srcFilter);
    }
    return result;
  }, [feedbacks, filter, srcFilter]);

  const selected = useMemo(
    () => feedbacks.find((f) => f.id === selectedId) || null,
    [feedbacks, selectedId]
  );

  useEffect(() => {
    if (!selected) return;
    // Prefill reply fields
    setReplyTo(selected.email ?? '');
    setReplySubject(business ? `A message from ${business.name}` : 'A message from us');
    setReplyBody('');

    // Auto-mark NEW -> REVIEWED when opened (keeps "New" count meaningful)
    if (selected.status !== FeedbackStatus.NEW) return;
    // Optimistic update first so badge and count drop instantly
    setFeedbacks((prev) => prev.map((f) => (f.id === selected.id ? { ...f, status: FeedbackStatus.REVIEWED } : f)));
    dataService.updateFeedbackStatus(selected.id, FeedbackStatus.REVIEWED);
  }, [selectedId]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const markAllRead = async () => {
    const toUpdate = feedbacks.filter((f) => f.status === FeedbackStatus.NEW);
    await Promise.all(toUpdate.map((f) => dataService.updateFeedbackStatus(f.id, FeedbackStatus.REVIEWED)));
    setFeedbacks((prev) => prev.map((f) => (f.status === FeedbackStatus.NEW ? { ...f, status: FeedbackStatus.REVIEWED } : f)));
  };


  const markResolved = async (id: string) => {
  const current = feedbacks.find((f) => f.id === id);
  if (!current) return;

  const nextStatus =
    current.status === FeedbackStatus.RESOLVED
      ? FeedbackStatus.REVIEWED
      : FeedbackStatus.RESOLVED;

  await dataService.updateFeedbackStatus(id, nextStatus);
  setFeedbacks((prev) =>
    prev.map((f) => (f.id === id ? { ...f, status: nextStatus } : f))
  );
};

const markFlagged = async (id: string) => {
  const current = feedbacks.find((f) => f.id === id);
  if (!current) return;

  const nextStatus =
    current.status === FeedbackStatus.FLAGGED
      ? FeedbackStatus.REVIEWED
      : FeedbackStatus.FLAGGED;

  await dataService.updateFeedbackStatus(id, nextStatus);
  setFeedbacks((prev) =>
    prev.map((f) => (f.id === id ? { ...f, status: nextStatus } : f))
  );
};
  
  const sendReply = async () => {
    if (!selected || !business) return;
    const to = replyTo.trim();
    const body = replyBody.trim();
    if (!to) {
      showToast('Please enter a recipient email.');
      return;
    }
    if (!body) {
      showToast('Please type a reply message.');
      return;
    }
    setSendingReply(true);
    try {
      await dataService.sendFeedbackReply({
        feedbackId: selected.id,
        businessId: business.id,
        toEmail: to,
        subject: replySubject?.trim() || undefined,
        body,
      });
      setReplySentOpen(true);
      setReplyBody('');
    }
    catch (e: any) {
      showToast(e?.message ?? 'Failed to send reply');
    }
    finally {
      setSendingReply(false);
    }
  };
  
  const openDeleteModal = (id: string) => {
  setDeleteTargetId(id);
  setDeleteModalOpen(true);
};

const closeDeleteModal = () => {
  if (deleting) return;
  setDeleteModalOpen(false);
  setDeleteTargetId(null);
};

const confirmDelete = async () => {
  if (!deleteTargetId) return;

  try {
    setDeleting(true);

    await dataService.deleteFeedback(deleteTargetId);

    setFeedbacks((prev) => prev.filter((f) => f.id !== deleteTargetId));

    if (selectedId === deleteTargetId) {
      setSelectedId(null);
    }

    closeDeleteModal();
  } finally {
    setDeleting(false);
  }
};

  if (loading) {
    return <div className="p-8 text-sm text-gray-500">Loading inbox...</div>;
  }
  
  if (!business) {
    return <div className="p-8 text-sm text-gray-500">Loading inbox...</div>;
  }
  const entryPointLabel = (src?: string): string => {
    if (!src) return 'Direct link';
    const ep = business?.entryPoints?.find((e: { src: string; label: string }) => e.src === src);
    return ep ? ep.label : src;
  };

  const formatFeedbackSource = (src?: string) => {
    return `Source: ${entryPointLabel(src)}`;
  };

  const hasDirectFeedback = feedbacks.some((f: Feedback) => !f.src);
  const activeSrcValues = [...new Set(feedbacks.map((f: Feedback) => f.src).filter(Boolean))] as string[];

  return (
    <div
      style={styleVars as any}
      className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] flex gap-6 relative animate-fade-in"
    >
      {/* Error toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-red-600 text-white animate-fade-in">
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-1 opacity-75 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}
      
      {/* Reply sent popup */}
      {replySentOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setReplySentOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Reply sent!</h3>
              <p className="mt-2 text-sm text-slate-500">
                {isDemoMode
                  ? 'In demo mode nothing is emailed; the reply is kept in the demo outbox.'
                  : "Your reply has been delivered to the customer's inbox."}
              </p>
            </div>
            <div className="px-6 py-4">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">
                {isDemoMode ? 'The reply was saved to the demo outbox.' : 'The email was sent successfully.'}
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              {isDemoMode && (
                <Link
                  to="/demo/outbox"
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Open outbox
                </Link>
              )}
              <button
                type="button"
                onClick={() => setReplySentOpen(false)}
                className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {/* List */}
      <div
        className={`${selected ? 'hidden lg:flex lg:w-1/3' : 'w-full'} bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col transition-all duration-300`}
      >
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="font-medium text-gray-700 flex justify-between items-center mb-3">
            <span>Feedback Inbox</span>
            <span className="bg-blue-100 text-gray-700 text-xs px-2 py-1 rounded-full">{unreadCount} New</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value as any)}
              className="px-3 py-2 rounded-lg text-xs border border-gray-200 bg-white text-gray-700"
              aria-label="Filter feedback"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="flagged">Flagged</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              value={srcFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSrcFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs border border-gray-200 bg-white text-gray-700"
              aria-label="Filter by source"
            >
              <option value="all">All Sources</option>
              {activeSrcValues.map((src) => (
                <option key={src} value={src}>
                  {entryPointLabel(src)}
                </option>
              ))}
              {hasDirectFeedback && <option value="__direct__">Direct link</option>}
            </select>
            {selectedIds.size > 0 && (
              <Button variant="ghost" onClick={clearSelection}>
                Clear ({selectedIds.size})
              </Button>
            )}
            {!selected && (
              <div className="ml-auto flex items-center gap-2">
                <Button variant="secondary" onClick={markAllRead}>
                  Mark as read
                </Button>
                <Button
                  variant="secondary"
                  onClick={refreshFeedbacks}
                  disabled={refreshing || loading}
                >
                  <RefreshCw
                    size={14}
                    className={refreshing ? 'animate-spin' : ''}
                  />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto divide-y">
          {filteredFeedbacks.length === 0 && <div className="p-10 text-center text-gray-400">No feedback yet.</div>}

          {filteredFeedbacks.map((f) => {
            const isActive = f.id === selectedId;
            const isChecked = selectedIds.has(f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedId(f.id === selectedId ? null : f.id)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${isActive ? 'bg-[color:color-mix(in_srgb,var(--brand)_8%,white)]' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {!selectedId && (
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={isChecked}
                      onChange={() => toggleSelect(f.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-gray-900 truncate">{f.name || 'Anonymous'}</div>
                      {f.status === FeedbackStatus.NEW && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-blue-600 text-white">NEW</span>
                      )}
                      {f.status === FeedbackStatus.FLAGGED && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-900">FLAGGED</span>
                      )}
                      {f.status === FeedbackStatus.RESOLVED && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-900">RESOLVED</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <Stars rating={f.rating} />
                      <span className="text-xs text-gray-400">{new Date(f.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 line-clamp-2">{f.comment}</div>
                  </div>
                  {/* <div className="text-xs text-slate-400 mt-1">
  {formatFeedbackSource(f.src)}
</div> */}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Detail */}
      {selected && (
        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-3 border-b border-gray-100 space-y-2.5">
            {/* Row 1: Avatar + Name/Email + Close */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--brand)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {(selected.name || 'G').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate text-sm sm:text-base">{selected.name || 'Guest'}</div>
                  <div className="text-xs text-gray-500 truncate">{selected.email || 'No email provided'}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            {/* Row 2: Action buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <Button variant="secondary" onClick={markAllRead}>
                <Mail size={14} />
                <span className="hidden sm:inline">Mark as read</span>
              </Button>
              <Button variant="secondary" onClick={refreshFeedbacks} disabled={refreshing || loading}>
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
              </Button>
              <Button variant="secondary" onClick={() => markResolved(selected.id)}>
                <CheckCircle size={14} />
                <span className="hidden sm:inline">{selected.status === FeedbackStatus.RESOLVED ? 'Unresolve' : 'Resolve'}</span>
              </Button>
              <Button variant="secondary" onClick={() => markFlagged(selected.id)}>
                <Flag size={14} />
                <span className="hidden sm:inline">{selected.status === FeedbackStatus.FLAGGED ? 'Unflag' : 'Flag'}</span>
              </Button>
              <Button variant="secondary" onClick={() => openDeleteModal(selected.id)}>
                <Trash2 size={14} />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <Stars rating={selected.rating} />
              <div className="text-xs text-gray-400">{new Date(selected.createdAt).toLocaleString()}</div>
            </div>

            <div className="text-gray-800 whitespace-pre-wrap">{selected.comment}</div>
            <div className="text-sm text-slate-500 mt-2">
  {formatFeedbackSource(selected.src)}
</div>
            {selected.answers && Object.keys(selected.answers).length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-gray-800">Answers</div>
                <div className="space-y-2">
                  {Object.entries(selected.answers).map(([qid, vals]) => (
                    <div key={qid} className="text-sm text-gray-700">
                      <span className="font-medium">
                        {business.feedbackQuestions?.find((q) => q.id === qid)?.question || qid}
                      </span>:{' '}
                      {/* Free-text answers are stored as a string, choice answers as a list. */}
                      <span className="text-gray-600">{(Array.isArray(vals) ? vals.join(', ') : String(vals ?? '')) || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.photos && selected.photos.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-gray-800">Photos</div>
                <div className="flex flex-wrap gap-2">
                  {selected.photos.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPreviewImage(p)}
                      className="w-24 h-24 rounded-lg overflow-hidden border hover:opacity-90 transition-opacity cursor-zoom-in"
                    >
                      <img src={p} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-[color:color-mix(in_srgb,var(--brand)_7%,white)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Mail size={16} /> Reply to Customer
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                This will be sent via email{replyTo ? ` to ${replyTo}` : ''}.
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2">
                <label className="text-xs text-gray-600">To</label>
                <input
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="customer@email.com"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                />

                <label className="text-xs text-gray-600 mt-2">Subject</label>
                <input
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  placeholder="A message from us"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                />

                <label className="text-xs text-gray-600 mt-2">Message</label>
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Type your response here..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm resize-y"
                />

                <div className="mt-2 flex justify-end">
                  <Button
                    variant="primary"
                    disabled={sendingReply || !replyTo.trim() || !replyBody.trim()}
                    onClick={sendReply}
                  >
                    {sendingReply ? 'Sending...' : 'Send Reply'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
              alt="Preview"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              aria-label="Close preview"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      {deleteModalOpen && (
        <div
  className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
  onClick={closeDeleteModal}
>
<div
  className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
  onClick={(e) => e.stopPropagation()}
>
      <div className="px-6 py-5 border-b border-slate-100">
        <h3 className="text-xl font-bold text-slate-900">Delete feedback?</h3>
        <p className="mt-2 text-sm text-slate-500">
          This action will permanently remove this feedback from the inbox.
        </p>
      </div>

      <div className="px-6 py-4">
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          This cannot be undone.
        </div>
      </div>

      <div className="px-6 pb-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={closeDeleteModal}
          disabled={deleting}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={confirmDelete}
          disabled={deleting}
          className="px-4 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default BusinessAdminFeedback;
