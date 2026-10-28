import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataService } from '../../services/dataService';
import { authService } from '../../services/authService';
import { Business, FeedbackQuestion } from '../../types';

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-[var(--card-bg)] rounded-xl border border-gray-100 shadow-sm ${className}`}>
    {children}
  </div>
);

const Button: React.FC<{
  children: React.ReactNode;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  onClick?: () => void;
}> = ({ children, type = 'button', variant = 'primary', disabled, onClick }) => {
  const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors';
  const cls = variant === 'primary'
    ? 'bg-[var(--brand)] text-white hover:opacity-90'
    : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${cls} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {children}
    </button>
  );
};

const QuestionBuilder: React.FC<{
  value: FeedbackQuestion[];
  onChange: (v: FeedbackQuestion[]) => void;
}> = ({ value, onChange }) => {
  const questions = value || [];

  const addQuestion = () => {
    onChange([
      ...questions,
      {
        id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`),
        question: '',
        type: 'single',
        options: [''],
      },
    ]);
  };

  const removeQuestion = (id: string) => onChange(questions.filter((q) => q.id !== id));

  const updateQuestion = (id: string, patch: Partial<FeedbackQuestion>) => {
    onChange(
      questions.map((q) => {
        if (q.id !== id) return q;
        const next: FeedbackQuestion = { ...q, ...patch };

        // Free text => no options
        if (next.type === 'text') next.options = [];

        // Choice questions must have at least 1 option row
        if ((next.type === 'single' || next.type === 'multi') && (!next.options || next.options.length === 0)) {
          next.options = [''];
        }

        return next;
      })
    );
  };

  const addOption = (qid: string) => {
    onChange(questions.map((q) => (q.id === qid ? { ...q, options: [...q.options, ''] } : q)));
  };

  const updateOption = (qid: string, idx: number, value: string) => {
    onChange(
      questions.map((q) => {
        if (q.id !== qid) return q;
        const options = [...q.options];
        options[idx] = value;
        return { ...q, options };
      })
    );
  };

  const removeOption = (qid: string, idx: number) => {
    onChange(
      questions.map((q) => {
        if (q.id !== qid) return q;
        const options = q.options.filter((_, i) => i !== idx);
        if ((q.type === 'single' || q.type === 'multi') && options.length === 0) options.push('');
        return { ...q, options };
      })
    );
  };

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <div key={q.id} className="border border-gray-200 rounded-2xl bg-white p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Question</label>
              <input
                className="w-full mt-1 px-3 py-2 border rounded-lg"
                value={q.question}
                placeholder="e.g. Did you dine in, take away or get delivery?"
                onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Type</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-white"
                value={q.type}
                onChange={(e) => updateQuestion(q.id, { type: e.target.value as FeedbackQuestion['type'] })}
              >
                <option value="single">Single choice</option>
                <option value="multi">Multiple choice</option>
                <option value="text">Free text</option>
              </select>
            </div>
          </div>

          {(q.type === 'single' || q.type === 'multi') && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Options</div>
              <div className="mt-2 space-y-2">
                {q.options.map((opt, idx) => (
                  <div key={`${q.id}-${idx}`} className="flex items-center gap-2">
                    <div className="text-gray-400 select-none">•</div>
                    <input
                      className="flex-1 px-3 py-2 border rounded-lg"
                      value={opt}
                      placeholder={`Option ${idx + 1}`}
                      onChange={(e) => updateOption(q.id, idx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addOption(q.id);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="p-2 text-gray-400 hover:text-red-600"
                      onClick={() => removeOption(q.id, idx)}
                      title="Remove option"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-semibold"
                onClick={() => addOption(q.id)}
              >
                + Add option
              </button>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-red-600 font-semibold flex items-center gap-2"
              onClick={() => removeQuestion(q.id)}
            >
              🗑️ Remove question
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold"
      >
        Add Question
      </button>
    </div>
  );
};

const BusinessAdminSettings: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuper, setIsSuper] = useState(false);

  const [draftQuestions, setDraftQuestions] = useState<FeedbackQuestion[]>([]);
  const [draft, setDraft] = useState(() => ({
    name: '',
    thresholdRating: 4,
    googleReviewUrl: '',
    redirectUrl: '',
    theme: {
      accentColor: '#2563eb',
      pageBg: '#f8fafc',
      adminBg: '#f1f5f9',
      cardBg: '#ffffff',
    },
  }));

  const [saved, setSaved] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const b = await dataService.getBusinessBySlug(slug);
      setBusiness(b);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    (async () => {
      try {
        const session = await authService.getCurrentSession();
        setIsSuper(session?.profile.role === 'super');
      } catch {
        setIsSuper(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!business) return;
    setDraftQuestions(business.feedbackQuestions || []);
    setDraft({
      name: business.name,
      thresholdRating: business.thresholdRating,
      googleReviewUrl: business.googleReviewUrl,
      redirectUrl: business.redirectUrl || '',
      theme: {
        accentColor: business.theme.accentColor,
        pageBg: business.theme.pageBg || '#f8fafc',
        adminBg: business.theme.adminBg || business.theme.pageBg || '#f1f5f9',
        cardBg: business.theme.cardBg || '#ffffff',
      },
    });
  }, [business?.id]);

  const styleVars = useMemo(() => {
    if (!business) return {};
    return {
      '--brand': business.theme.accentColor,
      '--card-bg': business.theme.cardBg || '#ffffff',
    } as React.CSSProperties;
  }, [business]);

  useEffect(() => {
    if (!saveModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSaveModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saveModalOpen, saving]);

  const closeSaveModal = () => {
    if (saving) return;
    setSaveModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!business) return;
    try {
      setDeleting(true);
      await dataService.deleteBusiness(business.id);
      navigate('/super');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-8 text-sm text-gray-500">Loading settings...</div>;
  if (!business) return <div className="p-8 text-sm text-gray-500">Loading settings...</div>;
  
  const handleCopyGoogleLink = async () => {
    const text = (draft.googleReviewUrl ?? '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1200);
    } catch {
      // Fallback for older browsers / non-secure contexts
      window.prompt('Copy Google Review Link:', text);
    }
  };
  const handleCopyRedirectLink = async () => {
  const text = draft.redirectUrl;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const temp = document.createElement('textarea');
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
  }
};
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveModalOpen(true);
  };

  const confirmSave = async () => {
    if (!business) return;
    try {
      setSaving(true);
      const next: Business = {
        ...business,
        name: isSuper ? draft.name : business.name,
        thresholdRating: Number(draft.thresholdRating),
        googleReviewUrl: isSuper ? draft.googleReviewUrl : business.googleReviewUrl,
        redirectUrl: draft.redirectUrl,
        feedbackQuestions: draftQuestions,
        theme: isSuper ? {
          accentColor: draft.theme.accentColor,
          pageBg: draft.theme.pageBg,
          adminBg: draft.theme.adminBg,
          cardBg: draft.theme.cardBg,
          logoUrl: business.theme.logoUrl,
        } : business.theme,
      };
      await dataService.saveBusiness(next);
      setBusiness(next);
      setSaveModalOpen(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in" style={styleVars as any}>
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">Configure how the routing works.</p>
      </div>

      <Card className="p-4 lg:p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input
              value={draft.name}
              readOnly={!isSuper}
              onChange={(e) => {
                if (!isSuper) return;
                setDraft(prev => ({ ...prev, name: e.target.value }));
              }}
              className={`w-full p-2 border rounded-lg bg-gray-50 ${!isSuper ? 'cursor-not-allowed opacity-80' : ''}`}
            />
            {!isSuper && (
              <p className="text-xs text-gray-400 mt-1">Only super admin can change the business name.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Routing Threshold</label>
            <div className="p-4 bg-[color:color-mix(in_srgb,var(--brand)_10%,white)] rounded-lg border border-[color:color-mix(in_srgb,var(--brand)_20%,white)] mb-2">
              <p className="text-sm text-blue-800 mb-2">
                If a customer rates <strong>{draft.thresholdRating} stars or higher</strong>, they are <strong>automatically redirected</strong> to Google.
                <br />Otherwise, they stay here for internal feedback.
              </p>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={draft.thresholdRating}
                className="w-full accent-[var(--brand)]"
                onChange={(e) => setDraft(prev => ({ ...prev, thresholdRating: Number(e.target.value) }))}
              />
              <div className="text-right font-bold text-[var(--brand)] mt-1">{draft.thresholdRating} Stars</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Review Link</label>
            <div className="flex items-stretch gap-2">
              <input
                value={draft.googleReviewUrl}
                readOnly={!isSuper}
                onChange={(e) => {
                  if (!isSuper) return;
                  setDraft(prev => ({ ...prev, googleReviewUrl: e.target.value }));
                }}
                className={`flex-1 p-2 border rounded-lg bg-gray-50 font-mono text-xs ${!isSuper ? 'cursor-not-allowed opacity-80' : ''}`}
                placeholder="https://search.google.com/local/writereview?..."
              />
              <button
                type="button"
                onClick={handleCopyGoogleLink}
                disabled={!draft.googleReviewUrl}
                className="px-3 rounded-lg border bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                title="Copy link"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Direct link to the review page.</p>
            {/* {!isSuper && (
              <p className="text-xs text-gray-400 mt-1">Only super admin can change this link.</p>
            )} */}
          </div>
          
          <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
  <div className="flex items-stretch gap-2">
    <input
      value={draft.redirectUrl || ''}
      readOnly={!isSuper}
      onChange={(e) => {
        if (!isSuper) return;
        setDraft(prev => ({ ...prev, redirectUrl: e.target.value }));
      }}
      className={`flex-1 p-2 border rounded-lg bg-gray-50 font-mono text-xs ${
        !isSuper ? 'cursor-not-allowed opacity-80' : ''
      }`}
      placeholder="https://yourbusiness.com"
    />
    <button
      type="button"
      onClick={handleCopyRedirectLink}
      disabled={!draft.redirectUrl}
      className="px-3 rounded-lg border bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      title="Copy link"
    >
      Copy
    </button>
  </div>
  <p className="text-xs text-gray-400 mt-1">
    Used when customers click Cancel, the close (X), or Done.
  </p>
  {/* {!isSuper && (
    <p className="text-xs text-gray-400 mt-1">
      Only super admin can change this link.
    </p>
  )} */}
</div>
          
          {isSuper && (
            <div className="pt-2">
              <div className="text-sm font-semibold text-gray-800 mb-2">Theme</div>
              <p className="text-xs text-gray-500 mb-3">These settings apply to both the customer flow and this dashboard.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand / Accent</label>
                <input
                  type="color"
                  value={draft.theme.accentColor}
                  onChange={(e) => setDraft(prev => ({ ...prev, theme: { ...prev.theme, accentColor: e.target.value } }))}
                  className="w-full h-11 p-1 border rounded-lg bg-white"
                />
                <p className="text-xs text-gray-400 mt-1">Buttons, highlights.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Background</label>
                <input
                  type="color"
                  value={draft.theme.pageBg}
                  onChange={(e) => setDraft(prev => ({ ...prev, theme: { ...prev.theme, pageBg: e.target.value } }))}
                  className="w-full h-11 p-1 border rounded-lg bg-white"
                />
                <p className="text-xs text-gray-400 mt-1">Customer landing background.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dashboard Background</label>
                <input
                  type="color"
                  value={draft.theme.adminBg}
                  onChange={(e) => setDraft(prev => ({ ...prev, theme: { ...prev.theme, adminBg: e.target.value } }))}
                  className="w-full h-11 p-1 border rounded-lg bg-white"
                />
                <p className="text-xs text-gray-400 mt-1">Main app background.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Background</label>
                <input
                  type="color"
                  value={draft.theme.cardBg}
                  onChange={(e) => setDraft(prev => ({ ...prev, theme: { ...prev.theme, cardBg: e.target.value } }))}
                  className="w-full h-11 p-1 border rounded-lg bg-white"
                />
                <p className="text-xs text-gray-400 mt-1">Panels and cards.</p>
              </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <div className="text-sm font-semibold text-gray-800 mb-2">Low-rating Questions</div>
            <p className="text-xs text-gray-500 mb-3">Configure questions shown when a customer rates below your threshold.</p>
            <QuestionBuilder value={draftQuestions} onChange={setDraftQuestions} />
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <div>
              {isSuper && (
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Delete Business
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {saved && <span className="text-xs text-green-600 font-medium">Saved</span>}
              <Button type="submit">Save Changes</Button>
            </div>
          </div>
        </form>
      </Card>

      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { if (!deleting) setDeleteModalOpen(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-red-700">Delete Business?</h3>
              <p className="mt-2 text-sm text-slate-500">
                This will permanently delete <strong>{business?.name}</strong> and all associated data — feedback, rating events, replies, and user profiles.
              </p>
            </div>
            <div className="px-6 py-4">
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                This action cannot be undone.
              </div>
            </div>
            <div className="px-6 pb-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
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
                {deleting ? 'Deleting...' : 'Yes, Delete Business'}
              </button>
            </div>
          </div>
        </div>
      )}

      {saveModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeSaveModal}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Save changes?</h3>
              <p className="mt-2 text-sm text-slate-500">
                Your settings will be updated and applied immediately.
              </p>
            </div>

            <div className="px-6 py-4">
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
                This will update the configuration for this business.
              </div>
            </div>

            <div className="px-6 pb-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeSaveModal}
                disabled={saving}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmSave}
                disabled={saving}
                className="px-4 py-2.5 rounded-lg bg-[var(--brand)] text-white font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessAdminSettings;
