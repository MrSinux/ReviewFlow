import { requireSupabase, supabaseUrlOrEmpty } from '../supabaseClient';
import { generateId } from '../ids';
import type { Business, Feedback, RatingEvent } from '../../types';
import { FeedbackStatus } from '../../types';
import type { DataService } from '../serviceTypes';

const db = requireSupabase;

// --- Mapping helpers (DB snake_case -> app camelCase) ---
const mapBusiness = (row: any): Business => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  status: row.status ?? 'Active',
  timezone: row.timezone,
  thresholdRating: row.threshold_rating,
  googleReviewUrl: row.google_review_url,
  redirectUrl: row.redirect_url ?? undefined,
  entryPoints: row.entry_points ?? [],
  feedbackQuestions: row.feedback_questions ?? [],
  theme: row.theme ?? { accentColor: '#3b82f6', pageBg: '#f8fafc', adminBg: '#f1f5f9', cardBg: '#ffffff' },
  contactSettings: row.contact_settings ?? { enabled: false },
  createdAt: row.created_at,
  updatedAt: row.updated_at ?? undefined,
});

const unmapBusiness = (b: Business) => ({
  id: b.id,
  name: b.name,
  slug: b.slug,
  status: b.status ?? 'Active',
  timezone: b.timezone,
  threshold_rating: b.thresholdRating,
  google_review_url: b.googleReviewUrl,
  redirect_url: b.redirectUrl ?? null,
  entry_points: b.entryPoints ?? [],
  feedback_questions: b.feedbackQuestions ?? [],
  theme: b.theme,
  contact_settings: b.contactSettings,
});

const mapFeedback = (row: any): Feedback => ({
  id: row.id,
  businessId: row.business_id,
  rating: row.rating,
  comment: row.comment,
  answers: row.answers ?? undefined,
  name: row.name ?? undefined,
  email: row.email ?? undefined,
  photos: row.photos ?? undefined,
  ratingEventId: row.rating_event_id ?? undefined,
  src: row.src ?? undefined,
  createdAt: row.created_at,
  status: row.status as FeedbackStatus,
});

const mapRatingEvent = (row: any): RatingEvent => ({
  id: row.id,
  businessId: row.business_id,
  stars: row.stars,
  src: row.src ?? undefined,
  wasRedirected: row.was_redirected,
  timestamp: row.created_at,
});

export const supabaseDataService: DataService = {
  // Businesses
  getBusinesses: async (): Promise<Business[]> => {
    const { data, error } = await db()
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapBusiness);
  },

  getBusinessBySlug: async (slug: string): Promise<Business | null> => {
    const { data, error } = await db()
      .from('businesses')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) return null;
    return mapBusiness(data);
  },

  saveBusiness: async (business: Business): Promise<Business> => {
    const payload = unmapBusiness(business);
    const { data, error } = await db()
      .from('businesses')
      .upsert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return mapBusiness(data);
  },

  // Feedback
  getFeedback: async (businessId?: string): Promise<Feedback[]> => {
    let q = db()
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });
    if (businessId) q = q.eq('business_id', businessId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapFeedback);
  },
  
  addFeedback: async (feedback): Promise<Feedback> => {
    // Generate ID client-side so anon doesn't need a SELECT policy to get the row back.
    const id = generateId();
    const now = new Date().toISOString();
    const { error } = await db()
      .from('feedback')
      .insert({
        id,
        business_id: feedback.businessId,
        rating: feedback.rating,
        comment: feedback.comment,
        answers: feedback.answers ?? null,
        name: feedback.name ?? null,
        email: feedback.email ?? null,
        photos: feedback.photos ?? null,
        rating_event_id: feedback.ratingEventId ?? null,
        src: feedback.src ?? null,
        status: FeedbackStatus.NEW,
        created_at: now,
      });
    if (error) throw error;
    return { id, businessId: feedback.businessId, rating: feedback.rating, comment: feedback.comment, answers: feedback.answers, name: feedback.name, email: feedback.email, photos: feedback.photos, ratingEventId: feedback.ratingEventId, src: feedback.src, createdAt: now, status: FeedbackStatus.NEW };
  },

  updateFeedbackStatus: async (id: string, status: FeedbackStatus): Promise<void> => {
    const { error } = await db().from('feedback').update({ status }).eq('id', id);
    if (error) throw error;
  },

  deleteFeedback: async (id: string): Promise<void> => {
    const { error } = await db().from('feedback').delete().eq('id', id);
    if (error) throw error;
  },

  // Feedback Replies (Resend via Edge Function)
  sendFeedbackReply: async (input) => {
    const { data: sessionData } = await db().auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token || !token.startsWith('eyJ')) {
      throw new Error('No valid Supabase session JWT. Please log in again.');
    }

    // Send token in body so the browser treats this as a "simple request"
    // (text/plain, no custom headers) — eliminates the CORS preflight OPTIONS call.
    const functionUrl = `${supabaseUrlOrEmpty}/functions/v1/send-feedback-reply`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      body: JSON.stringify({
        token,
        feedbackId: input.feedbackId,
        businessId: input.businessId,
        toEmail: input.toEmail,
        subject: input.subject,
        message: input.body,
      }),
    });

    const result = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; providerMessageId?: string };

    if (!response.ok || !result?.ok) {
      throw new Error(result?.error ?? `Request failed (${response.status})`);
    }

    return { ok: true, providerMessageId: result.providerMessageId };
  },

  // Rating Events
  getRatingEvents: async (businessId?: string): Promise<RatingEvent[]> => {
    let q = db()
      .from('rating_events')
      .select('*')
      .order('created_at', { ascending: false });
    if (businessId) q = q.eq('business_id', businessId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapRatingEvent);
  },

  addRatingEvent: async (evt): Promise<RatingEvent> => {
    // Generate ID client-side so anon doesn't need a SELECT policy to get the row back.
    const id = generateId();
    const now = new Date().toISOString();
    const { error } = await db()
      .from('rating_events')
      .insert({
        id,
        business_id: evt.businessId,
        stars: evt.stars,
        src: evt.src ?? null,
        was_redirected: evt.wasRedirected,
        created_at: now,
      });
    if (error) throw error;
    return { id, businessId: evt.businessId, stars: evt.stars, src: evt.src, wasRedirected: evt.wasRedirected, timestamp: now };
  },

  // Delete a business and ALL related data (FK-safe order)
  deleteBusiness: async (businessId: string): Promise<void> => {
    await db().from('feedback_replies').delete().eq('business_id', businessId);
    await db().from('feedback').delete().eq('business_id', businessId);
    await db().from('rating_events').delete().eq('business_id', businessId);
    await db().from('user_profiles').delete().eq('business_id', businessId);
    const { error } = await db().from('businesses').delete().eq('id', businessId);
    if (error) throw error;
  },
};
