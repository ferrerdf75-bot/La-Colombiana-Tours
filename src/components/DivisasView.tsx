import React, { useState, useEffect, useRef } from 'react';
import {
  Calculator,
  AlertTriangle,
  Check,
  Receipt,
  RefreshCw,
  Info
} from 'lucide-react';

interface DivisasViewProps {
  onOpenNewSale?: () => void;
}

interface DivisaItem {
  flag: string;
  code: string;
  name: string;
  compra: number;
  venta: number;
}

interface CurrencyOption {
  code: string;
  name: string;
  flag: string;
  symbol: string;
  compraDefault: number;
}

const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', name: 'Dólar Americano', flag: '🇺🇸', symbol: '$', compraDefault: 16.80 },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', symbol: '€', compraDefault: 19.75 },
  { code: 'CAD', name: 'Dólar Canadiense', flag: '🇨🇦', symbol: 'C$', compraDefault: 12.70 },
  { code: 'GBP', name: 'Libra Esterlina', flag: '🇬🇧', symbol: '£', compraDefault: 22.90 },
];

// Datos fijos de referencia de hoy 20 sep 2026
const DEFAULT_DIVISAS: DivisaItem[] = [
  { flag: '🇺🇸', code: 'USD', name: 'Dólar Americano', compra: 16.80, venta: 17.22 },
  { flag: '🇪🇺', code: 'EUR', name: 'Euro', compra: 19.75, venta: 20.15 },
  { flag: '🇨🇦', code: 'CAD', name: 'Dólar Canadiense', compra: 12.70, venta: 13.10 },
  { flag: '🇬🇧', code: 'GBP', name: 'Libra Esterlina', compra: 22.90, venta: 23.40 },
];

