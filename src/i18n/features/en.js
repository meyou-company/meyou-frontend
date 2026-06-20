export const FEATURE_NAV = [
  { key: 'earn', path: '/earn', label: 'Friend bonuses' },
  { key: 'chat', path: '/features/chat', label: 'Modern chat' },
  { key: 'security', path: '/features/security', label: 'Full security' },
];

export const FEATURE_PAGES = {
  earn: {
    key: 'earn',
    emoji: '💰',
    icon: '/icon1/1.png',
    title: 'Friend bonuses',
    subtitle: 'Rewards program — in development',
    intro:
      'MeYou is preparing a friend bonus and community activity program. All features on this page are upcoming; we will announce the launch in the app.',
    cards: [
      {
        emoji: '👥',
        title: 'Earn bonuses for new friends',
        text: 'Inviting friends and earning bonuses for their activity — in development.',
        comingSoon: true,
      },
      {
        emoji: '💎',
        title: 'Paid friend requests',
        text: 'Paid invitations from VIP users — feature preparing for launch.',
        comingSoon: true,
      },
      {
        emoji: '📈',
        title: 'Future payouts to users',
        text: 'Payouts to creators and active members for content, referrals, and monetization — in development.',
        comingSoon: true,
      },
      {
        emoji: '🎁',
        title: 'Gifts and activity monetization',
        text: 'Connecting bonuses with gifts and paid features — preparing for launch.',
        comingSoon: true,
      },
      {
        emoji: '🔗',
        title: 'Referral system',
        text: 'Invitation tracking and transparent bonus history — in development.',
        comingSoon: true,
      },
      {
        emoji: '🛡️',
        title: 'Anti-fraud rules',
        text: 'No bots, multi-accounts, or manipulation — rules at program launch.',
        comingSoon: true,
      },
    ],
    comingSoonSection: {
      title: 'Coming soon to MeYou',
      items: [
        {
          emoji: '👛',
          title: 'Wallet',
          text: 'A single balance for bonuses, gifts, and future transactions.',
        },
        {
          emoji: '💳',
          title: 'Withdrawals',
          text: 'Withdraw earned funds through verified payment providers.',
        },
        {
          emoji: '🎀',
          title: 'Gifts',
          text: 'Expanded gift catalog and premium effects to support creators.',
        },
        {
          emoji: '⭐',
          title: 'Premium account',
          text: 'VIP status with extra features and priority in the community.',
        },
      ],
    },
    faq: [
      {
        question: 'When will the bonus program launch?',
        answer:
          'All reward features are currently in development. We will announce the program start in the app and on this page.',
      },
      {
        question: 'Can I already earn bonuses?',
        answer:
          'No, bonus accrual is not available yet. Wallet, payouts, and the referral system are preparing for launch.',
      },
      {
        question: 'What happens if rules are violated?',
        answer:
          'After launch, bots, multi-accounts, and manipulation are prohibited. Violations will lead to bonus cancellation and possible blocking.',
      },
    ],
    cta: {
      label: 'Create an account and be the first to know',
      path: '/auth/register',
    },
  },
  chat: {
    key: 'chat',
    emoji: '💬',
    icon: '/icon1/2.png',
    title: 'Modern chat',
    subtitle: 'Fast messaging with media, reactions, and privacy protection',
    intro:
      'Private real-time conversations. Text, photos, video, voice messages, and emoji reactions — in a convenient MeYou interface with notifications and access control.',
    cards: [
      {
        emoji: '💬',
        title: 'Private chats',
        text: 'One-on-one with friends and followers. Instant delivery via WebSocket and a “typing…” status.',
      },
      {
        emoji: '👑',
        title: 'VIP chats',
        text: 'Premium conversations for VIP users — a separate section preparing for launch.',
        comingSoon: true,
      },
      {
        emoji: '👥',
        title: 'Group chats',
        text: 'Shared rooms for friends and communities — without third-party messengers.',
        comingSoon: true,
      },
      {
        emoji: '😊',
        title: 'Emoji reactions',
        text: 'React to messages quickly with emoji — without cluttering the chat thread.',
      },
      {
        emoji: '📷',
        title: 'Photos and video',
        text: 'Send media with in-chat preview and a fullscreen viewer.',
      },
      {
        emoji: '🎙️',
        title: 'Voice messages',
        text: 'Record and send voice notes directly in the chat — already available in MeYou chats.',
      },
      {
        emoji: '📹',
        title: 'Video calls',
        text: 'One-on-one video calls within the MeYou platform.',
        comingSoon: true,
      },
      {
        emoji: '🔐',
        title: 'Message privacy protection',
        text: 'Blocking, profile settings, and control over who can message you.',
      },
    ],
    cta: {
      label: 'Sign in and open chats',
      path: '/auth/login',
    },
  },
  security: {
    key: 'security',
    emoji: '🔒',
    icon: '/icon1/3.png',
    title: 'Full security',
    subtitle: 'Account protection, verification, and privacy on MeYou',
    intro:
      'MeYou combines technical security measures with transparent rules: from Google Login to moderation, blocking, and content visibility control.',
    cards: [
      {
        emoji: '🔑',
        title: 'Two-factor authentication',
        text: 'An extra layer of sign-in protection with a confirmation code.',
        comingSoon: true,
      },
      {
        emoji: '💳',
        title: 'Payment protection',
        text: 'Secure transaction processing through verified providers — preparing for launch.',
        comingSoon: true,
      },
      {
        emoji: '✅',
        title: 'Account verification',
        text: 'Email confirmation after registration is already available — a required step to protect your profile.',
      },
      {
        emoji: '🚩',
        title: 'Reports and moderation',
        text: 'Report violations through built-in tools — the team applies sanctions.',
      },
      {
        emoji: '📱',
        title: 'Active device sessions',
        text: 'View and manage devices where you are signed in.',
        comingSoon: true,
      },
      {
        emoji: '🚫',
        title: 'Blocking users',
        text: 'Block unwanted people — they will not be able to message you or see restricted content.',
      },
      {
        emoji: '🔒',
        title: 'Private profiles',
        text: 'Restrict profile access — follow requests need approval and content stays protected.',
      },
      {
        emoji: '🌐',
        title: 'Google Login',
        text: 'Quick sign-in via Google OAuth. Tokens are stored securely and revoked when the account is deleted.',
      },
      {
        emoji: '👁️',
        title: 'Profile and Stories privacy control',
        text: 'Manage profile fields, stories, and audience visibility — public, followers, or close friends.',
      },
    ],
    cta: {
      label: 'View privacy policy',
      path: '/legal/privacy',
    },
  },
};

export const FEATURE_UI = {
  brand: 'MeYou',
  backHome: 'Back to home',
  highlightsTitle: 'Key features',
  blocksTitle: 'Learn more',
  faqTitle: 'FAQ',
  futureTitle: 'Coming soon',
  comingSoonLabel: 'Coming soon',
  comingSoonSectionTitle: 'Coming soon to MeYou',
  exploreMore: 'MeYou features',
  cardsSwipeHint: 'Swipe right to see more →',
};
