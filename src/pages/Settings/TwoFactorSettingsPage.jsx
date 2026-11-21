import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { authApi } from '../../services/auth';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { parseOtpauthSecret } from '../../utils/parseOtpauthSecret';
import MfaCodeField from '../../components/Auth/MfaCodeField';
import SettingsPageShell from '../../components/Settings/SettingsPageShell';
import '../../components/Settings/SettingsPageShell.scss';
import './TwoFactorSettingsPage.scss';

const AUTH_LINKS = {
  googleIos:
    'https://apps.apple.com/app/google-authenticator/id388497605',
  googleAndroid:
    'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2',
  msIos: 'https://apps.apple.com/app/microsoft-authenticator/id983156458',
  msAndroid:
    'https://play.google.com/store/apps/details?id=com.azure.authenticator',
};

export default function TwoFactorSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [step, setStep] = useState('status');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [showManualSecret, setShowManualSecret] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableForm, setDisableForm] = useState({ code: '', password: '', method: 'totp' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const manualSecret = useMemo(
    () => (otpauthUri ? parseOtpauthSecret(otpauthUri) : null),
    [otpauthUri],
  );

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await authApi.getTotpStatus();
      setStatus(data);
      setStep(data.enabled ? 'manage' : 'status');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const startSetup = async () => {
    try {
      const data = await authApi.startTotpSetup();
      setOtpauthUri(data.otpauthUri);
      setConfirmCode('');
      setConfirmError('');
      setShowManualSecret(false);
      setStep('scan');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const confirmSetup = async (e) => {
    e.preventDefault();
    setConfirmError('');
    const code = confirmCode.trim();
    if (code.length < 6) {
      setConfirmError(t('settings.security.items.twoFactor.errors.codeTooShort'));
      return;
    }
    try {
      setSubmitting(true);
      const data = await authApi.confirmTotpSetup(code);
      setBackupCodes(data.backupCodes ?? []);
      setStep('backup');
      setOtpauthUri('');
      toast.success(t('settings.security.items.twoFactor.enabledToast'));
      await loadStatus();
    } catch (err) {
      setConfirmError(getApiErrorMessage(err) || t('settings.security.items.twoFactor.errors.confirmFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = async (text, toastKey) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t(toastKey));
    } catch {
      toast.error(t('settings.security.items.twoFactor.copyFailed'));
    }
  };

  const disable = async (e) => {
    e.preventDefault();
    if (!window.confirm(t('settings.security.items.twoFactor.disableConfirm'))) return;
    try {
      setSubmitting(true);
      await authApi.disableTotp({
        code: disableForm.code.trim(),
        method: disableForm.method,
        password: disableForm.password || undefined,
      });
      toast.success(t('settings.security.items.twoFactor.disabledToast'));
      setDisableOpen(false);
      setDisableForm({ code: '', password: '', method: 'totp' });
      await loadStatus();
      setStep('status');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const regenerate = async () => {
    if (!window.confirm(t('settings.security.items.twoFactor.regenerateConfirm'))) return;
    const code = window.prompt(t('settings.security.items.twoFactor.regeneratePrompt'));
    if (!code?.trim()) return;
    try {
      const data = await authApi.regenerateTotpBackup({
        code: code.trim(),
        method: 'totp',
      });
      setBackupCodes(data.backupCodes ?? []);
      setStep('backup');
      toast.success(t('settings.security.items.twoFactor.regeneratedToast'));
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleBack = () => navigate('/settings/security');

  return (
    <SettingsPageShell
      title={t('settings.security.items.twoFactor.pageTitle')}
      subtitle={t('settings.security.items.twoFactor.pageSubtitle')}
      onBack={handleBack}
    >
      <div className="two-factor-page">
        <div className="two-factor-panel settings-card">
          {loading ? (
            <p className="two-factor__muted">{t('settings.security.items.twoFactor.loading')}</p>
          ) : null}

          {!loading && step === 'status' && !status?.enabled ? (
            <div className="two-factor__section">
              <p className="two-factor__desc">{t('settings.security.items.twoFactor.intro')}</p>
              {status?.enrollmentAvailable === false ? (
                <p className="two-factor__warn">{t('settings.security.items.twoFactor.enrollmentOff')}</p>
              ) : (
                <button type="button" className="two-factor__cta" onClick={startSetup}>
                  {t('settings.security.items.twoFactor.startSetup')}
                </button>
              )}
            </div>
          ) : null}

          {step === 'scan' ? (
            <div className="two-factor__section two-factor__onboarding">
              <OnboardingStep
                step={1}
                title={t('settings.security.items.twoFactor.onboarding.step1Title')}
                body={t('settings.security.items.twoFactor.onboarding.step1Body')}
              >
                <ul className="two-factor__app-links">
                  <li>
                    <span>{t('settings.security.items.twoFactor.onboarding.googleAuth')}</span>
                    <a href={AUTH_LINKS.googleIos} target="_blank" rel="noopener noreferrer">
                      iOS
                    </a>
                    <a href={AUTH_LINKS.googleAndroid} target="_blank" rel="noopener noreferrer">
                      Android
                    </a>
                  </li>
                  <li>
                    <span>{t('settings.security.items.twoFactor.onboarding.msAuth')}</span>
                    <a href={AUTH_LINKS.msIos} target="_blank" rel="noopener noreferrer">
                      iOS
                    </a>
                    <a href={AUTH_LINKS.msAndroid} target="_blank" rel="noopener noreferrer">
                      Android
                    </a>
                  </li>
                </ul>
              </OnboardingStep>

              <OnboardingStep
                step={2}
                title={t('settings.security.items.twoFactor.onboarding.step2Title')}
                body={t('settings.security.items.twoFactor.onboarding.step2Body')}
              >
                <QrBlock uri={otpauthUri} />
                {manualSecret ? (
                  <div className="two-factor__manual">
                    <button
                      type="button"
                      className="two-factor__linkish"
                      onClick={() => setShowManualSecret((v) => !v)}
                    >
                      {showManualSecret
                        ? t('settings.security.items.twoFactor.onboarding.hideManualKey')
                        : t('settings.security.items.twoFactor.onboarding.showManualKey')}
                    </button>
                    {showManualSecret ? (
                      <div className="two-factor__secret-box">
                        <code className="two-factor__secret-code">{manualSecret}</code>
                        <button
                          type="button"
                          className="two-factor__ghost-btn"
                          onClick={() =>
                            void copyText(
                              manualSecret,
                              'settings.security.items.twoFactor.onboarding.secretCopied',
                            )
                          }
                        >
                          {t('settings.security.items.twoFactor.onboarding.copySecret')}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </OnboardingStep>

              <OnboardingStep
                step={3}
                title={t('settings.security.items.twoFactor.onboarding.step3Title')}
                body={t('settings.security.items.twoFactor.onboarding.step3Body')}
              >
                <form onSubmit={confirmSetup} className="two-factor__confirm-form">
                  <MfaCodeField
                    id="totp-confirm"
                    label={t('settings.security.items.twoFactor.confirmLabel')}
                    error={confirmError}
                    value={confirmCode}
                    onChange={setConfirmCode}
                    mode="totp"
                    disabled={submitting}
                  />
                  <button type="submit" className="two-factor__cta" disabled={submitting}>
                    {submitting
                      ? t('settings.security.items.twoFactor.confirming')
                      : t('settings.security.items.twoFactor.confirmButton')}
                  </button>
                </form>
              </OnboardingStep>
            </div>
          ) : null}

          {step === 'backup' && backupCodes.length > 0 ? (
            <BackupList
              codes={backupCodes}
              t={t}
              onCopyAll={() => void copyText(backupCodes.join('\n'), 'settings.security.items.twoFactor.backupCopied')}
              onDone={() => setStep('manage')}
            />
          ) : null}

          {!loading && (step === 'manage' || (status?.enabled && step !== 'scan' && step !== 'backup')) ? (
            <div className="two-factor__section">
              <StatusBadge enabled={Boolean(status?.enabled)} t={t} />
              <p className="two-factor__stat">
                {t('settings.security.items.twoFactor.backupRemaining', {
                  count: status?.backupCodesRemaining ?? 0,
                })}
              </p>

              <div className="two-factor__subsection">
                <h3 className="two-factor__subhead">{t('settings.security.items.twoFactor.backupSectionTitle')}</h3>
                <p className="two-factor__muted">{t('settings.security.items.twoFactor.backupSectionDesc')}</p>
                <button type="button" className="two-factor__secondary" onClick={regenerate}>
                  {t('settings.security.items.twoFactor.regenerate')}
                </button>
              </div>

              <div className="two-factor__subsection two-factor__subsection--danger">
                <h3 className="two-factor__subhead">{t('settings.security.items.twoFactor.disableTitle')}</h3>
                <p className="two-factor__muted">{t('settings.security.items.twoFactor.disableIntro')}</p>
                {!disableOpen ? (
                  <button type="button" className="two-factor__danger-outline" onClick={() => setDisableOpen(true)}>
                    {t('settings.security.items.twoFactor.disableOpen')}
                  </button>
                ) : (
                  <form className="two-factor__disable-form" onSubmit={disable}>
                    <MethodSelect
                      value={disableForm.method}
                      onChange={(method) => setDisableForm((f) => ({ ...f, method }))}
                      t={t}
                    />
                    <MfaCodeField
                      label={t('settings.security.items.twoFactor.codePlaceholder')}
                      value={disableForm.code}
                      onChange={(code) => setDisableForm((f) => ({ ...f, code }))}
                      mode={disableForm.method === 'totp' ? 'totp' : 'backup'}
                      disabled={submitting}
                    />
                    <input
                      type="password"
                      className="two-factor__settings-input"
                      value={disableForm.password}
                      onChange={(ev) => setDisableForm((f) => ({ ...f, password: ev.target.value }))}
                      placeholder={t('settings.security.items.twoFactor.passwordPlaceholder')}
                      autoComplete="current-password"
                    />
                    <div className="two-factor__danger-actions">
                      <button type="button" className="two-factor__ghost-btn" onClick={() => setDisableOpen(false)}>
                        {t('common.cancel')}
                      </button>
                      <button type="submit" className="two-factor__danger" disabled={submitting}>
                        {t('settings.security.items.twoFactor.disableButton')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </SettingsPageShell>
  );
}

function StatusBadge({ enabled, t }) {
  return (
    <div
      className={`two-factor__status ${enabled ? 'two-factor__status--on' : 'two-factor__status--off'}`}
    >
      {enabled
        ? t('settings.security.items.twoFactor.enabledBadge')
        : t('settings.security.items.twoFactor.disabledBadge')}
    </div>
  );
}

function OnboardingStep({ step, title, body, children }) {
  return (
    <section className="two-factor__step">
      <div className="two-factor__step-badge">{step}</div>
      <div>
        <h3 className="two-factor__step-title">{title}</h3>
        <p className="two-factor__muted">{body}</p>
        {children}
      </div>
    </section>
  );
}

function QrBlock({ uri }) {
  if (!uri) return null;
  return (
    <div className="two-factor__qr">
      <QRCodeSVG value={uri} size={176} level="M" includeMargin />
    </div>
  );
}

function BackupList({ codes, t, onCopyAll, onDone }) {
  return (
    <div className="two-factor__section two-factor__backup-block">
      <OnboardingStep
        step={4}
        title={t('settings.security.items.twoFactor.onboarding.step4Title')}
        body={t('settings.security.items.twoFactor.onboarding.step4Body')}
      >
        <ul className="two-factor__backup-grid">
          {codes.map((c) => (
            <li key={c}>
              <code>{c}</code>
            </li>
          ))}
        </ul>
        <p className="two-factor__warn">{t('settings.security.items.twoFactor.backupOnce')}</p>
        <div className="two-factor__backup-actions">
          <button type="button" className="two-factor__secondary" onClick={onCopyAll}>
            {t('settings.security.items.twoFactor.copyBackupCodes')}
          </button>
          <button type="button" className="two-factor__cta" onClick={onDone}>
            {t('settings.security.items.twoFactor.backupDone')}
          </button>
        </div>
      </OnboardingStep>
    </div>
  );
}

function MethodSelect({ value, onChange, t }) {
  return (
    <select
      className="two-factor__settings-input"
      value={value}
      onChange={(ev) => onChange(ev.target.value)}
    >
      <option value="totp">{t('settings.security.items.twoFactor.methodTotp')}</option>
      <option value="backup">{t('settings.security.items.twoFactor.methodBackup')}</option>
    </select>
  );
}