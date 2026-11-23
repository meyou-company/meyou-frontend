import { useTranslation } from 'react-i18next';
export default function AdminUsersPage() {
  const { t } = useTranslation();
  return (
    <section className="adminPage">
      <header className="adminPage__header">
        <h1>{t("uiText.users")}</h1>
        <p>{t('adminAudit.usersPlaceholder')}</p>
      </header>
      <div className="adminEmpty">{t("uiText.coming_soon")}</div>
    </section>
  );
}
