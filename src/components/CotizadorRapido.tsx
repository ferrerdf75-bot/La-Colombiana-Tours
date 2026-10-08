import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeftRight } from 'lucide-react';

interface CotizadorRapidoProps {
  tiposCambio?: Record<string, number>;
  tcOficial?: number;
}

export const CotizadorRapido: React.FC<CotizadorRapidoProps> = ({ tiposCambio: tiposCambioProp, tcOficial }) => {
  const [divisa, setDivisa] = useState('USD');
  const [tc, setTc] = useState(0);
  const [montoDivisa, setMontoDivisa] = useState('');
  const [montoMXN, setMontoMXN] = useState('');
  const [lastEdited, setLastEdited] = useState<'divisa' | 'mxn'>('divisa');

  // Obtener objeto de tipos de cambio de props o localStorage
  const tiposCambio = useMemo(() => {
    if (tiposCambioProp) return tiposCambioProp;
    try {
      const stored = localStorage.getItem('tcMulti');
      if (stored) return JSON.parse(stored);
      const settings = localStorage.getItem('settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (parsed.tiposCambio) return parsed.tiposCambio;
      }
    } catch {}
    return { USD: 19.20, CAD: 16.80, EUR: 21.50, GBP: 25.10 };
  }, [tiposCambioProp]);

  // Cuando cambia la divisa o los tipos de cambio, jalar de Ajustes y restar $1
  useEffect(() => {
    const interbancario =
      tiposCambio?.[divisa] ||
      (divisa === 'USD'
        ? tcOficial || 19.20
        : divisa === 'CAD'
        ? 16.80
        : divisa === 'EUR'
        ? 21.50
        : 25.10);
    const sugerido = Math.max(0, interbancario - 1); // Regla: Interbancario - $1
    setTc(Number(sugerido.toFixed(2)));
  }, [divisa, tiposCambio, tcOficial]);

  // Conversión bidireccional cuando cambia montoDivisa o tc
  useEffect(() => {
    const nTc = Number(tc) || 0;
    if (nTc <= 0) return;
    if (lastEdited === 'divisa') {
      const d = Number(montoDivisa) || 0;
      if (d > 0) setMontoMXN((d * nTc).toFixed(2));
      else if (montoDivisa === '') setMontoMXN('');
    }
  }, [montoDivisa, tc, lastEdited]);

  // Conversión bidireccional cuando cambia montoMXN
  useEffect(() => {
    const nTc = Number(tc) || 0;
    if (nTc <= 0) return;
    if (lastEdited === 'mxn') {
      const m = Number(montoMXN) || 0;
      if (m > 0) setMontoDivisa((m / nTc).toFixed(2));
      else if (montoMXN === '') setMontoDivisa('');
    }
  }, [montoMXN, tc, lastEdited]);

  const interbancarioActual =
    tiposCambio?.[divisa] ||
    (divisa === 'USD'
      ? tcOficial || 19.20
      : divisa === 'CAD'
      ? 16.80
      : divisa === 'EUR'
      ? 21.50
      : 25.10);

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 rounded-2xl p-3 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="font-black text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
          <span>💱</span>
          <ArrowLeftRight size={14} className="text-amber-600 dark:text-amber-400" />
          <span>Cotizador Rápido (TC Ajuste - $1)</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="flex gap-2">
          <select
            value={divisa}
            onChange={(e) => setDivisa(e.target.value)}
            className="border-2 border-amber-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2 font-bold text-xs sm:text-sm cursor-pointer"
          >
            <option value="USD">🇺🇸 USD</option>
            <option value="CAD">🇨🇦 CAD</option>
            <option value="EUR">🇪🇺 EUR</option>
            <option value="GBP">🇬🇧 GBP</option>
          </select>
          <input
            type="number"
            placeholder="Monto Divisa"
            value={montoDivisa}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              setMontoDivisa(e.target.value);
              setLastEdited('divisa');
            }}
            className="flex-1 border-2 border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2 text-xs sm:text-sm font-bold"
          />
        </div>

        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Monto MXN"
            value={montoMXN}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              setMontoMXN(e.target.value);
              setLastEdited('mxn');
            }}
            className="flex-1 border-2 border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2 text-xs sm:text-sm font-bold"
          />
          <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-950/60 border border-amber-400 rounded-xl px-2 py-1">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200">TC: $</span>
            <input
              type="number"
              value={tc || ''}
              onChange={(e) => setTc(Number(e.target.value) || 0)}
              className="w-16 p-1 font-black text-center bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-amber-400 text-xs"
            />
          </div>
        </div>
      </div>

      <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 mt-2 font-semibold">
        Interbancario {divisa} en Ajustes: ${Number(interbancarioActual).toFixed(2)} → Sugerido (-$1.00) = ${tc}
      </p>
    </div>
  );
};

export default CotizadorRapido;
