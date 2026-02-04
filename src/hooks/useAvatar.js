import { useMemo, useRef, useState } from "react";
import { authApi } from "../services/auth";

export function useAvatar({ refreshMe } = {}) {
  const fileRef = useRef(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const avatarPreview = useMemo(() => {
    if (!avatarFile) return "";
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  const pickAvatar = () => {
    setError("");
    fileRef.current?.click();
  };

  const onAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
  };

  const resetInput = () => {
    setAvatarFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const saveAvatar = async () => {
    if (!avatarFile) return;
    try {
      setIsSaving(true);
      setError("");
      await authApi.uploadAvatar(avatarFile); 
      await refreshMe?.();
      resetInput();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Помилка завантаження аватару";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAvatar = async () => {
    try {
      setIsDeleting(true);
      setError("");
      await authApi.deleteAvatar();
      await refreshMe?.();
      resetInput();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Помилка видалення аватару";
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    fileRef,
    avatarFile,
    avatarPreview,
    pickAvatar,
    onAvatarChange,
    saveAvatar,
    deleteAvatar,
    isSaving,
    isDeleting,
    error,
  };
}
