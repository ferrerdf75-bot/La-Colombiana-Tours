# RESPALDO COMPLETO DEL PROYECTO

Fecha de respaldo: 2026-09-22

---

## 1. Contenido de src/App.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { Sale, BusinessConfig, TourItem } from './types';
import { DEFAULT_BUSINESS_CONFIG, BASE_TOURS } from './data/defaultTours';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { WeatherView } from './components/WeatherView';
import { RemindersView } from './components/RemindersView';
import { CashClosingView } from './components/CashClosingView';
import { SalesLogView } from './components/SalesLogView';
import { DivisasView } from './components/DivisasView';
import { SettingsView } from './components/SettingsView';
import { NewSaleModal } from './components/NewSaleModal';
import { ReceiptModal } from './components/ReceiptModal';
import { getTomorrowDate, ensureSaleServices } from './utils/formatters';

export default function App() {
  // 1. Theme State (Dark / Light)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('holbox_darkMode');
      if (saved !== null) return saved === 'true';
      const oldTheme = localStorage.getItem('ht_theme');
      if (oldTheme) return oldTheme === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('holbox_darkMode', darkMode ? 'true' : 'false');
      localStorage.setItem('ht_theme', darkMode ? 'dark' : 'light');
    } catch {}
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // 2. Business Configuration (localStorage)
  const [config, setConfig] = useState<BusinessConfig>(() => {
    try {
      const saved = localStorage.getItem('ht_config');
      return saved ? JSON.parse(saved) : DEFAULT_BUSINESS_CONFIG;
    } catch {
      return DEFAULT_BUSINESS_CONFIG;
    }
  });

  const [showBirthdayPrompt, setShowBirthdayPrompt] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ht_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return !parsed.fechaNacimiento || !parsed.owner || !parsed.email || !parsed.phone;
      }
      return true;
    } catch {
      return true;
    }
  });

  const [promptNombre, setPromptNombre] = useState<string>(config.nombrePropietaria || config.owner || '');
  const [promptFecha, setPromptFecha] = useState<string>(config.fechaNacimiento || '');
  const [promptEmail, setPromptEmail] = useState<string>(config.email || config.correo || '');
  const [promptTelefono, setPromptTelefono] = useState<string>(config.phone || '');
  const [promptEmpresa, setPromptEmpresa] = useState<string>(config.name || '');

  const handleSavePromptBirthday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptFecha || !promptNombre || !promptEmail || !promptTelefono) return;
    const updated = {
      ...config,
      nombrePropietaria: promptNombre,
      owner: promptNombre,
      fechaNacimiento: promptFecha,
      email: promptEmail,
      correo: promptEmail,
      phone: promptTelefono,
      name: promptEmpresa || config.name || 'Holbox Tours',
    };
    setConfig(updated);
    try {
      localStorage.setItem('ht_config', JSON.stringify(updated));
      localStorage.setItem('holbox_config', JSON.stringify(updated));
    } catch {}
    setShowBirthdayPrompt(false);
  };

  useEffect(() => {
    try {
      localStorage.setItem('ht_config', JSON.stringify(config));
    } catch {}
  }, [config]);

  // 3. Tour Catalog (localStorage)
  const [tours, setTours] = useState<TourItem[]>(() => {
    try {
      const saved = localStorage.getItem('ht_tours');
      return saved ? JSON.parse(saved) : BASE_TOURS;
    } catch {
      return BASE_TOURS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ht_tours', JSON.stringify(tours));
    } catch {}
  }, [tours]);

  // 4. Sales State: REGLA 0KM - default empty array [], migrated automatically
  const [sales, setSales] = useState<Sale[]>(() => {
    try {
      const saved = localStorage.getItem('ventas');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(ensureSaleServices);
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ventas', JSON.stringify(sales));
    } catch {}
  }, [sales]);

  // 5. Navigation & Modal States
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isNewSaleOpen, setIsNewSaleOpen] = useState<boolean>(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [viewingReceiptSale, setViewingReceiptSale] = useState<Sale | null>(null);
  const [receiptFormat, setReceiptFormat] = useState<'ticket' | 'media'>('media');

  // Count pending reminders for tomorrow
  const tomorrow = getTomorrowDate();
  const pendingRemindersCount = sales.filter(
    (s) => s.tourDate === tomorrow && s.status !== 'Cancelado'
  ).length;

  // Handlers for Sales
  const handleSaveSale = (newSale: Sale, updatedConfig: BusinessConfig) => {
    setSales((prev) => [newSale, ...prev]);
    setConfig(updatedConfig);
    setIsNewSaleOpen(false);
    // Immediately open the newly generated ticket / voucher for print/download
    setViewingReceiptSale(newSale);
  };

  const handleUpdateSale = (updatedSale: Sale) => {
    setSales((prev) => prev.map((s) => (s.id === updatedSale.id ? updatedSale : s)));
    if (viewingReceiptSale && viewingReceiptSale.id === updatedSale.id) {
      setViewingReceiptSale(updatedSale);
    }
  };

  const handleDeleteSale = (saleId: string) => {
    setSales((prev) => prev.filter((s) => s.id !== saleId));
    if (viewingReceiptSale?.id === saleId) {
      setViewingReceiptSale(null);
    }
  };

  const handleLiquidateBalanceFromReceipt = (saleId: string) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    const updated: Sale = {
      ...sale,
      advancePayment: sale.total,
      balance: 0,
      status: 'Liquidado',
      balancePaidAt: new Date().toISOString(),
    };
    handleUpdateSale(updated);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white flex flex-col font-sans transition-colors">
      {/* Birthday Prompt Modal if missing */}
      {showBirthdayPrompt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] max-w-md w-full p-6 shadow-2xl border border-blue-100 dark:border-slate-800 animate-fade-in text-center space-y-3.5">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-inner">
              🎉
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              ¡Bienvenido! 🎉
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Ingresa tus datos de registro para empezar.
            </p>
            <form onSubmit={handleSavePromptBirthday} className="space-y-3 pt-1 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  value={promptNombre}
                  onChange={(e) => setPromptNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  placeholder=""
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Fecha de nacimiento *
                </label>
                <input
                  type="date"
                  required
                  value={promptFecha}
                  onChange={(e) => setPromptFecha(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Correo Gmail *
                </label>
                <input
                  type="email"
                  required
                  value={promptEmail}
                  onChange={(e) => setPromptEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  placeholder=""
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  required
                  value={promptTelefono}
                  onChange={(e) => setPromptTelefono(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  placeholder=""
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nombre de la empresa
                </label>
                <input
                  type="text"
                  value={promptEmpresa}
                  onChange={(e) => setPromptEmpresa(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  placeholder=""
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 mt-2 text-xs font-bold text-white bg-[#003087] hover:bg-[#002266] rounded-xl shadow-md transition"
              >
                Guardar y Empezar ✨
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Top Navbar with tricolor accent and fast controls */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isDark={darkMode}
        onToggleTheme={toggleDarkMode}
        onOpenNewSale={() => setIsNewSaleOpen(true)}
        config={config}
        pendingRemindersCount={pendingRemindersCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            sales={sales}
            config={config}
            onOpenNewSale={() => setIsNewSaleOpen(true)}
            onViewReceipt={(sale) => setViewingReceiptSale(sale)}
            onGoToTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'clima' && (
          <WeatherView />
        )}

        {currentTab === 'recordatorios' && (
          <RemindersView
            sales={sales}
            config={config}
            onViewReceipt={(sale) => setViewingReceiptSale(sale)}
          />
        )}

        {currentTab === 'cierre' && (
          <CashClosingView sales={sales} config={config} />
        )}

        {currentTab === 'bitacora' && (
          <SalesLogView
            sales={sales}
            config={config}
            onViewReceipt={(sale, format) => {
              setViewingReceiptSale(sale);
              setReceiptFormat(format || 'media');
            }}
            onEditSale={(sale) => {
              setEditingSale(sale);
            }}
            onUpdateSale={handleUpdateSale}
            onDeleteSale={handleDeleteSale}
          />
        )}

        {currentTab === 'divisas' && (
          <DivisasView onOpenNewSale={() => setIsNewSaleOpen(true)} />
        )}

        {currentTab === 'ajuste' && (
          <SettingsView
            config={config}
            onSaveConfig={setConfig}
            tours={tours}
            onSaveTours={setTours}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {config.name} &bull; Propietaria: {config.owner} &bull; Isla Holbox, Q. Roo
          </span>
          <span className="text-[11px] text-slate-400">
            PWA Offline-First &bull; Fix 384px (58mm) &bull; 816px (Media Carta) &bull; Firma 1:1
          </span>
        </div>
      </footer>

      {/* Modal Nueva Venta / Edición de Folio */}
      {(isNewSaleOpen || editingSale) && (
        <NewSaleModal
          tours={tours}
          config={config}
          saleToEdit={editingSale}
          onClose={() => {
            setIsNewSaleOpen(false);
            setEditingSale(null);
          }}
          onSaveSale={handleSaveSale}
          onUpdateSale={(updatedSale) => {
            handleUpdateSale(updatedSale);
            setEditingSale(null);
          }}
        />
      )}

      {/* Modal Recibo / Ticket */}
      {viewingReceiptSale && (
        <ReceiptModal
          sale={viewingReceiptSale}
          config={config}
          initialFormat={receiptFormat}
          onClose={() => setViewingReceiptSale(null)}
          onLiquidateBalance={handleLiquidateBalanceFromReceipt}
        />
      )}
    </div>
  );
}
```

## 2. Contenido de src/components/ReceiptModal.tsx

```tsx
import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, Share2, Copy, Check } from 'lucide-react';
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
import { PreviewTicketTermico } from './PreviewTicketTermico';
import { ReciboMediaCartaDesglosado } from './ReciboMediaCartaDesglosado';

interface ReceiptModalProps {
  sale: Sale;
  config: BusinessConfig;
  initialFormat?: 'ticket' | 'media' | 'mediaCarta';
  onClose: () => void;
  onLiquidateBalance?: (saleId: string) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  config,
  initialFormat = 'media',
  onClose,
  onLiquidateBalance,
}) => {
  const [formatoActivo, setFormatoActivo] = useState<'ticket' | 'mediaCarta'>(
    initialFormat === 'ticket' ? 'ticket' : 'mediaCarta'
  );
  const [isPNG, setIsPNG] = useState(false);
  const [isPDF, setIsPDF] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const isMediaCarta = formatoActivo === 'mediaCarta';

  const [isSharing, setIsSharing] = useState(false);

  const receiptRef = useRef<HTMLDivElement>(null);

  const crearImagen = async () => {
    const el = document.getElementById('media-carta-wrapper');
    if (!el) return null;

    const prevTransform = el.style.transform;
    el.style.transform = 'scale(1)';

    // Espera un poquito a que quite el zoom
    await new Promise(r => setTimeout(r, 200));

    try {
      // @ts-ignore
      const canvas = await html2canvas(el, {
        scale: 1, // EN CEL USA 1, con 2 se queda en Generando...
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      return canvas;
    } catch (err) {
      console.error("Fallo canvas:", err);
      return null;
    } finally {
      el.style.transform = prevTransform;
    }
  };


  useEffect(() => {
    if (formatoActivo === 'ticket') {
      const el = document.getElementById('ticket-wrapper');
      if (!el) return;
      let scale = 1;
      let startDist = 0;
      
      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          startDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
          scale = Math.min(Math.max(0.7, dist / startDist), 3);
          el.style.transform = `scale(${scale})`;
        }
      };

      el.addEventListener('touchstart', handleTouchStart, {passive: false});
      el.addEventListener('touchmove', handleTouchMove, {passive: false});

      return () => {
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchmove', handleTouchMove);
      };
    } else if (formatoActivo === 'mediaCarta') {
      const el = document.getElementById('media-carta-wrapper');
      const container = el?.parentElement;
      if (!el || !container) return;

      const fitScale = container.clientWidth / 816;
      el.style.transform = `scale(${fitScale})`;
      el.style.marginRight = `-${(1 - fitScale) * 816}px`;
      el.style.marginBottom = `-${(1 - fitScale) * el.offsetHeight}px`;

      let initialScale = fitScale;
      let currentScale = fitScale;
      let startDist = 0;

      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          startDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
          initialScale = currentScale;
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
          currentScale = Math.min(Math.max(fitScale * 0.8, initialScale * (dist / startDist)), 3);
          el.style.transform = `scale(${currentScale})`;
        }
      };

      el.addEventListener('touchstart', handleTouchStart, { passive: false });
      el.addEventListener('touchmove', handleTouchMove, { passive: false });

      return () => {
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, [formatoActivo]);

  // Formato dinero sin $ duplicado
  const formatoDineroTexto = (v: number) =>
    new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

  // TRUCO QUIRÚRGICO: Compartir Tour con imagen PNG y selector nativo sin forzar número fijo
  const handleCompartirTour = async () => {
    setIsSharing(true);
    try {
      // 1. Mensaje que se comparte
      const punto = sale.meetingPoint || 'Muelle Principal';
      const texto = `*La Colombiana - Recibo ${sale.folio}*\nCliente: ${sale.clientName}\nTotal: $${formatoDineroTexto(sale.total)} | Saldo: $${formatoDineroTexto(sale.balance)}\nPunto: ${punto}\n\nAquí tu recibo oficial:`;

      // 2. Genera el PNG que ya arreglamos (sin $$)
      const idPrint = formatoActivo === 'ticket' ? 'ticket-captura-print' : 'media-carta-captura-print';
      const blob = await generarReciboPNG(idPrint);
      const file = blob ? new File([blob], `${sale.folio}.png`, { type: 'image/png' }) : null;

      // 3. ESTE ES EL TRUCO: Compartir sin número fijo
      if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          text: texto,
          files: [file],
          title: sale.folio,
        });
        // Esto en tu Motorola abre el selector nativo y ahí sí puedes
        // elegir "Jazmin Telcel" o a varios, no te fuerza al 9984333344
      } else {
        // Fallback viejo, pero SIN número fijo (abre selector de chat en WhatsApp)
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        const punto = sale.meetingPoint || 'Muelle Principal';
        const texto = `*La Colombiana - Recibo ${sale.folio}*\nCliente: ${sale.clientName}\nTotal: $${formatoDineroTexto(sale.total)} | Saldo: $${formatoDineroTexto(sale.balance)}\nPunto: ${punto}\n\nAquí tu recibo oficial:`;
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const telefonoLimpio = cleanPhoneForWhatsApp(sale.clientPhone);
  const handleEnviarACliente = () => {
    if (!telefonoLimpio) return;
    const text = encodeURIComponent(getWhatsAppMessage());
    const telParam = telefonoLimpio.startsWith('52') ? telefonoLimpio : `52${telefonoLimpio}`;
    window.open(`https://wa.me/${telParam}?text=${text}`, '_blank');
  };

  const handleDownloadPNG = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (formatoActivo === 'ticket') {
      setIsPNG(true);
      try {
        await generarTicketTermico(sale.folio, 'png');
      } finally {
        setIsPNG(false);
      }
    } else {
      setIsPNG(true);
      try {
        const canvas = await crearImagen();
        if (canvas) {
          const url = canvas.toDataURL('image/png');
          const div = document.createElement('div');
          div.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000;color:white;padding:15px;overflow:auto';
          div.innerHTML = `<button onclick="this.parentElement.remove()" style="background:red;color:white;padding:10px;border-radius:6px;border:none;width:100%;font-weight:bold;cursor:pointer">X CERRAR - Deja presionada la imagen para guardar</button><img src="${url}" style="width:100%;margin-top:15px;background:white">`;
          document.body.appendChild(div);
        }
      } finally {
        setIsPNG(false);
      }
    }
  };

  const handleDownloadPDF = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (formatoActivo === 'ticket') {
      setIsPDF(true);
      try {
        await generarTicketTermico(sale.folio, 'pdf');
      } finally {
        setIsPDF(false);
      }
    } else {
      setIsPDF(true);
      try {
        const canvas = await crearImagen();
        if (canvas) {
          // @ts-ignore
          const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
          pdf.addImage(canvas.toDataURL(), 'PNG', 0, 0, canvas.width, canvas.height);
          pdf.save(`Recibo-${sale.folio || 'LC'}.pdf`);
        }
      } finally {
        setIsPDF(false);
      }
    }
  };

  const qrPayload = `${sale.folio}|${sale.clientName}|${sale.total}|${sale.status}`;

  const getWhatsAppMessage = (): string => {
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
            puntoEncuentro: sale.meetingPoint,
          },
        ];

    const serviciosText = srvs
      .map(
        (s, idx) =>
          `   ${idx + 1}. *${s.nombre}* (${s.cantidad}x) - ${formatCurrency(s.subtotal)}` +
          (s.fechaServicio ? ` [📅 ${formatDateSpanish(s.fechaServicio)}]` : '')
      )
      .join('\n');

    return (
      `🌴 *HOLBOX TOURS LA COLOMBIANA* 🇨🇴\n` +
      `¡Hola ${sale.clientName}! Gracias por tu reserva.\n\n` +
      `📋 *COMPROBANTE DE VENTA*\n` +
      `🔖 *Folio:* ${sale.folio}\n` +
      `🚤 *Servicios Contratados (${srvs.length}):*\n` +
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
      `📞 *Atención:* ${config.phone}\n` +
      `_Favor de presentarse 15 minutos antes de la hora programada._`
    );
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(getWhatsAppMessage());
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-3 overflow-y-auto">
      {/* Hidden printable layouts (384px and 816px) with absolute off-screen coordinates */}
      <HiddenPrintables sale={sale} config={config} />

      <div
        className={`bg-white dark:bg-slate-900 rounded-2xl w-full my-6 overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 transition-all ${
          isMediaCarta ? 'max-w-[440px] sm:max-w-[740px] md:max-w-[880px]' : 'max-w-[440px]'
        }`}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-black text-[15px] text-slate-900 dark:text-white">
                Emisión de Recibo • {sale.folio}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sale.balance > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                {sale.balance > 0 ? `Saldo: ${formatCurrency(sale.balance)}` : 'Liquidado'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 p-2 rounded-full transition"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
            <button
              onClick={() => setFormatoActivo('ticket')}
              className={`text-[12px] font-bold py-2.5 rounded-lg transition ${
                formatoActivo === 'ticket'
                  ? 'bg-white dark:bg-slate-700 shadow text-black dark:text-white'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Ticket Térmico<br />
              <span className="text-[10px]">58mm / 384px</span>
            </button>
            <button
              onClick={() => setFormatoActivo('mediaCarta')}
              className={`text-[12px] font-bold py-2.5 rounded-lg transition ${
                formatoActivo === 'mediaCarta'
                  ? 'bg-white dark:bg-slate-700 shadow text-[#003087] dark:text-[#FFCC00]'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Recibo Media Carta<br />
              <span className="text-[10px]">816px</span>
            </button>
          </div>

          <div className="mt-4" style={{touchAction:'pan-x pan-y'}}>
            {formatoActivo === 'ticket' ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadPNG();
                  }}
                  disabled={isPNG || isPDF}
                  className={`bg-black text-white text-[12px] font-bold py-3 rounded-full flex justify-center items-center gap-1.5 hover:bg-slate-800 transition ${isPNG ? 'opacity-50' : ''}`}
                  style={{touchAction:'manipulation'}}
                >
                  <Download size={14} /> {isPNG ? 'Generando...' : 'PNG Ticket'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadPDF();
                  }}
                  disabled={isPNG || isPDF}
                  className={`bg-black text-white text-[12px] font-bold py-3 rounded-full flex justify-center items-center gap-1.5 hover:bg-slate-800 transition ${isPDF ? 'opacity-50' : ''}`}
                  style={{touchAction:'manipulation'}}
                >
                  <Download size={14} /> {isPDF ? 'Generando...' : 'PDF Ticket'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadPNG(e);
                  }}
                  disabled={isPNG || isPDF}
                  className={`bg-[#059669] text-white text-[12px] font-bold py-3 rounded-full flex justify-center items-center gap-1.5 hover:bg-[#047857] transition ${isPNG ? 'opacity-50' : ''}`}
                  style={{touchAction:'manipulation'}}
                >
                  <Download size={14} /> {isPNG ? 'Generando...' : 'PNG Media Carta'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadPDF(e);
                  }}
                  disabled={isPNG || isPDF}
                  className={`bg-[#003087] text-white text-[12px] font-bold py-3 rounded-full flex justify-center items-center gap-1.5 hover:bg-[#002266] transition ${isPDF ? 'opacity-50' : ''}`}
                  style={{touchAction:'manipulation'}}
                >
                  <Download size={14} /> {isPDF ? 'Generando...' : 'PDF Media Carta'}
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-3">
            <button
              disabled={isSharing}
              onClick={handleCompartirTour}
              className="flex-1 min-w-[130px] bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
              title="Compartir Tour sin forzar número fijo"
            >
              <Share2 size={13} />
              {isSharing ? 'Preparando...' : 'Compartir Tour'}
            </button>

            {telefonoLimpio && (
              <button
                onClick={handleEnviarACliente}
                className="flex-1 min-w-[130px] bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm"
                title={`Enviar directo a ${telefonoLimpio}`}
              >
                <span>📱 Enviar a Cliente</span>
              </button>
            )}

            <button
              onClick={handleCopyText}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              {copiedMsg ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              {copiedMsg ? 'Copiado' : 'Copiar'}
            </button>
            {sale.balance > 0 && onLiquidateBalance && (
              <button
                onClick={() => onLiquidateBalance(sale.id)}
                className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold px-3 py-2.5 rounded-xl transition"
                title="Liquidar saldo"
              >
                Liquidar
              </button>
            )}
          </div>
        </div>

        {/* Contenedor padre */}
        <div className="w-full mt-4 bg-slate-100 dark:bg-slate-950 rounded-xl p-2">
          {/* Si es Ticket */}
          {formatoActivo === 'ticket' && (
            <div className="w-full bg-[#e5e7eb] p-2 flex justify-center overflow-auto"
                 style={{WebkitOverflowScrolling:'touch'}}>
              
              <div 
                id="ticket-wrapper"
                className="bg-white shadow-md mx-auto"
                style={{
                  width:'384px',
                  minWidth:'384px',
                  maxWidth:'none',
                  transformOrigin:'top center',
                  touchAction:'pan-x pan-y pinch-zoom'
                }}
              >
                <PreviewTicketTermico folio={sale} config={config} />
              </div>
            </div>
          )}

          {/* Si es Media Carta */}
          {formatoActivo === 'mediaCarta' && (
            <div className="w-full bg-[#e5e7eb] p-0 overflow-auto"
                 style={{WebkitOverflowScrolling:'touch', touchAction:'pan-x pan-y'}}>

              <div
                id="media-carta-wrapper"
                ref={receiptRef}
                className="bg-white shadow-lg"
                style={{
                  width:'816px',
                  minWidth:'816px',
                  maxWidth:'none',
                  transformOrigin:'top left',
                  touchAction:'pan-x pan-y pinch-zoom',
                  margin:'0 auto'
                }}
              >
                <ReciboMediaCartaDesglosado folio={sale} config={config} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

## 3. Contenido de package.json

```json
{
  "name": "react-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist server.js",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@google/genai": "^2.4.0",
    "@tailwindcss/vite": "^4.3.3",
    "@vitejs/plugin-react": "^6.1.1",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "html2canvas": "^1.4.1",
    "jspdf": "^4.2.1",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "qrcode.react": "^4.2.0",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "vite": "^8.3.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "tailwindcss": "^4.3.3",
    "tsx": "^4.21.0",
    "typescript": "^7.0.2",
    "@types/express": "^4.17.21"
  }
}
```
