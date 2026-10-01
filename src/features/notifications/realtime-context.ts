import { createContext, useContext } from "react";

/** Vrai quand l'abonnement temps réel aux devis / messages est actif. */
export const RealtimeContext = createContext(false);

export const useRealtimeLive = (): boolean => useContext(RealtimeContext);
