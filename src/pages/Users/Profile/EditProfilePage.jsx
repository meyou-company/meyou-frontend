import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

import EditProfileForm from '../../../components/Users/Profile/EditProfileForm/EditProfileForm'
import { profileApi } from '../../../services/profileApi'
import { useAuthStore } from '../../../zustand/useAuthStore'

export default function EditProfilePage() {
  const navigate = useNavigate()

  const handleSave = async (payload) => {
    try {
      await profileApi.updateProfile(payload)

      toast.success('Профіль успішно оновлено')
      await useAuthStore.getState().refreshMe()
    } catch (error) {
      console.error('Помилка оновлення профілю:', error)
    }
  }

  return (
    <EditProfileForm onSave={handleSave} onBack={() => navigate('/profile')} />
  )
}
