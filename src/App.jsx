import { useEffect } from 'react';
import { toast, Toaster } from 'sonner';
import { useAuthStore } from './zustand/useAuthStore';
import AppRouter from './router/AppRouter';
import { GlobalLoaderProvider } from './context/GlobalLoaderContext';
import GlobalLoader from './components/GlobalLoader/GlobalLoader';
import { NotificationsSocketProvider } from './providers/NotificationsSocketProvider';

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    (async () => {
      try {
        await init();
      } catch (e) {
        toast.error('Не вдалося завантажити додаток. Спробуйте оновити сторінку.');
      }
    })();
  }, [init]);

  return (
    <GlobalLoaderProvider>
      <NotificationsSocketProvider />
      <Toaster position="top-center" richColors closeButton />
      <GlobalLoader />
      <AppRouter />
    </GlobalLoaderProvider>
  );
}
