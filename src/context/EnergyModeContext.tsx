import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
const EnergyContext = createContext({ isPowerSaver: false, togglePowerSaver: () => {} });
export function EnergyProvider({ children }: { children: ReactNode }) {
  const [isPowerSaver, setIsPowerSaver] = useState(() => localStorage.getItem('power-saver-mode') === 'true');
  useEffect(() => {
    // @ts-ignore
    if (navigator.getBattery) { /* @ts-ignore */ navigator.getBattery().then((b:any)=>{ if(b.level<0.25) setIsPowerSaver(true); }); }
  }, []);
  useEffect(() => {
    localStorage.setItem('power-saver-mode', String(isPowerSaver));
    document.body.classList.toggle('power-saver', isPowerSaver);
  }, [isPowerSaver]);
  return <EnergyContext.Provider value={{ isPowerSaver, togglePowerSaver: () => setIsPowerSaver(v=>!v) }}>{children}</EnergyContext.Provider>;
}
export const useEnergy = () => useContext(EnergyContext);
