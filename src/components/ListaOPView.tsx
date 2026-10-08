import React, { useState, useEffect, useRef } from 'react';
import { Sale, BusinessConfig, TourItem } from '../types';
import { getHoyHolbox, getMananaHolbox } from '../utils/formatters';
import { ReciboListaOPHorizontal } from './ReciboListaOPHorizontal';

interface ListaOPViewProps { sales: Sale[]; config: BusinessConfig; tours: TourItem[]; onViewReceipt: (sale: Sale) => void; }

function getPasadoMananaHolbox(): string {
  const hoyStr = getHoyHolbox();
  const [y, m, d] = hoyStr.split('-').map(Number);
  const nextDate = new Date(Date.UTC(y, m - 1, d + 2, 12, 0, 0));
  return nextDate.toLocaleDateString('en-CA', { timeZone: 'America/Cancun' });
}
const getShortName = (fullName: string) => {
  if (!fullName) return '';
  if (fullName.includes('3 Islas')) return '3 Islas';
  if (fullName.includes('Bioluminiscencia')) return 'Bioluminiscencia';
  if (fullName.includes('Ballena')) return 'Tiburón Ballena';
  if (fullName.includes('Cabo Catoche')) return 'Cabo Catoche';
  if (fullName.includes('24 Horas')) return 'Carrito 24H';
  if (fullName.includes('por Hora')) return 'Carrito Hora';
  if (fullName.includes('Bicicleta')) return 'Bici';
  if (fullName.includes('Chiquilá')) return 'Traslado Chiquilá';
  if (fullName.includes('Chichén')) return 'Chichén Itzá';
  return fullName.split('(')[0].replace('Tour','').trim().substring(0,18);
}
const formatCorto = (iso: string) => { if(!iso) return ""; const [y,m,d] = iso.split("-"); return `${d}/${m}/${y.slice(-2)}`; }

