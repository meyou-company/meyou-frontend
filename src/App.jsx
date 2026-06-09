import { useEffect, useRef } from 'react';
import { toast, Toaster } from 'sonner';
import { i18n } from './i18n';
import { I18nProvider } from './providers/I18nProvider';
import { useAuthStore } from './zustand/useAuthStore';
import AppRouter from './router/AppRouter';
import { GlobalLoaderProvider } from './context/GlobalLoaderContext';
import GlobalLoader from './components/GlobalLoader/GlobalLoader';

function AppBootstrap() {
  const didInitRef = useRef(false);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    void useAuthStore.getState().init().catch(() => {
      toast.error(i18n.t('common.appLoadError'));
    });
  }, []);

  return (
    <GlobalLoaderProvider>
      <Toaster position="top-center" richColors closeButton />
      <GlobalLoader />
      <AppRouter />
    </GlobalLoaderProvider>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppBootstrap />
    </I18nProvider>
  );
}
