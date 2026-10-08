import React, { useMemo, useState } from 'react';
import { Sale, BusinessConfig, PagoDiario } from '../types';
import { CotizadorRapido } from './CotizadorRapido';

const METODOS = [
  'Efectivo',
  'Transferencia Bancaria',
  'SPEI',
  'Tarjeta (Terminal)',
  'CoDi',
  'USD (Dólares)',
  'EUR (Euros)',
  'GBP (Libras)',
  'CAD (Dólares Canadiense)'
];

interface CajaViewProps {
  sales?: Sale[];
  ventas?: Sale[];
  config?: BusinessConfig;
  pagosDiarios?: PagoDiario[];
  setPagosDiarios?: React.Dispatch<React.SetStateAction<PagoDiario[]>>;
  fechaSeleccionada?: string;
}

export const CajaView: React.FC<CajaViewProps> = ({
  sales: salesProp,
  ventas: ventasProp,
  config,
  pagosDiarios: pagosDiariosProp,
  setPagosDiarios,
  fechaSeleccionada: fechaSeleccionadaProp
}) => {
  const sales = salesProp || ventasProp || [];
  const [pagosDiariosLocal] = useState<PagoDiario[]>(() => {
    try {
      const s = localStorage.getItem('pagosDiarios');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const pagosDiarios = pagosDiariosProp || pagosDiariosLocal || [];
  const [filtro, setFiltro] = useState<'hoy' | 'ayer' | 'mes' | 'todo' | 'custom'>('hoy');
  const [fechaCustom, setFechaCustom] = useState<string>(new Date().toISOString().split('T')[0]);

  const hoy = new Date().toISOString().split('T')[0];
  const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const fechaSeleccionada = fechaSeleccionadaProp || (filtro === 'hoy' ? hoy : filtro === 'ayer' ? ayer : filtro === 'custom' ? fechaCustom : hoy);

  // 1. Filtrar ventas según el periodo seleccionado
  const ventasFiltradas = useMemo(() => {
    return sales.filter((s) => {
      if (s.status === 'Cancelado') return false;
      const fCreacion = s.createdAt ? s.createdAt.split('T')[0] : s.tourDate;
      const fTour = s.tourDate;

      if (filtro === 'todo') return true;
      if (filtro === 'mes') {
        const mesActual = hoy.slice(0, 7);
        return fCreacion?.startsWith(mesActual) || fTour?.startsWith(mesActual);
      }
      if (filtro === 'hoy') return fCreacion === hoy || fTour === hoy;
      if (filtro === 'ayer') return fCreacion === ayer || fTour === ayer;
      if (filtro === 'custom') return fCreacion === fechaCustom || fTour === fechaCustom;
      return true;
    });
  }, [sales, filtro, hoy, ayer, fechaCustom]);

  // 2. Historial unificado de pagos/abonos percibidos
  const todosLosPagos = useMemo(() => {
    const arr: any[] = [];
    const foliosCobrados = new Set<string>();

    try {
      const stored = localStorage.getItem('pagosDiarios');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((pd: any) => {
            arr.push({
              amount: pd.monto,
              method: pd.metodoPago || 'Efectivo',
              date: pd.fechaCobro ? pd.fechaCobro.split('T')[0] : new Date().toISOString().split('T')[0],
              time: pd.hora || '09:00',
              clientName: pd.cliente,
              folio: pd.folio,
              note: pd.tipo
            });
            if (pd.folio) foliosCobrados.add(pd.folio);
          });
        }
      }
    } catch {}

    if (Array.isArray(sales)) {
      sales.forEach((s: any) => {
        if (s.status === 'Cancelado') return;
        if (s.payments && Array.isArray(s.payments) && s.payments.length > 0) {
          s.payments.forEach((p: any) =>
            arr.push({
              ...p,
              clientName: s.clientName,
              folio: s.folio,
              tourDate: s.tourDate
            })
          );
        } else if (s.advancePayment > 0 && !foliosCobrados.has(s.folio)) {
          arr.push({
            amount: s.advancePayment,
            method: s.paymentMethod || 'Efectivo',
            date: s.createdAt ? s.createdAt.split('T')[0] : s.tourDate || hoy,
            time: '09:00',
            clientName: s.clientName,
            folio: s.folio,
            note: 'Anticipo inicial'
          });
        }
      });
    }

    return arr.sort((a, b) => ((b.date || '') + (b.time || '')).localeCompare((a.date || '') + (a.time || '')));
  }, [sales, hoy]);

  const pagosDelDia = useMemo(() => {
    if (filtro === 'todo') return todosLosPagos;
    const fechaFiltroStr = new Date(fechaSeleccionada + 'T12:00:00').toDateString();
    return todosLosPagos.filter((p: any) => {
      if (!p || !p.date) return false;
      return new Date(p.date + 'T12:00:00').toDateString() === fechaFiltroStr;
    });
  }, [todosLosPagos, fechaSeleccionada, filtro]);

  const totalContratado = useMemo(() => {
    return (ventasFiltradas || []).reduce((acc, s) => acc + (s.total || s.totalFolio || 0), 0);
  }, [ventasFiltradas]);

  const totalCobrado = useMemo(() => {
    return (pagosDelDia || []).reduce((s: any, p: any) => s + Number(p.amount || p.monto || 0), 0);
  }, [pagosDelDia]);

  const desgloseCobros = useMemo(() => {
    return pagosDelDia.reduce((acc: any, p: any) => {
      const m = p.method || p.metodoPago || 'Efectivo';
      acc[m] = (acc[m] || 0) + Number(p.amount || p.monto || 0);
      return acc;
    }, {});
  }, [pagosDelDia]);

  const honorariosPrestadores = useMemo(() => {
    let totalHonorarios = 0;
    ventasFiltradas.forEach((s: any) => {
      if (s.servicios?.length > 0) {
        s.servicios.forEach((serv: any) => {
          const costo = Number(serv.providerCost || 0);
          const cant = Number(serv.cantidad || 1);
          if (costo > 0) {
            totalHonorarios += costo * cant;
          }
        });
      } else {
        // Fallback si no hay desglosado pero la venta traía providerCost global
        totalHonorarios += Number(s.providerCost || 0);
      }
    });
    return totalHonorarios;
  }, [ventasFiltradas]);

  const gananciaNetaAgencia = totalContratado - honorariosPrestadores;
  const utilidadTotal = gananciaNetaAgencia;

  const porCobrarGlobal = useMemo(() => {
    return sales
      .filter((s) => s.status !== 'Cancelado')
      .reduce((acc, s) => acc + Number(s.balance || 0), 0);
  }, [sales]);

  // Desglose por método de pago
  const porMetodo = useMemo(() => {
    const map: Record<string, number> = {};
    METODOS.forEach((m) => (map[m] = 0));
    pagosDelDia.forEach((p: any) => {
      const m = p.method || p.metodoPago || 'Efectivo';
      const key =
        METODOS.find(
          (x) =>
            m.toLowerCase().includes(x.toLowerCase().split(' ')[0]) ||
            x.toLowerCase().includes(m.toLowerCase())
        ) || m;
      map[key] = (map[key] || 0) + Number(p.amount || p.monto || 0);
    });
    return map;
  }, [pagosDelDia]);

  // Cotizador Divisas
  const tiposCambioOficial = useMemo(() => {
    try {
      const stored = localStorage.getItem('tcMulti');
      return stored
        ? JSON.parse(stored)
        : { USD: 19.20, EUR: 21.50, CAD: 16.80, GBP: 25.10 };
    } catch {
      return { USD: 19.20, EUR: 21.50, CAD: 16.80, GBP: 25.10 };
    }
  }, []);

  const tcOficial = tiposCambioOficial['USD'] || 19.20;

  const fmt = (n: number) =>
    Number(n || 0).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    });

  return (
    <div className="p-3 sm:p-4 space-y-4 pb-28 max-w-5xl mx-auto">
      {/* 1. Calculadora de Divisas Arriba del todo */}
      <CotizadorRapido tiposCambio={tiposCambioOficial} tcOficial={tcOficial} />

      {/* 2. Header y Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>💰 Corte de Caja Real y Ganancias</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Resumen de contrataciones, cobros en efectivo/banco, honorarios de prestadores y ganancia neta.
          </p>
        </div>

        {/* Filtros de Fecha */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { k: 'hoy', label: 'Hoy' },
            { k: 'ayer', label: 'Ayer' },
            { k: 'mes', label: 'Este mes' },
            { k: 'todo', label: 'Todo' }
          ].map((b) => (
            <button
              key={b.k}
              type="button"
              onClick={() => setFiltro(b.k as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                filtro === b.k
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              {b.label}
            </button>
          ))}
          <input
            type="date"
            value={fechaCustom}
            onChange={(e) => {
              setFechaCustom(e.target.value);
              setFiltro('custom');
            }}
            className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl px-2.5 py-1 text-xs font-semibold"
          />
        </div>
      </div>

      {/* LAS 4 TARJETAS DEL CORTE DE CAJA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Tarjeta 1: Total Contratado */}
        <div className="bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-2xl p-3.5 shadow-sm space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            📊 Total Contratado
          </p>
          <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {fmt(totalContratado)}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {ventasFiltradas.length} folios emitidos ({filtro})
          </p>
        </div>

        {/* Tarjeta 2: Total Cobrado / Percibido */}
        <div className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-md space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
            💵 COBRADO / ANTICIPOS
          </p>
          <p className="text-lg sm:text-xl font-black text-amber-400">
            {fmt(totalCobrado)}
          </p>
          <p className="text-[10px] text-slate-300">
            {pagosDelDia.length} {pagosDelDia.length === 1 ? 'pago' : 'pagos'} en caja ({filtro})
          </p>
        </div>

        {/* Tarjeta 3: Honorarios Prestadores */}
        <div className="bg-white dark:bg-slate-800 border-2 border-amber-500 rounded-2xl p-3.5 shadow-sm space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            👤 Honorarios Prestadores
          </p>
          <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">
            {fmt(honorariosPrestadores)}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Capitanes, Lancheros, Guías
          </p>
        </div>

        {/* Tarjeta 4: Ganancia Neta Agencia */}
        <div className="bg-emerald-600 text-white rounded-2xl p-3.5 shadow-md space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-100">
            📈 Ganancia Neta Agencia
          </p>
          <p className="text-lg sm:text-xl font-black text-white">
            {fmt(utilidadTotal)}
          </p>
          <p className="text-[10px] text-emerald-100 font-medium">
            Utilidad real del periodo (Contratado - Honorarios)
          </p>
        </div>
      </div>

      {/* Tarjeta adicional de Saldo Pendiente por Cobrar Global */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
            ⏳ Saldo Pendiente Por Cobrar (Global)
          </span>
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Total acumulado de folios activos con saldo pendiente por cobrar en el punto de encuentro
          </p>
        </div>
        <span className="text-base font-black text-amber-900 dark:text-amber-200">
          {fmt(porCobrarGlobal)}
        </span>
      </div>

      {/* Desglose de Cobros por Método de Pago */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Desglose de Cobros en Caja ({filtro.toUpperCase()})
          </span>
          <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
            {fmt(totalCobrado)}
          </span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
          {Object.entries(desgloseCobros).map(([metodo, monto]: any) => (
            <div
              key={metodo}
              className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/40"
            >
              <span className="font-medium text-slate-700 dark:text-slate-300">{metodo}</span>
              <span className="font-extrabold text-slate-900 dark:text-white">{fmt(Number(monto))}</span>
            </div>
          ))}
          {Object.keys(desgloseCobros).length === 0 && (
            <div className="p-4 text-center text-slate-400 text-xs">
              No hay registrado ningún cobro en este periodo.
            </div>
          )}
        </div>
      </div>

      {/* Historial de Abonos percibidos */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Historial de Cobros y Abonos ({pagosDelDia.length})
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
            {filtro}
          </span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs max-h-[300px] overflow-y-auto">
          {pagosDelDia.map((p: any, i: number) => (
            <div key={i} className="p-3 flex justify-between items-center gap-2">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {p.clientName || p.cliente} <span className="text-blue-600 font-mono">({p.folio})</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  📅 {p.date || p.fechaCobro?.split('T')[0]} • ⏰ {p.time || p.hora || '09:00'} • 💳 {p.method || p.metodoPago} • {p.note || p.tipo || 'cobro'}
                </p>
              </div>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                +{fmt(p.amount || p.monto)}
              </span>
            </div>
          ))}
          {pagosDelDia.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-400">
              No se registraron cobros o anticipos en el filtro seleccionado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CajaView;
