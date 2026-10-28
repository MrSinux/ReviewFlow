import { FeedbackStatus } from '../../types';
import type { Business, EntryPoint, Feedback, FeedbackQuestion, RatingEvent } from '../../types';

// Synthetic demo data. Every business, person, comment and email address here is fictional;
// nothing is taken from a real ReviewFlow database.

export type DemoReply = {
  id: string;
  feedbackId: string;
  businessId: string;
  toEmail: string;
  subject: string;
  body: string;
  createdAt: string;
};

export type DemoDb = {
  version: 1;
  businesses: Business[];
  ratingEvents: RatingEvent[];
  feedback: Feedback[];
  replies: DemoReply[];
};

// Small deterministic PRNG so every fresh demo starts from the same data set.
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type BusinessSeed = {
  business: Omit<Business, 'createdAt'>;
  events: number;
  // One comment per intercepted rating, keyed by its star rating, so the inbox never repeats itself.
  comments: Record<1 | 2 | 3, string[]>;
  // Enough distinct customers for every intercepted rating.
  customers: string[];
  answer: (q: FeedbackQuestion, rand: () => number) => string[] | string;
};

const pick = <T,>(items: T[], rand: () => number): T => items[Math.floor(rand() * items.length)];

const nextComment = (seed: BusinessSeed, stars: 1 | 2 | 3, used: Record<number, number>) => {
  const pool = seed.comments[stars];
  return pool[used[stars]++ % pool.length];
};

const googleStandIn = (slug: string) => `/demo/google-review?business=${slug}`;

const entry = (id: string, label: string, src: string): EntryPoint => ({ id, label, src });

const choiceAnswer = (q: FeedbackQuestion, rand: () => number): string[] | string => {
  if (q.type === 'text') return rand() < 0.5 ? 'Please send a reminder the day before.' : '';
  if (q.type === 'single') return [pick(q.options, rand)];
  return q.options.filter(() => rand() < 0.35).slice(0, 2);
};