export const ListaOPView: React.FC<ListaOPViewProps> = ({ sales, config, tours, onViewReceipt }) => {
  const [logo, setLogo] = useState<string | null>(null);
  const [tourFiltro, setTourFiltro] = useState('Todos');
  const [dia, setDia] = useState<'Hoy'|'Mañana'|'Otra'>('Mañana');
  const [fechaOtra, setFechaOtra] = useState('');
  const [showDiaMenu, setShowDiaMenu] = useState(false);
  const [showTourMenu, setShowTourMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState<'png'|'pdf'>('png');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const diaRef = useRef<HTMLDivElement>(null);

  useEffect(() => { try { setLogo(localStorage.getItem('holbox_logo')); } catch {} }, []);
  const hoy = getHoyHolbox(); const manana = getMananaHolbox();
  const targetDate = dia === 'Hoy'? hoy : dia === 'Mañana'? manana : fechaOtra || hoy;
  const labelDia = dia === 'Hoy'? 'Hoy' : dia === 'Mañana'? 'Mañana' : fechaOtra ? `📅 ${formatCorto(fechaOtra).split('/')[0]}` : 'Otra fecha...';
  const filteredSales = sales.filter((sale) => {
    if (sale.status === 'Cancelado') return false;
    if (sale.tourDate!== targetDate) return false;
    if (tourFiltro!== 'Todos') {
      const tourName = sale.tourName || sale.servicios?.[0]?.nombre || '';
      const servicios = sale.servicios || [];
      const matchServicio = servicios.some(s => s.nombre.includes(tourFiltro)) || tourName.includes(tourFiltro);
      if (!matchServicio) return false;
    }
    return true;
  });
  const totalPax = filteredSales.reduce((acc, s) => acc + (s.passengerCount || 1), 0);

  const getTituloLine1 = () => {
    if (dia === 'Hoy') return 'LISTA DE TOURS PROGRAMADOS PARA HOY';
    if (dia === 'Mañana') return 'LISTA DE TOURS PROGRAMADOS PARA MAÑANA';
    return 'LISTA DE TOURS PROGRAMADOS';
  };

  const getFechaLarga = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const formatted = date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const handleWhatsApp = () => {
    const tourBonito = tourFiltro === 'Todos'? 'TODOS LOS TOURS' : getShortName(tourFiltro).toUpperCase();
    let texto = `🚤 *LISTA OP - ${tourBonito} - ${labelDia.toUpperCase()}*\n`;
    texto += `*La Colombiana Tours - Judith*\n`;
    texto += `Total: ${filteredSales.length} reservas - ${totalPax} PAX\n`;
    texto += `Fecha: ${targetDate}\n`;
    texto += `--------------------------\n`;
    if(filteredSales.length === 0){ texto += `No hay reservas para este día.\n`; }
    else { filteredSales.forEach((s, i) => { texto += `${i+1}. ${s.tourTime || ''} ${getShortName(s.tourName || s.servicios?.[0]?.nombre || '')} - ${s.clientName} - ${s.passengerCount} PAX - ${s.clientHotel || s.meetingPoint || 'S/Hotel'} - ${s.clientPhone}\n`; }); }
    texto += `--------------------------\nPropietaria: ${config.owner}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Error cargando ${src}`));
      document.head.appendChild(script);
    });
  };

  const handleDownloadPNG = async () => {
    const el = document.getElementById('print-lista-op') as HTMLElement;
    if (!el) return;

    try {
      if (!(window as any).html2canvas) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      }
      const html2canvas = (window as any).html2canvas;
      if (!html2canvas) throw new Error('html2canvas no disponible');

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1050
      });

      const tipo = dia === 'Hoy' ? 'hoy' : 'manana';
      const filename = `lista-${tipo}-${new Date().toISOString().slice(0, 10)}.png`;

      canvas.toBlob((blob: Blob | null) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 1000);
      }, 'image/png', 1.0);
    } catch (err) {
      console.error(err);
      alert('Inconveniente al generar la imagen PNG. Por favor intente nuevamente.');
    }
  };

  const handleDownloadPDF = async () => {
    const el = document.getElementById('print-lista-op') as HTMLElement;
    if (!el) return;

    try {
      if (!(window as any).html2canvas) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      }
      if (!(window as any).jspdf) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }

      const html2canvas = (window as any).html2canvas;
      const jspdfObj = (window as any).jspdf;
      if (!html2canvas || !jspdfObj) throw new Error('Librerías no disponibles');

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1050
      });

      const { jsPDF } = jspdfObj;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const tipo = dia === 'Hoy' ? 'hoy' : 'manana';
      const filename = `lista-${tipo}-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error(err);
      alert('Inconveniente al generar el PDF. Por favor intente nuevamente.');
    }
  };

  const handleShareWhatsAppReal = async (formato: 'png' | 'pdf') => {
    const el = document.getElementById('print-lista-op') as HTMLElement;
    if (!el) return;

    try {
      if (!(window as any).html2canvas) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      }
      if (formato === 'pdf' && !(window as any).jspdf) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }

      const html2canvas = (window as any).html2canvas;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1050
      });

      const tipo = dia === 'Hoy' ? 'hoy' : 'manana';
      const fecha = new Date().toLocaleDateString('es-MX');
      const fileName = `lista-${tipo}-${new Date().toISOString().slice(0, 10)}.${formato}`;
      const mime = formato === 'png' ? 'image/png' : 'application/pdf';

      let blob: Blob;

      if (formato === 'png') {
        const b = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png', 1.0));
        if (!b) return;
        blob = b;
      } else {
        const jspdfObj = (window as any).jspdf;
        const { jsPDF } = jspdfObj;
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        blob = pdf.output('blob');
      }

      const file = new File([blob], fileName, { type: mime });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Lista OP ${tipo} - ${fecha}`,
            text: `LA COLOMBIANA TOURS - ${tipo.toUpperCase()} ${fecha}`
          });
          return;
        } catch (e) {
          console.log('Share cancelado o fallback...', e);
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);

      const tourBonito = tourFiltro === 'Todos' ? 'TODOS LOS TOURS' : getShortName(tourFiltro).toUpperCase();
      const textMsg = `🚤 *LISTA OP - ${tourBonito} - ${labelDia.toUpperCase()}*\nFecha: ${targetDate}\nTotal: ${filteredSales.length} reservas (${totalPax} PAX)\nArchivo descargado: ${fileName}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(textMsg)}`, '_blank');
    } catch (err) {
      console.error(err);
      alert('Inconveniente al procesar para WhatsApp. Intente nuevamente.');
    }
  };

  useEffect(() => { function handleClickOutside(event: MouseEvent) { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) { setShowTourMenu(false); } if (diaRef.current && !diaRef.current.contains(event.target as Node)) { setShowDiaMenu(false); } } document.addEventListener("mousedown", handleClickOutside); return () => { document.removeEventListener("mousedown", handleClickOutside); }; }, []);

  const getTourBadgeColor = (tourName: string) => {
    const name = (tourName || '').toLowerCase();
    if (name.includes('isla mujeres')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (name.includes('cozumel')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (name.includes('atardecer') || name.includes('sunset')) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (name.includes('chichen')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (name.includes('3 islas')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (name.includes('bioluminiscencia')) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    if (name.includes('ballena')) return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    return 'bg-slate-100 text-slate-800 border-slate-300';
  };

  const getTourIcon = (name: string) => {
    if (name.includes('3 Islas')) return '🏝️';
    if (name.includes('Bioluminiscencia')) return '✨';
    if (name.includes('Ballena')) return '🦈';
    if (name.includes('Cabo Catoche')) return '🛶';
    if (name.includes('24 Horas') || name.includes('por Hora')) return '🛺';
    if (name.includes('Bicicleta')) return '🚲';
    if (name.includes('Chiquilá')) return '🚐';
    if (name.includes('Chichén')) return '🏛️';
    return '🎟️';
  };

  return (
    <div className="w-full pb-40">
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 p-2 flex gap-2 items-start border-b border-slate-200 dark:border-slate-800 shadow-sm no-print">
        {/* Filtro Fecha */}
        <div ref={diaRef} className="relative w-auto min-w-[110px] max-w-[130px] flex-shrink-0">
          <button onClick={() => setShowDiaMenu(!showDiaMenu)} className="w-full text-sm py-2 px-3 border rounded-xl bg-white dark:bg-slate-800 dark:text-white border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
            <span className="truncate font-medium">{labelDia}</span><span className="opacity-50">▼</span>
          </button>
          
          {showDiaMenu && (
            <div style={{WebkitOverflowScrolling:'touch'}} className="absolute top-full mt-2 left-0 w-44 max-h-[55vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border dark:border-slate-700 z-[9999] py-2 text-sm">
              <div onClick={() => { setDia('Hoy'); setFechaOtra(''); setShowDiaMenu(false); }} className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2"><span>📅 Hoy</span></div>
              <div onClick={() => { setDia('Mañana'); setFechaOtra(''); setShowDiaMenu(false); }} className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2"><span>📅 Mañana</span></div>
              <div className="relative flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <span>📅 Otra fecha...</span>
                <input type="date" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" value={fechaOtra} onChange={e => {setFechaOtra(e.target.value); setDia('Otra'); setShowDiaMenu(false)}} min={hoy} />
              </div>
            </div>
          )}
        </div>

        {/* Filtro Tour */}
        <div ref={dropdownRef} className="relative flex-1 min-w-0">
          <button onClick={() => setShowTourMenu(!showTourMenu)} className="w-full text-sm py-2 px-3 text-left truncate border rounded-xl bg-white dark:bg-slate-800 dark:text-white border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
            <span className="truncate font-medium">{tourFiltro === 'Todos' ? 'Todos los tours' : `${getTourIcon(tourFiltro)} ${tourFiltro}`}</span><span className="opacity-50 ml-1">▼</span>
          </button>
          
          {showTourMenu && (
            <div style={{WebkitOverflowScrolling:'touch'}} className="absolute top-full mt-2 right-0 w-[calc(100vw-24px)] max-w-[320px] max-h-[55vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border dark:border-slate-700 z-[9999] py-2">
              <div onClick={() => { setTourFiltro('Todos'); setShowTourMenu(false); }} className="text-[13px] leading-tight py-2.5 px-3 whitespace-normal break-words hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2"><span>🎟️ Todos los tours</span></div>
              {tours.map(t => (
                <div key={t.id} onClick={() => { setTourFiltro(t.name); setShowTourMenu(false); }} className="text-[13px] leading-tight py-2.5 px-3 whitespace-normal break-words hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2">
                  <span>{getTourIcon(t.name)} {t.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="w-full max-w-full overflow-x-hidden bg-gray-50 dark:bg-slate-900 m-2 border-2 border-gray-300 dark:border-slate-700 rounded-lg">
        <div id="lista-para-exportar" className="bg-white dark:bg-slate-900 w-full max-w-full overflow-x-hidden">
          <div className="p-4 border-b text-center bg-slate-50">
            <h2 className="text-[16px] font-[900] text-[#0f172a] uppercase tracking-[0.5px] m-0">
              {getTituloLine1()}
            </h2>
            <p className="text-[13px] font-semibold text-[#64748b] mt-1 m-0">
              {getFechaLarga(targetDate)} • Total PAX: {totalPax} {tourFiltro !== 'Todos' ? `• ${tourFiltro}` : ''}
            </p>
          </div>
          <div className="px-3">
            {filteredSales.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                <p>No hay reservas para {tourFiltro} el {labelDia}</p>
                <button onClick={() => setTourFiltro('Todos')} className="px-3 py-1 bg-blue-600 text-white rounded text-xs mt-2">Ver otro tour</button>
              </div>
            ) : (
              <div className="overflow-x-auto touch-pan-x" style={{ overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}>
                <table id="tablaOP" className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '75px' }} />
                    <col style={{ width: '95px' }} />
                    <col style={{ width: '50px' }} />
                    <col style={{ width: '130px' }} />
                    <col style={{ width: '35px' }} />
                    <col style={{ width: '95px' }} />
                    <col style={{ width: '120px' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b bg-gray-100">
                      <th className="py-2 px-1.5 text-xs font-bold truncate">Folio</th>
                      <th className="py-2 px-1.5 text-xs font-bold truncate">Tour</th>
                      <th className="py-2 px-1.5 text-xs font-bold">Hora</th>
                      <th className="py-2 px-1.5 text-xs font-bold truncate">Cliente</th>
                      <th className="py-2 px-1.5 text-xs font-bold text-center">PAX</th>
                      <th className="py-2 px-1.5 text-xs font-bold truncate">Tel</th>
                      <th className="py-2 px-1.5 text-xs font-bold truncate">Hotel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSales.map(sale => {
                      const tName = sale.tourName || sale.servicios?.[0]?.nombre || '';
                      return (
                        <tr key={sale.id} className="hover:bg-gray-50 cursor-pointer leading-4" onClick={() => onViewReceipt(sale)}>
                          <td className="py-1.5 px-1.5 text-sm font-mono text-blue-600 font-semibold truncate w-[75px]">{sale.folio}</td>
                          <td className="py-1.5 px-1.5 text-xs w-[95px] truncate">
                            <span className={`px-1 py-0.5 rounded border text-[10px] font-bold inline-block truncate max-w-full ${getTourBadgeColor(tName)}`}>
                              {getShortName(tName)}
                            </span>
                          </td>
                          <td className="py-1.5 px-1.5 text-sm w-[50px] truncate">{sale.tourTime}</td>
                          <td className="py-1.5 px-1.5 text-sm font-medium max-w-[130px] w-[130px] truncate text-ellipsis overflow-hidden whitespace-nowrap">{sale.clientName}</td>
                          <td className="py-1.5 px-1 text-sm font-bold w-[35px] min-w-[35px] text-center">{sale.passengerCount}</td>
                          <td className="py-1.5 px-1.5 text-sm w-[90px] max-w-[90px] truncate">{sale.clientPhone}</td>
                          <td className="py-1.5 px-1.5 text-sm w-[120px] truncate">{sale.clientHotel || sale.meetingPoint || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="text-[9px] mt-4 border-t pt-2 text-slate-500 px-3 pb-3">Propietaria: {config.owner} • Isla Holbox • Total PAX: {totalPax}</div>
        </div>
      </div>
      <div className="w-full flex gap-2 overflow-x-hidden sticky bottom-0 mt-6 bg-white dark:bg-slate-900 py-4 z-30">
        <button onClick={handleDownloadPNG} className="flex-1 bg-blue-600 text-white text-xs py-3 rounded-xl font-semibold shadow-sm">📥 PNG</button>
        <button onClick={handleDownloadPDF} className="flex-1 bg-green-600 text-white text-xs py-3 rounded-xl font-semibold shadow-sm">📄 PDF</button>
        <button onClick={() => setShowShareModal(true)} className="flex-1 bg-[#25D366] text-white text-xs py-3 rounded-xl font-semibold shadow-sm">📲 WhatsApp</button>
      </div>

      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-4 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm">Compartir Lista por WhatsApp</h3>
            <p className="text-xs text-slate-500">Selecciona el formato que deseas enviar:</p>
            <div className="flex gap-2">
              <button onClick={() => { setShowShareModal(false); handleShareWhatsAppReal('png'); }} className="flex-1 bg-blue-600 text-white text-xs py-2 rounded-xl font-semibold">Enviar como PNG</button>
              <button onClick={() => { setShowShareModal(false); handleShareWhatsAppReal('pdf'); }} className="flex-1 bg-green-600 text-white text-xs py-2 rounded-xl font-semibold">Enviar como PDF</button>
            </div>
            <button onClick={() => setShowShareModal(false)} className="w-full bg-slate-100 text-slate-700 text-xs py-2 rounded-xl font-semibold">Cancelar</button>
          </div>
        </div>
      )}

      <div id="print-lista-op" style={{ position: 'fixed', left: '-9999px', top: 0, width: '1050px', background: 'white', pointerEvents: 'none' }}>
        <ReciboListaOPHorizontal
          config={config}
          sales={filteredSales}
          targetDate={targetDate}
          dia={dia}
          tourFiltro={tourFiltro}
          totalPax={totalPax}
          getShortName={getShortName}
          getTourBadgeColor={getTourBadgeColor}
        />
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          #tablaOP { overflow: visible !important; width: 100% !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </div>
  );
};
