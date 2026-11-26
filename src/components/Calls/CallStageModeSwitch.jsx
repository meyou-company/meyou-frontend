import { useTranslation } from 'react-i18next';
import { LuMonitor, LuUsers } from 'react-icons/lu';

export default function CallStageModeSwitch({ mode, onChange }) {
  const { t } = useTranslation();
  return <div className="callStageMode" role="group" aria-label={t('messenger.calls.callView')}>
    <button type="button" aria-pressed={mode === 'screen'} onClick={() => onChange('screen')}><LuMonitor />{t('messenger.calls.screenView')}</button>
    <button type="button" aria-pressed={mode === 'participants'} onClick={() => onChange('participants')}><LuUsers />{t('messenger.calls.participantsView')}</button>
  </div>;
}
