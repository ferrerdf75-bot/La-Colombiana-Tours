import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, Share2, Copy, Check, Trash2 } from 'lucide-react';
import { Sale, BusinessConfig } from '../types';
import { formatCurrency, formatDateSpanish, cleanPhoneForWhatsApp } from '../utils/formatters';
import {
  exportarCompleto,
  generarTicketTermico,
  generarPDFMediaCarta,
  generarPNGMediaCarta,
  generarReciboPNG,
  HiddenPrintables,
} from './HiddenPrintables';
import { PreviewTicketFinal } from './PreviewTicketFinal';
import { PreviewReciboFinal } from './PreviewReciboFinal';
import { AbonoItem } from './AbonoItem';

interface ReceiptModalProps {
  sale: Sale;
  config: BusinessConfig;
  initialFormat?: 'ticket' | 'media' | 'mediaCarta';
  onClose: () => void;
  onLiquidateBalance?: (saleId: string) => void;
  onUpdateSale?: (updatedSale: Sale) => void;
  onDeleteSale?: (saleId: string) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  config,
  initialFormat = 'media',
  onClose,
  onLiquidateBalance,
  onUpdateSale,
  onDeleteSale,
}) => {
  const [formatoActivo, setFormatoActivo] = useState<'ticket' | 'mediaCarta'>(
    initialFormat === 'ticket' ? 'ticket' : 'mediaCarta'
  );
  const [isPNG, setIsPNG] = useState(false);
  const [isPDF, setIsPDF] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [showShareChoice, setShowShareChoice] = useState(false);

  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Efectivo');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payTime, setPayTime] = useState(new Date().toTimeString().slice(0, 5));
  const [payNote, setPayNote] = useState('');

  // Migración automática si tiene advancePayment pero no payments
  useEffect(() => {
    if ((sale.advancePayment || 0) > 0 && (!sale.payments || sale.payments.length === 0) && onUpdateSale) {
      const initialPayment = {
        id: Date.now().toString(),
        amount: sale.advancePayment,
        method: sale.paymentMethod || 'Efectivo',
        date: sale.tourDate || new Date().toISOString().split('T')[0],
        time: '09:00',
        note: 'Anticipo inicial migrado',
        createdAt: new Date().toISOString()
      };
      const updated: Sale = {
        ...sale,
        payments: [initialPayment]
      };
      onUpdateSale(updated);
    }
  }, [sale]);

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;

    const newPayment = {
      id: Date.now().toString(),
      amount,
      method: payMethod,
      date: payDate,
      time: payTime,
      note: payNote,
      createdAt: new Date().toISOString()
    };

    const payments = [...(sale.payments || []), newPayment];
    const advancePayment = payments.reduce((a, b) => a + b.amount, 0);
    const balance = Math.max(0, sale.total - advancePayment);
    const status = balance <= 0 ? 'Liquidado' : advancePayment > 0 ? 'Con Saldo' : 'Pendiente';

    const updatedSale: Sale = {
      ...sale,
      payments,
      advancePayment,
      balance,
      status
    };

    if (onUpdateSale) {
      onUpdateSale(updatedSale);
    }
    setPayAmount('');
    setPayNote('');
    setShowAddPaymentModal(false);
  };

  const handleDeleteAbono = (targetId: string) => {
    // No permitir borrar si es el único abono y folio es nuevo sin servicios
    const totalPaymentsCount = sale.payments?.length || (sale.advancePayment > 0 ? 1 : 0);
    const serviciosCount = sale.servicios?.length || (sale.tourName ? 1 : 0);
    if (totalPaymentsCount <= 1 && serviciosCount === 0) {
      alert('No se puede borrar el único abono de este folio. Si deseas cambiar el monto o tour, utiliza la opción "Editar" del folio.');
      return;
    }

    let payments = sale.payments ? [...sale.payments] : [];
    let deletedAmount = 0;

    if (targetId === 'anticipo-original') {
      deletedAmount = sale.advancePayment;
      payments = [];
    } else {
      const p = payments.find((x) => x.id === targetId);
      if (p) {
        deletedAmount = Number(p.amount) || 0;
      }
      payments = payments.filter((x) => x.id !== targetId);
    }

    const advancePayment = payments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const balance = Math.max(0, sale.total - advancePayment);

    // Si folio estaba Liquidado y al borrar queda con saldo, cambiar status a Con Saldo automáticamente
    let status: Sale['status'] = sale.status;
    if (status !== 'Cancelado') {
      if (balance <= 0 && sale.total > 0) {
        status = 'Liquidado';
      } else if (advancePayment > 0) {
        status = 'Con Saldo';
      } else {
        status = 'Pendiente';
      }
    }

    const ahoraStr =
      new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' +
      new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    const deleteLog = `Abono eliminado +$${deletedAmount} por error cliente - ${ahoraStr}`;
    const updatedNotes = sale.notes ? `${sale.notes} | ${deleteLog}` : deleteLog;

    const updatedSale: Sale = {
      ...sale,
      payments,
      advancePayment,
      balance,
      status,
      notes: updatedNotes,
    };

    if (onUpdateSale) {
      onUpdateSale(updatedSale);
    }
  };

  const handleReactivarFolio = () => {
    let nuevoStatus: Sale['status'] = 'Con Saldo';
    if (sale.balance <= 0 || (sale.advancePayment >= sale.total && sale.total > 0)) {
      nuevoStatus = 'Liquidado';
    } else if (sale.advancePayment > 0) {
      nuevoStatus = 'Con Saldo';
    } else {
      nuevoStatus = 'Pendiente';
    }

    const ahoraStr =
      new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' +
      new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    const updated: Sale = {
      ...sale,
      status: nuevoStatus,
      notes: (sale.notes ? sale.notes + ' | ' : '') + `Reactivado el ${ahoraStr} - cancelación por error`,
    };

    if (onUpdateSale) {
      onUpdateSale(updated);
    }
  };

  const handleEliminarDefinitivamente = () => {
    if (window.confirm(`¿Estás seguro de eliminar DEFINITIVAMENTE el folio ${sale.folio}? Esta acción no se puede deshacer.`)) {
      if (onDeleteSale) {
        onDeleteSale(sale.id);
      }
      onClose();
    }
  };

  const isMediaCarta = formatoActivo === 'mediaCarta';

  const [isSharing, setIsSharing] = useState(false);

  const receiptRef = useRef<HTMLDivElement>(null);

  const crearImagen = async () => {
    const el = document.getElementById('media-carta-wrapper');
    if (!el) return null;
    const prev = (el as HTMLElement).style.transform;
    (el as HTMLElement).style.transform = 'scale(1)';
    await new Promise(r => setTimeout(r, 500));
    try {
      const canvas = await (await import('html2canvas')).default(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: false,
      });
      return canvas;
    } catch { return null; }
    finally { (el as HTMLElement).style.transform = prev; }
  };




  const telefonoLimpio = cleanPhoneForWhatsApp(sale.clientPhone);

  const getWhatsAppMessage = () => {
    const serviciosText = Array.isArray(sale.servicios) && sale.servicios.length > 0
      ? sale.servicios.map(s => `- *${s.nombre}* (Cant: ${s.cantidad}, Subtotal: ${formatCurrency(s.subtotal)})`).join('\n')
      : `- *${sale.tourName}* (${sale.passengerCount} pax)`;

    return (
      `🏝️ *${config.name.toUpperCase()}* - *CONFIRMACIÓN DE RESERVA*\n\n` +
      `Hola *${sale.clientName}*, ¡gracias por reservar con nosotros!\n\n` +
      `📋 *Folio:* ${sale.folio}\n` +
      `📅 *Fecha del Tour:* ${formatDateSpanish(sale.tourDate)}\n` +
      `⏰ *Hora:* ${sale.tourTime}\n\n` +
      `🚤 *Servicios Contratados:*\n` +
      `${serviciosText}\n\n` +
      `📍 *Punto de Encuentro:* ${sale.meetingPoint}\n` +
      `👥 *Total Pasajeros:* ${sale.passengerCount}\n\n` +
      `💵 *Total:* ${formatCurrency(sale.total)}\n` +
      `🟢 *Anticipo Pagado:* ${formatCurrency(sale.advancePayment)} (${sale.paymentMethod})\n` +
      (sale.balance > 0
        ? `⚠️ *Saldo Pendiente por Liquidar:* ${formatCurrency(sale.balance)}\n`
        : `✅ *Estatus:* TOTALMENTE LIQUIDADO\n`) +
      (sale.notes ? `📝 *Notas:* ${sale.notes}\n` : '') +
      `\n📍 *Ubicación Oficina:* ${config.address}\n` +
      `📞 *Teléfono:* ${config.phone}\n\n` +
      `¡Te esperamos con la mejor actitud! 🌴🌊`
    );
  };

  const handleEnviarACliente = () => {
    if (!telefonoLimpio) return;
    const text = encodeURIComponent(getWhatsAppMessage());
    const telParam = telefonoLimpio.startsWith('52') ? telefonoLimpio : `52${telefonoLimpio}`;
    window.open(`https://wa.me/${telParam}?text=${text}`, '_blank');
    alert('Mensaje enviado. El recibo PNG/PDF se descargó aparte, adjúntalo manual en el chat');
  };

  const handleDownloadPNG = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (formatoActivo === 'ticket') {
      setIsPNG(true);
      try { await generarTicketTermico(sale.folio, 'png'); }
      finally { setIsPNG(false); }
      return;
    }
    setIsPNG(true);
    try {
      const blob = await generarReciboPNG('media-carta-captura-print');
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Recibo-${sale.folio}.png`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 1000);
    } finally {
      setIsPNG(false);
    }
  };

  const handleDownloadPDF = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (formatoActivo === 'ticket') {
      setIsPDF(true);
      try { await generarTicketTermico(sale.folio, 'pdf'); }
      finally { setIsPDF(false); }
      return;
    }
    setIsPDF(true);
    try {
      await generarPDFMediaCarta(sale.folio);
    } finally {
      setIsPDF(false);
    }
  };

  const handleShareTour = () => {
    setShowShareChoice(true);
  };

  const doShareFile = async (type: 'png' | 'pdf') => {
    setShowShareChoice(false);
    const activeElId = formatoActivo === 'ticket' ? 'recibo-ticket-termico' : 'recibo-media-carta';
    const el = document.getElementById(activeElId) as HTMLElement | null;
    if (!el) {
      alert('Recibo no encontrado');
      return;
    }

    try {
      const h2c = (window as any).html2canvas || html2canvas;
      if (!h2c) {
        alert('Cargando librería, intenta de nuevo');
        return;
      }

      let canvas: HTMLCanvasElement;
      if (activeElId === 'recibo-ticket-termico') {
        canvas = await h2c(el, {
          scale: 2.5,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: true,
          width: 384,
          height: el.scrollHeight,
          windowWidth: 384,
          windowHeight: el.scrollHeight,
          scrollY: 0,
          scrollX: 0
        });
      } else {
        canvas = await h2c(el, { scale: 1.3, backgroundColor: '#ffffff', useCORS: true, allowTaint: true });
      }

      let blob: Blob;
      const fileSuffix = formatoActivo === 'ticket' ? '-Ticket' : '';
      const fileName = `Recibo-${sale.folio || 'LC'}${fileSuffix}.${type}`;

      if (type === 'png') {
        blob = await new Promise<Blob>((resolve) => canvas.toBlob((b: Blob | null) => resolve(b as Blob), 'image/png'));
      } else if (activeElId === 'recibo-ticket-termico') {
        const imgData = canvas.toDataURL('image/png');
        const pdfWidthMM = 58;
        const pdfHeightMM = (canvas.height * pdfWidthMM) / canvas.width;
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: [pdfWidthMM, pdfHeightMM]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMM, pdfHeightMM);
        blob = pdf.output('blob');
      } else {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'letter');
        const w = pdf.internal.pageSize.getWidth();
        const h = (canvas.height * w) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, w, h);
        blob = pdf.output('blob');
      }

      const file = new File([blob], fileName, { type: blob.type });
      // @ts-ignore
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // @ts-ignore
        await navigator.share({ files: [file], title: fileName });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error(err);
        alert('Error al compartir: ' + (err?.message || err));
      }
    }
  };

  const handleCopyText = () => {
    const text = getWhatsAppMessage().replace(/[*_]/g, '');
    navigator.clipboard.writeText(text);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <HiddenPrintables sale={sale} config={config} />
      
      <div className="bg-white dark:bg-slate-900 rounded-[24px] max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Folio: {sale.folio}</span>
              {sale.status === 'Cancelado' && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                  Cancelado
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cliente: <span className="font-semibold text-slate-700 dark:text-slate-300">{sale.clientName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Banner Cancelado por error */}
        {sale.status === 'Cancelado' && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 text-xs font-bold">
              <span className="text-base">⚠️</span>
              <span>¿Folio cancelado por error?</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleReactivarFolio}
                className="flex-1 sm:flex-none px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
              >
                ↩️ Reactivar folio
              </button>
              {onDeleteSale && (
                <button
                  type="button"
                  onClick={handleEliminarDefinitivamente}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/60 dark:text-red-300 rounded-lg text-xs font-semibold transition active:scale-95 flex items-center justify-center cursor-pointer"
                >
                  Eliminar definitivamente
                </button>
              )}
            </div>
          </div>
        )}

        {/* Acciones principales / Formatos */}
        <div className="shrink-0 pt-3">
          {/* Control Segmentado Compacto (36px) */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl h-11 items-center gap-1">
            <button
              type="button"
              onClick={() => setFormatoActivo('ticket')}
              className={`flex-1 h-9 rounded-lg text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                formatoActivo === 'ticket'
                  ? 'bg-white dark:bg-slate-700 border-2 border-blue-600 shadow-sm text-blue-900 dark:text-blue-300 font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
              }`}
            >
              <span>🎟️ Ticket Térmico</span>
              <span className="text-[10px] opacity-75 font-normal">(58mm)</span>
            </button>
            <button
              type="button"
              onClick={() => setFormatoActivo('mediaCarta')}
              className={`flex-1 h-9 rounded-lg text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                formatoActivo === 'mediaCarta'
                  ? 'bg-white dark:bg-slate-700 border-2 border-blue-600 shadow-sm text-blue-900 dark:text-blue-300 font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
              }`}
            >
              <span>📄 Recibo Media Carta</span>
              <span className="text-[10px] opacity-75 font-normal">(816px)</span>
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {/* Fila 1: Compartir Tour (50%) y Copiar (50%) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleShareTour}
                className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm"
              >
                <Share2 size={15} />
                <span>Compartir Tour</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="h-11 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm"
              >
                {copiedMsg ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                <span>{copiedMsg ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            {/* Fila 2: Agregar Abono y Liquidar */}
            <div className={`grid ${sale.balance > 0 && onLiquidateBalance ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
              <button
                type="button"
                onClick={() => setShowAddPaymentModal(true)}
                className="h-11 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm"
              >
                <span>+ Agregar Abono</span>
              </button>

              {sale.balance > 0 && onLiquidateBalance && (
                <button
                  type="button"
                  onClick={() => onLiquidateBalance(sale.id)}
                  className="h-11 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm"
                  title="Liquidar saldo"
                >
                  <span>Liquidar</span>
                </button>
              )}
            </div>

            {/* Fila 3: Botones de descarga dinámicos según tipo seleccionado */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={(e) => handleDownloadPNG(e)}
                disabled={isPNG || isPDF}
                className="h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex justify-center items-center gap-1.5 active:scale-95 transition shadow-sm disabled:opacity-50"
              >
                <Download size={15} />
                <span>{isPNG ? 'Generando...' : formatoActivo === 'ticket' ? 'PNG Ticket' : 'PNG Media Carta'}</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleDownloadPDF(e)}
                disabled={isPNG || isPDF}
                className="h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex justify-center items-center gap-1.5 active:scale-95 transition shadow-sm disabled:opacity-50"
              >
                <Download size={15} />
                <span>{isPDF ? 'Generando...' : formatoActivo === 'ticket' ? 'PDF Ticket' : 'PDF Media Carta'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECCIÓN ABONOS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 mt-3 shrink-0">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>💳 Historial de Abonos</span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                ({sale.payments?.length || (sale.advancePayment > 0 ? 1 : 0)} {(sale.payments?.length || (sale.advancePayment > 0 ? 1 : 0)) === 1 ? 'pago' : 'pagos'})
              </span>
            </h3>
          </div>

          <div className="space-y-2">
            {(!sale.payments || sale.payments.length === 0) && sale.advancePayment > 0 && (
              <AbonoItem
                payment={{
                  id: 'anticipo-original',
                  amount: sale.advancePayment,
                  date: sale.tourDate || sale.createdAt?.split('T')[0] || 'Fecha tour',
                  time: sale.tourTime || '',
                  method: sale.paymentMethod || 'Efectivo',
                }}
                isAnticipo={true}
                onDeleteAbono={handleDeleteAbono}
              />
            )}
            {sale.payments &&
              sale.payments.map((p) => (
                <AbonoItem
                  key={p.id}
                  payment={p}
                  onDeleteAbono={handleDeleteAbono}
                />
              ))}
            {(!sale.payments || sale.payments.length === 0) && sale.advancePayment === 0 && (
              <p className="text-xs text-slate-400 text-center py-2">No hay abonos registrados aún.</p>
            )}
          </div>
        </div>

        {/* MODAL AGREGAR ABONO */}
        {showAddPaymentModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b pb-3 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Registrar Nuevo Abono</h3>
                <button onClick={() => setShowAddPaymentModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
              </div>

              <form onSubmit={handleAddPayment} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Monto del abono (MXN $)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Forma de pago</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                  >
                    {['Efectivo', 'Transferencia Bancaria', 'SPEI', 'Tarjeta (Terminal)', 'CoDi', 'USD (Dólares)', 'EUR (Euros)', 'GBP (Libras)', 'CAD'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Fecha del pago</label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Hora</label>
                    <input
                      type="time"
                      value={payTime}
                      onChange={(e) => setPayTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nota u observación (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Anticipo mañana, Abono tarde..."
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPaymentModal(false)}
                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                  >
                    Guardar Abono
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Contenedor padre */}
        <div className="w-full mt-4 bg-slate-100 dark:bg-slate-950 rounded-xl p-2 shrink-0 overflow-hidden">
          {/* Si es Ticket */}
          {formatoActivo === 'ticket' && (
            <PreviewTicketFinal folio={sale} config={config} />
          )}

          {/* Si es Media Carta */}
          {formatoActivo === 'mediaCarta' && (
            <PreviewReciboFinal folio={sale} config={config} />
          )}
        </div>
      </div>

      {showShareChoice && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowShareChoice(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 w-full max-w-xs space-y-3.5 shadow-2xl border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-extrabold text-sm text-center text-slate-900 dark:text-white">
              Compartir {formatoActivo === 'ticket' ? 'Ticket Térmico' : 'Recibo Media Carta'}
            </h3>
            <button onClick={() => doShareFile('png')} className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform text-white rounded-xl font-bold text-xs shadow">🖼️ Compartir como PNG (Imagen)</button>
            <button onClick={() => doShareFile('pdf')} className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-95 transition-transform text-white rounded-xl font-bold text-xs shadow">📄 Compartir como PDF</button>
            <button onClick={() => setShowShareChoice(false)} className="w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold active:scale-95 transition-transform">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};
