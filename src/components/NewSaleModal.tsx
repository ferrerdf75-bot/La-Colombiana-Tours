import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Compass,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Users,
  Percent,
  Check,
  CreditCard,
  Building2,
  Phone,
  User,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  ShoppingCart
} from 'lucide-react';
import { TourItem, Sale, PaymentMethod, BusinessConfig, TourCategory, SaleServiceItem, SaleEditionHistory, SaleFirma } from '../types';
import { fmtMoney, parseMoney, formatCurrency, formatFolio, getTodayDate, getTomorrowDate, formatDateSpanish, getHoyHolbox } from '../utils/formatters';
import { WheelTimePicker } from './WheelTimePicker';
import { SignaturePad } from './SignaturePad';

interface NewSaleModalProps {
  tours: TourItem[];
  config: BusinessConfig;
  saleToEdit?: Sale | null;
  onClose: () => void;
  onSaveSale: (sale: Sale, updatedConfig: BusinessConfig) => void;
  onUpdateSale?: (updatedSale: Sale) => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  tours,
  config,
  saleToEdit,
  onClose,
  onSaveSale,
  onUpdateSale,
}) => {
  const isEditing = Boolean(saleToEdit);
  const activeTours = tours.filter((t) => t.active);

  // 1. Initial services array: VACÍO para nuevo folio (sin tours precargados)
  const [servicios, setServicios] = useState<SaleServiceItem[]>(() => {
    try {
      localStorage.removeItem('draftFolio');
    } catch (_) {}

    if (saleToEdit) {
      if (Array.isArray(saleToEdit.servicios) && saleToEdit.servicios.length > 0) {
        return saleToEdit.servicios.map((s) => ({
          ...s,
          providerCost: s.providerCost ?? 0,
          providerType: s.providerType || 'Lanchero',
          utilidad: s.utilidad ?? (s.precioUnitario - (s.providerCost || 0)),
        }));
      }
      return [
        {
          id: 'srv-' + (saleToEdit.id || '1') + '-0',
          tourId: saleToEdit.tourId || '',
          nombre: saleToEdit.tourName || 'Tour General',
          tipo: 'por_persona',
          cantidad: saleToEdit.passengerCount || 1,
          precioUnitario: saleToEdit.unitPrice || saleToEdit.total || 0,
          subtotal: saleToEdit.subtotal || saleToEdit.total || 0,
          providerCost: 0,
          providerType: 'Lanchero',
          utilidad: saleToEdit.unitPrice || saleToEdit.total || 0,
          fechaServicio: saleToEdit.tourDate || getTodayDate(),
          horaServicio: saleToEdit.tourTime || '09:00 AM',
          puntoEncuentro: saleToEdit.meetingPoint || 'Muelle Principal Holbox',
          nota: saleToEdit.notes || '',
        },
      ];
    }

    // Default para nuevo folio: lista VACÍA sin tours precargados
    return [];
  });

  // Service form state (for adding or editing an individual service)
  const [selectedTourId, setSelectedTourId] = useState<string>('');
  const [customTourName, setCustomTourName] = useState<string>('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(600);
  const [itemProviderCost, setItemProviderCost] = useState<number>(0);
  const [itemProviderType, setItemProviderType] = useState<string>('Lanchero');
  const [itemDate, setItemDate] = useState<string>(() => getHoyHolbox());
  const [itemTime, setItemTime] = useState<string>('10:00 AM');
  const [itemMeetingPoint, setItemMeetingPoint] = useState<string>('Muelle Principal Holbox');
  const [itemNotes, setItemNotes] = useState<string>('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Function to switch/select a tour cleanly without getting stuck
  const handleSelectTourItem = (tour: TourItem) => {
    if (checkFirmaBloqueada()) return;
    setSelectedTourId(tour.id);
    if (!editingItemId) {
      setItemUnitPrice(tour.defaultPrice);
      setItemProviderCost(tour.providerCost || 0);
      setItemProviderType(tour.providerType || 'Lanchero');
      setItemTime(tour.defaultTime || '10:00 AM');
      setItemMeetingPoint(tour.meetingPoint || 'Muelle Principal Holbox');
      if (!itemDate) {
        setItemDate(getHoyHolbox());
      }
    }
  };

  const handleSelectCustomTour = () => {
    if (checkFirmaBloqueada()) return;
    setSelectedTourId('custom');
    if (!editingItemId) {
      setItemProviderCost(0);
      setItemProviderType('Lanchero');
      if (!itemDate) {
        setItemDate(getHoyHolbox());
      }
    }
  };

  // Autoselección en móvil / Android: input.addEventListener('focus', e => e.target.select())
  useEffect(() => {
    const selector = '#input-cantidad-servicio, #input-precio-servicio, #input-hora, #input-minuto';
    const handler = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target && typeof target.select === 'function') {
        target.select();
        setTimeout(() => {
          try {
            target.select();
            target.setSelectionRange?.(0, 9999);
          } catch (_) {}
        }, 50);
      }
    };
    const inputs = document.querySelectorAll<HTMLInputElement>(selector);
    inputs.forEach((inp) => {
      inp.addEventListener('focus', handler);
      inp.addEventListener('click', handler);
    });
    return () => {
      inputs.forEach((inp) => {
        inp.removeEventListener('focus', handler);
        inp.removeEventListener('click', handler);
      });
    };
  }, [selectedTourId, editingItemId]);

  // Client Details
  const [clientName, setClientName] = useState<string>(saleToEdit?.clientName || '');
  const [clientPhone, setClientPhone] = useState<string>(saleToEdit?.clientPhone || '');
  const [clientHotel, setClientHotel] = useState<string>(saleToEdit?.clientHotel || '');
  const [clientSignature, setClientSignature] = useState<string | undefined>(saleToEdit?.clientSignature);
  const [firma, setFirma] = useState<SaleFirma>(() => {
    if (saleToEdit?.firma) return saleToEdit.firma;
    if (saleToEdit?.clientSignature) {
      return {
        bloqueada: true,
        timestampBloqueo: saleToEdit.createdAt || new Date().toISOString(),
        base64: saleToEdit.clientSignature,
      };
    }
    return { bloqueada: false };
  });

  const checkFirmaBloqueada = (): boolean => {
    if (firma.bloqueada) {
      setToastMsg('🔒 Desbloquea la firma primero para editar el folio');
      setTimeout(() => setToastMsg(null), 3500);
      return true;
    }
    return false;
  };

  const handleSignatureChange = (sig: string | undefined, meta?: SaleFirma) => {
    setClientSignature(sig);
    if (meta) {
      setFirma(meta);
    } else if (!sig) {
      setFirma({ bloqueada: false });
    } else {
      setFirma({
        bloqueada: true,
        timestampBloqueo: new Date().toISOString(),
        base64: sig,
      });
    }
  };

  const handleAutoSelect = (e: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    if (target && target.value) {
      target.select();
      setTimeout(() => target.select(), 100);
    }
  };

  const handleMouseUpPrevent = (e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
  };

  const [sellerName, setSellerName] = useState<string>(saleToEdit?.sellerName || config.owner);
  const [notes, setNotes] = useState<string>(saleToEdit?.notes || '');

  // Financial Values
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'amount' | 'courtesy'>(
    saleToEdit?.discountType || 'none'
  );
  const [discountPercent, setDiscountPercent] = useState<number>(
    saleToEdit?.discountType === 'percent' ? saleToEdit.discountValue : 0
  );
  const [discountAmountManual, setDiscountAmountManual] = useState<number>(
    saleToEdit?.discountType === 'amount' ? saleToEdit.discountValue : 0
  );
  const [advancePayment, setAdvancePayment] = useState<number>(() => {
    if (saleToEdit) return saleToEdit.advancePayment;
    try {
      const savedDivisa = localStorage.getItem('holbox_divisa_anticipo');
      if (savedDivisa) {
        localStorage.removeItem('holbox_divisa_anticipo');
        const num = parseFloat(savedDivisa);
        if (!isNaN(num) && num > 0) return num;
      }
    } catch {}
    return 0;
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    saleToEdit?.paymentMethod || 'Efectivo'
  );
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Debounce and anti-double click protection for "+ Agregar al Folio"
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const isAddingRef = useRef<boolean>(false);

  // Derived calculations from current services cart with useMemo for smooth 60fps performance
  const { serviciosSubtotal, totalPassengers, calculatedDiscountAmount, totalFolio, balance } = React.useMemo(() => {
    const sSub = servicios.reduce((sum, s) => sum + s.subtotal, 0);
    const tPax = servicios.reduce((sum, s) => sum + (s.cantidad || 1), 0);
    let dAmt = 0;
    if (discountType === 'percent') {
      dAmt = Math.round((sSub * discountPercent) / 100);
    } else if (discountType === 'amount') {
      dAmt = Math.min(sSub, discountAmountManual);
    } else if (discountType === 'courtesy') {
      dAmt = sSub;
    }
    const tFolio = Math.max(0, sSub - dAmt);
    const bal = Math.max(0, tFolio - advancePayment);
    return {
      serviciosSubtotal: sSub,
      totalPassengers: tPax,
      calculatedDiscountAmount: dAmt,
      totalFolio: tFolio,
      balance: bal
    };
  }, [servicios, discountType, discountPercent, discountAmountManual, advancePayment]);

  // Quick discount setters
  const applyDiscountPreset = (type: 'none' | 'percent' | 'amount' | 'courtesy', val: number) => {
    if (checkFirmaBloqueada()) return;
    setDiscountType(type);
    if (type === 'percent') {
      setDiscountPercent(val);
    } else if (type === 'courtesy') {
      setDiscountPercent(100);
    } else if (type === 'none') {
      setDiscountPercent(0);
      setDiscountAmountManual(0);
    }
  };

  // Quick advance setters
  const applyAdvancePreset = (type: '100%' | '50%' | '200' | '500' | '0') => {
    if (checkFirmaBloqueada()) return;
    if (type === '100%') {
      setAdvancePayment(totalFolio);
    } else if (type === '50%') {
      setAdvancePayment(Math.round(totalFolio / 2));
    } else if (type === '200') {
      setAdvancePayment(Math.min(totalFolio, 200));
    } else if (type === '500') {
      setAdvancePayment(Math.min(totalFolio, 500));
    } else if (type === '0') {
      setAdvancePayment(0);
    }
  };

  // Adjust advance if total changes below advance
  useEffect(() => {
    if (!isEditing && advancePayment > totalFolio) {
      setAdvancePayment(totalFolio);
    }
  }, [totalFolio, isEditing]);

  // Handle adding or updating an item in the services cart
  const handleAddOrUpdateService = () => {
    if (checkFirmaBloqueada()) return;
    // 2. PROTECCIÓN LÓGICA (DEBOUNCE)
    if (isAddingRef.current) return;

    if (itemQty <= 0) {
      setErrorMsg('La cantidad debe ser al menos 1.');
      return;
    }

    const currentTour = tours.find((t) => t.id === selectedTourId);
    const resolvedName =
      selectedTourId === 'custom'
        ? customTourName.trim() || 'Servicio Personalizado'
        : currentTour?.name || 'Tour Holbox';

    const itemSubtotal = itemQty * itemUnitPrice;

    if (editingItemId) {
      // Update existing item
      setServicios((prev) =>
        prev.map((s) =>
          s.id === editingItemId
            ? {
                ...s,
                tourId: selectedTourId,
                nombre: resolvedName,
                tipo: currentTour?.priceUnit || 'por_persona',
                cantidad: itemQty,
                precioUnitario: itemUnitPrice,
                subtotal: itemSubtotal,
                providerCost: itemProviderCost,
                providerType: itemProviderType,
                utilidad: itemUnitPrice - itemProviderCost,
                fechaServicio: itemDate,
                horaServicio: itemTime,
                puntoEncuentro: itemMeetingPoint,
                nota: itemNotes,
              }
            : s
        )
      );
      setEditingItemId(null);
      setItemQty(1);
      setItemNotes('');
      setItemProviderCost(0);
      setItemProviderType('Lanchero');
      setErrorMsg('');
      return;
    }

    // 3. PROTECCIÓN ANTI-DUPLICADO INTELIGENTE:
    // Revisa si es exactamente idéntico (mismo tour, misma fecha, misma cantidad y mismo precio) dentro de los últimos 5 segundos
    const existeIgual = servicios.some((s: any) =>
      s.tourId === selectedTourId &&
      s.fechaServicio === itemDate &&
      s.cantidad === itemQty &&
      s.precioUnitario === itemUnitPrice &&
      s.timestamp &&
      Date.now() - s.timestamp < 5000
    );

    if (existeIgual) {
      setToastMsg('⚠️ Ese servicio ya se agregó hace 2 seg');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    // 1. PROTECCIÓN VISUAL INMEDIATA + DEBOUNCE
    isAddingRef.current = true;
    setIsAdding(true);

    try {
      // Add new item with timestamp tracking
      const newItem: SaleServiceItem & { timestamp?: number } = {
        id: 'srv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        tourId: selectedTourId,
        nombre: resolvedName,
        tipo: currentTour?.priceUnit || 'por_persona',
        cantidad: itemQty,
        pax: itemQty,
        precioUnitario: itemUnitPrice,
        subtotal: itemSubtotal,
        providerCost: itemProviderCost,
        providerType: itemProviderType,
        utilidad: itemUnitPrice - itemProviderCost,
        fechaServicio: itemDate,
        fecha_tour: itemDate,
        horaServicio: itemTime,
        hora_tour: itemTime,
        puntoEncuentro: itemMeetingPoint,
        punto_encuentro: itemMeetingPoint,
        nota: itemNotes,
        timestamp: Date.now(),
      };

      setServicios((prev) => [...prev, newItem]);

      // Reset item form
      setItemQty(1);
      setItemNotes('');
      setItemProviderCost(0);
      setItemProviderType('Lanchero');
      setErrorMsg('');

      // Espera 800ms y regresa visualmente a: "+ Agregar al Folio"
      setTimeout(() => {
        setIsAdding(false);
      }, 800);

      // Debounce lógico: 1000ms antes de liberar re-ingreso
      setTimeout(() => {
        isAddingRef.current = false;
      }, 1000);
    } catch (err) {
      // Si hay error, rehabilita
      isAddingRef.current = false;
      setIsAdding(false);
      setErrorMsg('Ocurrió un error al agregar el servicio.');
    }
  };

  const handleStartEditItem = (item: SaleServiceItem & any) => {
    if (checkFirmaBloqueada()) return;
    setEditingItemId(item.id);
    setSelectedTourId(item.tourId);
    if (item.tourId === 'custom') {
      setCustomTourName(item.nombre);
    }
    setItemQty(item.cantidad || item.pax || 1);
    setItemUnitPrice(item.precioUnitario);
    setItemProviderCost(item.providerCost || 0);
    setItemProviderType(item.providerType || 'Lanchero');
    setItemDate(item.fecha_tour || item.fechaServicio || getHoyHolbox());
    setItemTime(item.hora_tour || item.horaServicio || '10:00 AM');
    setItemMeetingPoint(item.punto_encuentro || item.puntoEncuentro || 'Muelle Principal Holbox');
    setItemNotes(item.nota || '');
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setItemQty(1);
    setItemNotes('');
    setItemProviderCost(0);
    setItemProviderType('Lanchero');
  };

  const handleRemoveService = (serviceId: string) => {
    if (checkFirmaBloqueada()) return;
    setServicios((prev) => prev.filter((s) => s.id !== serviceId));
    if (editingItemId === serviceId) {
      handleCancelEditItem();
    }
  };

  // Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!clientName.trim()) {
      setErrorMsg('Por favor ingrese el nombre del turista.');
      return;
    }
    if (servicios.length === 0) {
      setErrorMsg('Debe agregar al menos un servicio al folio.');
      return;
    }

    if (firma.bloqueada) {
      const finalSig = firma.base64 || clientSignature;
      if (!finalSig || !finalSig.startsWith('data:image')) {
        setErrorMsg('La firma bloqueada no puede guardarse vacía. Firme o desbloquee.');
        return;
      }
    }

    const finalSignature = firma.bloqueada ? (firma.base64 || clientSignature) : clientSignature;
    const finalFirma: SaleFirma = {
      bloqueada: Boolean(firma.bloqueada && finalSignature),
      timestampBloqueo: firma.bloqueada ? (firma.timestampBloqueo || new Date().toISOString()) : undefined,
      base64: firma.bloqueada ? finalSignature : undefined,
    };

    const firstService = servicios[0];
    const resolvedTourSummary =
      servicios.length === 1
        ? firstService.nombre
        : `${servicios.length} servicios: ${servicios
            .map((s) => `${s.nombre} (${s.cantidad})`)
            .join(', ')}`;

    if (isEditing && saleToEdit) {
      // Build edition history
      const editionEntry: SaleEditionHistory = {
        fecha: new Date().toISOString(),
        cambio: `Edición de folio: ${servicios.length} servicios. Total: $${totalFolio}, Anticipo/Pagos: $${advancePayment}, Saldo: $${balance}`,
        usuario: sellerName.trim() || config.owner || 'Admin',
      };

      const updatedHistory = [...(saleToEdit.historialEdiciones || []), editionEntry];

      const updatedSale: Sale = {
        ...saleToEdit,
        tourId: firstService.tourId,
        tourName: resolvedTourSummary,
        tourCategory: (tours.find((t) => t.id === firstService.tourId)?.category) || ('TOURS ESTRELLA HOLBOX' as TourCategory),
        tourDate: firstService.fechaServicio || saleToEdit.tourDate,
        tourTime: firstService.horaServicio || saleToEdit.tourTime,
        meetingPoint: firstService.puntoEncuentro || saleToEdit.meetingPoint,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientHotel: clientHotel.trim(),
        clientSignature: finalSignature,
        firma: finalFirma,
        passengerCount: totalPassengers,
        unitPrice: firstService.precioUnitario,
        subtotal: serviciosSubtotal,
        discountType,
        discountValue: discountType === 'percent' ? discountPercent : discountAmountManual,
        discountAmount: calculatedDiscountAmount,
        total: totalFolio,
        totalFolio,
        servicios,
        historialEdiciones: updatedHistory,
        advancePayment,
        balance,
        paymentMethod,
        notes: notes.trim(),
        status:
          saleToEdit.status === 'Cancelado'
            ? 'Cancelado'
            : balance === 0
            ? 'Liquidado'
            : 'Con Saldo',
        sellerName: sellerName.trim(),
      };

      if (onUpdateSale) {
        onUpdateSale(updatedSale);
      }
      onClose();
    } else {
      // New Sale
      const currentYear = new Date().getFullYear();
      const currentSeq = config.nextFolioNumber || 1;
      const generatedFolio = formatFolio(config.folioPrefix || 'LC', currentYear, currentSeq);

      const newSale: Sale = {
        id: 'sale-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        folio: generatedFolio,
        createdAt: new Date().toISOString(),
        tourId: firstService.tourId,
        tourName: resolvedTourSummary,
        tourCategory: (tours.find((t) => t.id === firstService.tourId)?.category) || ('TOURS ESTRELLA HOLBOX' as TourCategory),
        tourDate: firstService.fechaServicio || getTodayDate(),
        tourTime: firstService.horaServicio || '09:00 AM',
        meetingPoint: firstService.puntoEncuentro || 'Muelle Principal Holbox',
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientHotel: clientHotel.trim(),
        clientSignature: finalSignature,
        firma: finalFirma,
        passengerCount: totalPassengers,
        unitPrice: firstService.precioUnitario,
        subtotal: serviciosSubtotal,
        discountType,
        discountValue: discountType === 'percent' ? discountPercent : discountAmountManual,
        discountAmount: calculatedDiscountAmount,
        total: totalFolio,
        totalFolio,
        servicios,
        historialEdiciones: [
          {
            fecha: new Date().toISOString(),
            cambio: `Emisión de folio con ${servicios.length} servicios`,
            usuario: sellerName.trim() || config.owner || 'Admin',
          },
        ],
        advancePayment,
        balance,
        paymentMethod,
        notes: notes.trim(),
        status: balance === 0 ? 'Liquidado' : 'Con Saldo',
        sellerName: sellerName.trim(),
      };

      const updatedConfig: BusinessConfig = {
        ...config,
        nextFolioNumber: currentSeq + 1,
      };

      onSaveSale(newSale, updatedConfig);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[96vh]" style={{ contain: 'layout paint' }}>
        {/* Tricolor Header Stripe */}
        <div className="flex w-full h-2">
          <div className="w-1/2 bg-[#FFCC00]" />
          <div className="w-1/4 bg-[#003087]" />
          <div className="w-1/4 bg-[#CE1126]" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a6ab0] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold">
              <Compass className="w-5 h-5 text-[#FFCC00]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEditing ? `Editar Folio • ${saleToEdit?.folio}` : 'Nuevo Folio Multiservicio'}
              </h2>
              <p className="text-xs text-white/80">
                {isEditing
                  ? 'Modifique los servicios, importes o datos del turista. El saldo y el ticket se recalcularán automáticamente.'
                  : 'Agregue hasta 5+ servicios en un mismo folio y emita el comprobante oficial.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto overscroll-contain p-6 space-y-6 flex-1"
          style={{
            WebkitOverflowScrolling: 'touch',
            willChange: 'transform',
            transform: 'translateZ(0)'
          }}
        >
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {toastMsg && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/80 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2 shadow-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* Floating Toast Pill */}
          {toastMsg && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 bg-slate-900/95 text-white rounded-2xl shadow-2xl border-2 border-amber-400 text-xs sm:text-sm font-black flex items-center gap-2.5 animate-bounce">
              <span className="text-amber-400 text-base">⚠️</span>
              <span>{toastMsg}</span>
            </div>
          )}

          {/* 1. SERVICIOS EN ESTE FOLIO (CARRITO) */}
          <div className="bg-slate-50 dark:bg-slate-800/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#003087] dark:text-[#FFCC00]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  SERVICIOS EN ESTE FOLIO ({servicios.length})
                </h3>
              </div>
              <span className="text-xs font-black text-[#003087] dark:text-[#FFCC00]">
                Subtotal Servicios: {formatCurrency(serviciosSubtotal)}
              </span>
            </div>

            {/* List with visual limit 5 and scroll */}
            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-200/70 dark:divide-slate-700/70">
              {servicios.length === 0 ? (
                <div
                  id="listaToursRecibo"
                  className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 bg-white/60 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"
                >
                  <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Sin tours</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Aún no hay tours agregados</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Escribe o selecciona un tour abajo y haz clic en "+ Agregar al Folio"</p>
                </div>
              ) : (
                servicios.map((srv, idx) => (
                  <div
                    key={srv.id}
                    className={`pt-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs ${
                      editingItemId === srv.id ? 'p-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-[#003087] dark:text-[#FFCC00]">
                          [{idx + 1}]
                        </span>
                        <span className="truncate">{srv.nombre}</span>
                        <span className="text-slate-600 dark:text-slate-300 font-extrabold">x{srv.cantidad}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                        <span>📅 {formatDateSpanish(srv.fechaServicio)}</span>
                        {srv.horaServicio && <span>⏰ {srv.horaServicio}</span>}
                        <span>• {formatCurrency(srv.precioUnitario)} c/u</span>
                        {srv.puntoEncuentro && <span className="truncate max-w-[150px]">📍 {srv.puntoEncuentro}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {formatCurrency(srv.subtotal)}
                      </span>

                      {/* Editar cantidad/servicio */}
                      <button
                        type="button"
                        onClick={() => handleStartEditItem(srv)}
                        title="Editar este servicio"
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-slate-700 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Borrar servicio */}
                      <button
                        type="button"
                        onClick={() => handleRemoveService(srv.id)}
                        title="Borrar servicio"
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-slate-700 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>TOTAL SERVICIOS ACUMULADOS:</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(serviciosSubtotal)} MXN
              </span>
            </div>
          </div>

          {/* 2. AGREGAR SERVICIO AL FOLIO (Catálogo de Tours y Formulario Desplegable) */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#003087] dark:text-[#0284c7]">
                {editingItemId ? '✏️ Editando Servicio Seleccionado' : '+ Agregar Servicio al Folio'}
              </span>
              {editingItemId && (
                <button
                  type="button"
                  onClick={handleCancelEditItem}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            {/* Selecciona el Tour / Experiencia: [LISTA CLICKEABLE] */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Selecciona el Tour / Experiencia:
              </label>

              <div className="max-h-[190px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-100 dark:divide-slate-800/70">
                {activeTours.map((t) => {
                  const isSelected = selectedTourId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTourItem(t)}
                      style={{fontSize: '11px', lineHeight: '1.2', padding: '5px 10px'}}
                      className={`flex items-center justify-between gap-2 cursor-pointer transition service-filter-option ${
                        isSelected ? 'bg-blue-50/80 dark:bg-blue-950/60 border-l-4 border-l-[#003087]' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div style={{fontSize: '11px'}} className="font-semibold text-slate-900 dark:text-white truncate">
                          {t.name}
                        </div>
                        <div style={{fontSize: '11px'}} className="text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                          {formatCurrency(t.defaultPrice)} {t.priceUnit || 'por persona'}
                        </div>
                      </div>
                      {isSelected && (
                        <span style={{fontSize: '11px'}} className="font-bold text-[#003087] dark:text-[#FFCC00] bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full shrink-0">
                          Seleccionado ✓
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Opción personalizada */}
                <div
                  onClick={handleSelectCustomTour}
                  className={`flex items-center justify-between gap-2 text-sm py-1.5 px-2 cursor-pointer transition ${
                    selectedTourId === 'custom' ? 'bg-blue-50/80 dark:bg-blue-950/60 border-l-4 border-l-[#003087]' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm leading-tight font-semibold text-slate-900 dark:text-white">
                      + Servicio personalizado / Otro
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                      Definir precio, nombre y logística personalizada
                    </div>
                  </div>
                  {selectedTourId === 'custom' && (
                    <span className="text-[11px] font-bold text-[#003087] dark:text-[#FFCC00] bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full shrink-0">
                      Seleccionado ✓
                    </span>
                  )}
                </div>
              </div>
            </div>

            {selectedTourId === 'custom' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nombre del Servicio Personalizado:
                </label>
                <input
                  type="text"
                  placeholder="Ej. Renta Kayak doble / Can-Am 2 horas..."
                  value={customTourName}
                  readOnly={firma.bloqueada}
                  onClick={() => {
                    if (firma.bloqueada) checkFirmaBloqueada();
                  }}
                  onChange={(e) => {
                    if (checkFirmaBloqueada()) return;
                    setCustomTourName(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#003087] focus:outline-none"
                />
              </div>
            )}

            {/* FORMULARIO DEL TOUR SELECCIONADO (Se despliega al hacer click en un tour) */}
            {selectedTourId ? (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3.5 animate-fade-in">
                {/* Fila 1: Cantidad, Precio Unitario, Fecha del Tour */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Cantidad: [-] 1 [+] */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" /> Cantidad
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (checkFirmaBloqueada()) return;
                          setItemQty((q) => Math.max(1, q - 1));
                        }}
                        className="w-9 h-9 flex items-center justify-center font-bold text-base bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition"
                      >
                        -
                      </button>
                      <input
                        id="input-cantidad-servicio"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={itemQty}
                        readOnly={firma.bloqueada}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        onChange={(e) => {
                          if (checkFirmaBloqueada()) return;
                          setItemQty(Math.max(1, parseInt(e.target.value, 10) || 1));
                        }}
                        className="w-16 h-9 text-center font-bold text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (checkFirmaBloqueada()) return;
                          setItemQty((q) => q + 1);
                        }}
                        className="w-9 h-9 flex items-center justify-center font-bold text-base bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Precio Unitario / Sugerido */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-500" /> Precio Sugerido (MXN)
                    </label>
                    <input
                      id="input-precio-servicio"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9,]*"
                      autoComplete="off"
                      value={fmtMoney(itemUnitPrice)}
                      readOnly={firma.bloqueada}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => {
                        if (checkFirmaBloqueada()) return;
                        setItemUnitPrice(parseMoney(e.target.value));
                      }}
                      className="w-full h-9 px-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#003087]"
                    />
                  </div>

                  {/* Fecha del Tour (usa getHoyHolbox()) */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" /> Fecha del Tour
                    </label>
                    <input
                      type="date"
                      value={itemDate}
                      readOnly={firma.bloqueada}
                      onClick={() => {
                        if (firma.bloqueada) checkFirmaBloqueada();
                      }}
                      onChange={(e) => {
                        if (checkFirmaBloqueada()) return;
                        setItemDate(e.target.value);
                      }}
                      className="w-full h-9 px-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-[#003087]"
                    />
                  </div>
                </div>

                {/* Fila Negociación de Honorarios y Ganancia Neta (Oculta en modal de folio para cliente) */}
                <div className="hidden grid-cols-1 sm:grid-cols-3 gap-2 bg-[#f1f5f9] dark:bg-slate-700/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      💰 Precio Contratado
                    </label>
                    <input
                      type="number"
                      value={itemUnitPrice || ''}
                      readOnly={firma.bloqueada}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => {
                        if (checkFirmaBloqueada()) return;
                        setItemUnitPrice(parseFloat(e.target.value) || 0);
                      }}
                      placeholder="Ej: 2500"
                      className="w-full mt-1 h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    />
                    <span className="text-[9px] text-slate-500 dark:text-slate-400">Cobro al cliente</span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      👤 Honorarios Prestador
                    </label>
                    <div className="flex gap-1 mt-1">
                      <input
                        type="number"
                        value={itemProviderCost || ''}
                        readOnly={firma.bloqueada}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        onChange={(e) => {
                          if (checkFirmaBloqueada()) return;
                          setItemProviderCost(parseFloat(e.target.value) || 0);
                        }}
                        placeholder="Ej: 1600"
                        className="w-full h-8 px-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400"
                      />
                      <select
                        value={itemProviderType}
                        disabled={firma.bloqueada}
                        onChange={(e) => {
                          if (checkFirmaBloqueada()) return;
                          setItemProviderType(e.target.value);
                        }}
                        className="text-[10px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-1 font-semibold text-slate-700 dark:text-slate-300"
                      >
                        <option value="Lanchero">Lanchero</option>
                        <option value="Capitán">Capitán</option>
                        <option value="Taxista">Taxista</option>
                        <option value="Bicicletas">Bicicletas</option>
                        <option value="Carritos Golf">Carritos Golf</option>
                        <option value="Can-Am">Can-Am</option>
                        <option value="Guía">Guía</option>
                        <option value="Transfer">Transfer</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400">Costo prestador</span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      📈 Ganancia Neta
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formatCurrency((itemUnitPrice - itemProviderCost) * itemQty)}
                      className="w-full mt-1 h-8 px-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-black text-emerald-700 dark:text-emerald-400"
                    />
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Utilidad: {formatCurrency(itemUnitPrice - itemProviderCost)} c/u
                    </span>
                  </div>
                </div>

                {/* Fila 2: Hora del Tour (sin icono reloj), Punto de Encuentro, Nota */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Hora del Tour (sin icono reloj, input time compacto) */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Hora del Tour:
                    </label>
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2 h-9">
                      <input
                        id="input-hora"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="12"
                        value={(() => {
                          try {
                            if (!itemTime) return "10";
                            const clean = itemTime.toUpperCase().replace(/[^0-9:]/g, "");
                            const parts = clean.split(":");
                            let h = parseInt(parts[0] || "10", 10);
                            if (h === 0) h = 12;
                            if (h > 12) h = h % 12 || 12;
                            return `${h}`;
                          } catch {
                            return "10";
                          }
                        })()}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        onChange={(e) => {
                          if (checkFirmaBloqueada()) return;
                          let val = parseInt(e.target.value, 10);
                          if (isNaN(val)) val = 1;
                          if (val > 12) val = 12;
                          if (val < 1) val = 1;

                          const upper = (itemTime || "10:00 AM").toUpperCase();
                          const isPm = upper.includes("PM");
                          const clean = upper.replace(/[^0-9:]/g, "");
                          const parts = clean.split(":");
                          const mStr = parts[1] || "00";
                          const ap = isPm ? "PM" : "AM";
                          const hStr = val < 10 ? `0${val}` : `${val}`;
                          setItemTime(`${hStr}:${mStr} ${ap}`);
                        }}
                        className="w-10 h-7 text-center bg-slate-100 dark:bg-slate-800 rounded font-bold text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#003087]"
                      />
                      <span className="font-bold text-slate-400">:</span>
                      <input
                        id="input-minuto"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max="59"
                        value={(() => {
                          try {
                            if (!itemTime) return "00";
                            const clean = itemTime.toUpperCase().replace(/[^0-9:]/g, "");
                            const parts = clean.split(":");
                            const m = parseInt(parts[1] || "0", 10);
                            const mClamped = Math.min(Math.max(m, 0), 59);
                            return mClamped < 10 ? `0${mClamped}` : `${mClamped}`;
                          } catch {
                            return "00";
                          }
                        })()}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        onChange={(e) => {
                          if (checkFirmaBloqueada()) return;
                          let val = parseInt(e.target.value, 10);
                          if (isNaN(val)) val = 0;
                          if (val > 59) val = 59;
                          if (val < 0) val = 0;

                          const upper = (itemTime || "10:00 AM").toUpperCase();
                          const isPm = upper.includes("PM");
                          const clean = upper.replace(/[^0-9:]/g, "");
                          const parts = clean.split(":");
                          let h = parseInt(parts[0] || "10", 10);
                          if (h === 0) h = 12;
                          if (h > 12) h = h % 12 || 12;
                          const hStr = h < 10 ? `0${h}` : `${h}`;
                          const ap = isPm ? "PM" : "AM";
                          const mStr = val < 10 ? `0${val}` : `${val}`;
                          setItemTime(`${hStr}:${mStr} ${ap}`);
                        }}
                        className="w-10 h-7 text-center bg-slate-100 dark:bg-slate-800 rounded font-bold text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#003087]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (checkFirmaBloqueada()) return;
                          const upper = (itemTime || "10:00 AM").toUpperCase();
                          const isPm = upper.includes("PM");
                          const clean = upper.replace(/[^0-9:]/g, "");
                          const parts = clean.split(":");
                          let h = parseInt(parts[0] || "10", 10);
                          if (h === 0) h = 12;
                          if (h > 12) h = h % 12 || 12;
                          const hStr = h < 10 ? `0${h}` : `${h}`;
                          const mStr = parts[1] || "00";
                          const newAp = isPm ? "AM" : "PM";
                          setItemTime(`${hStr}:${mStr} ${newAp}`);
                        }}
                        className="px-2 py-1 ml-auto bg-blue-50 dark:bg-blue-950/60 text-[#003087] dark:text-[#FFCC00] font-extrabold text-[11px] rounded hover:bg-blue-100 transition"
                      >
                        {itemTime?.toUpperCase().includes('PM') ? 'PM' : 'AM'}
                      </button>
                    </div>
                  </div>

                  {/* Punto Encuentro: [Muelle Principal...] */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" /> Punto Encuentro:
                    </label>
                    <input
                      type="text"
                      value={itemMeetingPoint}
                      readOnly={firma.bloqueada}
                      onClick={() => {
                        if (firma.bloqueada) checkFirmaBloqueada();
                      }}
                      onChange={(e) => {
                        if (checkFirmaBloqueada()) return;
                        setItemMeetingPoint(e.target.value);
                      }}
                      placeholder="Muelle Principal Holbox..."
                      className="w-full h-9 px-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
                    />
                  </div>

                  {/* Nota: [ ] */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nota:
                    </label>
                    <input
                      type="text"
                      value={itemNotes}
                      readOnly={firma.bloqueada}
                      onClick={() => {
                        if (firma.bloqueada) checkFirmaBloqueada();
                      }}
                      onChange={(e) => {
                        if (checkFirmaBloqueada()) return;
                        setItemNotes(e.target.value);
                      }}
                      placeholder="Ej. Llevar toalla, vegetariano, etc."
                      className="w-full h-9 px-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Botón azul grande: [+ Agregar a este Folio] */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isAdding}
                    onClick={handleAddOrUpdateService}
                    className={`w-full py-3 px-4 bg-[#003087] hover:bg-[#002266] text-white text-sm font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                      isAdding ? 'opacity-60 pointer-events-none cursor-not-allowed' : ''
                    }`}
                  >
                    {isAdding ? (
                      <>⏳ Agregando...</>
                    ) : editingItemId ? (
                      <>
                        <Check className="w-4 h-4" />
                        Guardar Cambios Servicio ({formatCurrency(itemQty * itemUnitPrice)})
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        + Agregar a este Folio ({formatCurrency(itemQty * itemUnitPrice)})
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                👆 Selecciona un tour o experiencia arriba para desplegar y configurar sus datos.
              </div>
            )}
          </div>

          {/* 3. DATOS DEL TURISTA / CLIENTE */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-[#003087] dark:text-[#0284c7]">
              3. Datos del Turista / Titular
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" /> Nombre del Turista *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nombre y Apellido"
                  value={clientName}
                  readOnly={firma.bloqueada}
                  onClick={() => {
                    if (firma.bloqueada) checkFirmaBloqueada();
                  }}
                  onKeyDown={(e) => {
                    if (firma.bloqueada) {
                      e.preventDefault();
                      checkFirmaBloqueada();
                    }
                  }}
                  onChange={(e) => {
                    if (checkFirmaBloqueada()) return;
                    setClientName(e.target.value);
                  }}
                  className={`w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#003087] focus:outline-none ${
                    firma.bloqueada
                      ? 'border-emerald-400 dark:border-emerald-600 cursor-not-allowed bg-emerald-50/20'
                      : 'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> WhatsApp / Teléfono
                </label>
                <input
                  type="tel"
                  placeholder="Ej. +52 984 000 0000"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-[#003087] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" /> Hotel / Hospedaje
                </label>
                <input
                  type="text"
                  placeholder="Ej. Hotel Mystique, Cabañas..."
                  value={clientHotel}
                  onChange={(e) => setClientHotel(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-[#003087] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 4. DESGLOSE FINANCIERO, DESCUENTOS Y ANTICIPO */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-[#003087] dark:text-[#0284c7]">
              4. Desglose Financiero, Descuentos y Saldo
            </span>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-4">
              <div className="flex justify-between items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>Subtotal ({servicios.length} servicios acumulados):</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(serviciosSubtotal)}</span>
              </div>

              {/* Descuentos */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Descuentos / Promociones
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyDiscountPreset('none', 0)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                      discountType === 'none'
                        ? 'bg-[#003087] text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    Sin desc.
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDiscountPreset('percent', 10)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                      discountType === 'percent' && discountPercent === 10
                        ? 'bg-[#003087] text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    10% desc.
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDiscountPreset('percent', 15)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                      discountType === 'percent' && discountPercent === 15
                        ? 'bg-[#003087] text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    15% desc.
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDiscountPreset('courtesy', 100)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                      discountType === 'courtesy'
                        ? 'bg-[#CE1126] text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    Cortesía (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (checkFirmaBloqueada()) return;
                      setDiscountType('amount');
                      if (discountAmountManual === 0) setDiscountAmountManual(100);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                      discountType === 'amount'
                        ? 'bg-[#003087] text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    Monto en $ (Personalizado)
                  </button>
                </div>

                {discountType === 'amount' && (
                  <div className="pt-2 max-w-xs">
                    <label className="text-[11px] text-slate-500 font-medium">Monto a descontar (MXN):</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9,]*"
                      autoComplete="off"
                      value={fmtMoney(discountAmountManual)}
                      readOnly={firma.bloqueada}
                      onClick={() => {
                        if (firma.bloqueada) checkFirmaBloqueada();
                      }}
                      onChange={(e) => {
                        if (checkFirmaBloqueada()) return;
                        setDiscountAmountManual(parseMoney(e.target.value));
                      }}
                      className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold text-[#CE1126]"
                    />
                  </div>
                )}
              </div>

              {/* Total final */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700">
                <span className="text-base font-bold text-slate-900 dark:text-white">Total del Folio:</span>
                <span className="text-xl font-extrabold text-[#003087] dark:text-[#FFCC00]">
                  {formatCurrency(totalFolio)} MXN
                </span>
              </div>

              {/* Anticipo & Saldo */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isEditing ? 'Pagos Realizados / Anticipo Registrado' : 'Anticipo / Pago Inicial'}
                  </label>
                  <span className="text-xs font-medium text-slate-500">
                    Saldo Restante:{' '}
                    <strong className={balance > 0 ? 'text-[#CE1126]' : 'text-[#059669]'}>
                      {formatCurrency(balance)}
                    </strong>
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyAdvancePreset('100%')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      advancePayment === totalFolio && totalFolio > 0
                        ? 'bg-[#059669] text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    100% (Liquidado)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAdvancePreset('50%')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      advancePayment === Math.round(totalFolio / 2) && totalFolio > 0
                        ? 'bg-[#003087] text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAdvancePreset('500')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      advancePayment === 500
                        ? 'bg-[#003087] text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    $500
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAdvancePreset('200')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      advancePayment === 200
                        ? 'bg-[#003087] text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    $200
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAdvancePreset('0')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      advancePayment === 0
                        ? 'bg-slate-600 text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    $0 (Sin anticipo)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Monto Anticipo / Cobrado (MXN):</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9,]*"
                      autoComplete="off"
                      value={fmtMoney(advancePayment)}
                      readOnly={firma.bloqueada}
                      onClick={() => {
                        if (firma.bloqueada) checkFirmaBloqueada();
                      }}
                      onChange={(e) => {
                        if (checkFirmaBloqueada()) return;
                        setAdvancePayment(parseMoney(e.target.value));
                      }}
                      className="w-full mt-1 px-3.5 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-bold text-[#059669]"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Método de Pago:</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full mt-1 px-3.5 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
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
                    {(() => {
                      if (paymentMethod !== 'USD' && paymentMethod !== 'EUR' && paymentMethod !== 'GBP' && paymentMethod !== 'CAD') return null;
                      
                      let tc = 16.00;
                      try {
                        const stored = localStorage.getItem('tcMulti');
                        if (stored) {
                          const parsed = JSON.parse(stored);
                          tc = Number(parsed[paymentMethod] || tc);
                        } else {
                          if (paymentMethod === 'USD') tc = config.usdExchangeRate || 16.00;
                          else if (paymentMethod === 'EUR') tc = 17.80;
                          else if (paymentMethod === 'CAD') tc = 12.50;
                          else if (paymentMethod === 'GBP') tc = 20.10;
                        }
                      } catch (_) {
                        tc = config.usdExchangeRate || 16.00;
                      }

                      return (
                        <span className="text-[10px] text-slate-500 mt-1 block font-bold text-[#003087] dark:text-[#FFCC00]">
                          TC Base: ${tc} MXN &bull; Total aprox: ${(totalFolio / tc).toFixed(2)} {paymentMethod}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. FIRMA DE CONFORMIDAD */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-[#003087] dark:text-[#0284c7] block mb-3">
              5. Firma de Conformidad del Pasajero
            </span>
            <SignaturePad
              onSignatureChange={handleSignatureChange}
              initialSignature={clientSignature}
              initialFirma={firma}
              onBlockedAttempt={() => checkFirmaBloqueada()}
            />
          </div>

          {/* 6. VENDEDOR Y NOTAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Vendedor / Responsable
              </label>
              <input
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Observaciones / Notas Especiales
              </label>
              <input
                type="text"
                placeholder="Ej. Turistas vegetarianos, recolección hotel..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Historial de Ediciones previo si existe */}
          {saleToEdit?.historialEdiciones && saleToEdit.historialEdiciones.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] space-y-1 text-amber-800 dark:text-amber-300">
              <span className="font-bold block">Historial de Modificaciones Previas ({saleToEdit.historialEdiciones.length}):</span>
              {saleToEdit.historialEdiciones.map((h, i) => (
                <div key={i} className="text-[10px] text-amber-700 dark:text-amber-400">
                  &bull; {h.fecha.split('T')[0]}: {h.cambio} ({h.usuario || 'Admin'})
                </div>
              ))}
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#003087] hover:bg-[#002266] rounded-xl shadow-lg shadow-blue-900/20 transition active:scale-[0.98]"
            >
              <Check className="w-4 h-4 text-[#FFCC00]" />
              {isEditing ? 'Guardar Cambios del Folio' : 'Emitir Venta & Recibo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
