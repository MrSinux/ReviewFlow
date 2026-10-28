import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import DevelopedByFooter from '../../components/DevelopedByFooter';
import { dataService } from '../../services/dataService';
import { Business } from '../../types';

const ThankYouPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const b = await dataService.getBusinessBySlug(slug);
      setBusiness(b || null);
    })();
  }, [slug]);

  const styleVars = useMemo(() => {
    if (!business) return {};
    return {
      '--brand': business.theme.accentColor,
      '--page-bg': business.theme.pageBg || '#f8fafc',
      '--card-bg': business.theme.cardBg || '#ffffff',
    } as React.CSSProperties;
  }, [business]);

  if (!business) return null;

  const exitToRedirect = () => {
    const url = business.redirectUrl || business.googleReviewUrl || `/r/${business.slug}`;
    window.location.href = url;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--page-bg)]" style={styleVars as any}>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-12 text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 bg-[color:color-mix(in_srgb,var(--brand)_16%,white)] text-[var(--brand)] rounded-full flex items-center justify-center mx-auto">
            <Send size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Thank You</h2>
            <p className="text-gray-500 mt-2">Your feedback has been shared with us.</p>
          </div>
          <button
            type="button"
            onClick={exitToRedirect}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
      <DevelopedByFooter />
    </div>
  );
};

export default ThankYouPage;
