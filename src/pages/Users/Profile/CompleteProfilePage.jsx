import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import CompleteProfileForm from '../../../components/Users/Profile/CompleteProfileForm/CompleteProfileForm';
import { profileApi } from '../../../services/profileApi';
import { useAuthStore } from '../../../zustand/useAuthStore';

export default function CompleteProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSave = async (payload) => {
    try {
      await profileApi.completeProfile(payload);

      toast.success(t('profile.completeForm.toast.profileSaved'));
      await useAuthStore.getState().refreshMe();
      navigate('/profile', { replace: true });
    } catch (error) {
      console.error(t('profile.completeForm.errors.saveError:'), error);
    }
  };

  return <CompleteProfileForm onSave={handleSave} onBack={() => navigate(-1)} />;
}
