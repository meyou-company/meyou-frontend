import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { authApi } from '../../services/auth';
import { useAuthStore } from '../../zustand/useAuthStore';
import { useForceDarkTheme } from '../../hooks/useForceDarkTheme';
import {
  getApiErrorCode,
  getApiErrorMessage,
} from '../../utils/getApiErrorMessage';
import {
  clearMfaChallenge,
  readMfaChallenge,
} from '../../utils/mfaChallengeStorage';
import { LuClock } from 'react-icons/lu';
import BrandLogo from '../../components/BrandLogo/BrandLogo';
import MfaCodeField from '../../components/Auth/MfaCodeField';
import { hasAcceptedTerms } from '../../utils/authTerms';
import '../../components/Auth/Login/LoginForm.scss';
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

function resolveMfaErrorMessage(err, t) {
  const code = getApiErrorCode(err);
  if (code === 'MFA_CHALLENGE_EXPIRED') {
    return t('auth.mfa.errors.challengeExpired');
  }
  if (code === 'MFA_INVALID_CODE' || code === 'MFA_TOTP_REPLAY') {
    return t('auth.mfa.errors.invalidCode');
  }
  if (code === 'MFA_ATTEMPTS_EXCEEDED') {
    return t('auth.mfa.errors.attemptsExceeded');
  }
  return getApiErrorMessage(err) || t('auth.mfa.errors.failed');
}

function MethodTabs({ method, onChange, t, disabled }) {
  return (
    <div className="mfa-verify__tabs" role="tablist" aria-label={t('auth.mfa.methodLabel')}>
      <button
        type="button"
        role="tab"
        aria-selected={method === 'totp'}
        disabled={disabled}
        className={`mfa-verify__tab ${method === 'totp' ? 'mfa-verify__tab--active' : ''}`}
        onClick={() => onChange('totp')}
      >
        {t('auth.mfa.methodTotp')}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={method === 'backup'}
        disabled={disabled}
        className={`mfa-verify__tab ${method === 'backup' ? 'mfa-verify__tab--active' : ''}`}
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
  const [fieldError, setFieldError] = useState('');

  const challenge = readMfaChallenge();

  const goLogin = useCallback(() => {
    clearMfaChallenge();
    navigate('/auth/login', { replace: true });
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setFieldError('');
    if (!challenge) {
      setFieldError(t('auth.mfa.errors.challengeExpired'));
      return;
    }
    const trimmed = code.replace(/\s+/g, '');
    if (!trimmed) {
      setFieldError(t('auth.mfa.errors.codeRequired'));
      return;
    }
  if (method === 'totp' && trimmed.length < 6) {
      setFieldError(t('auth.mfa.errors.codeTooShort'));
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
      const msg = resolveMfaErrorMessage(err, t);
      setFieldError(msg);
      if (getApiErrorCode(err) === 'MFA_CHALLENGE_EXPIRED') {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onMethodChange = (next) => {
    setMethod(next);
    setCode('');
    setFieldError('');
  };

  if (!challenge) {
    return (
      <section className="auth auth--login auth--mfa">
        <div className="mfa-verify__shell">
          <form className="mfa-verify__card" onSubmit={(ev) => ev.preventDefault()}>
            <p className="mfa-verify__expired">{t('auth.mfa.errors.challengeExpired')}</p>
            <button type="button" className="btn-gradient btn-gradient--auth-primary mfa-verify__submit" onClick={goLogin}>
              {t('auth.mfa.backToLogin')}
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="auth auth--login auth--mfa">
      <button
        type="button"
        className="back-arrow"
        onClick={goLogin}
        aria-label={t('common.back')}
      >
        <img src="/icon1/Vector.png" alt="" aria-hidden className="back-arrow__icon" />
      </button>

      <div className="mfa-verify__shell">
        <div className="auth__logoCard mfa-verify__logo" aria-hidden="true">
          <BrandLogo className="auth__logoImg" decorative />
        </div>

        <div className="mfa-verify__card">
          <h1 className="mfa-verify__title">{t('auth.mfa.title')}</h1>
          <p className="mfa-verify__lead">{t('auth.mfa.subtitle')}</p>

          <form className="mfa-verify__form" onSubmit={onSubmit}>
            <MethodTabs method={method} onChange={onMethodChange} t={t} disabled={submitting} />

            <MfaCodeField
              label={method === 'backup' ? t('auth.mfa.backupLabel') : undefined}
              error={fieldError}
              value={code}
              onChange={setCode}
              mode={method === 'totp' ? 'totp' : 'backup'}
              variant={method === 'totp' ? 'cells' : 'single'}
              disabled={submitting}
              autoFocus
            />

            {method === 'totp' && !fieldError ? (
              <p className="mfa-verify__timer-hint">
                <LuClock className="mfa-verify__timer-icon" aria-hidden />
                {t('auth.mfa.totpHint')}
              </p>
            ) : null}
            {method === 'backup' && !fieldError ? (
              <p className="mfa-verify__timer-hint mfa-verify__timer-hint--plain">
                {t('auth.mfa.backupHint')}
              </p>
            ) : null}

            <button
              type="submit"
              className="btn-gradient btn-gradient--auth-primary mfa-verify__submit"
              disabled={submitting}
            >
              {submitting ? t('auth.mfa.verifying') : t('auth.mfa.verify')}
            </button>

            <button type="button" className="mfa-verify__help-link" onClick={goLogin}>
              {t('auth.mfa.troubleSignIn')}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}