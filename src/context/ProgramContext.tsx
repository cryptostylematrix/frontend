import { createContext, useContext, useMemo, type ReactNode } from "react";

type ProgramContextType = {
  marketingAddress: string;
};

const ProgramContext = createContext<ProgramContextType | undefined>(undefined);

export function ProgramProvider({
  children,
  marketingAddress,
}: {
  children: ReactNode;
  marketingAddress: string;
}) {
  const value = useMemo(
    () => ({ marketingAddress: marketingAddress.trim() }),
    [marketingAddress],
  );

  return <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>;
}

export function useProgramContext() {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error("useProgramContext must be used within ProgramProvider");
  }
  return context;
}
