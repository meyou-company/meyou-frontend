import { createContext, useContext, useState } from "react";

const GlobalLoaderContext = createContext(null);

export function GlobalLoaderProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <GlobalLoaderContext.Provider
      value={{ isLoading, setLoading: setIsLoading }}
    >
      {children}
    </GlobalLoaderContext.Provider>
  );
}

export function useGlobalLoader() {
  const context = useContext(GlobalLoaderContext);

  if (!context) {
    throw new Error("useGlobalLoader must be used inside GlobalLoaderProvider");
  }

  return context;
}