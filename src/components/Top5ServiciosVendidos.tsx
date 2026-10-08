import React, { useState, useMemo } from 'react';
import { Sale, TourItem } from '../types';
import { BASE_TOURS } from '../data/defaultTours';

interface Top5ServiciosVendidosProps {
  periodo?: 'anual' | 'mensual';
  mesSeleccionado?: number;
  año?: number;
  sales?: Sale[];
  tours?: TourItem[];
  onPeriodoChange?: (periodo: 'anual' | 'mensual') => void;
  onMesChange?: (mes: number) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const Top5ServiciosVendidos: React.FC<Top5ServiciosVendidosProps> = ({
  periodo: propPeriodo,
  mesSeleccionado: propMes,
  año = 2026,
  sales: propSales,
  tours: propTours,
  onPeriodoChange,
  onMesChange
}) => {
  const [internalPeriodo, setInternalPeriodo] = useState<'anual' | 'mensual'>(propPeriodo || 'anual');
  const [internalMes, setInternalMes] = useState<number>(propMes || (new Date().getMonth() + 1));

  const periodo = propPeriodo ?? internalPeriodo;
  const mes = propMes ?? internalMes;

  const handlePeriodoToggle = (nuevoPeriodo: 'anual' | 'mensual') => {
    setInternalPeriodo(nuevoPeriodo);
    if (onPeriodoChange) onPeriodoChange(nuevoPeriodo);
  };

  const handleMesSelect = (nuevoMes: number) => {
    setInternalMes(nuevoMes);
    if (onMesChange) onMesChange(nuevoMes);
  };

  const getPax = (s: any) => Number(s.passengerCount || s.pax || s.personas || s.numPersonas || 1);

  // 1. Obtener catálogo dinámico
  const rawCatalogo: any[] = useMemo(() => {
    try {
      const stored = localStorage.getItem('tours_catalog') || localStorage.getItem('ht_tours') || localStorage.getItem('holbox_tours');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    if (propTours && propTours.length > 0) return propTours;
    return BASE_TOURS;
  }, [propTours]);

  // Lista de nombres completos de tours activos
  const listaCatalogoNombres = useMemo(() => {
    return rawCatalogo
      .filter((t: any) => t.activo !== false && t.active !== false)
      .map((t: any) => {
        const titulo = t.titulo || t.name || t.tipo_servicio || '';
        const subtitulo = t.subtitulo || '';
        const full = (titulo + (subtitulo ? ' ' + subtitulo : '')).trim();
        return full || titulo;
      })
      .filter((name: string) => Boolean(name));
  }, [rawCatalogo]);

  // 2. Obtener folios / ventas
  const allFolios: Sale[] = useMemo(() => {
    if (propSales && propSales.length > 0) return propSales;
    try {
      const stored = localStorage.getItem('folios') || localStorage.getItem('ventas');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }, [propSales]);

  // Filtrar folios válidos según año y mes (excluir cancelados y reservas pendientes)
  const foliosFiltrados = useMemo(() => {
    return allFolios.filter((s: any) => {
      if (!s) return false;
      const esReserva = (s as any).esReserva === true || 
                       ['reserva', 'reservación', 'pendiente'].includes((s.status || (s as any).estado || '').toLowerCase());
      if (esReserva || s.status === 'Cancelado') return false;

      const dateStr = s.tourDate || s.createdAt?.split('T')[0] || '';
      if (!dateStr) return false;
      const [y, m] = dateStr.split('-').map(Number);
      if (y !== año) return false;

      if (periodo === 'mensual') {
        return m === mes;
      }
      return true;
    });
  }, [allFolios, año, periodo, mes]);

  // Total de pax del periodo seleccionado
  const totalPaxPeriodo = useMemo(() => {
    return foliosFiltrados.reduce((sum, s) => sum + getPax(s), 0);
  }, [foliosFiltrados]);

  // Contar pax por tour y calcular Top 5
  const top5 = useMemo(() => {
    // Tomar tours del catálogo y cualquier otro tour registrado en ventas
    const nombresCatalogSet = new Set(listaCatalogoNombres.map((n: string) => n.toLowerCase().trim()));
    const todosLosNombres = [...listaCatalogoNombres];

    foliosFiltrados.forEach((s: any) => {
      const nombreVenta = (s.tourName || s.servicios?.[0]?.nombre || '').trim();
      if (nombreVenta && !nombresCatalogSet.has(nombreVenta.toLowerCase())) {
        todosLosNombres.push(nombreVenta);
        nombresCatalogSet.add(nombreVenta.toLowerCase());
      }
    });

    const resultados = todosLosNombres.map((nombreTour) => {
      const paxTour = foliosFiltrados
        .filter((s: any) => {
          // Si tiene múltiples servicios desglosados
          if (Array.isArray(s.servicios) && s.servicios.length > 0) {
            return s.servicios.some((srv: any) => {
              const srvName = (srv.nombre || '').trim().toLowerCase();
              const target = nombreTour.toLowerCase();
              return srvName === target || srvName.includes(target) || target.includes(srvName);
            });
          }
          const saleTour = (s.tourName || '').trim().toLowerCase();
          const target = nombreTour.toLowerCase();
          return saleTour === target || saleTour.includes(target) || target.includes(saleTour);
        })
        .reduce((sum, s: any) => {
          if (Array.isArray(s.servicios) && s.servicios.length > 0) {
            const matchingServicios = s.servicios.filter((srv: any) => {
              const srvName = (srv.nombre || '').trim().toLowerCase();
              const target = nombreTour.toLowerCase();
              return srvName === target || srvName.includes(target) || target.includes(srvName);
            });
            if (matchingServicios.length > 0) {
              return sum + matchingServicios.reduce((subSum: number, srv: any) => {
                return subSum + Number(srv.personas || srv.pax || s.passengerCount || 1);
              }, 0);
            }
          }
          return sum + getPax(s);
        }, 0);

      const pct = totalPaxPeriodo > 0 ? (paxTour / totalPaxPeriodo) * 100 : 0;
      return {
        nombre: nombreTour,
        pax: paxTour,
        pct
      };
    });

    return resultados
      .filter(item => item.pax > 0)
      .sort((a, b) => b.pax - a.pax)
      .slice(0, 5);
  }, [listaCatalogoNombres, foliosFiltrados, totalPaxPeriodo]);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          icon: '🥇',
          label: '#1 🥇',
          badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
          barClass: 'bg-gradient-to-r from-amber-400 to-amber-500'
        };
      case 2:
        return {
          icon: '🥈',
          label: '#2 🥈',
          badgeClass: 'bg-slate-200 text-slate-800 border border-slate-300 font-bold',
          barClass: 'bg-gradient-to-r from-slate-400 to-slate-500'
        };
      case 3:
        return {
          icon: '🥉',
          label: '#3 🥉',
          badgeClass: 'bg-amber-100/70 text-amber-900 border border-amber-600/30 font-bold',
          barClass: 'bg-gradient-to-r from-amber-600 to-amber-700'
        };
      case 4:
        return {
          icon: '',
          label: '#4',
          badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200 font-bold',
          barClass: 'bg-gradient-to-r from-blue-500 to-blue-600'
        };
      case 5:
      default:
        return {
          icon: '',
          label: '#5',
          badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200 font-bold',
          barClass: 'bg-gradient-to-r from-indigo-400 to-indigo-500'
        };
    }
  };

