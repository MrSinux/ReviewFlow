import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Mail } from 'lucide-react';
import DevelopedByFooter from '../../components/DevelopedByFooter';
import { readDb } from '../../services/demo/store';

// Demo-only: replies are kept here instead of being emailed. Each one is laid out like the email
// the send-feedback-reply Edge Function sends through Resend: the message, then the original feedback.
const DemoOutboxPage: React.FC = () => {
  const { replies, feedback, businesses } = useMemo(() => readDb(), []);
  const sorted = [...replies].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-6">
        <header className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Inbox size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Demo outbox</h1>
            <p className="text-sm text-slate-500">
              In demo mode replies are not emailed. This is what each customer would receive.
            </p>
          </div>
        </header>

        {sorted.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
            No replies yet. Sign in as the business admin and reply to feedback from the inbox.
          </div>
        )}

        {sorted.map((reply) => {
          const business = businesses.find((b) => b.id === reply.businessId);
          const original = feedback.find((f) => f.id === reply.feedbackId);
          return (
            <article key={reply.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 space-y-1 text-sm">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-base">
                  <Mail size={16} className="text-slate-400" />
                  {reply.subject}
                </div>
                <div className="text-slate-500">
                  <span className="text-slate-400">From</span> {business?.name ?? 'The business'}
                  <span className="text-slate-400"> · To</span> {reply.toEmail}
                </div>
                <div className="text-slate-400 text-xs">{new Date(reply.createdAt).toLocaleString()}</div>
              </div>
              <div className="px-6 py-5 text-[15px] leading-relaxed text-slate-800 whitespace-pre-line">
                {reply.body}
              </div>
              {original && (
                <div className="mx-6 mb-6 pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
                  <div className="font-semibold">Original feedback</div>
                  <div>
                    From: {original.name || 'Guest'} ({original.email || 'no email'})
                  </div>
                  <div>Rating: {original.rating}/5</div>
                  <div className="pt-1 whitespace-pre-line">{original.comment || '-'}</div>
                </div>
              )}
            </article>
          );
        })}

        <div className="text-center">
          <Link to="/login" className="text-sm text-blue-600 hover:underline">
            Back to the demo
          </Link>
        </div>
      </div>
      <DevelopedByFooter />
    </div>
  );
};

export default DemoOutboxPage;
