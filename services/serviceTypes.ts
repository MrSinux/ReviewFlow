import type { Business, Feedback, FeedbackStatus, RatingEvent, UserProfile } from '../types';

// Contracts shared by the Supabase implementations (services/supabase) and the
// in-browser demo implementations (services/demo).

export type AuthSession = {
  userId: string;
  email: string | null;
  profile: UserProfile;
};

export interface AuthService {
  login(email: string, password: string): Promise<AuthSession>;
  logout(): Promise<void>;
  getCurrentSession(): Promise<AuthSession | null>;
}

export type NewFeedback = Omit<Feedback, 'id' | 'createdAt' | 'status'>;
export type NewRatingEvent = Omit<RatingEvent, 'id' | 'timestamp'>;

export type SendFeedbackReplyInput = {
  feedbackId: string;
  businessId?: string;
  toEmail: string;
  subject?: string;
  body: string;
};

export interface DataService {
  getBusinesses(): Promise<Business[]>;
  getBusinessBySlug(slug: string): Promise<Business | null>;
  saveBusiness(business: Business): Promise<Business>;
  deleteBusiness(businessId: string): Promise<void>;

  getFeedback(businessId?: string): Promise<Feedback[]>;
  addFeedback(feedback: NewFeedback): Promise<Feedback>;
  updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<void>;
  deleteFeedback(id: string): Promise<void>;
  sendFeedbackReply(input: SendFeedbackReplyInput): Promise<{ ok: true; providerMessageId?: string }>;

  getRatingEvents(businessId?: string): Promise<RatingEvent[]>;
  addRatingEvent(evt: NewRatingEvent): Promise<RatingEvent>;
}
