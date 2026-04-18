import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { getProfileRouteHandle } from "../utils/profileFriendNav";

const UserProfileNavContext = createContext(null);

/**
 * Глобальний перехід на /profile/:handle з будь-якої сторінки.
 * Провайдер має бути всередині BrowserRouter.
 */
export function UserProfileNavProvider({ children }) {
  const navigate = useNavigate();

  const openProfile = useCallback(
    (userOrHandle) => {
      const h =
        typeof userOrHandle === "string"
          ? String(userOrHandle).trim().replace(/^@/, "") || null
          : getProfileRouteHandle(userOrHandle);
      if (h) navigate(`/profile/${encodeURIComponent(h)}`);
    },
    [navigate]
  );

  const value = useMemo(() => ({ openProfile }), [openProfile]);

  return (
    <UserProfileNavContext.Provider value={value}>
      {children}
    </UserProfileNavContext.Provider>
  );
}

/** Якщо поза провайдером — повертає null (кліки на автора не ведуть нікуди). */
export function useUserProfileNav() {
  return useContext(UserProfileNavContext);
}
