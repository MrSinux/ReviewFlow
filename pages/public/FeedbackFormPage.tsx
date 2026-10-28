import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Eye, ShieldCheck, Trash2, X } from 'lucide-react';
import StarRating from '../../components/StarRating';
import DevelopedByFooter from '../../components/DevelopedByFooter';
import { dataService } from '../../services/dataService';
import { Business } from '../../types';

const Chip: React.FC<{ label: string; selected: boolean; onClick: () => void }> = ({
  label,
  selected,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
      selected
        ? 'bg-[color:color-mix(in_srgb,var(--brand)_12%,white)] border-[var(--brand)] text-[var(--brand)]'
        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
    }`}
  >
    {label}
  </button>
);

const Button: React.FC<{
  children: React.ReactNode;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  onClick?: () => void;
}> = ({ children, type = 'button', variant = 'primary', disabled, onClick }) => {
  const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors';
  const styles =
    variant === 'primary'
      ? 'bg-[var(--brand)] text-white hover:opacity-95 disabled:opacity-50'
      : variant === 'secondary'
        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
        : 'bg-transparent text-gray-600 hover:bg-gray-100 disabled:opacity-50';

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
};

const FeedbackFormPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const ratingFromUrl = Number(searchParams.get('rating') || '0');
  const eventId = searchParams.get('eventId') || '';
  const srcFromUrl = searchParams.get('src') || '';
  const [business, setBusiness] = useState<Business | null>(null);
  const [rating, setRating] = useState<number>(ratingFromUrl);
  const [loading, setLoading] = useState(false);

  const [comment, setComment] = useState('');
  const [answers, setAnswers] = useState<Record<string, string[] | string>>({});
  const [contactInfo, setContactInfo] = useState({ name: '', email: '' });
  const [emailError, setEmailError] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const b = await dataService.getBusinessBySlug(slug);
      setBusiness(b || null);
    })();
  }, [slug]);

  useEffect(() => {
    setRating(ratingFromUrl);
  }, [ratingFromUrl]);

  useEffect(() => {
    if (!previewImage) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewImage(null);
        setPreviewIndex(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewImage]);

  const styleVars = useMemo(() => {
    const b = business;
    return {
      '--brand': b?.theme?.accentColor || '#2563eb',
      '--page-bg': b?.theme?.pageBg || '#f8fafc',
      '--card-bg': b?.theme?.cardBg || '#ffffff',
    } as React.CSSProperties;
  }, [business]);

  const exitToRedirect = () => {
    if (!business) return;
    const url = business.redirectUrl || business.googleReviewUrl || `/r/${business.slug}`;
    window.location.href = url;
  };

  const toggleAnswer = (qid: string, opt: string, type: 'single' | 'multi') => {
    setAnswers((prev) => {
      const current = (Array.isArray(prev[qid]) ? (prev[qid] as string[]) : []) as string[];

      if (type === 'single') {
        return { ...prev, [qid]: current.includes(opt) ? [] : [opt] };
      }

      return {
        ...prev,
        [qid]: current.includes(opt) ? current.filter((x) => x !== opt) : [...current, opt],
      };
    });
  };

  const setTextAnswer = (qid: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: text }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from<File>(e.target.files ?? []);
    if (fileList.length === 0) return;

    const remainingSlots = 3 - photos.length;
    if (remainingSlots <= 0) {
      e.target.value = '';
      return;
    }

    const filesToProcess = fileList.slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const openPreview = (image: string, index: number) => {
    setPreviewImage(image);
    setPreviewIndex(index);
  };

  const closePreview = () => {
    setPreviewImage(null);
    setPreviewIndex(null);
  };

  const deletePreviewImage = () => {
    if (previewIndex === null) return;

    setPhotos((prev) => prev.filter((_, i) => i !== previewIndex));
    closePreview();
  };


  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!business || loading) return;

  if (contactInfo.email && !isValidEmail(contactInfo.email)) {
    setEmailError('Please enter a valid email address.');
    return;
  }

  setLoading(true);

  await dataService.addFeedback({
    businessId: business.id,
    rating,
    comment,
    answers: answers as Record<string, string[]>,
    name: contactInfo.name,
    email: contactInfo.email,
    photos,
    ratingEventId: eventId || undefined,
    src: srcFromUrl || undefined,
  });

  window.setTimeout(() => {
    setLoading(false);
    navigate(`/r/${slug}/thanks`);
  }, 700);
};
  
  if (!business) return null;


  return (
    <div
      className="min-h-screen flex flex-col bg-[var(--page-bg)]"
      style={styleVars}
    >
      <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-[480px] w-full bg-white rounded-xl shadow-lg overflow-hidden animate-slide-up">
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          <h1 className="text-lg font-medium text-gray-800">{business.name}</h1>
          <button
            type="button"
            onClick={exitToRedirect}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-3 pt-1">
              <div className="flex justify-center">
                <StarRating rating={rating} interactive={false} />
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-gray-900">How can we improve?</h2>
                <p className="mt-2 text-sm text-gray-500 max-w-md">
                  We&apos;re sorry to hear your experience wasn&apos;t great. Your feedback helps us
                  do better.
                </p>
              </div>
            </div>

            <div>
              <textarea
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[var(--brand)] focus:border-[var(--brand)] outline-none min-h-[140px] text-gray-800 placeholder-gray-500 resize-none text-base"
                placeholder="Share details of your own experience at this place"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="w-full py-3 border border-gray-300 rounded-lg flex items-center justify-center gap-2 text-[var(--brand)] font-medium hover:bg-gray-50 transition-colors cursor-pointer">
                <Eye size={20} />
                Add photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
              
              {photos.length > 0 && (
  <div className="flex gap-3 flex-wrap">
    {photos.map((p, i) => (
      <div
        key={i}
        className="relative w-36 h-36 rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm"
      >
        <button
          type="button"
          onClick={() => openPreview(p, i)}
          className="absolute inset-0 w-full h-full"
          aria-label={`Preview uploaded photo ${i + 1}`}
        >
          <img
            src={p}
            alt={`Uploaded photo ${i + 1}`}
            className="w-full h-full object-cover"
          />
        </button>

        <div className="absolute top-2 left-2 z-10">
          <button
            type="button"
            onClick={() => openPreview(p, i)}
            className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow flex items-center justify-center"
            aria-label={`Open preview for uploaded photo ${i + 1}`}
          >
            <Eye size={14} />
          </button>
        </div>

        <div className="absolute top-2 right-2 z-10">
          <button
            type="button"
            onClick={() => {
              setPhotos((prev) => prev.filter((_, index) => index !== i));
              if (previewIndex === i) {
                closePreview();
              }
            }}
            className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow flex items-center justify-center"
            aria-label={`Remove uploaded photo ${i + 1}`}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    ))}
  </div>
)}
            </div>

            <div className="space-y-4 pt-2">
              {(business.feedbackQuestions || []).map((q) => {
                const val = answers[q.id];
                const selected = Array.isArray(val) ? val : [];
                const textVal = typeof val === 'string' ? val : '';

                return (
                  <div key={q.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {q.question}
                    </label>

                    {q.type === 'text' ? (
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[var(--brand)] focus:border-[var(--brand)] outline-none text-gray-800 placeholder-gray-500"
                        placeholder="Type your answer..."
                        value={textVal}
                        onChange={(e) => setTextAnswer(q.id, e.target.value)}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((opt) => (
                          <Chip
                            key={opt}
                            label={opt}
                            selected={selected.includes(opt)}
                            onClick={() => toggleAnswer(q.id, opt, q.type as 'single' | 'multi')}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3 mt-4 border border-gray-200">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <ShieldCheck size={16} className="text-green-600" />
                <span>Contact Information</span>
                <span className="text-red-500 ml-auto text-xs">* Required</span>
              </div>

              <p className="text-xs text-gray-500">
                To maintain the integrity of our feedback and prevent fake reviews, please verify
                your details.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  type="text"
                  placeholder="Name"
                  className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[var(--brand)]"
                  value={contactInfo.name}
                  onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                />
                <div className="flex flex-col gap-1">
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    className={`w-full p-2 border rounded-md text-sm outline-none focus:border-[var(--brand)] ${emailError ? 'border-red-400' : 'border-gray-300'}`}
                    value={contactInfo.email}
                    onChange={(e) => {
                      setContactInfo({ ...contactInfo, email: e.target.value });
                      if (emailError) setEmailError('');
                    }}
                    onBlur={() => {
                      if (contactInfo.email && !isValidEmail(contactInfo.email)) {
                        setEmailError('Invalid email address.');
                      } else {
                        setEmailError('');
                      }
                    }}
                  />
                  {emailError && (
                    <p className="text-xs text-red-500">{emailError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-white sticky bottom-0">
            <Button variant="secondary" onClick={exitToRedirect}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      </div>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={closePreview}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closePreview}
              className="absolute top-3 right-3 z-10 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow"
              aria-label="Close image preview"
            >
              <X size={18} />
            </button>

            <div className="absolute top-3 left-3 z-10">
              <button
                type="button"
                onClick={deletePreviewImage}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-2 shadow"
              >
                <Trash2 size={16} />
                Delete photo
              </button>
            </div>

            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      <DevelopedByFooter />
    </div>
  );
};

export default FeedbackFormPage;