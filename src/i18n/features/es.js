export const FEATURE_NAV = [
  { key: 'earn', path: '/earn', label: 'Bonos por amigos' },
  { key: 'chat', path: '/features/chat', label: 'Chat moderno' },
  { key: 'security', path: '/features/security', label: 'Seguridad total' },
];

export const FEATURE_PAGES = {
  earn: {
    key: 'earn',
    emoji: '💰',
    icon: '/icon1/1.png',
    title: 'Bonos por amigos',
    subtitle: 'Programa de recompensas — en desarrollo',
    intro:
      'MeYou prepara un programa de bonos por amigos y actividad en la comunidad. Todas las funciones de esta página son futuras; anunciaremos el lanzamiento en la app.',
    cards: [
      {
        emoji: '👥',
        title: 'Gana bonos por nuevos amigos',
        text: 'Invitar amigos y ganar bonos por su actividad — en desarrollo.',
        comingSoon: true,
      },
      {
        emoji: '💎',
        title: 'Solicitudes de amistad de pago',
        text: 'Invitaciones de pago de usuarios VIP — función en preparación.',
        comingSoon: true,
      },
      {
        emoji: '📈',
        title: 'Futuros pagos a usuarios',
        text: 'Pagos a creadores y miembros activos por contenido, referidos y monetización — en desarrollo.',
        comingSoon: true,
      },
      {
        emoji: '🎁',
        title: 'Regalos y monetización de actividad',
        text: 'Conexión de bonos con regalos y funciones de pago — en preparación.',
        comingSoon: true,
      },
      {
        emoji: '🔗',
        title: 'Sistema de referidos',
        text: 'Seguimiento de invitaciones e historial transparente de bonos — en desarrollo.',
        comingSoon: true,
      },
      {
        emoji: '🛡️',
        title: 'Reglas antifraude',
        text: 'Prohibición de bots, multicuentas y manipulación — reglas al lanzar el programa.',
        comingSoon: true,
      },
    ],
    comingSoonSection: {
      title: 'Próximamente en MeYou',
      items: [
        {
          emoji: '👛',
          title: 'Cartera',
          text: 'Un saldo único para bonos, regalos y futuras operaciones.',
        },
        {
          emoji: '💳',
          title: 'Retiros',
          text: 'Retiro de fondos acumulados a través de proveedores de pago verificados.',
        },
        {
          emoji: '🎀',
          title: 'Regalos',
          text: 'Catálogo ampliado de regalos y efectos premium para apoyar a creadores.',
        },
        {
          emoji: '⭐',
          title: 'Cuenta premium',
          text: 'Estado VIP con funciones adicionales y prioridad en la comunidad.',
        },
      ],
    },
    faq: [
      {
        question: '¿Cuándo se lanzará el programa de bonos?',
        answer:
          'Todas las funciones de recompensa están en desarrollo. Anunciaremos el inicio del programa en la app y en esta página.',
      },
      {
        question: '¿Ya se pueden obtener bonos?',
        answer:
          'No, la acumulación de bonos aún no está disponible. Cartera, pagos y referidos se preparan para el lanzamiento.',
      },
      {
        question: '¿Qué pasa si se violan las reglas?',
        answer:
          'Tras el lanzamiento, están prohibidos bots, multicuentas y manipulación. Las violaciones llevarán a la cancelación de bonos y posible bloqueo.',
      },
    ],
    cta: {
      label: 'Crear cuenta y enterarse primero',
      path: '/auth/register',
    },
  },
  chat: {
    key: 'chat',
    emoji: '💬',
    icon: '/icon1/2.png',
    title: 'Chat moderno',
    subtitle: 'Comunicación rápida con medios, reacciones y protección de privacidad',
    intro:
      'Diálogos privados en tiempo real. Texto, fotos, video, mensajes de voz y reacciones emoji — en una interfaz MeYou cómoda con notificaciones y control de acceso.',
    cards: [
      {
        emoji: '💬',
        title: 'Chats privados',
        text: 'Uno a uno con amigos y seguidores. Entrega instantánea vía WebSocket y estado «escribiendo…».',
      },
      {
        emoji: '👑',
        title: 'Chats VIP',
        text: 'Diálogos premium para usuarios VIP — sección separada en preparación.',
        comingSoon: true,
      },
      {
        emoji: '👥',
        title: 'Chats grupales',
        text: 'Salas compartidas para amigos y comunidades — sin mensajeros externos.',
        comingSoon: true,
      },
      {
        emoji: '😊',
        title: 'Reacciones emoji',
        text: 'Reacciona rápido a los mensajes con emoji — sin saturar la conversación.',
      },
      {
        emoji: '📷',
        title: 'Fotos y video',
        text: 'Envía medios con vista previa en el chat y visor a pantalla completa.',
      },
      {
        emoji: '🎙️',
        title: 'Mensajes de voz',
        text: 'Graba y envía notas de voz directamente en el diálogo — ya disponible en los chats MeYou.',
      },
      {
        emoji: '📹',
        title: 'Videollamadas',
        text: 'Videollamada uno a uno dentro de la plataforma MeYou.',
        comingSoon: true,
      },
      {
        emoji: '🔐',
        title: 'Protección de privacidad de mensajes',
        text: 'Bloqueo, ajustes de perfil y control de quién puede escribirte.',
      },
    ],
    cta: {
      label: 'Iniciar sesión y abrir chats',
      path: '/auth/login',
    },
  },
  security: {
    key: 'security',
    emoji: '🔒',
    icon: '/icon1/3.png',
    title: 'Seguridad total',
    subtitle: 'Protección de cuenta, verificación y privacidad en MeYou',
    intro:
      'MeYou combina medidas técnicas de seguridad con reglas transparentes: desde Google Login hasta moderación, bloqueo y control de visibilidad del contenido.',
    cards: [
      {
        emoji: '🔑',
        title: 'Autenticación de dos factores',
        text: 'Capa adicional de protección de inicio de sesión con código de confirmación.',
        comingSoon: true,
      },
      {
        emoji: '💳',
        title: 'Protección de pagos',
        text: 'Procesamiento seguro de transacciones a través de proveedores verificados — en preparación.',
        comingSoon: true,
      },
      {
        emoji: '✅',
        title: 'Verificación de cuentas',
        text: 'Confirmación de email tras el registro ya disponible — paso obligatorio para proteger tu perfil.',
      },
      {
        emoji: '🚩',
        title: 'Denuncias y moderación',
        text: 'Reporta infracciones con herramientas integradas — el equipo aplica sanciones.',
      },
      {
        emoji: '📱',
        title: 'Sesiones activas de dispositivos',
        text: 'Consulta y gestiona los dispositivos donde has iniciado sesión.',
        comingSoon: true,
      },
      {
        emoji: '🚫',
        title: 'Bloqueo de usuarios',
        text: 'Bloquea personas no deseadas — no podrán escribirte ni ver contenido restringido.',
      },
      {
        emoji: '🔒',
        title: 'Perfiles privados',
        text: 'Restringe el acceso al perfil — las solicitudes de seguimiento requieren aprobación, el contenido está protegido.',
      },
      {
        emoji: '🌐',
        title: 'Google Login',
        text: 'Inicio rápido con Google OAuth. Los tokens se almacenan de forma segura y se revocan al eliminar la cuenta.',
      },
      {
        emoji: '👁️',
        title: 'Control de privacidad del perfil y Stories',
        text: 'Gestiona la visibilidad de campos del perfil, stories y audiencia — público, seguidores o close friends.',
      },
    ],
    cta: {
      label: 'Ver política de privacidad',
      path: '/legal/privacy',
    },
  },
};

export const FEATURE_UI = {
  brand: 'MeYou',
  backHome: 'Volver al inicio',
  highlightsTitle: 'Funciones clave',
  blocksTitle: 'Más información',
  faqTitle: 'Preguntas frecuentes',
  futureTitle: 'Próximamente',
  comingSoonLabel: 'Próximamente',
  comingSoonSectionTitle: 'Próximamente en MeYou',
  exploreMore: 'Funciones de MeYou',
  cardsSwipeHint: 'Desliza a la derecha para ver más →',
};
