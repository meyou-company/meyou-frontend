import { useTranslation } from 'react-i18next';

/** Іконки для зовнішнього шеру (круглі, як у TikTok / Instagram). */

function IconTelegram() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.78 14.95 9.5 19.2c.55 0 .79-.24 1.08-.52l2.6-2.49 5.39 3.95c.99.54 1.7.26 1.96-.9l3.54-16.62h.01c.32-1.48-.54-2.06-1.52-1.7L2.1 9.44c-1.45.56-1.43 1.36-.25 1.72l5.06 1.58L18.9 5.5c.66-.43 1.26-.2.77.27" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

function ShareExternalItem({ label, iconClassName, icon, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      className="shareExternalItem"
      onClick={onClick}
      aria-label={ariaLabel || label}
    >
      <span className={["shareExternalIcon", iconClassName].filter(Boolean).join(" ")}>
        {icon}
      </span>
      <span className="shareExternalLabel">{label}</span>
    </button>
  );
}

export default function ShareExternalSheet({
  onCopyLink,
  onSystemShare,
  systemShareAvailable,
  onOpenUrl,
}) {
  const { t } = useTranslation();

  const items = [
    {
      id: "telegram",
      label: "Telegram",
      iconClass: "shareExternalIcon--telegram",
      icon: <IconTelegram />,
      onClick: () => onOpenUrl?.("telegram"),
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      iconClass: "shareExternalIcon--whatsapp",
      icon: <IconWhatsApp />,
      onClick: () => onOpenUrl?.("whatsapp"),
    },
    {
      id: "facebook",
      label: "Facebook",
      iconClass: "shareExternalIcon--facebook",
      icon: <IconFacebook />,
      onClick: () => onOpenUrl?.("facebook"),
    },
    {
      id: "tiktok",
      label: "TikTok",
      iconClass: "shareExternalIcon--tiktok",
      icon: <IconTikTok />,
      onClick: () => onOpenUrl?.("tiktok"),
    },
    {
      id: "twitter",
      label: "X",
      iconClass: "shareExternalIcon--twitter",
      icon: <IconX />,
      onClick: () => onOpenUrl?.("twitter"),
    },
    {
      id: "copy",
      label: t('posts.shareExternal.copy'),
      iconClass: "shareExternalIcon--copy",
      icon: <IconCopy />,
      onClick: onCopyLink,
    },
  ];

  if (systemShareAvailable) {
    items.push({
      id: "system",
      label: t('posts.shareExternal.more'),
      iconClass: "shareExternalIcon--system",
      icon: <IconMore />,
      onClick: onSystemShare,
      ariaLabel: t('posts.shareExternal.systemAria'),
    });
  }

  return (
    <div className="shareExternalRow" role="list" aria-label={t('posts.shareExternal.listAria')}>
      {items.map((item) => (
        <ShareExternalItem
          key={item.id}
          label={item.label}
          iconClassName={item.iconClass}
          icon={item.icon}
          onClick={item.onClick}
          ariaLabel={item.ariaLabel}
        />
      ))}
    </div>
  );
}
