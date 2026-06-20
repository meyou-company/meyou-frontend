import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import LegalLayout from '../layout';
import LegalDocumentView from '../LegalDocumentView';
import { getLegalUi } from '../../../i18n/legal';
import { profileApi } from '../../../services/profileApi';
import { useAuthStore } from '../../../zustand/useAuthStore';
import { getApiErrorMessage } from '../../../utils/getApiErrorMessage';

export default function LegalDeleteAccountPage() {
  const { i18n } = useTranslation();
  const ui = getLegalUi(i18n.language);
  const navigate = useNavigate();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!isAuthed) {
      navigate('/auth/login');
      return;
    }

    const confirmed = window.confirm(ui.deleteAccountConfirm);
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await profileApi.deleteAccount();
      try {
        await authApi.logout();
      } catch {
        /* session may already be invalid */
      }
      await clearSession();
      toast.success(ui.deleteAccountSuccess);
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error) || ui.deleteAccountConfirm);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <LegalLayout>
      <LegalDocumentView documentKey="deleteAccount" />
      {isAuthed ? (
        <div className="legalDeleteAction">
          <button
            type="button"
            className="legalDeleteAction__btn"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? '…' : ui.deleteAccountAction}
          </button>
        </div>
      ) : null}
    </LegalLayout>
  );
}
