import { useEffect, useRef, useState } from "react";

export function useAvatar() {
  const fileRef = useRef(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const pickAvatar = () => fileRef.current?.click();

  const onAvatarChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setAvatarFile(f);

    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const saveAvatar = async () => {
    if (!avatarFile) return;
    // TODO: коли з’явиться ендпоінт — сюди
    console.log("avatar ready:", avatarFile);
  };

  return {
    fileRef,
    avatarFile,
    avatarPreview,
    pickAvatar,
    onAvatarChange,
    saveAvatar,
  };
}
