import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import StarRating from '../../components/StarRating';
import DevelopedByFooter from '../../components/DevelopedByFooter';
import { dataService } from '../../services/dataService';
import { Business } from '../../types';

const PublicReviewPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [business, setBusiness] = useState<Business | null>(null);
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const src = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get('src') || undefined;
    return v ? decodeURIComponent(v) : undefined;
  }, [location.search]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const b = await dataService.getBusinessBySlug(slug);
      setBusiness(b || null);
    })();

    // Reset state if navigating between slugs
    setRating(0);
    setLoading(false);
    setRedirecting(false);
    setEventId(null);
  }, [slug]);
  
  if (!business) return <div className="p-10 text-center">Loading business...</div>;
  
  const styleVars = {
    // used by tailwind arbitrary values
    ['--brand' as any]: business.theme.accentColor || '#2563eb',
    ['--page-bg' as any]: business.theme.pageBg || '#f8fafc',
    ['--card-bg' as any]: business.theme.cardBg || '#ffffff',
  };

  const handleRatingSubmit = async (stars: number) => {
    if (loading || redirecting) return;

    setRating(stars);
    setLoading(true);
    setSubmitError(null);

    let evt: Awaited<ReturnType<typeof dataService.addRatingEvent>>;
    try {
      evt = await dataService.addRatingEvent({
        businessId: business.id,
        stars,
        src,
        wasRedirected: stars >= business.thresholdRating,
      });
    } catch (err: unknown) {
      setLoading(false);
      setRating(0);
      setSubmitError((err as any)?.message ?? 'Something went wrong. Please try again.');
      return;
    }
    setEventId(evt.id);

    const SIMULATED_DELAY = 700;

    // Positive -> auto redirect to Google.
    if (stars >= business.thresholdRating) {
      window.setTimeout(() => {
        setRedirecting(true);
        window.setTimeout(() => {
          // leave site
          window.location.href = business.googleReviewUrl;
        }, 900);
      }, SIMULATED_DELAY);
      return;
    }

    // Negative -> internal feedback form.
    window.setTimeout(() => {
  const params = new URLSearchParams();
  params.set('rating', String(stars));

  if (evt.id) {
    params.set('eventId', evt.id);
  }

  if (src) {
    params.set('src', src);
  }

  navigate(`/r/${slug}/feedback?${params.toString()}`);
}, SIMULATED_DELAY);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-[var(--page-bg)]" style={styleVars as any}>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-8 animate-fade-in">
          <div className="space-y-2">
            <div className="w-16 h-16 bg-[color:color-mix(in_srgb,var(--brand)_16%,white)] text-[var(--brand)] rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
            <p className="text-gray-500">How was your experience with us today?</p>
          </div>

          <div className="flex justify-center py-4 min-h-[80px]">
            {(loading || redirecting) ? (
              <div className="flex flex-col items-center animate-fade-in">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand)] mb-4" />
                {redirecting && (
                  <p className="text-[var(--brand)] font-medium">Redirecting to Google Reviews...</p>
                )}
              </div>
            ) : (
              <StarRating rating={rating} onRatingChange={handleRatingSubmit} />
            )}
          </div>

          {submitError ? (
            <p className="text-xs text-red-500">{submitError}</p>
          ) : (
            <p className="text-xs text-gray-400">Your feedback helps us improve.</p>
          )}
        </div>
      </div>

      <DevelopedByFooter />
    </div>
  );
};

export default PublicReviewPage;
