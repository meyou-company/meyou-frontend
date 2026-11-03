import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import LegalLayout from '../layout';
import { getLegalUi } from '../../../i18n/legal';
import { profileApi } from '../../../services/profileApi';
import { useAuthStore } from '../../../zustand/useAuthStore';
import { getApiErrorMessage } from '../../../utils/getApiErrorMessage';

function postAuthPath(user) {
  const verified =
    user?.isVerified === true ||
    user?.emailVerified === true ||
    Boolean(user?.emailVerifiedAt || user?.email_verified);
  if (!verified) return '/auth/verify-email';
  if (user?.profileCompleted !== true) return '/users/profile/complete';
  return '/profile';
}

export default function LegalAcceptTermsPage() {
  const { i18n } = useTranslation();
  const ui = getLegalUi(i18n.language);
  const navigate = useNavigate();
  const setAuth = useAuthStore.setState;
  const refreshMe = useAuthStore((state) => state.refreshMe);
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!accepted || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await profileApi.acceptTerms();
      let user = response?.user ?? response?.data?.user ?? null;
      if (!user && response?.id) user = response;
      if (user) setAuth({ user, isAuthed: true });
      try {
        user = await refreshMe();
      } catch (refreshError) {
        if (!user) throw refreshError;
      }
      navigate(postAuthPath(user), { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error) || ui.acceptTermsSubmitting);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    if (isSubmitting) return;
    useAuthStore.getState().clearSession();
    navigate('/auth/login', { replace: true });
  };

  return (
    <LegalLayout>
      <div className="legalAccept">
        <h2 className="legalAccept__title">{ui.acceptTermsTitle}</h2>
        <p className="legalAccept__text">{ui.acceptTermsText}</p>
        <form onSubmit={handleSubmit}>
          <div className="legalAccept__policy">
            <input
              id="legal-accept-terms"
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <label htmlFor="legal-accept-terms">
              Я приймаю{' '}
              <Link to="/legal/terms">{ui.acceptTermsTermsLink}</Link>
              {' та '}
              <Link to="/legal/privacy">{ui.acceptTermsPrivacyLink}</Link>
              {' LunMeYo.'}
            </label>
          </div>
          <div className="legalAccept__actions">
            <button
              type="button"
              className="legalAccept__btn legalAccept__btn--secondary"
              disabled={isSubmitting}
              onClick={handleDecline}
            >
              {ui.acceptTermsDecline}
            </button>
            <button
              type="submit"
              className="legalAccept__btn"
              disabled={!accepted || isSubmitting}
            >
              {isSubmitting ? ui.acceptTermsSubmitting : ui.acceptTermsSubmit}
            </button>
          </div>
        </form>
      </div>
    </LegalLayout>
  );
}
