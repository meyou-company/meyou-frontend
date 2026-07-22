export const FEATURE_NAV = [
  { key: 'earn', path: '/earn', label: 'Arkadaş bonusları' },
  { key: 'chat', path: '/features/chat', label: 'Modern sohbet' },
  { key: 'security', path: '/features/security', label: 'Tam güvenlik' },
];

export const FEATURE_PAGES = {
  earn: {
    key: 'earn',
    emoji: '💰',
    icon: '/icon1/1.png',
    title: 'Arkadaş bonusları',
    subtitle: 'Ödül programı — geliştiriliyor',
    intro:
      'MeYou, arkadaş bonusları ve topluluk aktivitesi için bir program hazırlıyor. Bu sayfadaki tüm özellikler gelecekteki olanaklardır; lansmanı uygulamada duyuracağız.',
    cards: [
      {
        emoji: '👥',
        title: 'Yeni arkadaşlar için bonus kazanın',
        text: 'Arkadaş davet etmek ve aktiviteleri için bonus kazanmak — geliştiriliyor.',
        comingSoon: true,
      },
      {
        emoji: '💎',
        title: 'Ücretli arkadaşlık istekleri',
        text: 'VIP kullanıcılardan ücretli davetler — özellik lansmana hazırlanıyor.',
        comingSoon: true,
      },
      {
        emoji: '📈',
        title: 'Gelecekteki kullanıcı ödemeleri',
        text: 'İçerik, referans ve monetizasyon için yaratıcılara ve aktif üyelere ödemeler — geliştiriliyor.',
        comingSoon: true,
      },
      {
        emoji: '🎁',
        title: 'Hediyeler ve aktivite monetizasyonu',
        text: 'Bonusların hediyeler ve ücretli özelliklerle bağlantısı — lansmana hazırlanıyor.',
        comingSoon: true,
      },
      {
        emoji: '🔗',
        title: 'Referans sistemi',
        text: 'Davet takibi ve şeffaf bonus geçmişi — geliştiriliyor.',
        comingSoon: true,
      },
      {
        emoji: '🛡️',
        title: 'Dolandırıcılık önleme kuralları',
        text: 'Botlar, çoklu hesaplar ve manipülasyon yasak — program lansmanındaki kurallar.',
        comingSoon: true,
      },
    ],
    comingSoonSection: {
      title: 'Yakında MeYou’da',
      items: [
        {
          emoji: '👛',
          title: 'Cüzdan',
          text: 'Bonuslar, hediyeler ve gelecekteki işlemler için tek bakiye.',
        },
        {
          emoji: '💳',
          title: 'Para çekme',
          text: 'Biriken fonları doğrulanmış ödeme sağlayıcılarıyla çekme.',
        },
        {
          emoji: '🎀',
          title: 'Hediyeler',
          text: 'Yaratıcıları desteklemek için genişletilmiş hediye kataloğu ve premium efektler.',
        },
        {
          emoji: '⭐',
          title: 'Premium hesap',
          text: 'Ek özellikler ve toplulukta öncelikli VIP statüsü.',
        },
      ],
    },
    faq: [
      {
        question: 'Bonus programı ne zaman başlayacak?',
        answer:
          'Tüm ödül özellikleri şu anda geliştiriliyor. Program başlangıcını uygulamada ve bu sayfada duyuracağız.',
      },
      {
        question: 'Şimdiden bonus alınabilir mi?',
        answer:
          'Hayır, bonus birikimi henüz mevcut değil. Cüzdan, ödemeler ve referans sistemi lansmana hazırlanıyor.',
      },
      {
        question: 'Kurallar ihlal edilirse ne olur?',
        answer:
          'Lansmandan sonra botlar, çoklu hesaplar ve manipülasyon yasaktır. İhlaller bonus iptali ve olası engellemeye yol açar.',
      },
    ],
    cta: {
      label: 'Hesap oluştur ve ilk sen öğren',
      path: '/auth/register',
    },
  },
  chat: {
    key: 'chat',
    emoji: '💬',
    icon: '/icon1/2.png',
    title: 'Modern sohbet',
    subtitle: 'Medya, reaksiyonlar ve gizlilik korumasıyla hızlı iletişim',
    intro:
      'Gerçek zamanlı özel diyaloglar. Metin, fotoğraf, video, sesli mesajlar ve emoji reaksiyonları — bildirimler ve erişim kontrolüyle pratik bir MeYou arayüzünde.',
    cards: [
      {
        emoji: '💬',
        title: 'Özel sohbetler',
        text: 'Arkadaşlar ve takipçilerle bire bir. WebSocket ile anlık teslimat ve «yazıyor…» durumu.',
      },
      {
        emoji: '👑',
        title: 'VIP sohbetler',
        text: 'VIP kullanıcılar için premium diyaloglar — ayrı bölüm lansmana hazırlanıyor.',
        comingSoon: true,
      },
      {
        emoji: '👥',
        title: 'Grup sohbetleri',
        text: 'Arkadaşlar ve topluluklar için ortak odalar — üçüncü taraf mesajlaşma uygulamalarına gerek yok.',
        comingSoon: true,
      },
      {
        emoji: '😊',
        title: 'Emoji reaksiyonları',
        text: 'Mesajlara emoji ile hızlıca tepki verin — sohbeti gereksiz yanıtlarla doldurmadan.',
      },
      {
        emoji: '📷',
        title: 'Fotoğraf ve video',
        text: 'Sohbette önizleme ve tam ekran görüntüleyiciyle medya gönderin.',
      },
      {
        emoji: '🎙️',
        title: 'Sesli mesajlar',
        text: 'Diyalogda doğrudan sesli notlar kaydedin ve gönderin — MeYou sohbetlerinde zaten mevcut.',
      },
      {
        emoji: '📹',
        title: 'Görüntülü aramalar',
        text: 'MeYou platformu içinde bire bir görüntülü görüşme.',
        comingSoon: true,
      },
      {
        emoji: '🔐',
        title: 'Mesaj gizliliği koruması',
        text: 'Engelleme, profil ayarları ve size kimin yazabileceğinin kontrolü.',
      },
    ],
    cta: {
      label: 'Giriş yap ve sohbetleri aç',
      path: '/auth/login',
    },
  },
  security: {
    key: 'security',
    emoji: '🔒',
    icon: '/icon1/3.png',
    title: 'Tam güvenlik',
    subtitle: 'MeYou’da hesap koruması, doğrulama ve gizlilik',
    intro:
      'MeYou, Google Login’den moderasyona, engellemeye ve içerik görünürlük kontrolüne kadar teknik güvenlik önlemlerini şeffaf kurallarla birleştirir.',
    cards: [
      {
        emoji: '🔑',
        title: 'İki faktörlü kimlik doğrulama',
        text: 'Onay koduyla ek giriş koruması katmanı.',
        comingSoon: true,
      },
      {
        emoji: '💳',
        title: 'Ödeme koruması',
        text: 'Doğrulanmış sağlayıcılarla güvenli işlem işleme — lansmana hazırlanıyor.',
        comingSoon: true,
      },
      {
        emoji: '✅',
        title: 'Hesap doğrulama',
        text: 'Kayıttan sonra e-posta onayı zaten mevcut — profilinizi korumak için zorunlu adım.',
      },
      {
        emoji: '🚩',
        title: 'Şikayetler ve moderasyon',
        text: 'Yerleşik araçlarla ihlalleri bildirin — ekip yaptırım uygular.',
      },
      {
        emoji: '📱',
        title: 'Aktif cihaz oturumları',
        text: 'Giriş yaptığınız cihazları görüntüleyin ve yönetin.',
        comingSoon: true,
      },
      {
        emoji: '🚫',
        title: 'Kullanıcı engelleme',
        text: 'İstenmeyen kişileri engelleyin — size yazamaz ve kısıtlı içeriği göremezler.',
      },
      {
        emoji: '🔒',
        title: 'Özel profiller',
        text: 'Profile erişimi kısıtlayın — takip istekleri onay gerektirir, içerik korunur.',
      },
      {
        emoji: '🌐',
        title: 'Google Login',
        text: 'Google OAuth ile hızlı giriş. Tokenlar güvenle saklanır ve hesap silindiğinde iptal edilir.',
      },
      {
        emoji: '👁️',
        title: 'Profil ve Stories gizlilik kontrolü',
        text: 'Profil alanları, stories ve kitle görünürlüğünü yönetin — herkese açık, takipçiler veya close friends.',
      },
    ],
    cta: {
      label: 'Gizlilik politikasını görüntüle',
      path: '/legal/privacy',
    },
  },
};

export const FEATURE_UI = {
  brand: 'MeYou',
  backHome: 'Ana sayfaya dön',
  highlightsTitle: 'Temel özellikler',
  blocksTitle: 'Daha fazla bilgi',
  faqTitle: 'SSS',
  futureTitle: 'Yakında',
  comingSoonLabel: 'Yakında',
  comingSoonSectionTitle: 'Yakında MeYou’da',
  exploreMore: 'MeYou özellikleri',
  cardsSwipeHint: 'Daha fazlası için sağa kaydırın →',
};
