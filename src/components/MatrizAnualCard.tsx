import React, { useState } from 'react';
import { Sale, TourItem } from '../types';
import { BASE_TOURS } from '../data/defaultTours';

interface MatrizAnualCardProps {
  sales: Sale[];
  tours?: TourItem[];
  selectedYear?: number;
  onYearChange?: (year: number) => void;
  hideHeader?: boolean;
}

export const MatrizAnualCard: React.FC<MatrizAnualCardProps> = ({
  sales,
  tours,
  selectedYear: propSelectedYear,
  onYearChange,
  hideHeader = false
}) => {
  const currentYear = new Date().getFullYear();
  const [internalYear, setInternalYear] = useState<number>(currentYear);
  const selectedYear = propSelectedYear ?? internalYear;
  const [catalogTrigger, setCatalogTrigger] = useState(0);

  // Escuchar evento: window.addEventListener('catalogo-actualizado') para recalcular
  React.useEffect(() => {
    const handleActualizado = () => {
      setCatalogTrigger(prev => prev + 1);
    };
    window.addEventListener('catalogo-actualizado', handleActualizado);
    return () => window.removeEventListener('catalogo-actualizado', handleActualizado);
  }, []);

  const handleYearChange = (year: number) => {
    setInternalYear(year);
    if (onYearChange) {
      onYearChange(year);
    }
  };

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const getPax = (s: any) => Number(s.passengerCount || s.pax || s.personas || s.numPersonas || 1);

  // 1. Obtener catálogo dinámico desde localStorage o props o BASE_TOURS (garantizando los 24 servicios)
  const rawCatalogo: any[] = React.useMemo(() => {
    try {
      const stored = localStorage.getItem('tours_catalog') || localStorage.getItem('ht_tours') || localStorage.getItem('holbox_tours');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    if (tours && tours.length > 0) return tours;
    return BASE_TOURS;
  }, [tours, catalogTrigger]);

  // Lista de tours activos con su nombre limpio
  const listaTours = React.useMemo(() => {
    const toursActivos = rawCatalogo.filter((t: any) => t.activo !== false && t.active !== false);
    return toursActivos
      .map((t: any) => {
        const titulo = t.titulo || t.name || t.tipo_servicio || '';
        const subtitulo = t.subtitulo || '';
        const full = (titulo + (subtitulo ? ' ' + subtitulo : '')).trim();
        return full || titulo;
      })
      .filter((name: string) => Boolean(name));
  }, [rawCatalogo]);

  // Ventas válidas (no canceladas ni reservas pendientes)
  const safeSales = (sales || []).filter(s => {
    if (!s) return false;
    const esReserva = (s as any).esReserva === true || 
                     ['reserva', 'reservación', 'pendiente'].includes((s.status || (s as any).estado || '').toLowerCase());
    return !esReserva && s.status !== 'Cancelado';
  });

  const getSalesForMonth = (month: number, year: number) => {
    return safeSales.filter((s: any) => {
      const dateStr = s.tourDate || s.createdAt?.split('T')[0] || '';
      if (!dateStr) return false;
      const [y, m] = dateStr.split('-').map(Number);
      return y === year && m === month;
    });
  };

  // También incluir cualquier tour que exista en ventas pero no esté en listaTours
  const toursVendidosExtra = React.useMemo(() => {
    const nombresCatalogSet = new Set(listaTours.map((n: string) => n.toLowerCase().trim()));
    const extras: string[] = [];
    safeSales.forEach((s: any) => {
      const nombreVenta = (s.tourName || s.servicios?.[0]?.nombre || '').trim();
      if (nombreVenta && !nombresCatalogSet.has(nombreVenta.toLowerCase())) {
        extras.push(nombreVenta);
        nombresCatalogSet.add(nombreVenta.toLowerCase());
      }
    });
    return extras;
  }, [listaTours, safeSales]);

  const toursParaMatriz = React.useMemo(() => {
    return [...listaTours, ...toursVendidosExtra];
  }, [listaTours, toursVendidosExtra]);

  // 2. Matriz Anual debe mapear todos los tours de la lista completa (aparecen automáticos con 0s)
  const rows = React.useMemo(() => {
    return toursParaMatriz.map((nombreTour) => {
      const row: any = { name: nombreTour, total: 0 };
      months.forEach((_, i) => {
        const monthSales = getSalesForMonth(i + 1, selectedYear);
        const pax = monthSales
          .filter((s: any) => {
            if (Array.isArray(s.servicios) && s.servicios.length > 0) {
              return s.servicios.some((srv: any) => {
                const srvName = (srv.nombre || '').trim().toLowerCase();
                const target = nombreTour.toLowerCase();
                return srvName === target || srvName.includes(target) || target.includes(srvName);
              });
            }
            const saleTour = (s.tourName || '').trim().toLowerCase();
            const targetTour = nombreTour.toLowerCase();
            return saleTour === targetTour || saleTour.includes(targetTour) || targetTour.includes(saleTour);
          })
          .reduce((acc, s: any) => {
            if (Array.isArray(s.servicios) && s.servicios.length > 0) {
              const matches = s.servicios.filter((srv: any) => {
                const srvName = (srv.nombre || '').trim().toLowerCase();
                const target = nombreTour.toLowerCase();
                return srvName === target || srvName.includes(target) || target.includes(srvName);
              });
              if (matches.length > 0) {
                return acc + matches.reduce((sub: number, srv: any) => sub + Number(srv.personas || srv.pax || s.passengerCount || 1), 0);
              }
            }
            return acc + getPax(s);
          }, 0);
        row[months[i]] = pax;
        row.total += pax;
      });
      return row;
    });
  }, [toursParaMatriz, safeSales, selectedYear]);

  const grandTotalAnual = rows.reduce((acc, r) => acc + r.total, 0);

  const enhancedAnnualData = rows.map(r => ({
    ...r,
    porcentaje: grandTotalAnual > 0 ? ((r.total / grandTotalAnual) * 100).toFixed(1) : '0.0'
  }));

  return (
    <div className="w-full shadow-sm rounded-xl print:rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 print:shadow-none">
      {/* Header azul border-b-0 rounded-t-xl como THEAD de la matriz */}
      <div className="bg-blue-600 text-white rounded-t-xl print:rounded-t-lg border-b-0 p-3 print:py-1.5 print:px-2 flex flex-col items-center gap-2 print:gap-0.5 shadow-sm print:shadow-none">
        <h2 className="font-bold text-lg print:text-sm text-center">Matriz Anual {selectedYear}</h2>
        <select
          value={selectedYear}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          className="bg-white text-blue-900 rounded-full px-4 py-1 print:hidden text-sm mx-auto font-semibold shadow-sm cursor-pointer outline-none"
        >
          {[2024, 2025, 2026, 2027, 2028].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Tabla completa con altura automática y scroll horizontal si se requiere en móviles */}
      <div className="w-full h-auto overflow-x-auto print:overflow-visible rounded-b-xl border-t-0 p-1.5 print:p-0 bg-white dark:bg-slate-900 relative">
        <table className="min-w-[680px] print:min-w-0 w-full border-collapse border-spacing-0 text-xs print:text-[8px]">
          <thead>
            <tr className="border-b bg-slate-50 dark:bg-slate-800/80">
              <th className="sticky left-0 top-0 z-[40] min-w-[150px] max-w-[150px] w-[150px] print:min-w-0 print:max-w-none print:w-[32%] bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 p-1.5 print:p-[2px_3px] text-[11px] print:text-[8px] font-bold text-left shadow-xs">
                Tour
              </th>
              {months.map(m => (
                <th key={m} className="sticky top-0 z-[30] min-w-[36px] max-w-[36px] w-[36px] print:min-w-0 print:max-w-none print:w-[4.8%] bg-slate-50 dark:bg-slate-800 p-1.5 print:p-[2px_1px] text-[10px] print:text-[7.5px] font-bold text-center border-b border-slate-200 dark:border-slate-700">
                  {m}
                </th>
              ))}
              <th className="sticky top-0 z-[30] min-w-[42px] print:min-w-0 print:w-[5%] bg-slate-100 dark:bg-slate-800 p-1.5 print:p-[2px_1px] text-[10px] print:text-[7.5px] font-bold text-center border-b border-slate-200 dark:border-slate-700">Total</th>
              <th className="sticky top-0 z-[30] min-w-[42px] print:min-w-0 print:w-[5%] bg-slate-100 dark:bg-slate-800 p-1.5 print:p-[2px_1px] text-[10px] print:text-[7.5px] font-bold text-center border-b border-slate-200 dark:border-slate-700">%</th>
            </tr>
          </thead>
          <tbody>
            {enhancedAnnualData.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center py-4 text-xs text-slate-400">
                  No hay tours en el catálogo
                </td>
              </tr>
            ) : (
              enhancedAnnualData.map((t, i) => {
                const maxPax = Math.max(...months.map(m => t[m] || 0));
                return (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="sticky left-0 z-[20] min-w-[150px] max-w-[150px] print:min-w-0 print:max-w-none print:w-[32%] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 p-1.5 print:p-[1.5px_3px] text-[10.5px] print:text-[7.5px] leading-tight whitespace-normal break-words font-medium text-slate-800 dark:text-slate-200 shadow-xs print:shadow-none">
                      {t.name}
                    </td>
                    {months.map(m => (
                      <td
                        key={m}
                        className={`min-w-[36px] print:min-w-0 print:w-[4.8%] p-1.5 print:p-[1.5px_1px] text-[10px] print:text-[7.5px] text-center border-b border-slate-100 dark:border-slate-800 ${
                          t[m] === maxPax && maxPax > 0 ? 'bg-green-100 dark:bg-green-950/40 font-bold text-green-700 dark:text-green-300' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {t[m] || 0}
                      </td>
                    ))}
                    <td className="min-w-[42px] print:min-w-0 print:w-[5%] p-1.5 print:p-[1.5px_1px] text-[10.5px] print:text-[7.5px] text-center border-b border-slate-100 dark:border-slate-800 font-bold bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white">
                      {t.total}
                    </td>
                    <td className="min-w-[42px] print:min-w-0 print:w-[5%] p-1.5 print:p-[1.5px_1px] text-[10px] print:text-[7.5px] text-center border-b border-slate-100 dark:border-slate-800 text-slate-500 font-semibold">
                      {t.porcentaje}%
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MatrizAnualCard;
