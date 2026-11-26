import { useTranslation } from 'react-i18next';
export default function AdminUsersPage() {
  const { t } = useTranslation();
  return (
    <section className="adminPage">
      <header className="adminPage__header">
        <h1>{t('admin.nav.users')}</h1>
        <p>{t('adminAudit.usersPlaceholder')}</p>
      </header>
      <div className="adminEmpty" role="status">
        {t('adminAudit.usersComingSoon')}
      </div>
    </section>
  );
}
