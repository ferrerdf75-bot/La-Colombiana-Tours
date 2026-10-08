import React, { useState } from 'react';
import {
  Calendar,
  Check,
  Phone
} from 'lucide-react';
import { Sale, BusinessConfig } from '../types';
import {
  getHoyHolbox,
  getMananaHolbox,
  formatearFechaBonita,
  cleanPhoneForWhatsApp
} from '../utils/formatters';
import { ChatAsistente } from './ChatAsistente';
import { useEnergy } from '../context/EnergyModeContext';
import { useEffect, useRef } from 'react';

interface DashboardViewProps {
  sales: Sale[];
  config: BusinessConfig;
  onOpenNewSale: () => void;
  onViewReceipt: (sale: Sale) => void;
  onGoToTab: (tab: 'recordatorios' | 'cierre' | 'bitacora' | 'divisas' | 'ajuste') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  config,
  onViewReceipt,
}) => {
  let hoy = getHoyHolbox(); // e.g. 2026-09-24
  let manana = getMananaHolbox(); // e.g. 2026-09-25

  // Active (non-cancelled) sales
  const activeSales = sales.filter((s) => s.status !== 'Cancelado');

  // Sales created today
  const todaySalesCreated = activeSales.filter((s) => s.createdAt.startsWith(hoy));
  const totalRecaudadoHoy = todaySalesCreated.reduce((acc, s) => acc + s.advancePayment, 0);

  const nombreCompleto = (config.nombrePropietaria || '').trim();
  const nombre = nombreCompleto.split(' ')[0] || 'Julieth';
  const fechaNac = config.fechaNacimiento; // formato YYYY-MM-DD

  const [anioH, mesH, diaH] = hoy.split('-').map(Number);
  const dia = diaH;
  const mes = mesH;

  let mensajeFinal = "";
  let esFechaEspecial = false;

  // 1. PRIORIDAD 1: AÑO NUEVO - 1 ENERO TODO EL DIA
  if (dia === 1 && mes === 1) {
    esFechaEspecial = true;
    mensajeFinal = `¡Feliz Año Nuevo mi parcerita hermosa! ${nombre}, me da tanto gusto tenerte en mi vida. Eres una gran amiga, siempre tan alegre, tan motivadora, iluminas todo a tu paso. De corazón deseo que este año sea un año de muchas bendiciones, abundancia, salud y tours llenos para La Colombiana. ¡Gracias por existir! Feliz año nuevo!! 🎉💙✨`;
  }
  // 2. PRIORIDAD 2: CUMPLEAÑOS - TODO EL DIA SOLO FELICITACIÓN
  else if (fechaNac) {
    const partes = fechaNac.split('-');
    const diaNac = parseInt(partes[2]);
    const mesNac = parseInt(partes[1]);
    if (dia === diaNac && mes === mesNac) {
      esFechaEspecial = true;
      mensajeFinal = `¡Feliz cumpleaños mi parcerita hermosa! Hoy es tu día ${nombre} 🎂💙 Eres una mujer increíble, alegre, luchadora y con un corazón enorme. Que este nuevo año de vida te traiga mucha salud, amor, éxitos y todo lo bonito que te mereces. ¡Disfruta tu día al máximo, te quiero mucho! ✨🎉`;
    }
  }

  // 3. SI NO ES FECHA ESPECIAL -> GENERADOR INFINITO
  if (!esFechaEspecial) {
    const intros = ["Buenos días", "Hola", "Mi parcerita hermosa", "Hey hermosa"];
    const acciones = ["conquista", "ilumina", "llena de magia", "abraza fuerte", "disfruta"];
    const lugares = ["Holbox", "la isla", "el mar", "cada tour", "la playa"];
    const cualidades = ["tu alegría", "tu esfuerzo", "esa sonrisa tuya", "tu corazón bonito", "tu energía"];
    
    // Semilla del día para que sea distinto cada día pero estable todo el día
    const semillaDia = dia + mes * 31;
    const r = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    const plantillas = [
      `${r(intros)} ${nombre}, hoy ${r(acciones)} ${r(lugares)} con ${r(cualidades)}. ¡Vamos con toda!`,
      `${nombre}, ${r(cualidades)} es lo que hace grande a La Colombiana. ${r(intros)}, a brillar en ${r(lugares)}`,
      `Mi parcerita hermosa ${nombre}, que ${r(cualidades)} ${r(acciones)} todo ${r(lugares)} hoy 💙`
    ];
    mensajeFinal = plantillas[semillaDia % plantillas.length];
  }

  // Check state persistence
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('colombiana_tours_check_list');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleCheck = (id: string) => {
    setCheckedMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('colombiana_tours_check_list', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Reutiliza exactamente el mismo modal de recibo que existe en Bitácora
  const verReciboPreview = (folioId: string, saleObj?: Sale) => {
    const sale = saleObj || sales.find((s) => s.folio === folioId || s.id === folioId);
    if (sale) {
      onViewReceipt(sale);
    }
  };

  // Exponer a nivel de ventana para compatibilidad global
  if (typeof window !== 'undefined') {
    (window as any).verReciboPreview = verReciboPreview;
  }

  // Lógica: por cada folio, iterar for (let servicio of folio.servicios), comparar servicio.fecha_tour == fechaObjetivo
  const getToursPorDia = (fechaObjetivo: string) => {
    const list: Array<{
      id: string;
      folio: string;
      tour: string;
      hora: string;
      pax: number;
      cliente: string;
      tel: string;
      sale: Sale;
    }> = [];

    activeSales.forEach((folio: any) => {
      if (folio.status === 'Cancelado') return;

      if (Array.isArray(folio.servicios) && folio.servicios.length > 0) {
        for (const servicio of folio.servicios) {
          const fechaTour = servicio.fecha_tour || servicio.fechaServicio || servicio.fecha;
          if (folio.folio?.includes('0005') || folio.folio?.includes('LC-2026-0005')) {
            console.log("LC-0005 fecha_tour:" + (servicio.fecha_tour || fechaTour));
          }
          if (fechaTour === fechaObjetivo) {
            list.push({
              id: `${folio.id}-srv-${servicio.id || Math.random()}`,
              folio: folio.folio,
              tour: servicio.nombre || servicio.tour || folio.tourName || 'Tour General',
              hora: servicio.hora_tour || servicio.horaServicio || servicio.hora || folio.tourTime || '09:00 AM',
              pax: servicio.pax || servicio.cantidad || folio.passengerCount || 1,
              cliente: folio.clientName || folio.nombre_cliente || 'Cliente',
              tel: folio.clientPhone || folio.telefono || '',
              sale: folio,
            });
          }
        }
      } else {
        const fechaTour = folio.fecha_tour || folio.tourDate;
        if (folio.folio?.includes('0005') || folio.folio?.includes('LC-2026-0005')) {
          console.log("LC-0005 fecha_tour:" + (folio.fecha_tour || fechaTour));
        }
        if (fechaTour === fechaObjetivo) {
          list.push({
            id: `${folio.id}-main`,
            folio: folio.folio,
            tour: folio.tourName || folio.tour || 'Tour General',
            hora: folio.hora_tour || folio.tourTime || '09:00 AM',
            pax: folio.pax || folio.passengerCount || 1,
            cliente: folio.clientName || folio.nombre_cliente || 'Cliente',
            tel: folio.clientPhone || folio.telefono || '',
            sale: folio,
          });
        }
      }
    });

    // Ordenar cronológicamente por hora
    list.sort((a, b) => a.hora.localeCompare(b.hora));
    return list;
  };

  const toursHoy = getToursPorDia(hoy);
  const toursManana = getToursPorDia(manana);

  const renderTablaTours = (
    titulo: string,
    items: typeof toursHoy,
    esHoy: boolean
  ) => {
    const totalPax = items.reduce((acc, t) => acc + (t.pax || 0), 0);

    const getDisplay = (tourNombre: string) => {
      const cleanStr = tourNombre.trim();
      let catalogo: any[] = [];
      try {
        const saved = localStorage.getItem('ht_tours');
        if (saved) catalogo = JSON.parse(saved);
      } catch (_) {}

      // Map/processed catalogo to migrate inline if any item is missing 'tipo_servicio' or 'titulo'
      const processedCatalogo = catalogo.map((c: any) => {
        if (c.tipo_servicio) return c;
        if (c.titulo) {
          return {
            ...c,
            tipo_servicio: c.titulo
          };
        }
        const nameVal = c.name || c.nombre || "";
        const words = nameVal.trim().split(/\s+/);
        // Split: first 3 words as tipo_servicio/titulo, rest as descripcion
        const titulo = words.slice(0, 3).join(" ");
        const descripcion = words.slice(3).join(" ");
        return {
          ...c,
          tipo_servicio: titulo,
          descripcion: descripcion ? descripcion : ""
        };
      });

      const found = processedCatalogo.find(c => 
        (c.name && c.name.trim().toLowerCase() === cleanStr.toLowerCase()) || 
        (c.nombre_completo && c.nombre_completo.trim().toLowerCase() === cleanStr.toLowerCase()) || 
        (c.tipo_servicio && cleanStr.toLowerCase().includes(c.tipo_servicio.toLowerCase()))
      );

      if (found && found.tipo_servicio) {
        return { t: found.tipo_servicio, d: found.descripcion || "" };
      }

      // fallback: splitTour por prefijos
      if (cleanStr.startsWith("Tour Privado")) {
        return {
          t: "Tour Privado",
          d: cleanStr.slice("Tour Privado".length).trim()
        };
      }
      if (cleanStr.startsWith("Tour Colectivo")) {
        return {
          t: "Tour Colectivo",
          d: cleanStr.slice("Tour Colectivo".length).trim()
        };
      }
      if (cleanStr.startsWith("Renta de Bicicleta")) {
        return {
          t: "Renta de Bicicleta",
          d: cleanStr.slice("Renta de Bicicleta".length).trim()
        };
      }
      if (cleanStr.startsWith("Renta de Carrito")) {
        return {
          t: "Renta de Carrito",
          d: cleanStr.slice("Renta de Carrito".length).trim()
        };
      }
      if (cleanStr.startsWith("Tour")) {
        const words = cleanStr.split(/\s+/);
        if (words.length <= 2) {
          return { t: cleanStr, d: "" };
        }
        return {
          t: words.slice(0, 2).join(" "),
          d: words.slice(2).join(" ")
        };
      }
      
      const words = cleanStr.split(/\s+/);
      if (words.length <= 2) {
        return { t: cleanStr, d: "" };
      }
      return {
        t: words.slice(0, 2).join(" "),
        d: words.slice(2).join(" ")
      };
    };

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
        {/* Encabezado de la tabla */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                esHoy ? 'bg-[#003087] text-[#FFCC00]' : 'bg-blue-600 text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{titulo}</span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
              {totalPax} Pax
            </span>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {items.length} {items.length === 1 ? 'salida' : 'salidas'}
            </span>
          </div>
        </div>

        {/* Contenido de la tarjeta */}
        {items.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
            No hay tours programados para {esHoy ? 'hoy' : 'mañana'}.
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {items.map((item) => {
              const { t } = getDisplay(item.tour.split('(')[0].trim());
              
              // Simple status logic: just "Próximo" for now as requested
              const status = "Próximo";

              return (
                <div 
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-sm"
                >
                  {/* Left: Folio + Tour */}
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                        👁️ {item.folio}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{status}</span>
                    </div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {t}
                    </div>
                  </div>

                  {/* Right: Pax + Time */}
                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-blue-900 dark:text-blue-300 text-sm">
                      {item.pax} Pax
                    </div>
                    <div className="text-[12px] font-bold text-slate-600 dark:text-slate-400">
                      {item.hora}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const { isPowerSaver } = useEnergy();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isPowerSaver) videoRef.current.pause();
    else videoRef.current.play().catch(()=>{});
  }, [isPowerSaver]);
  
  return (
    <div className="w-full pb-40">
      {/* 1. SECCIÓN PROTEGIDA: Logo Ballena animado, Bienvenida y ChatAsistente */}
      <div className="text-center py-5 animate-fade-in">
        <h2 className="text-xl font-bold text-blue-700 mb-2">¡Bienvenida!</h2>
        <div style={{ animationPlayState: isPowerSaver ? 'paused' : 'running', willChange: isPowerSaver ? 'auto' : 'transform' }} className={isPowerSaver ? '' : 'animate-flota'}>
          <video
            ref={videoRef}
            src="/Bienvenida-lt.mp4"
            autoPlay
            loop
            muted
            playsInline
            poster="/logo-tiket-final.jpg"
            className="w-[240px] h-[240px] rounded-[32px] object-cover shadow-lg mx-auto bg-white"
            style={{ animation: isPowerSaver ? 'none' : undefined }}
            onError={(e) => {
              (e.target as HTMLVideoElement).style.display = 'none';
              const img = document.getElementById('fallback-logo');
              if (img) img.style.display = 'block';
            }}
          />
        </div>
        <div style={{ animationPlayState: isPowerSaver ? 'paused' : 'running', willChange: isPowerSaver ? 'auto' : 'transform' }} className={isPowerSaver ? '' : 'animate-flota'}>
          <img
            id="fallback-logo"
            src="/logo-bienvenida.jpg?v=3"
            className="w-[240px] h-[240px] mx-auto rounded-[32px] shadow-lg object-cover bg-white"
            style={{ animation: 'flota 3s ease-in-out infinite', display: 'none' }}
          />
        </div>
        <p
          className={`mt-4 px-6 text-[15px] leading-relaxed ${
            esFechaEspecial
              ? 'text-blue-800 font-semibold text-base bg-blue-50 p-4 rounded-2xl'
              : 'text-gray-700 italic'
          }`}
        >
          {mensajeFinal}
        </p>
        <div className="px-6 mt-6">
          <ChatAsistente sales={sales} cajaHoy={totalRecaudadoHoy} />
        </div>
      </div>
      <style>{`@keyframes flota{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>

      {/* 2. TABLAS OPERATIVAS INSERTADAS DIRECTAMENTE DESPUÉS DEL CHAT */}
      <div className="space-y-6">
        {/* Tabla 1: Tours de HOY */}
        {renderTablaTours("Tours de HOY • " + formatearFechaBonita(hoy), toursHoy, true)}

        {/* Tabla 2: Tours de MAÑANA */}
        {renderTablaTours("Tours de MAÑANA • " + formatearFechaBonita(manana), toursManana, false)}
      </div>
    </div>
  );
};
