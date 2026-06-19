import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import EditProfileForm from '../../../components/Users/Profile/EditProfileForm/EditProfileForm';
import { profileApi } from '../../../services/profileApi';
import { useAuthStore } from '../../../zustand/useAuthStore';

export default function EditProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSave = async (payload) => {
    try {
      await profileApi.updateProfile(payload);

      toast.success(t('profile.editForm.toast.profileUpdated'));
      await useAuthStore.getState().refreshMe();
    } catch (error) {
      console.error(t('profile.editForm.errors.updateError:'), error);
    }
  };

  return <EditProfileForm onSave={handleSave} onBack={() => navigate('/profile')} />;
}
