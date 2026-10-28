import { FeedbackStatus } from '../../types';
import type { Business, Feedback, RatingEvent } from '../../types';
import { generateId } from '../ids';
import type { DataService } from '../serviceTypes';
import { latency, readDb, updateDb } from './store';

const newestFirst = <T,>(key: (item: T) => string) => (a: T, b: T) => (key(a) < key(b) ? 1 : -1);

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export const demoDataService: DataService = {
  getBusinesses: async () => {
    await latency();
    return readDb().businesses.sort(newestFirst((b) => b.createdAt));
  },

  getBusinessBySlug: async (slug) => {
    await latency();
    return readDb().businesses.find((b) => b.slug === slug) ?? null;
  },

  saveBusiness: async (business) => {
    await latency();
    return updateDb((db) => {
      if (db.businesses.some((b) => b.slug === business.slug && b.id !== business.id)) {
        throw new Error(`A business with the slug "${business.slug}" already exists.`);
      }
      const now = new Date().toISOString();
      const index = db.businesses.findIndex((b) => b.id === business.id);
      const saved: Business = index >= 0
        ? { ...db.businesses[index], ...business, updatedAt: now }
        : { ...business, createdAt: business.createdAt || now };
      if (index >= 0) db.businesses[index] = saved;
      else db.businesses.push(saved);
      return structuredClone(saved);
    });
  },

  deleteBusiness: async (businessId) => {
    await latency();
    updateDb((db) => {
      db.replies = db.replies.filter((r) => r.businessId !== businessId);
      db.feedback = db.feedback.filter((f) => f.businessId !== businessId);
      db.ratingEvents = db.ratingEvents.filter((e) => e.businessId !== businessId);
      db.businesses = db.businesses.filter((b) => b.id !== businessId);
    });
  },

  getFeedback: async (businessId) => {
    await latency();
    return readDb()
      .feedback.filter((f) => !businessId || f.businessId === businessId)
      .sort(newestFirst((f) => f.createdAt));
  },

  addFeedback: async (feedback) => {
    await latency();
    const row: Feedback = {
      ...feedback,
      id: generateId(),
      createdAt: new Date().toISOString(),
      status: FeedbackStatus.NEW,
    };
    updateDb((db) => {
      db.feedback.push(row);
    });
    return row;
  },

  updateFeedbackStatus: async (id, status) => {
    await latency();
    updateDb((db) => {
      const row = db.feedback.find((f) => f.id === id);
      if (row) row.status = status;
    });
  },

  deleteFeedback: async (id) => {
    await latency();
    updateDb((db) => {
      db.feedback = db.feedback.filter((f) => f.id !== id);
      db.replies = db.replies.filter((r) => r.feedbackId !== id);
    });
  },

  // Mirrors the send-feedback-reply Edge Function's checks, then logs the reply instead of emailing it.
  sendFeedbackReply: async (input) => {
    await latency(400);
    const toEmail = input.toEmail.trim();
    const body = input.body.trim();
    if (!toEmail || !isEmail(toEmail)) throw new Error('Invalid toEmail');
    if (!body) throw new Error('Missing message');
    const id = generateId();
    updateDb((db) => {
      const feedback = db.feedback.find((f) => f.id === input.feedbackId);
      if (!feedback) throw new Error('Feedback not found');
      db.replies.push({
        id,
        feedbackId: feedback.id,
        businessId: feedback.businessId,
        toEmail,
        subject: input.subject?.trim() || 'A message from us',
        body,
        createdAt: new Date().toISOString(),
      });
    });
    return { ok: true, providerMessageId: `demo-${id}` };
  },

  getRatingEvents: async (businessId) => {
    await latency();
    return readDb()
      .ratingEvents.filter((e) => !businessId || e.businessId === businessId)
      .sort(newestFirst((e) => e.timestamp));
  },

  addRatingEvent: async (evt) => {
    await latency();
    const row: RatingEvent = { ...evt, id: generateId(), timestamp: new Date().toISOString() };
    updateDb((db) => {
      db.ratingEvents.push(row);
    });
    return row;
  },
};
