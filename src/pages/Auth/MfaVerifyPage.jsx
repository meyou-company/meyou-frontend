import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { authApi } from '../../services/auth';
import { useAuthStore } from '../../zustand/useAuthStore';
import { useForceDarkTheme } from '../../hooks/useForceDarkTheme';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import {
  clearMfaChallenge,
  readMfaChallenge,
} from '../../utils/mfaChallengeStorage';
import BrandLogo from '../../components/BrandLogo/BrandLogo';
import { hasAcceptedTerms } from '../../utils/authTerms';
import './MfaVerifyPage.scss';

function postAuthPath(user) {
  if (!hasAcceptedTerms(user)) return '/legal/accept-terms';
  const verified =
    user.isVerified === true ||
    user.emailVerified === true ||
    Boolean(user.emailVerifiedAt || user.email_verified);
  if (!verified) return '/auth/verify-email';
  if (user.profileCompleted !== true) return '/users/profile/complete';
  return '/profile';
}

function MethodTabs({ method, onChange, t }) {
  return (
    <div className="mfa-method" role="tablist" aria-label={t('auth.mfa.methodLabel')}>
      <button
        type="button"
        role="tab"
        aria-selected={method === 'totp'}
        className={`mfa-method__btn ${method === 'totp' ? 'mfa-method__btn--active' : ''}`}
        onClick={() => onChange('totp')}
      >
        {t('auth.mfa.methodTotp')}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={method === 'backup'}
        className={`mfa-method__btn ${method === 'backup' ? 'mfa-method__btn--active' : ''}`}
        onClick={() => onChange('backup')}
      >
        {t('auth.mfa.methodBackup')}
      </button>
    </div>
  );
}

export default function MfaVerifyPage() {
  useForceDarkTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const completeMfaLogin = useAuthStore((s) => s.completeMfaLogin);
  const [method, setMethod] = useState('totp');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const challenge = readMfaChallenge();

  const goLogin = useCallback(() => {
    clearMfaChallenge();
    navigate('/auth/login', { replace: true });
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!challenge) {
      toast.error(t('auth.mfa.errors.challengeExpired'));
      goLogin();
      return;
    }
    const trimmed = code.replace(/\s+/g, '');
    if (!trimmed) {
      toast.error(t('auth.mfa.errors.codeRequired'));
      return;
    }
    try {
      setSubmitting(true);
      const data = await authApi.verifyMfa({
        challengeToken: challenge.challengeToken,
        code: trimmed,
        method,
      });
      clearMfaChallenge();
      const result = await completeMfaLogin(data);
      if (!result?.ok) {
        throw result?.error ?? new Error('MFA session failed');
      }
      toast.success(t('auth.mfa.success'));
      navigate(postAuthPath(result.user), { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('auth.mfa.errors.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!challenge) {
    return (
      <section className="auth auth--mfa">
        <div className="auth__card">
          <p>{t('auth.mfa.errors.challengeExpired')}</p>
          <button type="button" className="auth__primary" onClick={goLogin}>
            {t('auth.mfa.backToLogin')}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="auth auth--mfa">
      <button
        type="button"
        className="back-arrow"
        onClick={goLogin}
        aria-label={t('common.back')}
      >
        <img src="/icon1/Vector.png" alt="" aria-hidden className="back-arrow__icon" />
      </button>
      <div className="auth__brand">
        <BrandLogo />
      </div>
      <h1 className="auth__title">{t('auth.mfa.title')}</h1>
      <p className="auth__subtitle">{t('auth.mfa.subtitle')}</p>
      <form className="auth__form" onSubmit={onSubmit}>
        <MethodTabs method={method} onChange={setMethod} t={t} />
        <label className="auth__label" htmlFor="mfa-code">
          {method === 'totp' ? t('auth.mfa.totpLabel') : t('auth.mfa.backupLabel')}
        </label>
        <input
          id="mfa-code"
          className="auth__input"
          inputMode={method === 'totp' ? 'numeric' : 'text'}
          autoComplete="one-time-code"
          value={code}
          onChange={(ev) => setCode(ev.target.value)}
          placeholder={
            method === 'totp' ? t('auth.mfa.totpPlaceholder') : t('auth.mfa.backupPlaceholder')
          }
        />
        <button type="submit" className="auth__primary" disabled={submitting}>
          {submitting ? t('auth.mfa.verifying') : t('auth.mfa.verify')}
        </button>
      </form>
    </section>
  );
}