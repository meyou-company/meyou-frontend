export const FEATURE_NAV = [
  { key: 'earn', path: '/earn', label: 'Bonusy za přátele' },
  { key: 'chat', path: '/features/chat', label: 'Moderní chat' },
  { key: 'security', path: '/features/security', label: 'Plná bezpečnost' },
];

export const FEATURE_PAGES = {
  earn: {
    key: 'earn',
    emoji: '💰',
    icon: '/icon1/1.png',
    title: 'Bonusy za přátele',
    subtitle: 'Program odměn — ve vývoji',
    intro:
      'MeYou připravuje program bonusů za přátele a aktivitu v komunitě. Všechny funkce na této stránce jsou budoucí možnosti; o spuštění informujeme v aplikaci.',
    cards: [
      {
        emoji: '👥',
        title: 'Získejte bonusy za nové přátele',
        text: 'Pozvání přátel a připsání bonusů za jejich aktivitu — ve vývoji.',
        comingSoon: true,
      },
      {
        emoji: '💎',
        title: 'Placené žádosti o přátelství',
        text: 'Placené pozvánky od VIP uživatelů — funkce se připravuje ke spuštění.',
        comingSoon: true,
      },
      {
        emoji: '📈',
        title: 'Budoucí výplaty uživatelům',
        text: 'Výplaty autorům a aktivním členům za obsah, doporučení a monetizaci — ve vývoji.',
        comingSoon: true,
      },
      {
        emoji: '🎁',
        title: 'Dárky a monetizace aktivity',
        text: 'Propojení bonusů s dárky a placenými funkcemi — připravuje se ke spuštění.',
        comingSoon: true,
      },
      {
        emoji: '🔗',
        title: 'Referral systém',
        text: 'Evidence pozvánek a transparentní historie připsání — ve vývoji.',
        comingSoon: true,
      },
      {
        emoji: '🛡️',
        title: 'Antifraud pravidla',
        text: 'Zákaz botů, multiúčtů a manipulace — pravidla při spuštění programu.',
        comingSoon: true,
      },
    ],
    comingSoonSection: {
      title: 'Již brzy v MeYou',
      items: [
        {
          emoji: '👛',
          title: 'Peněženka',
          text: 'Jednotný zůstatek pro bonusy, dárky a budoucí operace.',
        },
        {
          emoji: '💳',
          title: 'Výběr prostředků',
          text: 'Výběr nasbíraných prostředků přes ověřené platební poskytovatele.',
        },
        {
          emoji: '🎀',
          title: 'Dárky',
          text: 'Rozšířený katalog dárků a prémiových efektů pro podporu autorů.',
        },
        {
          emoji: '⭐',
          title: 'Prémiový účet',
          text: 'VIP status s dalšími možnostmi a prioritou v komunitě.',
        },
      ],
    },
    faq: [
      {
        question: 'Kdy se spustí bonusový program?',
        answer:
          'Všechny funkce odměn jsou nyní ve vývoji. O startu programu informujeme v aplikaci a na této stránce.',
      },
      {
        question: 'Lze již získat bonusy?',
        answer:
          'Ne, připsání bonusů zatím není dostupné. Peněženka, výplaty a referral systém se připravují ke spuštění.',
      },
      {
        question: 'Co se stane při porušení pravidel?',
        answer:
          'Po spuštění programu jsou zakázáni boti, multiúčty a manipulace. Porušení povede ke zrušení bonusů a možnému zablokování.',
      },
    ],
    cta: {
      label: 'Vytvořit účet a dozvědět se první',
      path: '/auth/register',
    },
  },
  chat: {
    key: 'chat',
    emoji: '💬',
    icon: '/icon1/2.png',
    title: 'Moderní chat',
    subtitle: 'Rychlá komunikace s médii, reakcemi a ochranou soukromí',
    intro:
      'Soukromé dialogy v reálném čase. Text, fotky, video, hlasové zprávy a emoji reakce — v pohodlném rozhraní MeYou s notifikacemi a kontrolou přístupu.',
    cards: [
      {
        emoji: '💬',
        title: 'Soukromé chaty',
        text: 'Jeden na jednoho s přáteli a sledujícími. Okamžité doručení přes WebSocket a stav „píše…“.',
      },
      {
        emoji: '👑',
        title: 'VIP chaty',
        text: 'Prémiové dialogy pro VIP uživatele — samostatná sekce se připravuje ke spuštění.',
        comingSoon: true,
      },
      {
        emoji: '👥',
        title: 'Skupinové chaty',
        text: 'Společné místnosti pro přátele a komunity — bez přechodu do jiných messengerů.',
        comingSoon: true,
      },
      {
        emoji: '😊',
        title: 'Emoji reakce',
        text: 'Rychle reagujte na zprávy emoji — bez zbytečných odpovědí v konverzaci.',
      },
      {
        emoji: '📷',
        title: 'Fotky a video',
        text: 'Odesílejte média s náhledem v chatu a celoobrazovkovým prohlížečem.',
      },
      {
        emoji: '🎙️',
        title: 'Hlasové zprávy',
        text: 'Nahrávejte a odesílejte hlasové poznámky přímo v dialogu — již dostupné v MeYou chatech.',
      },
      {
        emoji: '📹',
        title: 'Videohovory',
        text: 'Videohovor jeden na jednoho v rámci platformy MeYou.',
        comingSoon: true,
      },
      {
        emoji: '🔐',
        title: 'Ochrana soukromí zpráv',
        text: 'Blokování, nastavení profilu a kontrola toho, kdo vám může psát.',
      },
    ],
    cta: {
      label: 'Přihlásit se a otevřít chaty',
      path: '/auth/login',
    },
  },
  security: {
    key: 'security',
    emoji: '🔒',
    icon: '/icon1/3.png',
    title: 'Plná bezpečnost',
    subtitle: 'Ochrana účtu, ověření a soukromí na MeYou',
    intro:
      'MeYou kombinuje technická bezpečnostní opatření s transparentními pravidly: od Google Login po moderaci, blokování a kontrolu viditelnosti obsahu.',
    cards: [
      {
        emoji: '🔑',
        title: 'Dvoufaktorové ověření',
        text: 'Další úroveň ochrany přihlášení pomocí potvrzovacího kódu.',
        comingSoon: true,
      },
      {
        emoji: '💳',
        title: 'Ochrana plateb',
        text: 'Bezpečné zpracování transakcí přes ověřené poskytovatele — funkce se připravuje ke spuštění.',
        comingSoon: true,
      },
      {
        emoji: '✅',
        title: 'Ověření účtů',
        text: 'Potvrzení emailu po registraci je již dostupné — povinný krok pro ochranu vašeho profilu.',
      },
      {
        emoji: '🚩',
        title: 'Nahlášení a moderace',
        text: 'Hlaste porušení přes vestavěné nástroje — tým uplatňuje sankce.',
      },
      {
        emoji: '📱',
        title: 'Aktivní relace zařízení',
        text: 'Přehled a správa zařízení, ze kterých jste přihlášeni.',
        comingSoon: true,
      },
      {
        emoji: '🚫',
        title: 'Blokování uživatelů',
        text: 'Zablokujte nežádoucí lidi — nebudou vám moci psát ani vidět omezený obsah.',
      },
      {
        emoji: '🔒',
        title: 'Soukromé profily',
        text: 'Omezte přístup k profilu — žádosti o sledování vyžadují schválení, obsah je chráněn.',
      },
      {
        emoji: '🌐',
        title: 'Google Login',
        text: 'Rychlé přihlášení přes Google OAuth. Tokeny jsou uloženy bezpečně a zrušeny při smazání účtu.',
      },
      {
        emoji: '👁️',
        title: 'Kontrola soukromí profilu a Stories',
        text: 'Spravujte viditelnost polí profilu, stories a publika — veřejně, pro sledující nebo close friends.',
      },
    ],
    cta: {
      label: 'Zobrazit zásady ochrany soukromí',
      path: '/legal/privacy',
    },
  },
};

export const FEATURE_UI = {
  brand: 'MeYou',
  backHome: 'Domů',
  highlightsTitle: 'Klíčové funkce',
  blocksTitle: 'Více informací',
  faqTitle: 'Časté dotazy',
  futureTitle: 'Již brzy',
  comingSoonLabel: 'Již brzy',
  comingSoonSectionTitle: 'Již brzy v MeYou',
  exploreMore: 'Funkce MeYou',
  cardsSwipeHint: 'Přejeďte doprava pro více →',
};