export const DivisasView: React.FC<DivisasViewProps> = ({ onOpenNewSale }) => {
  // 1. Divisas interbancarias fijas con simulación de sincronización diaria
  const [divisas, setDivisas] = useState<DivisaItem[]>(() => {
    try {
      const saved = localStorage.getItem('holbox_oficiales_table');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) return parsed;
      }
    } catch {}
    return DEFAULT_DIVISAS;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Hoy, 20 sep 2026 - 08:30 hrs');

  // Divisa seleccionada para la calculadora con bandera y código
  const [selectedCurrency, setSelectedCurrency] = useState<{
    code: string;
    symbol: string;
    flag: string;
    compraRef: number;
  }>(() => {
    try {
      const saved = localStorage.getItem('holbox_selected_currency');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { code: 'USD', symbol: '$', flag: '🇺🇸', compraRef: 16.80 };
  });

  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
        setIsCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('holbox_selected_currency', JSON.stringify(selectedCurrency));
    } catch {}
  }, [selectedCurrency]);

  // 2. Toma local para la calculadora (localStorage: holbox_toma)
  const [tomaLocal, setTomaLocal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('holbox_toma');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch {}
    return 16.00;
  });

  // Modo de conversión: 'DIVISA_A_MXN' o 'MXN_A_DIVISA'
  const [modo, setModo] = useState<'DIVISA_A_MXN' | 'MXN_A_DIVISA'>('DIVISA_A_MXN');

  // 3. Importe a convertir (moneda extranjera o pesos ingresados)
  const [importeExtranjero, setImporteExtranjero] = useState<number | ''>(100);

  // 4. Feedback de copia / carga a recibo
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  // Guardar toma local en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('holbox_toma', tomaLocal.toString());
    } catch {}
  }, [tomaLocal]);

  // Selección de divisa con valor sugerido -1 peso
  const handleSelectCurrency = (cur: CurrencyOption) => {
    const dInfo = divisas.find(d => d.code === cur.code);
    const compraRef = dInfo ? dInfo.compra : cur.compraDefault;
    const suggestedValue = Math.max(1, Math.round((compraRef - 1.00) * 100) / 100);

    setSelectedCurrency({
      code: cur.code,
      symbol: cur.symbol,
      flag: cur.flag,
      compraRef,
    });
    setTomaLocal(suggestedValue);
    setIsCurrencyDropdownOpen(false);
  };

  // Cálculo bidireccional en tiempo real
  const cantidad = typeof importeExtranjero === 'number' ? importeExtranjero : 0;
  
  const totalMxn = Math.round(tomaLocal * cantidad * 100) / 100;
  const formattedTotalMxn = totalMxn.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
  });

  const totalDivisa = tomaLocal > 0 ? Math.round((cantidad / tomaLocal) * 100) / 100 : 0;
  const formattedTotalDivisa = `${selectedCurrency.symbol}${totalDivisa.toFixed(2)}`;

  const toggleModo = () => {
    setModo(prev => prev === 'DIVISA_A_MXN' ? 'MXN_A_DIVISA' : 'DIVISA_A_MXN');
  };

  // Simulación de fetch a Banxico para actualización diaria
  const handleRefreshBanxico = () => {
    setIsSyncing(true);
    setTimeout(() => {
      // Simula verificación con Banxico
      setDivisas(DEFAULT_DIVISAS);
      try {
        localStorage.setItem('holbox_oficiales_table', JSON.stringify(DEFAULT_DIVISAS));
      } catch {}
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(`Hoy, 20 sep 2026 - ${timeStr} hrs (Banxico API)`);
      setIsSyncing(false);
    }, 600);
  };

  const handleCargarAlRecibo = () => {
    const valorACargar = modo === 'DIVISA_A_MXN' ? totalMxn : cantidad;
    if (valorACargar <= 0) return;
    try {
      // Guardar monto para que el formulario de venta lo tome si se abre uno nuevo
      localStorage.setItem('holbox_divisa_anticipo', valorACargar.toString());
      const copyText = modo === 'DIVISA_A_MXN' ? formattedTotalMxn : `$${cantidad.toLocaleString()} MXN (${formattedTotalDivisa} ${selectedCurrency.code})`;
      navigator.clipboard.writeText(copyText);
    } catch {}

    setCopiedMsg(`Total copiado: ${modo === 'DIVISA_A_MXN' ? formattedTotalMxn : `${formattedTotalDivisa} ${selectedCurrency.code}`}`);
    setTimeout(() => setCopiedMsg(null), 3500);

    if (onOpenNewSale) {
      setTimeout(() => {
        onOpenNewSale();
      }, 600);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      {/* 1. Título y Subtítulo */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xl">
            💱
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Panel Divisas - La Colombiana - Holbox
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Cotización oficial informativa vs Toma local. Hoy 20 sep 2026: Banxico USD $17.22
            </p>
          </div>
        </div>
      </div>

      {/* 2. NUEVO FORMATO COMPACTO - TABLA DE 4 COLUMNAS */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Cabecera de la sección */}
        <div className="p-4 sm:px-5 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Cotización Referencia Interbancaria - Actualizado Diario
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Valores informativos Banxico / No somos casa de cambio
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {lastSyncTime}
            </span>
            <button
              type="button"
              onClick={handleRefreshBanxico}
              disabled={isSyncing}
              title="Sincronizar cotizaciones interbancarias"
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-700"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-[#003087]' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Tabla compacta de 4 columnas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#003087] text-white">
                <th scope="col" className="py-2.5 px-3 font-bold w-14 text-center">
                  Bandera
                </th>
                <th scope="col" className="py-2.5 px-4 font-bold">
                  Divisa
                </th>
                <th scope="col" className="py-2.5 px-4 font-bold text-right">
                  Compra
                </th>
                <th scope="col" className="py-2.5 px-4 font-bold text-right">
                  Venta
                </th>
              </tr>
            </thead>
            <tbody>
              {divisas.map((item, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <tr
                    key={item.code}
                    className={`border-b border-slate-100 dark:border-slate-800/80 transition-colors ${
                      isEven
                        ? 'bg-white dark:bg-slate-900'
                        : 'bg-slate-50 dark:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center text-xl">
                      <span role="img" aria-label={item.name}>
                        {item.flag}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {item.name} <span className="text-slate-500 font-semibold">({item.code})</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                      ${item.compra.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-extrabold text-[#003087] dark:text-[#FFCC00]">
                      ${item.venta.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. CALCULADORA RÁPIDA DE CONVERSIÓN */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#003087] dark:text-[#FFCC00]" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Calculadora rápida de conversión
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            Toma local Holbox
          </span>
        </div>

        {/* Switch de modo arriba del Valor de cambio */}
        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-xl mb-5 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setModo('DIVISA_A_MXN')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              modo === 'DIVISA_A_MXN'
                ? 'bg-white dark:bg-slate-900 text-[#003087] dark:text-[#FFCC00] shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>💵</span> Divisa → MXN
          </button>
          <button
            type="button"
            onClick={toggleModo}
            title="Alternar modo de conversión"
            className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black hover:bg-slate-50 transition mx-1 flex-shrink-0"
          >
            ⇄
          </button>
          <button
            type="button"
            onClick={() => setModo('MXN_A_DIVISA')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              modo === 'MXN_A_DIVISA'
                ? 'bg-white dark:bg-slate-900 text-[#003087] dark:text-[#FFCC00] shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>💰</span> MXN → Divisa
          </button>
        </div>

        {/* Fila con los 3 campos en una misma fila en pantallas medianas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Campo 1: Valor de cambio con layout 2 columnas (35% selector / 65% input) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Valor de cambio:
            </label>
            <div className="flex items-center gap-1.5 relative" ref={currencyDropdownRef}>
              {/* Izquierda (35%): Botón selector de divisa con bandera y código */}
              <div className="w-[35%] relative">
                <button
                  type="button"
                  onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                  className="w-full h-[46px] px-2 py-2 text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/80 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-[#003087] dark:hover:border-[#FFCC00] transition flex items-center justify-between shadow-sm"
                >
                  <span className="flex items-center gap-1 truncate">
                    <span className="text-base leading-none">{selectedCurrency.flag}</span>
                    <span className="text-xs font-black">{selectedCurrency.code}</span>
                  </span>
                  <span className="text-[10px] text-slate-400">▼</span>
                </button>

                {/* Dropdown de 4 divisas de Holbox */}
                {isCurrencyDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-30 overflow-hidden py-1 divide-y divide-slate-100 dark:divide-slate-800">
                    {CURRENCIES.map((cur) => {
                      const dInfo = divisas.find(d => d.code === cur.code);
                      const cRef = dInfo ? dInfo.compra : cur.compraDefault;
                      const sVal = (cRef - 1.00).toFixed(2);
                      const isSelected = selectedCurrency.code === cur.code;
                      return (
                        <button
                          key={cur.code}
                          type="button"
                          onClick={() => handleSelectCurrency(cur)}
                          className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 dark:hover:bg-slate-800 transition ${
                            isSelected
                              ? 'bg-blue-50/90 dark:bg-blue-950/50 font-bold text-[#003087] dark:text-[#FFCC00]'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl leading-none">{cur.flag}</span>
                            <div>
                              <div className="font-bold flex items-center gap-1">
                                {cur.code} <span className="text-[10px] text-slate-400 font-normal">({cur.symbol})</span>
                              </div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[100px]">{cur.name}</div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[10px] text-slate-400">Ref ${cRef.toFixed(2)}</div>
                            <div className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              -${1} = ${sVal}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Derecha (65%): Input numérico del valor, con $ adelante */}
              <div className="w-[65%] relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">$</span>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  value={tomaLocal}
                  onChange={(e) => setTomaLocal(parseFloat(e.target.value) || 0)}
                  className="w-full h-[46px] pl-7 pr-3 text-lg font-extrabold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/80 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-[#003087] dark:focus:border-[#FFCC00] focus:outline-none transition"
                  placeholder="16.00"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
              A cómo lo tomo en Holbox (Sugerido: Compra - $1.00 MXN).
            </p>
          </div>

          {/* Campo 2: Importe a convertir */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Importe a convertir:
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                {modo === 'DIVISA_A_MXN' ? selectedCurrency.symbol : '$'}
              </span>
              <input
                type="number"
                step="1"
                min="0"
                value={importeExtranjero}
                onChange={(e) => setImporteExtranjero(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full h-[46px] pl-8 pr-3 text-lg font-extrabold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/80 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-[#003087] dark:focus:border-[#FFCC00] focus:outline-none transition"
                placeholder={modo === 'DIVISA_A_MXN' ? '100' : '1600'}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
              {modo === 'DIVISA_A_MXN'
                ? `Cantidad en ${selectedCurrency.code} que pregunta el cliente.`
                : 'Cantidad en pesos que te pagan.'}
            </p>
          </div>

          {/* Campo 3: Total MXN o Total Divisa (readonly, verde, grande, bold) */}
          <div>
            <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
              {modo === 'DIVISA_A_MXN' ? 'Total MXN:' : 'Total Divisa:'}
            </label>
            <div className="relative">
              <div className="w-full h-[46px] px-3.5 text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border-2 border-emerald-500 flex items-center justify-between shadow-inner">
                <span>{modo === 'DIVISA_A_MXN' ? formattedTotalMxn : formattedTotalDivisa}</span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                  {modo === 'DIVISA_A_MXN' ? 'MXN' : selectedCurrency.code}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 leading-tight font-medium">
              {modo === 'DIVISA_A_MXN'
                ? `= Valor $${tomaLocal.toFixed(2)} × ${cantidad} ${selectedCurrency.code}`
                : `= $${cantidad.toLocaleString()} / $${tomaLocal.toFixed(2)} = ${totalDivisa.toFixed(2)} ${selectedCurrency.code}`}
            </p>
          </div>
        </div>

        {/* Botón: Cargar al recibo y Feedback */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span>
              {modo === 'DIVISA_A_MXN'
                ? `Ejemplo: Valor $${tomaLocal.toFixed(2)} x ${cantidad} ${selectedCurrency.code} = Total ${formattedTotalMxn}`
                : `Ejemplo: $${cantidad.toLocaleString()} / $${tomaLocal.toFixed(2)} = ${formattedTotalDivisa} ${selectedCurrency.code}`}
            </span>
          </div>

          <button
            type="button"
            id="btn-cargar-al-recibo"
            onClick={handleCargarAlRecibo}
            disabled={totalMxn <= 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#003087] hover:bg-[#002266] active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-blue-900/20 transition"
          >
            <Receipt className="w-4 h-4 text-[#FFCC00]" />
            <span>Cargar al recibo</span>
          </button>
        </div>

        {copiedMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{copiedMsg}</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-extrabold">
              Informativo
            </span>
          </div>
        )}
      </div>

      {/* 4. Aviso amarillo abajo */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/60 rounded-xl p-4 sm:p-5 text-amber-900 dark:text-amber-200 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-200/80 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 text-amber-800 dark:text-amber-300 font-black">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h3 className="font-bold text-xs sm:text-sm text-amber-950 dark:text-amber-100">
              Aviso importante sobre pagos en divisas en Isla Holbox:
            </h3>
            <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
              No somos casa de cambio. Solo brindamos presupuesto estimado en moneda extranjera para comodidad del turista, pero los cobros se calculan con nuestra toma local más baja (USD $16.50) debido a que en Holbox no existen sucursales bancarias y las casas de cambio locales cobran alta comisión por canje de efectivo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
