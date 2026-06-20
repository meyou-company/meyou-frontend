export const FEATURE_NAV = [
  { key: 'earn', path: '/earn', label: 'Bonus pour les amis' },
  { key: 'chat', path: '/features/chat', label: 'Chat moderne' },
  { key: 'security', path: '/features/security', label: 'Sécurité totale' },
];

export const FEATURE_PAGES = {
  earn: {
    key: 'earn',
    emoji: '💰',
    icon: '/icon1/1.png',
    title: 'Bonus pour les amis',
    subtitle: 'Programme de récompenses — en développement',
    intro:
      'MeYou prépare un programme de bonus pour les amis et l’activité communautaire. Toutes les fonctions de cette page sont à venir ; nous annoncerons le lancement dans l’application.',
    cards: [
      {
        emoji: '👥',
        title: 'Gagnez des bonus pour de nouveaux amis',
        text: 'Inviter des amis et gagner des bonus pour leur activité — en développement.',
        comingSoon: true,
      },
      {
        emoji: '💎',
        title: 'Demandes d’amis payantes',
        text: 'Invitations payantes de la part d’utilisateurs VIP — fonction en préparation.',
        comingSoon: true,
      },
      {
        emoji: '📈',
        title: 'Futurs paiements aux utilisateurs',
        text: 'Paiements aux créateurs et membres actifs pour le contenu, les parrainages et la monétisation — en développement.',
        comingSoon: true,
      },
      {
        emoji: '🎁',
        title: 'Cadeaux et monétisation de l’activité',
        text: 'Lien entre bonus, cadeaux et fonctions payantes — en préparation.',
        comingSoon: true,
      },
      {
        emoji: '🔗',
        title: 'Système de parrainage',
        text: 'Suivi des invitations et historique transparent des bonus — en développement.',
        comingSoon: true,
      },
      {
        emoji: '🛡️',
        title: 'Règles anti-fraude',
        text: 'Interdiction des bots, multi-comptes et manipulations — règles au lancement du programme.',
        comingSoon: true,
      },
    ],
    comingSoonSection: {
      title: 'Bientôt sur MeYou',
      items: [
        {
          emoji: '👛',
          title: 'Portefeuille',
          text: 'Un solde unique pour les bonus, cadeaux et futures opérations.',
        },
        {
          emoji: '💳',
          title: 'Retraits',
          text: 'Retrait des fonds accumulés via des prestataires de paiement vérifiés.',
        },
        {
          emoji: '🎀',
          title: 'Cadeaux',
          text: 'Catalogue élargi de cadeaux et effets premium pour soutenir les créateurs.',
        },
        {
          emoji: '⭐',
          title: 'Compte premium',
          text: 'Statut VIP avec fonctionnalités supplémentaires et priorité dans la communauté.',
        },
      ],
    },
    faq: [
      {
        question: 'Quand le programme de bonus sera-t-il lancé ?',
        answer:
          'Toutes les fonctions de récompense sont en développement. Nous annoncerons le lancement dans l’application et sur cette page.',
      },
      {
        question: 'Peut-on déjà gagner des bonus ?',
        answer:
          'Non, l’attribution de bonus n’est pas encore disponible. Portefeuille, paiements et parrainage sont en préparation.',
      },
      {
        question: 'Que se passe-t-il en cas de violation des règles ?',
        answer:
          'Après le lancement, les bots, multi-comptes et manipulations sont interdits. Les violations entraîneront l’annulation des bonus et un possible blocage.',
      },
    ],
    cta: {
      label: 'Créer un compte et être informé en premier',
      path: '/auth/register',
    },
  },
  chat: {
    key: 'chat',
    emoji: '💬',
    icon: '/icon1/2.png',
    title: 'Chat moderne',
    subtitle: 'Communication rapide avec médias, réactions et protection de la vie privée',
    intro:
      'Dialogues privés en temps réel. Texte, photos, vidéos, messages vocaux et réactions emoji — dans une interface MeYou pratique avec notifications et contrôle d’accès.',
    cards: [
      {
        emoji: '💬',
        title: 'Chats privés',
        text: 'En tête-à-tête avec amis et abonnés. Livraison instantanée via WebSocket et statut « en train d’écrire… ».',
      },
      {
        emoji: '👑',
        title: 'Chats VIP',
        text: 'Dialogues premium pour utilisateurs VIP — section séparée en préparation.',
        comingSoon: true,
      },
      {
        emoji: '👥',
        title: 'Chats de groupe',
        text: 'Salles partagées pour amis et communautés — sans messageries tierces.',
        comingSoon: true,
      },
      {
        emoji: '😊',
        title: 'Réactions emoji',
        text: 'Réagissez rapidement aux messages avec des emoji — sans encombrer la conversation.',
      },
      {
        emoji: '📷',
        title: 'Photos et vidéos',
        text: 'Envoyez des médias avec aperçu dans le chat et visionneuse plein écran.',
      },
      {
        emoji: '🎙️',
        title: 'Messages vocaux',
        text: 'Enregistrez et envoyez des notes vocales directement dans le dialogue — déjà disponible dans les chats MeYou.',
      },
      {
        emoji: '📹',
        title: 'Appels vidéo',
        text: 'Appel vidéo en tête-à-tête sur la plateforme MeYou.',
        comingSoon: true,
      },
      {
        emoji: '🔐',
        title: 'Protection de la confidentialité des messages',
        text: 'Blocage, paramètres du profil et contrôle de qui peut vous écrire.',
      },
    ],
    cta: {
      label: 'Se connecter et ouvrir les chats',
      path: '/auth/login',
    },
  },
  security: {
    key: 'security',
    emoji: '🔒',
    icon: '/icon1/3.png',
    title: 'Sécurité totale',
    subtitle: 'Protection du compte, vérifications et confidentialité sur MeYou',
    intro:
      'MeYou combine des mesures de sécurité techniques avec des règles transparentes : de Google Login à la modération, au blocage et au contrôle de visibilité du contenu.',
    cards: [
      {
        emoji: '🔑',
        title: 'Authentification à deux facteurs',
        text: 'Couche supplémentaire de protection de connexion via code de confirmation.',
        comingSoon: true,
      },
      {
        emoji: '💳',
        title: 'Protection des paiements',
        text: 'Traitement sécurisé des transactions via des prestataires vérifiés — en préparation.',
        comingSoon: true,
      },
      {
        emoji: '✅',
        title: 'Vérification des comptes',
        text: 'Confirmation de l’email après inscription déjà disponible — étape obligatoire pour protéger votre profil.',
      },
      {
        emoji: '🚩',
        title: 'Signalements et modération',
        text: 'Signalez les violations via les outils intégrés — l’équipe applique des sanctions.',
      },
      {
        emoji: '📱',
        title: 'Sessions actives des appareils',
        text: 'Consultez et gérez les appareils où vous êtes connecté.',
        comingSoon: true,
      },
      {
        emoji: '🚫',
        title: 'Blocage des utilisateurs',
        text: 'Bloquez les personnes indésirables — elles ne pourront plus vous écrire ni voir le contenu restreint.',
      },
      {
        emoji: '🔒',
        title: 'Profils privés',
        text: 'Limitez l’accès au profil — les abonnements nécessitent une approbation, le contenu est protégé.',
      },
      {
        emoji: '🌐',
        title: 'Google Login',
        text: 'Connexion rapide via Google OAuth. Les jetons sont stockés en sécurité et révoqués à la suppression du compte.',
      },
      {
        emoji: '👁️',
        title: 'Contrôle de confidentialité du profil et des Stories',
        text: 'Gérez la visibilité des champs du profil, des stories et de l’audience — public, abonnés ou close friends.',
      },
    ],
    cta: {
      label: 'Voir la politique de confidentialité',
      path: '/legal/privacy',
    },
  },
};

export const FEATURE_UI = {
  brand: 'MeYou',
  backHome: 'Retour à l’accueil',
  highlightsTitle: 'Fonctionnalités clés',
  blocksTitle: 'En savoir plus',
  faqTitle: 'FAQ',
  futureTitle: 'Bientôt',
  comingSoonLabel: 'Bientôt',
  comingSoonSectionTitle: 'Bientôt sur MeYou',
  exploreMore: 'Fonctionnalités MeYou',
  cardsSwipeHint: 'Glissez vers la droite pour en voir plus →',
};
