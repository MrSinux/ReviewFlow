import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import DevelopedByFooter from '../../components/DevelopedByFooter';
import { dataService } from '../../services/dataService';
import type { Business } from '../../types';

// Demo-only stand-in for a business's Google review form, so the demo never sends
// visitors to a real Google Business Profile.
const DemoGoogleReviewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('business') ?? '';
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    if (!slug) return;
    dataService.getBusinessBySlug(slug).then(setBusiness);
  }, [slug]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-10 text-center space-y-5">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <ExternalLink size={30} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Google review</h1>
          <p className="text-gray-500">
            Happy customers were redirected here, to the Google review form for{' '}
            <strong>{business?.name ?? 'the business'}</strong>. In the demo this page stands in for Google.
          </p>
          {slug && (
            <Link
              to={`/r/${slug}`}
              className="inline-block px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50"
            >
              Back to the review page
            </Link>
          )}
        </div>
      </div>
      <DevelopedByFooter />
    </div>
  );
};

export default DemoGoogleReviewPage;