const SEEDS: BusinessSeed[] = [
  {
    business: {
      id: 'biz_demo_cafe',
      name: 'Demo Café',
      slug: 'demo-cafe',
      status: 'active',
      timezone: 'Asia/Kuala_Lumpur',
      thresholdRating: 4,
      googleReviewUrl: googleStandIn('demo-cafe'),
      entryPoints: [
        entry('ep_cafe_table_3', 'Table 3', 'table_3'),
        entry('ep_cafe_counter', 'Front counter', 'front_counter'),
        entry('ep_cafe_receipt', 'Takeaway receipt', 'takeaway_receipt'),
      ],
      feedbackQuestions: [
        { id: 'q_cafe_visit', question: 'Did you dine in, take away or get delivery?', type: 'single', options: ['Dine in', 'Take away', 'Delivery'] },
        { id: 'q_cafe_improve', question: 'What could we do better?', type: 'multi', options: ['Food quality', 'Speed of service', 'Staff friendliness', 'Cleanliness', 'Price'] },
      ],
      theme: { accentColor: '#0f766e', pageBg: '#f0fdfa', adminBg: '#f1f5f9', cardBg: '#ffffff' },
      contactSettings: { enabled: false },
    },
    events: 64,
    comments: {
      1: [
        "Waited 35 minutes for two iced lattes and a toastie. Nobody apologised or told us there was a delay.",
        "Found a hair in my nasi lemak. They replaced it, but no one checked back with us afterwards.",
        "I was charged twice for one card payment and had to come back the next day to sort it out.",
        "The chicken in my sandwich was still cold in the middle. That's not safe.",
        "Booked a table for six online and the booking wasn't there when we arrived.",
        "Delivery came 50 minutes late and the iced drinks had completely melted.",
        "The staff at the counter were rude when I asked whether they had oat milk.",
        "The toilet was out of order and there was nowhere to wash my hands.",
      ],
      2: [
        "My latte was lukewarm and the table hadn't been wiped down.",
        "Ordered for delivery and the noodles arrived soggy. The packaging could be better.",
        "The music was too loud to have a conversation.",
        "Prices went up again but the portions look smaller than last month.",
        "The cashier got my order wrong twice while the queue behind me grew.",
        "The air-conditioning wasn't working on a hot afternoon, so we left early.",
        "My croissant was stale, probably left over from the day before.",
        "Waited ages to pay. Only one person on the counter at lunchtime.",
        "The Wi-Fi kept dropping, which matters if you advertise it for remote work.",
      ],
      3: [
        "Good coffee, but the seating is cramped and the tables wobble.",
        "Lovely cakes, but the kaya toast was dry this time.",
        "Friendly staff, slow service. I'd come back on a quieter day.",
        "Decent food, but the takeaway cups leak at the lid.",
      ],
    },
    customers: ["Aisha R.", "Daniel K.", "Mei Ling T.", "Ravi S.", "Nurul H.", "Farah Z.", "Jason L.", "Siti A.", "Kavitha M.", "Wei Jie C.", "Hafiz O.", "Priya N.", "Marcus T.", "Liyana I.", "Arjun P.", "Grace W.", "Imran Y."],
    answer: choiceAnswer,
  },
  {
    business: {
      id: 'biz_sample_dental',
      name: 'Sample Dental Clinic',
      slug: 'sample-dental',
      status: 'active',
      timezone: 'America/New_York',
      thresholdRating: 4,
      googleReviewUrl: googleStandIn('sample-dental'),
      entryPoints: [
        entry('ep_dental_reception', 'Reception desk', 'reception_desk'),
        entry('ep_dental_email', 'Appointment email', 'appointment_email'),
      ],
      feedbackQuestions: [
        { id: 'q_dental_visit', question: 'What was your visit for?', type: 'single', options: ['Check-up & cleaning', 'Treatment', 'Emergency', 'Consultation'] },
        { id: 'q_dental_next', question: 'Anything we should know for next time?', type: 'text', options: [] },
      ],
      theme: { accentColor: '#2563eb', pageBg: '#eff6ff', adminBg: '#f1f5f9', cardBg: '#ffffff' },
      contactSettings: { enabled: false },
    },
    events: 38,
    comments: {
      1: [
        "My appointment started 45 minutes late and nobody told me why.",
        "I was billed for an X-ray I was told was covered. Still waiting for a call back.",
        "The hygienist was rough and didn't stop when I said it hurt.",
      ],
      2: [
        "The front desk couldn't explain what my insurance would cover.",
        "I had to call three times to reschedule because the online booking never worked.",
        "I felt rushed during the consultation and left with unanswered questions.",
        "No reminder text, so I nearly missed my appointment.",
      ],
      3: [
        "The cleaning itself was fine, but the waiting room was crowded and noisy.",
        "Good dentist, but parking is a nightmare and the validation machine was broken.",
        "The treatment went well; the aftercare instructions were hard to follow.",
        "Friendly staff, but I waited 20 minutes past my slot.",
        "The clinic is clean and modern, but the payment portal kept logging me out.",
        "A fine visit overall, though nobody explained the cost before starting.",
      ],
    },
    customers: ["Sarah M.", "James W.", "Emily R.", "Carlos G.", "Hannah B.", "David O.", "Olivia P.", "Michael T.", "Rachel K."],
    answer: choiceAnswer,
  },
  {
    business: {
      id: 'biz_example_auto',
      name: 'Example Auto Care',
      slug: 'example-auto-care',
      status: 'active',
      timezone: 'America/Chicago',
      thresholdRating: 4,
      googleReviewUrl: googleStandIn('example-auto-care'),
      entryPoints: [
        entry('ep_auto_invoice', 'Service invoice', 'service_invoice'),
        entry('ep_auto_lounge', 'Waiting lounge', 'waiting_lounge'),
      ],
      feedbackQuestions: [
        { id: 'q_auto_issue', question: 'Which part of the visit fell short?', type: 'multi', options: ['Wait time', 'Communication', 'Price', 'Quality of work'] },
      ],
      theme: { accentColor: '#c2410c', pageBg: '#fff7ed', adminBg: '#f1f5f9', cardBg: '#ffffff' },
      contactSettings: { enabled: false },
    },
    events: 26,
    comments: {
      1: [
        "Quoted $180 at drop-off and charged $260 at pick-up without a call.",
        "My car came back with a new scratch on the rear bumper, and they denied it.",
        "The same check-engine light came on again the next morning.",
        "They kept the car three days for a one-day job, with no updates.",
        "The oil was overfilled and another shop had to drain it.",
      ],
      2: [
        "The car was ready a day later than promised.",
        "Nobody updated me on progress; I had to keep calling.",
      ],
      3: [
        "The work was fine, but there was grease on the steering wheel and the seat.",
        "Fair price, but the coffee machine in the waiting lounge was broken again.",
        "Good repair. The invoice listed parts I didn't recognise and nobody explained them.",
        "A quick oil change, but they pushed hard to upsell a full service.",
      ],
    },
    customers: ["Tom B.", "Chris L.", "Ben O.", "Jessica H.", "Kevin D.", "Laura S.", "Andre W."],
    answer: choiceAnswer,
  },
];

