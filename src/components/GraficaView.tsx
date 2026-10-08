import React, { useState, useEffect, useRef } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Sale, BusinessConfig, TourItem } from '../types';
import { BASE_TOURS } from '../data/defaultTours';
import { MatrizAnualCard } from './MatrizAnualCard';
import { Top5ServiciosVendidos } from './Top5ServiciosVendidos';

interface GraficaViewProps {
  sales: Sale[];
  config: BusinessConfig;
  tours: TourItem[];
}

// Auxiliar para convertir oklch a rgb en navegadores modernos evitando errores en html2canvas 1.4.1
const canvasAux = document.createElement('canvas');
canvasAux.width = 1;
canvasAux.height = 1;
const ctxAux = canvasAux.getContext('2d');

const oklchToRgb = (str: string): string => {
  if (!str || typeof str !== 'string' || !str.includes('oklch')) return str;
  return str.replace(/oklch\([^)]+\)/gi, (match) => {
    if (!ctxAux) return '#334155';
    try {
      ctxAux.fillStyle = '#000000';
      ctxAux.fillStyle = match;
      return ctxAux.fillStyle || '#334155';
    } catch {
      return '#334155';
    }
  });
};

const wrapStyleDeclaration = (target: CSSStyleDeclaration) => {
  return new Proxy(target, {
    get(obj: any, prop: string | symbol) {
      if (prop === 'getPropertyValue') {
        return (name: string) => {
          const val = obj.getPropertyValue(name);
          return typeof val === 'string' && val.includes('oklch') ? oklchToRgb(val) : val;
        };
      }
      const val = obj[prop];
      if (typeof val === 'string' && val.includes('oklch')) {
        return oklchToRgb(val);
      }
      if (typeof val === 'function') {
        return val.bind(obj);
      }
      return val;
    }
  });
};

// Cargar html2canvas desde CDN https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
const getHtml2Canvas = async (): Promise<any> => {
  if (typeof (window as any).html2canvas === 'function') {
    return (window as any).html2canvas;
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="html2canvas"]') as HTMLScriptElement;
    if (existing) {
      if ((window as any).html2canvas) {
        return resolve((window as any).html2canvas);
      }
      existing.addEventListener('load', () => resolve((window as any).html2canvas));
      setTimeout(() => {
        if ((window as any).html2canvas) resolve((window as any).html2canvas);
        else reject(new Error('html2canvas CDN tardó demasiado en cargar'));
      }, 2500);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => {
      if ((window as any).html2canvas) {
        resolve((window as any).html2canvas);
      } else {
        reject(new Error('html2canvas no se encontró tras cargar'));
      }
    };
    script.onerror = () => reject(new Error('No se pudo cargar html2canvas desde CDN'));
    document.head.appendChild(script);
  });
};

