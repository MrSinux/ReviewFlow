
export enum FeedbackStatus {
  NEW = 'new',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  FLAGGED = 'flagged',
  SPAM = 'spam'
}

export interface BusinessTheme {
  accentColor: string;
  logoUrl?: string;
  pageBg?: string;
  adminBg?: string;
  cardBg?: string;
}

export type EntryPoint = {
  id: string;
  label: string;
  src: string;
};

export type FeedbackQuestion = {
  id: string;
  question: string;
  //
  /**
   * single: single choice
   * multi: multiple choice
   * text: free text (no predefined options)
   */
  type: 'single' | 'multi' | 'text';
  options: string[];
};

export interface Business {
  id: string;
  name: string;
  slug: string;
  status?: string;
  timezone: string;
  thresholdRating: number;
  googleReviewUrl: string;
  redirectUrl?: string;
  entryPoints?: EntryPoint[];
  feedbackQuestions?: FeedbackQuestion[];
  theme: BusinessTheme;
  contactSettings: {
    notifyEmail?: string;
    enabled: boolean;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface Feedback {
  id: string;
  businessId: string;
  rating: number;
  comment: string;
  answers?: Record<string, string[]>;
  name?: string;
  email?: string;
  photos?: string[]; // base64 strings
  ratingEventId?: string;
  src?: string;
  createdAt: string;
  status: FeedbackStatus;
}

export interface RatingEvent {
  id: string;
  businessId: string;
  stars: number;
  src?: string;
  wasRedirected: boolean;
  timestamp: string;
}

export type UserRole = 'super' | 'admin' | 'user';

export interface UserProfile {
  id: string; // auth.users.id
  role: UserRole;
  businessId?: string | null;
  businessSlug?: string | null;
  createdAt?: string;
}
