import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '../../zustand/useAuthStore';
import { passwordApi } from '../../services/passwordApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { EMAIL_REGEX } from '../../utils/validationRegister';
import SettingsPageShell from '../../components/Settings/SettingsPageShell';
import '../../components/Settings/SettingsPageShell.scss';

export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userEmail = useAuthStore((s) => s.user?.email) || '';
  const [email] = useState(userEmail);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailError = useMemo(() => {
    const value = (email || '').trim();
    if (!value) return t('settings.changePassword.errors.emailRequired');
    if (!EMAIL_REGEX.test(value)) return t('settings.changePassword.errors.emailInvalid');
    return '';
  }, [email, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (emailError) return;

    setIsSubmitting(true);
    try {
      await passwordApi.forgotPassword(email.trim());
      toast.success(t('settings.changePassword.toastSent'));
      navigate('/auth/reset/verify-code', { state: { email: email.trim() } });
    } catch (err) {
      const msg =
        getApiErrorMessage(err) || t('settings.changePassword.errors.sendFailed');
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SettingsPageShell
      title={t('settings.changePassword.title')}
      subtitle={t('settings.changePassword.subtitle')}
      onBack={() => navigate('/settings/account')}
    >
      <form className="settings-card settings-form" onSubmit={handleSubmit}>
        <div className="settings-form__field">
          <label className="settings-form__label" htmlFor="change-password-email">
            {t('settings.changePassword.emailLabel')}
          </label>
          <input
            id="change-password-email"
            name="email"
            type="email"
            className="settings-form__input"
            value={email}
            readOnly
            disabled
            autoComplete="email"
          />
          <p className="settings-form__hint">{t('settings.changePassword.emailHint')}</p>
        </div>

        {submitError ? <p className="settings-form__error">{submitError}</p> : null}

        <button type="submit" className="settings-form__submit" disabled={isSubmitting || Boolean(emailError)}>
          {isSubmitting ? t('settings.changePassword.submitting') : t('settings.changePassword.submit')}
        </button>
      </form>
    </SettingsPageShell>
  );
}
