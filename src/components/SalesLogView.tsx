import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Ticket,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  FileSpreadsheet,
  AlertTriangle,
  X,
  CreditCard,
  Check,
  Eye,
  Edit,
  Printer,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { Sale, PaymentMethod, BusinessConfig } from '../types';
import { formatCurrency, formatDateSpanish, getMananaHolbox } from '../utils/formatters';
import { ReciboMediaCartaDesglosado } from './ReciboMediaCartaDesglosado';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface SalesLogViewProps {
  sales: Sale[];
  config: BusinessConfig;
  onViewReceipt: (sale: Sale, initialFormat?: 'ticket' | 'media') => void;
  onEditSale?: (sale: Sale) => void;
  onUpdateSale: (updatedSale: Sale) => void;
  onDeleteSale: (saleId: string) => void;
  onRegisterPayment?: (venta: any, monto: number, metodo: string, tipo?: 'anticipo' | 'liquidacion' | 'abono') => any;
}

export const SalesLogView: React.FC<SalesLogViewProps> = ({
  sales,
  config,
  onViewReceipt,
  onEditSale,
  onUpdateSale,
  onDeleteSale,
  onRegisterPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Liquidado' | 'Con Saldo' | 'Cancelado'>('Todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [ordenRecientePrimero, setOrdenRecientePrimero] = useState<boolean>(() => {
    const saved = localStorage.getItem('bitacoraOrden');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [settlingSale, setSettlingSale] = useState<Sale | null>(null);
  const [settleMethod, setSettleMethod] = useState<PaymentMethod>('Efectivo');
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [folioPreview, setFolioPreview] = useState<Sale | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const compartirFolio = async (formato: 'png'|'pdf' = 'png') => {
    if(!folioPreview) return;
    const idPrint = `print-recibo-${folioPreview.folio}`;
    const el = document.getElementById(idPrint) as HTMLElement;
    if(!el){ alert('No encuentro recibo '+idPrint); return; }

    // Esperar que cargue logo
    await new Promise(r=>setTimeout(r, 600));

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    let blob: Blob;
    let fileName = `${folioPreview.folio}.${formato}`;

    if(formato === 'png'){
      blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/png', 1.0));
      fileName = `Recibo-${folioPreview.folio}.png`;
    } else {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p','mm','a5');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData,'PNG',0,0,pdfW,pdfH,undefined,'FAST');
      blob = pdf.output('blob');
      fileName = `Recibo-${folioPreview.folio}.pdf`;
    }

    const file = new File([blob], fileName, { type: blob.type });

    // 1. INTENTO PRINCIPAL: Share nativo con archivo (abre menú con WhatsApp, Email, Gmail, Drive, etc)
    if(navigator.canShare && navigator.canShare({ files: [file] })){
      try{
        await navigator.share({
          files: [file],
          title: `Folio ${folioPreview.folio} - La Colombiana Tours`,
          text: `🏝️ LA COLOMBIANA TOURS\nFolio: ${folioPreview.folio}\nCliente: ${folioPreview.clientName}\nTour: ${folioPreview.tourName}\nFecha: ${folioPreview.tourDate} ${folioPreview.tourTime||''}\nTotal: $${folioPreview.total}\n\n¡Gracias por reservar con nosotros!`,
        });
        return;
      } catch(e:any){
        if(e?.name === 'AbortError') return;
        console.log('Share cancelado', e);
      }
    }

    // 2. FALLBACK: Si el navegador no soporta share con archivos, DESCARGA + comparte texto
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 2000);

    if(navigator.share){
      try{
        await navigator.share({
          title: `Folio ${folioPreview.folio}`,
          text: `🏝️ LA COLOMBIANA TOURS\nFolio: ${folioPreview.folio}\nCliente: ${folioPreview.clientName}\nSe descargó el archivo ${fileName}, por favor adjúntalo en tu Email o WhatsApp.\n\nTotal: $${folioPreview.total}`,
        });
      } catch{}
    } else {
      alert(`Archivo ${fileName} descargado. Ahora puedes adjuntarlo manualmente en Email o WhatsApp.`);
    }
  };

  // Opciones dinámicas de tipo tour + fijos
  const tourOptions = React.useMemo(() => {
    const fijos = [
      'Todos',
      '3 Islas',
      'Tiburón Ballena',
      'Pesca Deportiva',
      'Bioluminiscencia',
      'Kayaks',
      'Transfer',
      'Chichén Itzá',
      'Carritos Golf',
      'Can-Am',
    ];
    const unicos = new Set<string>();
    sales.forEach((s) => {
      if (s.tourName && s.tourName.trim()) unicos.add(s.tourName.trim());
      if (Array.isArray(s.servicios)) {
        s.servicios.forEach((srv) => {
          if (srv.nombre && srv.nombre.trim()) unicos.add(srv.nombre.trim());
        });
      }
    });

    try {
      const stored = localStorage.getItem('colombiana_sales') || localStorage.getItem('bitacora_sales');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((s: any) => {
            if (s.tourName && s.tourName.trim()) unicos.add(s.tourName.trim());
            if (Array.isArray(s.servicios)) {
              s.servicios.forEach((srv: any) => {
                if (srv.nombre && srv.nombre.trim()) unicos.add(srv.nombre.trim());
              });
            }
          });
        }
      }
    } catch (_) {}

    const result = ['Todos'];
    fijos.slice(1).forEach((f) => {
      if (!result.includes(f)) result.push(f);
    });
    Array.from(unicos).forEach((u) => {
      if (!result.includes(u)) result.push(u);
    });
    return result;
  }, [sales]);

  const setRangoRapido = (tipo: 'hoy' | 'semana' | 'mes') => {
    const hoy = new Date();
    if (tipo === 'hoy') {
      const fecha = hoy.toISOString().split('T')[0];
      setFechaDesde(fecha);
      setFechaHasta(fecha);
    } else if (tipo === 'semana') {
      const lunes = new Date();
      lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
      setFechaDesde(lunes.toISOString().split('T')[0]);
      setFechaHasta(hoy.toISOString().split('T')[0]);
    } else if (tipo === 'mes') {
      setFechaDesde(new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]);
      setFechaHasta(hoy.toISOString().split('T')[0]);
    }
  };

  useEffect(() => {
    localStorage.setItem('bitacoraOrden', JSON.stringify(ordenRecientePrimero));
  }, [ordenRecientePrimero]);

  // Filtered sales
  const foliosFiltrados = sales.filter((sale) => {
    const matchesSearch =
      sale.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.clientPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.tourName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'Todos' ||
      (statusFilter === 'Liquidado' && sale.status === 'Liquidado') ||
      (statusFilter === 'Con Saldo' && sale.status === 'Con Saldo') ||
      (statusFilter === 'Cancelado' && sale.status === 'Cancelado');

    // NUEVO: filtro fecha
    if (fechaDesde) {
      const fFecha = new Date((sale as any).fecha || sale.createdAt);
      const desde = new Date(fechaDesde);
      if (fFecha < desde) return false;
    }
    if (fechaHasta) {
      const fFecha = new Date((sale as any).fecha || sale.createdAt);
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59);
      if (fFecha > hasta) return false;
    }

    return matchesSearch && matchesStatus;
  });

  const foliosOrdenados = [...foliosFiltrados].sort((a,b) => {
    const nA = parseInt(a.folio.split('-').pop() || '0');
    const nB = parseInt(b.folio.split('-').pop() || '0');
    return ordenRecientePrimero ? nB - nA : nA - nB;
  });

  const handleConfirmLiquidate = () => {
    if (settlingSale) {
      const monto = Number(settlingSale.balance || 0);
      if (monto > 0 && onRegisterPayment) {
        onRegisterPayment(settlingSale, monto, settleMethod, 'liquidacion');
      }
      const updated: Sale = {
        ...settlingSale,
        advancePayment: settlingSale.total,
        balance: 0,
        status: 'Liquidado',
        balancePaymentMethod: settleMethod,
        balancePaidAt: new Date().toISOString(),
      };
      onUpdateSale(updated);
      setSettlingSale(null);
    }
  };

  const handleCancelSale = (sale: Sale) => {
    const ahoraStr =
      new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' +
      new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const updated: Sale = {
      ...sale,
      status: 'Cancelado',
      notes: (sale.notes ? sale.notes + ' | ' : '') + 'Cancelado el ' + ahoraStr,
    };
    onUpdateSale(updated);
    setSaleToDelete(null);
  };

  const handleReactivarFolio = (sale: Sale) => {
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
    onUpdateSale(updated);
  };

  const handleExportCSV = () => {
    const headers = [
      'Folio',
      'Fecha Venta',
      'Fecha Tour',
      'Hora',
      'Cliente',
      'Telefono',
      'Hotel',
      'Tour',
      'Categoria',
      'Pasajeros',
      'Precio Unitario',
      'Subtotal',
      'Descuento',
      'Total',
      'Anticipo',
      'Saldo',
      'Metodo Pago',
      'Estatus',
      'Vendedor',
      'Notas',
    ];

    const rows = foliosOrdenados.map((s) => [
      s.folio,
      s.createdAt.split('T')[0],
      s.tourDate,
      s.tourTime,
      `"${s.clientName.replace(/"/g, '""')}"`,
      `"${s.clientPhone}"`,
      `"${(s.clientHotel || '').replace(/"/g, '""')}"`,
      `"${s.tourName.replace(/"/g, '""')}"`,
      s.tourCategory,
      s.passengerCount,
      s.unitPrice,
      s.subtotal,
      s.discountAmount,
      s.total,
      s.advancePayment,
      s.balance,
      s.paymentMethod,
      s.status,
      `"${s.sellerName}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const nombreArchivo = `Bitacora_${fechaDesde || 'inicio'}_a_${fechaHasta || 'hoy'}.csv`;
    link.setAttribute('download', nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full overflow-visible pb-48">
      {/* Header, Search & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Bitácora Histórica de Ventas &amp; Reservas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Control de todas las operaciones, liquidación de saldos y emisión de comprobantes.
            </p>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setOrdenRecientePrimero(!ordenRecientePrimero)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              {ordenRecientePrimero ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
              {ordenRecientePrimero ? 'Recientes' : 'Antiguos'}
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#059669]" />
              Exportar Bitácora (CSV / Excel)
            </button>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col gap-3">
          {/* Nuevo Filtro Fecha */}
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
              <span>a</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
              <button
                onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400"
              >
                Limpiar
              </button>
            </div>
            <div className="flex gap-1 ml-auto">
              {(['hoy', 'semana', 'mes'] as const).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => setRangoRapido(tipo)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 capitalize"
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por folio, cliente, teléfono o tour..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-[#003087]"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['Todos', 'Liquidado', 'Con Saldo', 'Cancelado'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-700 text-[#003087] dark:text-[#FFCC00] shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sales List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {foliosOrdenados.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No se encontraron ventas con los filtros especificados.
          </div>
        ) : (
          <div className="grid gap-3 p-2">
            {foliosOrdenados.map((sale) => {
              const srvs = sale.servicios && sale.servicios.length > 0
                ? sale.servicios
                : [
                    {
                      nombre: sale.tourName,
                      cantidad: sale.passengerCount,
                      precioUnitario: sale.unitPrice,
                      subtotal: sale.subtotal,
                      fechaServicio: sale.tourDate,
                      horaServicio: sale.tourTime,
                    },
                  ];
              const firstTwo = srvs.slice(0, 2);
              const remainingCount = srvs.length - 2;
              const summaryParts = firstTwo.map(
                (s) => `${s.nombre} (${s.cantidad}p)`
              );
              const remainingText = remainingCount > 0 ? ` +${remainingCount} más` : '';
              const tourResumen = summaryParts.join(', ') + remainingText;

              return (
                <div key={sale.id} className="w-full max-w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-800 p-3 mb-2 overflow-visible">
                  {/* Línea 1: Folio y Fecha creación */}
                  <div className="flex justify-between items-center text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setFolioPreview(sale);
                        setShowPreview(true);
                      }}
                      className="text-blue-600 dark:text-blue-400 font-bold text-[14px] hover:underline text-left cursor-pointer"
                    >
                      {sale.folio}
                    </button>
                    <span className="text-[11px] text-gray-500">{sale.createdAt.split('T')[0]}</span>
                  </div>
                  
                  {/* Línea 2: Datos cliente a la izquierda, Estatus a la derecha */}
                  <div className="flex justify-between items-center gap-2 mt-1 text-[11px]">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1 truncate max-w-[140px]">👤 {sale.clientName}</span>
                      <span className="opacity-70 text-slate-600 dark:text-slate-300 flex items-center gap-1 truncate max-w-[110px]">📞 {sale.clientPhone || 'Sin tel.'}</span>
                      <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">{srvs.length} serv</span>
                      <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">Pax {sale.passengerCount}</span>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                      sale.status === 'Liquidado'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : sale.status === 'Con Saldo'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        : sale.status === 'Cancelado'
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {sale.status}
                    </span>
                  </div>

                  {/* Línea 3: Tour a la izquierda, Importe a la derecha */}
                  <div className="flex justify-between items-baseline gap-2 mt-1">
                    <div className="text-[13px] font-bold leading-tight text-slate-900 dark:text-white truncate max-w-[65%]" title={tourResumen}>
                      {tourResumen}
                    </div>
                    <span className="text-green-700 dark:text-green-400 font-bold text-lg leading-none shrink-0 text-right">
                      {formatCurrency(sale.total)}
                    </span>
                  </div>

                  {/* Línea 4: Fecha de servicio */}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    <span>📅 {formatDateSpanish(srvs[0].fechaServicio || sale.tourDate)} {srvs[0].horaServicio ? `• ⏰ ${srvs[0].horaServicio}` : ''}</span>
                  </div>

                  {/* Actions: 1 sola fila compacta: [👁️ Ver] [✏️ Editar] [💳 Cobrar] [❌ Cancelar] / [↩️ Reactivar] */}
                  <div className="flex items-center gap-[6px] mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 w-full">
                    <button
                      type="button"
                      onClick={() => onViewReceipt(sale, 'media')}
                      className="flex-1 justify-center px-2.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg font-semibold transition flex items-center gap-1 active:scale-95 shadow-sm cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </button>
                    {onEditSale && (
                      <button
                        type="button"
                        onClick={() => onEditSale(sale)}
                        className="flex-1 justify-center px-2.5 py-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg font-semibold transition flex items-center gap-1 active:scale-95 shadow-sm cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" /> Editar
                      </button>
                    )}
                    {sale.balance > 0 && sale.status !== 'Cancelado' && (
                      <button
                        type="button"
                        onClick={() => setSettlingSale(sale)}
                        className="flex-1 justify-center px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg font-semibold transition flex items-center gap-1 active:scale-95 shadow-sm cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Cobrar
                      </button>
                    )}
                    {sale.status !== 'Cancelado' ? (
                      <button
                        type="button"
                        onClick={() => setSaleToDelete(sale)}
                        className="flex-1 justify-center px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-slate-800 dark:hover:bg-red-950/50 rounded-lg font-semibold transition flex items-center gap-1 active:scale-95 shadow-sm cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancelar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReactivarFolio(sale)}
                        className="flex-1 justify-center px-2.5 py-1.5 text-xs text-blue-700 dark:text-blue-300 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800 rounded-lg font-bold transition flex items-center gap-1 active:scale-95 shadow-sm cursor-pointer"
                      >
                        ↩️ Reactivar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Liquidar Saldo */}
      {settlingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Liquidar Saldo Pendiente
              </h3>
              <button
                type="button"
                onClick={() => setSettlingSale(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1 text-xs">
              <div><strong>Folio:</strong> {settlingSale.folio}</div>
              <div><strong>Cliente:</strong> {settlingSale.clientName}</div>
              <div><strong>Tour:</strong> {settlingSale.tourName}</div>
              <div className="text-sm font-bold text-[#CE1126] pt-1">
                Saldo a cobrar: {formatCurrency(settlingSale.balance)} MXN
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Método de Pago para Liquidación:
              </label>
              <select
                value={settleMethod}
                onChange={(e) => setSettleMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="SPEI">SPEI</option>
                <option value="Tarjeta">Tarjeta (Terminal)</option>
                <option value="CoDi">CoDi</option>
                <option value="USD">USD (Dólares)</option>
                <option value="EUR">EUR (Euros)</option>
                <option value="GBP">GBP (Libras)</option>
                <option value="CAD">CAD (Dólares Canadiense)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSettlingSale(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLiquidate}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-xl shadow"
              >
                <Check className="w-4 h-4" />
                Confirmar Pago y Liquidar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Cancel */}
      {saleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-[#CE1126]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ¿Cancelar esta reserva?
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              ¿Estás seguro de cancelar la venta <strong>{saleToDelete.folio}</strong> de <strong>{saleToDelete.clientName}</strong>?
              El estatus pasará a "Cancelado" y no computará en los ingresos del corte de caja.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => handleCancelSale(saleToDelete)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#CE1126] hover:bg-red-700 rounded-xl"
              >
                Sí, Cancelar Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Drawer: Vista Rápida de Folio (Media Carta) */}
      {showPreview && folioPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-300 dark:border-slate-800 flex flex-col overflow-hidden max-h-[94vh]">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-[#003087] dark:text-blue-400">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Vista Rápida de Folio</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/60 text-[#003087] dark:text-[#FFCC00]">
                      {folioPreview.folio}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Media Carta Oficial (8.5" x 5.5") &bull; {folioPreview.clientName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPreview(false);
                    setFolioPreview(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"
                  title="Cerrar Vista Rápida"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido con scroll interno max-h- */}
            <div className="flex-1 overflow-x-auto overflow-y-auto p-2 sm:p-4 max-h-[82vh] bg-slate-200/80 dark:bg-slate-950">
              <div className="w-[816px] bg-white shadow mx-auto origin-top-left scale-[0.44] sm:scale-[0.65] md:scale-100 -mb-[55%] sm:-mb-[35%] md:mb-0">
                <ReciboMediaCartaDesglosado folio={folioPreview} config={config} idPrint={`print-recibo-${folioPreview.folio}`} />
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 justify-end">
              <button onClick={()=>compartirFolio('png')} className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-bold shadow">📤 Compartir / Descargar PNG</button>
              <button onClick={()=>compartirFolio('pdf')} className="px-4 py-2 bg-[#DC2626] hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow">📄 Compartir / Descargar PDF</button>
              <button onClick={()=>{setShowPreview(false); setFolioPreview(null);}} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow">Cerrar</button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
};
