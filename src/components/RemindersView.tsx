import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  Check,
  Phone,
  Search,
  BellRing,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { Sale, BusinessConfig } from '../types';
import { formatDateSpanish, formatCurrency, getTomorrowDate, getTodayDate, cleanPhoneForWhatsApp } from '../utils/formatters';

interface RemindersViewProps {
  sales: Sale[];
  config: BusinessConfig;
  onViewReceipt: (sale: Sale) => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  sales,
  config,
  onViewReceipt,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTomorrowDate());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sentMap, setSentMap] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('ht_reminders_sent') || '{}');
    } catch {
      return {};
    }
  });

  const activeSales = sales.filter((s) => s.status !== 'Cancelado');
  const targetSales = activeSales.filter((s) => s.tourDate === selectedDate);

  const getReminderMessage = (sale: Sale): string => {
    return (
      `🌴 *RECORDATORIO DE TOUR - HOLBOX TOURS LA COLOMBIANA* 🇨🇴\n` +
      `¡Hola ${sale.clientName}! Te recordamos que mañana tienes una gran aventura programada:\n\n` +
      `🚤 *Tour:* ${sale.tourName}\n` +
      `📅 *Fecha:* ${formatDateSpanish(sale.tourDate)}\n` +
      `⏰ *Hora de Salida:* ${sale.tourTime}\n` +
      `📍 *Punto de Encuentro:* ${sale.meetingPoint}\n` +
      `👥 *Pasajeros:* ${sale.passengerCount} persona(s)\n` +
      (sale.balance > 0
        ? `⚠️ *Saldo pendiente por liquidar en el abordaje:* ${formatCurrency(sale.balance)} MXN\n`
        : `✅ *Pago:* TOTALMENTE LIQUIDADO\n`) +
      `\n📌 *Recomendaciones importantes:*\n` +
      `• Presentarse con 15 minutos de anticipación.\n` +
      `• Llevar bloqueador solar biodegradable y toalla.\n` +
      `• Llevar dinero en efectivo para impuestos portuarios o compras menores en la isla.\n\n` +
      `📍 *Nuestra Oficina:* ${config.address}\n` +
      `📞 *Contacto directo:* ${config.phone} (Julieth Torres)\n` +
      `¡Nos vemos mañana en el paraíso!`
    );
  };

  const handleSendWhatsApp = (sale: Sale) => {
    const text = encodeURIComponent(getReminderMessage(sale));
    const phone = cleanPhoneForWhatsApp(sale.clientPhone);
    const updated = { ...sentMap, [sale.id]: true };
    setSentMap(updated);
    try {
      localStorage.setItem('ht_reminders_sent', JSON.stringify(updated));
    } catch {}

    if (phone) {
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  const handleCopyMessage = (sale: Sale) => {
    navigator.clipboard.writeText(getReminderMessage(sale));
    setCopiedId(sale.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Date Selector */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-[#003087] dark:text-[#FFCC00]" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recordatorios de Tours Programados
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Envía avisos de logística, hora de cita y punto de encuentro con 1 clic por WhatsApp a los turistas.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Fecha de salida:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#003087]"
          />
          <button
            type="button"
            onClick={() => setSelectedDate(getTomorrowDate())}
            className="px-2.5 py-1.5 text-xs font-semibold text-[#003087] dark:text-[#0284c7] hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg"
          >
            Mañana
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(getTodayDate())}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* List of Reminders */}
      {targetSales.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            No hay salidas programadas para el {formatDateSpanish(selectedDate)}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Cambia la fecha o registra una nueva venta para generar recordatorios automáticos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {targetSales.map((sale) => {
            const isSent = sentMap[sale.id];
            return (
              <div
                key={sale.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 transition hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Card Top */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#003087] dark:text-[#FFCC00]">
                        {sale.folio}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        &bull; {sale.tourCategory}
                      </span>
                    </div>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                      {sale.tourName}
                    </h4>
                  </div>

                  {isSent ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <Check className="w-3 h-3" /> Enviado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      Pendiente
                    </span>
                  )}
                </div>

                {/* Logistic Badges */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-[#003087] dark:text-[#0284c7]" />
                    <span><strong>Hora:</strong> {sale.tourTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Users className="w-3.5 h-3.5 text-[#003087] dark:text-[#0284c7]" />
                    <span><strong>Turistas:</strong> {sale.passengerCount} pax</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-[#CE1126] shrink-0" />
                    <span className="truncate"><strong>Punto:</strong> {sale.meetingPoint}</span>
                  </div>
                </div>

                {/* Client Info & Balance */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      👤 {sale.clientName}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      📞 {sale.clientPhone || 'Sin teléfono'} {sale.clientHotel ? `• ${sale.clientHotel}` : ''}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-slate-500">Saldo pendiente:</div>
                    <div className={`font-extrabold ${sale.balance > 0 ? 'text-[#CE1126]' : 'text-[#059669]'}`}>
                      {sale.balance > 0 ? formatCurrency(sale.balance) : 'LIQUIDADO'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onViewReceipt(sale)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                  >
                    Ver Recibo
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(sale)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition inline-flex items-center gap-1"
                      title="Copiar texto del recordatorio"
                    >
                      {copiedId === sale.id ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <FileText className="w-3.5 h-3.5" />}
                      <span>{copiedId === sale.id ? 'Copiado' : 'Copiar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(sale)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-xl shadow transition"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Enviar WhatsApp
                    </button>
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
