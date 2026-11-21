import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { authApi } from '../../services/auth';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import SettingsPageShell from '../../components/Settings/SettingsPageShell';
import '../../components/Settings/SettingsPageShell.scss';
import './TwoFactorSettingsPage.scss';

export default function TwoFactorSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [step, setStep] = useState('status');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [disableForm, setDisableForm] = useState({ code: '', password: '', method: 'totp' });
  const [loading, setLoading] = useState(true);

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
      setStep('scan');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const confirmSetup = async (e) => {
    e.preventDefault();
    try {
      const data = await authApi.confirmTotpSetup(confirmCode.trim());
      setBackupCodes(data.backupCodes ?? []);
      setStep('backup');
      toast.success(t('settings.security.items.twoFactor.enabledToast'));
      await loadStatus();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const disable = async (e) => {
    e.preventDefault();
    if (!window.confirm(t('settings.security.items.twoFactor.disableConfirm'))) return;
    try {
      await authApi.disableTotp({
        code: disableForm.code.trim(),
        method: disableForm.method,
        password: disableForm.password || undefined,
      });
      toast.success(t('settings.security.items.twoFactor.disabledToast'));
      await loadStatus();
      setStep('status');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
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
      <div className="settings-card two-factor">
        {loading ? (
          <p className="two-factor__muted">{t('settings.security.items.twoFactor.loading')}</p>
        ) : null}

        {!loading && step === 'status' && !status?.enabled ? (
          <>
            <p className="two-factor__desc">{t('settings.security.items.twoFactor.intro')}</p>
            {status?.enrollmentAvailable === false ? (
              <p className="two-factor__warn">{t('settings.security.items.twoFactor.enrollmentOff')}</p>
            ) : (
              <button type="button" className="two-factor__primary" onClick={startSetup}>
                {t('settings.security.items.twoFactor.startSetup')}
              </button>
            )}
          </>
        ) : null}

        {step === 'scan' ? (
          <div className="two-factor__scan">
            <p>{t('settings.security.items.twoFactor.scanHint')}</p>
            <QrBlock uri={otpauthUri} />
            <form onSubmit={confirmSetup}>
              <label className="two-factor__label" htmlFor="totp-confirm">
                {t('settings.security.items.twoFactor.confirmLabel')}
              </label>
              <input
                id="totp-confirm"
                className="two-factor__input"
                inputMode="numeric"
                value={confirmCode}
                onChange={(ev) => setConfirmCode(ev.target.value)}
                placeholder={t('settings.security.items.twoFactor.confirmPlaceholder')}
              />
              <button type="submit" className="two-factor__primary">
                {t('settings.security.items.twoFactor.confirmButton')}
              </button>
            </form>
          </div>
        ) : null}

        {step === 'backup' && backupCodes.length > 0 ? (
          <BackupList codes={backupCodes} t={t} onDone={() => setStep('manage')} />
        ) : null}

        {!loading && (step === 'manage' || (status?.enabled && step !== 'scan' && step !== 'backup')) ? (
          <div className="two-factor__manage">
            <p className="two-factor__badge">{t('settings.security.items.twoFactor.enabledBadge')}</p>
            <p className="two-factor__muted">
              {t('settings.security.items.twoFactor.backupRemaining', {
                count: status?.backupCodesRemaining ?? 0,
              })}
            </p>
            <button type="button" className="settings-card__row two-factor__row" onClick={regenerate}>
              {t('settings.security.items.twoFactor.regenerate')}
            </button>
            <form className="two-factor__disable" onSubmit={disable}>
              <h3>{t('settings.security.items.twoFactor.disableTitle')}</h3>
              <MethodSelect
                value={disableForm.method}
                onChange={(method) => setDisableForm((f) => ({ ...f, method }))}
                t={t}
              />
              <input
                className="two-factor__input"
                value={disableForm.code}
                onChange={(ev) => setDisableForm((f) => ({ ...f, code: ev.target.value }))}
                placeholder={t('settings.security.items.twoFactor.codePlaceholder')}
              />
              <input
                type="password"
                className="two-factor__input"
                value={disableForm.password}
                onChange={(ev) => setDisableForm((f) => ({ ...f, password: ev.target.value }))}
                placeholder={t('settings.security.items.twoFactor.passwordPlaceholder')}
              />
              <button type="submit" className="two-factor__danger">
                {t('settings.security.items.twoFactor.disableButton')}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </SettingsPageShell>
  );
}

function QrBlock({ uri }) {
  if (!uri) return null;
  return (
    <div className="two-factor__qr" aria-hidden="false">
      <QRCodeSVG value={uri} size={200} level="M" includeMargin />
    </div>
  );
}

function BackupList({ codes, t, onDone }) {
  return (
    <div className="two-factor__backup">
      <h3>{t('settings.security.items.twoFactor.backupTitle')}</h3>
      <p className="two-factor__warn">{t('settings.security.items.twoFactor.backupOnce')}</p>
      <ul>
        {codes.map((c) => (
          <li key={c}>
            <code>{c}</code>
          </li>
        ))}
      </ul>
      <button type="button" className="two-factor__primary" onClick={onDone}>
        {t('settings.security.items.twoFactor.backupDone')}
      </button>
    </div>
  );
}

function MethodSelect({ value, onChange, t }) {
  return (
    <select
      className="two-factor__input"
      value={value}
      onChange={(ev) => onChange(ev.target.value)}
    >
      <option value="totp">{t('settings.security.items.twoFactor.methodTotp')}</option>
      <option value="backup">{t('settings.security.items.twoFactor.methodBackup')}</option>
    </select>
  );
}