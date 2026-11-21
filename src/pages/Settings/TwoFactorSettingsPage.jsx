import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LuChevronRight,
  LuKeyRound,
  LuRefreshCw,
  LuShieldCheck,
  LuSmartphone,
  LuTrash2,
} from 'react-icons/lu';
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
  const [instructionsOpen, setInstructionsOpen] = useState(false);
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

  const prefix = 'settings.security.items.twoFactor';

  return (
    <SettingsPageShell
      title={t(`${prefix}.pageTitle`)}
      subtitle={t(`${prefix}.pageSubtitle`)}
      onBack={handleBack}
    >
      <div className="two-factor-page">
        {loading ? (
          <p className="two-factor__loading settings-card two-factor__card">{t(`${prefix}.loading`)}</p>
        ) : null}

        {!loading && step === 'status' && !status?.enabled ? (
          <div className="two-factor__card settings-card two-factor__intro-card">
            <p className="two-factor__desc">{t(`${prefix}.intro`)}</p>
            {status?.enrollmentAvailable === false ? (
              <p className="two-factor__warn">{t(`${prefix}.enrollmentOff`)}</p>
            ) : (
              <button type="button" className="two-factor__cta" onClick={startSetup}>
                {t(`${prefix}.startSetup`)}
              </button>
            )}
          </div>
        ) : null}

        {step === 'scan' ? (
          <div className="two-factor__card settings-card two-factor__setup-card">
            <h2 className="two-factor__card-title">{t(`${prefix}.startSetup`)}</h2>
            <OnboardingStep step={1} title={t(`${prefix}.onboarding.step1Title`)} body={t(`${prefix}.onboarding.step1Body`)}>
              <ul className="two-factor__app-links">
                <li>
                  <span>{t(`${prefix}.onboarding.googleAuth`)}</span>
                  <a href={AUTH_LINKS.googleIos} target="_blank" rel="noopener noreferrer">
                    iOS
                  </a>
                  <a href={AUTH_LINKS.googleAndroid} target="_blank" rel="noopener noreferrer">
                    Android
                  </a>
                </li>
                <li>
                  <span>{t(`${prefix}.onboarding.msAuth`)}</span>
                  <a href={AUTH_LINKS.msIos} target="_blank" rel="noopener noreferrer">
                    iOS
                  </a>
                  <a href={AUTH_LINKS.msAndroid} target="_blank" rel="noopener noreferrer">
                    Android
                  </a>
                </li>
              </ul>
            </OnboardingStep>

            <OnboardingStep step={2} title={t(`${prefix}.onboarding.step2Title`)} body={t(`${prefix}.onboarding.step2Body`)}>
              <QrBlock uri={otpauthUri} />
              {manualSecret ? (
                <div className="two-factor__manual">
                  <button
                    type="button"
                    className="two-factor__linkish"
                    onClick={() => setShowManualSecret((v) => !v)}
                  >
                    {showManualSecret
                      ? t(`${prefix}.onboarding.hideManualKey`)
                      : t(`${prefix}.onboarding.showManualKey`)}
                  </button>
                  {showManualSecret ? (
                    <div className="two-factor__secret-box">
                      <code className="two-factor__secret-code">{manualSecret}</code>
                      <button
                        type="button"
                        className="two-factor__ghost-btn"
                        onClick={() =>
                          void copyText(manualSecret, `${prefix}.onboarding.secretCopied`)
                        }
                      >
                        {t(`${prefix}.onboarding.copySecret`)}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </OnboardingStep>

            <OnboardingStep step={3} title={t(`${prefix}.onboarding.step3Title`)} body={t(`${prefix}.onboarding.step3Body`)}>
              <form onSubmit={confirmSetup} className="two-factor__confirm-form">
                <MfaCodeField
                  id="totp-confirm"
                  label={t(`${prefix}.confirmLabel`)}
                  error={confirmError}
                  value={confirmCode}
                  onChange={setConfirmCode}
                  mode="totp"
                  variant="cells"
                  disabled={submitting}
                />
                <button type="submit" className="two-factor__cta" disabled={submitting}>
                  {submitting ? t(`${prefix}.confirming`) : t(`${prefix}.confirmButton`)}
                </button>
              </form>
            </OnboardingStep>
          </div>
        ) : null}

        {step === 'backup' && backupCodes.length > 0 ? (
          <BackupList
            codes={backupCodes}
            t={t}
            prefix={prefix}
            onCopyAll={() => void copyText(backupCodes.join('\n'), `${prefix}.backupCopied`)}
            onDone={() => setStep('manage')}
          />
        ) : null}

        {!loading && (step === 'manage' || (status?.enabled && step !== 'scan' && step !== 'backup')) ? (
          <div className="two-factor__stack">
            <div className="two-factor__card settings-card two-factor__summary-card">
              <div className="two-factor__summary-row">
                <span className="two-factor__icon two-factor__icon--success" aria-hidden>
                  <LuShieldCheck />
                </span>
                <div className="two-factor__summary-text">
                  <span className="two-factor__summary-title">{t(`${prefix}.enabledStatusTitle`)}</span>
                  <span className="two-factor__summary-desc">{t(`${prefix}.enabledStatusDesc`)}</span>
                </div>
              </div>
              <div className="two-factor__divider" />
              <div className="two-factor__summary-row two-factor__summary-row--backup">
                <span className="two-factor__icon two-factor__icon--key" aria-hidden>
                  <LuKeyRound />
                </span>
                <div className="two-factor__summary-text">
                  <span className="two-factor__summary-title">{t(`${prefix}.backupSectionTitle`)}</span>
                  <span className="two-factor__summary-desc">
                    {t(`${prefix}.backupCountShort`, { count: status?.backupCodesRemaining ?? 0 })}
                  </span>
                </div>
                <button
                  type="button"
                  className="two-factor__outline-btn"
                  onClick={regenerate}
                >
                  <LuRefreshCw aria-hidden />
                  <span>{t(`${prefix}.regenerate`)}</span>
                </button>
              </div>
            </div>

            <div className="two-factor__card settings-card">
              <h2 className="two-factor__card-title">{t(`${prefix}.manageTitle`)}</h2>
              <button
                type="button"
                className="two-factor__menu-row"
                onClick={() => setInstructionsOpen((v) => !v)}
                aria-expanded={instructionsOpen}
              >
                <span className="two-factor__icon two-factor__icon--muted" aria-hidden>
                  <LuSmartphone />
                </span>
                <span className="two-factor__menu-meta">
                  <span className="two-factor__menu-label">{t(`${prefix}.showInstructions`)}</span>
                  <span className="two-factor__menu-desc">{t(`${prefix}.showInstructionsDesc`)}</span>
                </span>
                <LuChevronRight
                  className={`two-factor__chevron ${instructionsOpen ? 'is-open' : ''}`}
                  aria-hidden
                />
              </button>
              {instructionsOpen ? (
                <div className="two-factor__instructions-panel">
                  <p className="two-factor__muted">{t(`${prefix}.instructionsReadOnly`)}</p>
                  <ol className="two-factor__instructions-list">
                    <li>
                      <strong>{t(`${prefix}.onboarding.step1Title`)}</strong>
                      <p>{t(`${prefix}.onboarding.step1Body`)}</p>
                    </li>
                    <li>
                      <strong>{t(`${prefix}.onboarding.step2Title`)}</strong>
                      <p>{t(`${prefix}.onboarding.step2Body`)}</p>
                    </li>
                    <li>
                      <strong>{t(`${prefix}.onboarding.step3Title`)}</strong>
                      <p>{t(`${prefix}.onboarding.step3Body`)}</p>
                    </li>
                    <li>
                      <strong>{t(`${prefix}.onboarding.step4Title`)}</strong>
                      <p>{t(`${prefix}.onboarding.step4Body`)}</p>
                    </li>
                  </ol>
                </div>
              ) : null}
              <button type="button" className="two-factor__menu-row" onClick={regenerate}>
                <span className="two-factor__icon two-factor__icon--muted" aria-hidden>
                  <LuKeyRound />
                </span>
                <span className="two-factor__menu-meta">
                  <span className="two-factor__menu-label">{t(`${prefix}.backupSectionTitle`)}</span>
                  <span className="two-factor__menu-desc">{t(`${prefix}.backupSectionDesc`)}</span>
                </span>
                <LuChevronRight className="two-factor__chevron" aria-hidden />
              </button>
            </div>

            <div className="two-factor__card settings-card two-factor__danger-card">
              <div className="two-factor__danger-head">
                <span className="two-factor__icon two-factor__icon--danger" aria-hidden>
                  <LuTrash2 />
                </span>
                <div className="two-factor__danger-copy">
                  <span className="two-factor__danger-title">{t(`${prefix}.disableTitle`)}</span>
                  <span className="two-factor__danger-desc">{t(`${prefix}.disableIntro`)}</span>
                </div>
              </div>
              {!disableOpen ? (
                <button
                  type="button"
                  className="two-factor__danger-solid"
                  onClick={() => setDisableOpen(true)}
                >
                  {t(`${prefix}.disableButton`)}
                </button>
              ) : (
                <form className="two-factor__disable-form" onSubmit={disable}>
                  <MethodSelect
                    value={disableForm.method}
                    onChange={(method) => setDisableForm((f) => ({ ...f, method }))}
                    t={t}
                    prefix={prefix}
                  />
                  <MfaCodeField
                    label={t(`${prefix}.codePlaceholder`)}
                    value={disableForm.code}
                    onChange={(code) => setDisableForm((f) => ({ ...f, code }))}
                    mode={disableForm.method === 'totp' ? 'totp' : 'backup'}
                    variant={disableForm.method === 'totp' ? 'cells' : 'single'}
                    disabled={submitting}
                  />
                  <input
                    type="password"
                    className="two-factor__settings-input"
                    value={disableForm.password}
                    onChange={(ev) => setDisableForm((f) => ({ ...f, password: ev.target.value }))}
                    placeholder={t(`${prefix}.passwordPlaceholder`)}
                    autoComplete="current-password"
                  />
                  <div className="two-factor__danger-actions">
                    <button type="button" className="two-factor__ghost-btn" onClick={() => setDisableOpen(false)}>
                      {t('common.cancel')}
                    </button>
                    <button type="submit" className="two-factor__danger-solid" disabled={submitting}>
                      {t(`${prefix}.disableButton`)}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </SettingsPageShell>
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

function BackupList({ codes, t, prefix, onCopyAll, onDone }) {
  return (
    <div className="two-factor__card settings-card two-factor__backup-block">
      <OnboardingStep
        step={4}
        title={t(`${prefix}.onboarding.step4Title`)}
        body={t(`${prefix}.onboarding.step4Body`)}
      >
        <ul className="two-factor__backup-grid">
          {codes.map((c) => (
            <li key={c}>
              <code>{c}</code>
            </li>
          ))}
        </ul>
        <p className="two-factor__warn">{t(`${prefix}.backupOnce`)}</p>
        <div className="two-factor__backup-actions">
          <button type="button" className="two-factor__secondary" onClick={onCopyAll}>
            {t(`${prefix}.copyBackupCodes`)}
          </button>
          <button type="button" className="two-factor__cta" onClick={onDone}>
            {t(`${prefix}.backupDone`)}
          </button>
        </div>
      </OnboardingStep>
    </div>
  );
}

function MethodSelect({ value, onChange, t, prefix }) {
  return (
    <select
      className="two-factor__settings-input"
      value={value}
      onChange={(ev) => onChange(ev.target.value)}
    >
      <option value="totp">{t(`${prefix}.methodTotp`)}</option>
      <option value="backup">{t(`${prefix}.methodBackup`)}</option>
    </select>
  );
}