const emailFor = (name: string) =>
  `${name.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.')}@example.com`;

// A simple illustrated "customer photo" so the photo preview has something to show.
const demoPhoto = (label: string, color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">` +
      `<rect width="480" height="360" fill="${color}"/>` +
      `<circle cx="360" cy="90" r="40" fill="#fde68a"/>` +
      `<path d="M0 300 L140 170 L250 260 L330 200 L480 320 L480 360 L0 360 Z" fill="#ffffff" fill-opacity="0.35"/>` +
      `<text x="24" y="44" font-family="sans-serif" font-size="22" fill="#ffffff">${label}</text>` +
      `</svg>`
  )}`;

const STAR_WEIGHTS: [number, number][] = [[1, 0.06], [2, 0.08], [3, 0.12], [4, 0.3], [5, 0.44]];

const drawStars = (rand: () => number) => {
  let r = rand();
  for (const [stars, weight] of STAR_WEIGHTS) {
    if ((r -= weight) <= 0) return stars;
  }
  return 5;
};

export const createSeed = (now = Date.now()): DemoDb => {
  const rand = mulberry32(20260428);
  const DAY = 24 * 60 * 60 * 1000;
  const businesses: Business[] = [];
  const ratingEvents: RatingEvent[] = [];
  const feedback: Feedback[] = [];

  SEEDS.forEach((seed, bi) => {
    const business: Business = { ...seed.business, createdAt: new Date(now - (120 - bi * 20) * DAY).toISOString() };
    businesses.push(business);
    const sources = business.entryPoints ?? [];
    const used: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    let customer = 0;
    let photosLeft = bi === 0 ? 2 : 0;

    for (let i = 0; i < seed.events; i++) {
      const timestamp = new Date(now - rand() * 30 * DAY).toISOString();
      const stars = drawStars(rand);
      const src = rand() < 0.2 ? undefined : pick(sources, rand).src;
      const wasRedirected = stars >= business.thresholdRating;
      const event: RatingEvent = { id: `evt_${bi}_${i}`, businessId: business.id, stars, src, wasRedirected, timestamp };
      ratingEvents.push(event);

      if (wasRedirected) continue;
      const name = seed.customers[customer++ % seed.customers.length];
      const answers: Record<string, string[]> = {};
      for (const q of business.feedbackQuestions ?? []) {
        const a = seed.answer(q, rand);
        if (Array.isArray(a) ? a.length > 0 : a) answers[q.id] = a as string[];
      }
      const photos = photosLeft-- > 0 ? [demoPhoto(`Photo from ${name}`, ['#0f766e', '#334155'][photosLeft % 2])] : undefined;
      feedback.push({
        id: `fb_${bi}_${i}`,
        businessId: business.id,
        rating: stars,
        comment: nextComment(seed, stars as 1 | 2 | 3, used),
        answers,
        name,
        email: emailFor(name),
        photos,
        ratingEventId: event.id,
        src,
        createdAt: new Date(Date.parse(timestamp) + 2 * 60 * 1000).toISOString(),
        status: FeedbackStatus.NEW,
      });
    }
  });

  // Newest feedback stays unread; older items show the other inbox states.
  feedback.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const older: FeedbackStatus[] = [FeedbackStatus.REVIEWED, FeedbackStatus.RESOLVED, FeedbackStatus.FLAGGED, FeedbackStatus.RESOLVED];
  const seenPerBusiness = new Map<string, number>();
  for (const f of feedback) {
    const n = seenPerBusiness.get(f.businessId) ?? 0;
    seenPerBusiness.set(f.businessId, n + 1);
    if (n >= 3) f.status = older[n % older.length];
  }

  ratingEvents.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return { version: 1, businesses, ratingEvents, feedback, replies: [] };
};