export const GraficaView: React.FC<GraficaViewProps> = ({ sales, tours }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isExportingPNG, setIsExportingPNG] = useState(false);
  const [catalogTrigger, setCatalogTrigger] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Escuchar evento: window.addEventListener('catalogo-actualizado') para recalcular
  useEffect(() => {
    const handleActualizado = () => {
      setCatalogTrigger(prev => prev + 1);
    };
    window.addEventListener('catalogo-actualizado', handleActualizado);
    return () => window.removeEventListener('catalogo-actualizado', handleActualizado);
  }, []);

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

  // Ventas válidas para el año seleccionado (no reservas pendientes ni canceladas)
  const safeSales = React.useMemo(() => {
    return (sales || []).filter(s => {
      if (!s) return false;
      const esReserva = (s as any).esReserva === true || 
                       ['reserva', 'reservación', 'pendiente'].includes((s.status || (s as any).estado || '').toLowerCase());
      if (esReserva || s.status === 'Cancelado') return false;
      const dateStr = s.tourDate || s.createdAt?.split('T')[0] || '';
      if (!dateStr) return false;
      const [y] = dateStr.split('-').map(Number);
      return y === selectedYear;
    });
  }, [sales, selectedYear]);

  // Participación Anual por Tour usando listaTours dinámico (MOSTRAR TODOS AUNQUE pax=0)
  const totalAnualPax = React.useMemo(() => safeSales.reduce((acc, s) => acc + getPax(s), 0), [safeSales]);

  // Incluir listaTours completa (24 servicios) y cualquier otro tour vendido registrado
  const participacion = React.useMemo(() => {
    const nombresCatalogSet = new Set(listaTours.map((n: string) => n.toLowerCase().trim()));
    const todosLosNombres = [...listaTours];

    safeSales.forEach((s: any) => {
      const nombreVenta = (s.tourName || s.servicios?.[0]?.nombre || '').trim();
      if (nombreVenta && !nombresCatalogSet.has(nombreVenta.toLowerCase())) {
        todosLosNombres.push(nombreVenta);
        nombresCatalogSet.add(nombreVenta.toLowerCase());
      }
    });

    return todosLosNombres.map(nombreTour => {
      const total = safeSales
        .filter(s => {
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
        .reduce((sum, s) => {
          if (Array.isArray(s.servicios) && s.servicios.length > 0) {
            const matches = s.servicios.filter((srv: any) => {
              const srvName = (srv.nombre || '').trim().toLowerCase();
              const target = nombreTour.toLowerCase();
              return srvName === target || srvName.includes(target) || target.includes(srvName);
            });
            if (matches.length > 0) {
              return sum + matches.reduce((sub: number, srv: any) => sub + Number(srv.personas || srv.pax || s.passengerCount || 1), 0);
            }
          }
          return sum + getPax(s);
        }, 0);

      const pct = totalAnualPax > 0 ? (total / totalAnualPax * 100).toFixed(1) : '0';
      return { nombreCompleto: nombreTour, total, pct: parseFloat(pct) };
    })
    .sort((a, b) => b.total - a.total);
  }, [safeSales, listaTours, totalAnualPax]);

  // UN SOLO BOTÓN: Descargar Grafica PNG
  // Al click:
  // 1. Oculta el botón
  // 2. Captura div contenedor con Top 5 Servicios Más Vendidos y Matriz Anual 2026 completo con html2canvas
  //    { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 1400 }
  // 3. Convierte a canvas.toDataURL y descarga como HOLBOX_GRAFICA_2026_TOP5_MATRIZ.png
  // 4. Vuelve a mostrar el botón
  const handleDescargarGraficaPNG = async () => {
    if (isExportingPNG) return;
    const targetElement = document.getElementById('grafica-full') || contentRef.current;
    if (!targetElement) {
      alert('No se encontró el contenedor de la gráfica.');
      return;
    }

    // 1. Oculta el botón
    setIsExportingPNG(true);

    const origGetComputedStyle = window.getComputedStyle;
    (window as any).getComputedStyle = function (el: Element, pseudo?: string | null) {
      const cs = origGetComputedStyle.call(this, el, pseudo);
      return wrapStyleDeclaration(cs);
    };

    try {
      // 2. Cargar html2canvas desde CDN
      const h2c = await getHtml2Canvas();

      // Esperar brevemente para asegurar que el botón esté oculto en el render
      await new Promise(resolve => setTimeout(resolve, 150));

      // 3. Capturar contenedor completo con opciones exactas
      const canvas: HTMLCanvasElement = await h2c(targetElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 1400,
        logging: false,
        onclone: (clonedDoc: Document) => {
          // Reemplazar cualquier función oklch en etiquetas <style>
          try {
            const styles = clonedDoc.querySelectorAll('style');
            styles.forEach(st => {
              if (st.textContent && st.textContent.includes('oklch')) {
                st.textContent = oklchToRgb(st.textContent);
              }
            });
          } catch {}

          // Wrapper en getComputedStyle del documento clonado
          try {
            const clonedWin = clonedDoc.defaultView;
            if (clonedWin) {
              const origCloned = clonedWin.getComputedStyle;
              clonedWin.getComputedStyle = function (el: Element, pseudo?: string | null) {
                const cs = origCloned.call(this, el, pseudo);
                return wrapStyleDeclaration(cs);
              };
            }
          } catch {}

          // Asegurar que la tabla de matriz se expanda sin recortes horizontales
          try {
            clonedDoc.querySelectorAll('.overflow-x-auto').forEach((el: any) => {
              el.style.overflow = 'visible';
            });
          } catch {}
        }
      });

      // 4. Convierte a canvas.toDataURL y descarga como HOLBOX_GRAFICA_2026_TOP5_MATRIZ.png
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const fileName = `HOLBOX_GRAFICA_${selectedYear || 2026}_TOP5_MATRIZ.png`;

      // Descarga compatible con móvil Android y preview iframe
      try {
        const byteString = atob(dataUrl.split(',')[1]);
        const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.download = fileName;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      } catch {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      console.error('Error al generar imagen PNG de la gráfica:', err);
      alert('Ocurrió un error al generar la imagen PNG: ' + (err?.message || err));
    } finally {
      // Restaurar getComputedStyle y volver a mostrar el botón
      window.getComputedStyle = origGetComputedStyle;
      setIsExportingPNG(false);
    }
  };

  return (
    <div
      id="grafica-tab"
      data-tab="grafica"
      className="w-full max-w-7xl mx-auto px-4 py-4 print:p-0 space-y-4 print:space-y-2 pb-32 print:pb-0"
    >
      {/* ÚNICO BOTÓN: Descargar Grafica PNG (se oculta al hacer clic durante la captura y se vuelve a mostrar) */}
      {!isExportingPNG && (
        <div className="flex justify-end items-center print:hidden no-print">
          <button
            type="button"
            onClick={handleDescargarGraficaPNG}
            disabled={isExportingPNG}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
            title="Descargar imagen PNG con Top 5 y Matriz Anual completa"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Grafica PNG</span>
          </button>
        </div>
      )}

      {/* CONTENEDOR DE CAPTURA COMPLETO: Top 5 Servicios Más Vendidos + Matriz Anual 2026 */}
      <div
        id="grafica-full"
        data-tab="grafica"
        ref={contentRef}
        className="reporte-impresion-completo space-y-4 print:space-y-2 bg-white dark:bg-slate-900 p-2 rounded-2xl"
      >
        {/* 1. TOP 5 SERVICIOS VENDIDOS */}
        <div className="bg-transparent">
          <Top5ServiciosVendidos
            año={selectedYear}
            sales={sales}
            tours={tours}
          />
        </div>

        {/* 2. MATRIZ ANUAL CON HEADER AZUL UNIDO A LA TABLA */}
        <MatrizAnualCard
          sales={sales}
          tours={tours}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
      </div>

      {/* 3. PARTICIPACIÓN ANUAL COMPACTA CON TODOS LOS CONCEPTOS (INCLUYENDO 0s) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 shadow-sm print:hidden">
        <style>{`
          .participacion-bar-track {background:#E5E7EB !important; height:8px !important; border-radius:99px !important;}
          .participacion-bar-fill {background:#5B8C8E !important; height:8px !important; border-radius:99px !important;}
          .participacion-label {color:#111827 !important; font-size:14px !important;}
          .participacion-value {color:#6B7280 !important; font-size:13px !important;}
        `}</style>
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
          <h4 className="font-bold text-xs text-slate-900 dark:text-white">
            Participación Anual {selectedYear} - % por Tour
          </h4>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
            Total: {totalAnualPax} PAX
          </span>
        </div>
        <div className="space-y-1.5 py-0.5">
          {participacion.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">No hay datos en el catálogo.</p>
          ) : (
            participacion.map((item) => {
              const esCero = item.total === 0;
              return (
                <div key={item.nombreCompleto} className="space-y-0.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="participacion-label font-bold truncate pr-2">
                      {item.nombreCompleto}
                    </span>
                    <span className="participacion-value shrink-0 font-semibold">
                      {esCero ? '0 pax - 0%' : `${item.total} pax - ${item.pct}%`}
                    </span>
                  </div>
                  <div className="w-full overflow-hidden participacion-bar-track">
                    <div
                      className="participacion-bar-fill transition-all duration-500"
                      style={{ width: esCero ? '2%' : `${Math.max(item.pct, 2)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default GraficaView;

