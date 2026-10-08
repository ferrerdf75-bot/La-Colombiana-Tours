import React, { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export interface AbonoPaymentItem {
  id: string;
  amount: number;
  date?: string;
  time?: string;
  method?: string;
  note?: string;
  createdAt?: string;
}

interface AbonoItemProps {
  payment: AbonoPaymentItem;
  confirmId?: string | null;
  onSetConfirmId?: (id: string | null) => void;
  onDeleteAbono: (id: string) => void;
  isAnticipo?: boolean;
}

export const AbonoItem: React.FC<AbonoItemProps> = ({
  payment,
  confirmId: externalConfirmId,
  onSetConfirmId,
  onDeleteAbono,
  isAnticipo = false,
}) => {
  // Support both internal state and parent-managed confirmId
  const [internalConfirmId, setInternalConfirmId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const timerRef = useRef<any>(null);

  const activeConfirmId = externalConfirmId !== undefined ? externalConfirmId : internalConfirmId;
  const isConfirming = activeConfirmId === payment.id;

  const updateConfirmId = (val: string | null) => {
    if (onSetConfirmId) {
      onSetConfirmId(val);
    } else {
      setInternalConfirmId(val);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClickBote = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Si aún no está en confirmación: PRIMER CLICK
    if (!isConfirming) {
      updateConfirmId(payment.id);
      if (timerRef.current) clearTimeout(timerRef.current);
      // Volver a gris en 3 segundos si no confirma
      timerRef.current = setTimeout(() => {
        updateConfirmId(null);
      }, 3000);
      return;
    }

    // SEGUNDO CLICK en menos de 3 seg: mostrar modal
    if (timerRef.current) clearTimeout(timerRef.current);
    updateConfirmId(null);
    setShowModal(true);
  };

  const handleConfirmDelete = () => {
    setShowModal(false);
    onDeleteAbono(payment.id);
  };

  const formattedAmount = formatCurrency(payment.amount);
  const displayDate = payment.date || '2026-10-10';
  const displayMethod = payment.method || 'Efectivo';
  const displayTime = payment.time ? ` ${payment.time}` : '';

  return (
    <>
      <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition group">
        <div>
          <p className="font-bold text-emerald-600 dark:text-emerald-400">
            +{formattedAmount}
          </p>
          <p className="text-[11px] text-slate-500">
            {displayDate}{displayTime} • {displayMethod}
            {isAnticipo ? ' (Anticipo original)' : payment.note ? ` • ${payment.note}` : ''}
          </p>
        </div>

        {/* Ícono 🗑️ a la derecha con doble confirmación */}
        {isConfirming ? (
          <button
            type="button"
            onClick={handleClickBote}
            className="px-2.5 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-950/70 text-red-600 dark:text-red-400 rounded-full flex items-center gap-1.5 transition active:scale-95 cursor-pointer ml-2 border border-red-300 dark:border-red-800 animate-pulse shrink-0 shadow-sm"
            title="¿Borrar? Toca de nuevo"
          >
            <span className="p-0.5 text-xs">🗑️</span>
            <span className="text-[10px] font-bold whitespace-nowrap">¿Borrar? Toca de nuevo</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleClickBote}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 flex items-center justify-center transition active:scale-95 cursor-pointer ml-2 shrink-0"
            title="Borrar este abono"
          >
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 hover:text-red-600" />
          </button>
        )}
      </div>

      {/* Modal Confirmación de Borrado */}
      {showModal && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-red-600">
              <span className="text-xl">⚠️</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ¿Borrar abono?
              </h3>
            </div>

            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              ¿Borrar abono +{formattedAmount} del {displayDate}{displayTime} {displayMethod}?
              {isAnticipo
                ? ' - Anticipo inicial migrado'
                : payment.note
                ? ` - ${payment.note}`
                : ''}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Esta acción recalcula saldo y no se puede deshacer.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#dc2626] hover:bg-red-700 rounded-xl shadow transition active:scale-95 cursor-pointer"
              >
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AbonoItem;