  return (
    <div
      id="top5-card"
      className="bg-white dark:bg-slate-900 py-3 px-4 print:py-1.5 print:px-2 rounded-2xl print:rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm print:shadow-none"
    >
      {/* Header del Top 5 Compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5 pb-2 print:mb-1 print:pb-1 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 print:w-5 print:h-5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center text-sm print:text-xs shrink-0 shadow-xs print:shadow-none">
            🏆
          </div>
          <div>
            <h3 className="font-bold text-sm print:text-xs text-slate-900 dark:text-white leading-tight">
              Top 5 Servicios Más Vendidos
            </h3>
            <p className="text-[10px] print:text-[8px] text-slate-500 dark:text-slate-400">
              Según pasajeros (PAX) registrados en folios
            </p>
          </div>
        </div>

        {/* Filtros Toggle Anual / Mensual Compactos (Ocultos en impresión para máxima limpieza) */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto print:hidden">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => handlePeriodoToggle('anual')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                periodo === 'anual'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Anual
            </button>
            <button
              type="button"
              onClick={() => handlePeriodoToggle('mensual')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                periodo === 'mensual'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Mensual
            </button>
          </div>

          {periodo === 'mensual' && (
            <select
              value={mes}
              onChange={(e) => handleMesSelect(Number(e.target.value))}
              className="py-1 px-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none cursor-pointer shadow-xs"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Lista del Ranking Compacta */}
      {top5.length === 0 ? (
        <div className="py-4 text-center text-slate-400 dark:text-slate-500 text-xs">
          No hay ventas registradas en este periodo
        </div>
      ) : (
        <div className="space-y-1.5 print:space-y-0.5 py-0.5">
          {top5.map((item, index) => {
            const rank = index + 1;
            const meta = getRankBadge(rank);
            return (
              <div key={item.nombre} className="space-y-0.5 print:space-y-0">
                <div className="flex items-center justify-between text-xs print:text-[8px]">
                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] print:text-[7.5px] print:px-1 print:py-0 shrink-0 ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                    <span
                      className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs print:text-[8px]"
                      title={item.nombre}
                    >
                      {item.nombre}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-right shrink-0">
                    <span className="font-bold text-slate-900 dark:text-white text-xs print:text-[8px]">
                      {item.pax} pax
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-semibold text-[10px] print:text-[7.5px] min-w-[38px] text-right">
                      {item.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                {/* Barra de progreso h-2 */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 print:h-1 overflow-hidden">
                  <div
                    className={`h-2 print:h-1 rounded-full transition-all duration-500 ${meta.barClass}`}
                    style={{ width: `${Math.min(100, Math.max(item.pct, 3))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Top5ServiciosVendidos;
