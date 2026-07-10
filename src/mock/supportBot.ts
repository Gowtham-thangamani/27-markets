/**
 * Content for the rule-based support assistant (ChatWidget).
 * NON-TECHNICAL EDITS: change the wording, add/remove topics, or update the
 * links here — no other file needs to change. Each topic becomes a button in
 * the chat; clicking it shows `answer` plus any `links` as quick buttons.
 */

export interface BotLink {
  label: string
  /** In-app route, e.g. '/register'. */
  to: string
}

export interface BotTopic {
  /** Stable id. */
  id: string
  /** Button label shown in the chat menu. */
  label: string
  /** The assistant's reply. Use blank lines / "• " for lists. */
  answer: string
  /** Optional buttons that navigate the user somewhere useful. */
  links?: BotLink[]
}

export const BOT_GREETING =
  "Hi! I'm the 27 Markets assistant. Pick a topic below and I'll help — or raise a support ticket and our team will get back to you."

export const BOT_TOPICS: BotTopic[] = [
  {
    id: 'how-it-works',
    label: 'How does 27 Markets work?',
    answer:
      '27 Markets is an online CFD & forex broker. From a single account you can trade forex, metals, indices, commodities, and shares — on our web platform or MetaTrader 5.\n\nThe flow is simple: open an account, complete a quick verification (KYC), fund it (from $50), then start trading.',
    links: [
      { label: 'Explore markets', to: '/markets' },
      { label: 'Trading conditions', to: '/conditions' },
    ],
  },
  {
    id: 'create-account',
    label: 'How do I create an account?',
    answer:
      'Opening an account takes a couple of minutes:\n\n1. Click "Open Account" and enter your name, email, and a password.\n2. Verify your email address.\n3. Complete KYC — upload your ID and a proof of address.\n4. Fund your account (minimum $50) and start trading.',
    links: [
      { label: 'Open an account', to: '/register' },
      { label: 'Log in', to: '/login' },
    ],
  },
  {
    id: 'kyc',
    label: 'Verification (KYC) help',
    answer:
      'Verification (KYC) has 3 levels:\n\n• Level 1 — Identity: passport, national ID, or driver’s licence\n• Level 2 — Proof of address: a utility bill or bank statement issued within 3 months\n• Level 3 — Selfie holding your ID\n\nEach document is reviewed by our compliance team, usually within 24 hours. Higher levels unlock higher deposit and withdrawal limits.',
    links: [{ label: 'Go to my verification', to: '/portal/kyc' }],
  },
  {
    id: 'funding',
    label: 'Funding & withdrawals',
    answer:
      'The minimum deposit is $50 and there is no minimum withdrawal. All accounts are held in USD.\n\nYou can fund using cards, e-wallets, and bank transfer — any provider fee is shown before you confirm. Withdrawals are returned to your original method after a finance review.',
    links: [{ label: 'Funding details', to: '/funding' }],
  },
  {
    id: 'platforms',
    label: 'Platforms & devices',
    answer:
      'Trade on our fast web platform or the MetaTrader 5 desktop terminal. It’s one account, synced across both, so you can pick up exactly where you left off.',
    links: [{ label: 'View platforms', to: '/platforms' }],
  },
  {
    id: 'accounts',
    label: 'Account types',
    answer:
      'Start commission-free, or trade raw spreads with a transparent commission. You can upgrade your account type anytime from your portal.',
    links: [{ label: 'Compare account types', to: '/accounts' }],
  },
]
