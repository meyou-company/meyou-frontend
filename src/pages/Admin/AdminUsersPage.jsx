import { useTranslation } from 'react-i18next';
export default function AdminUsersPage() {
  const { t } = useTranslation();
  return (
    <section className="adminPage">
      <header className="adminPage__header">
        <h1>Users</h1>
        <p>{t('adminAudit.usersPlaceholder')}</p>
      </header>
      <div className="adminEmpty">Coming soon</div>
    </section>
  );
}
