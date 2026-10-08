import React, { useState, useEffect } from 'react';
import { Sale, BusinessConfig, TourItem, PagoDiario } from './types';
import { DEFAULT_BUSINESS_CONFIG, BASE_TOURS, migrateCategory } from './data/defaultTours';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ListaOPView } from './components/ListaOPView';
import { WeatherView } from './components/WeatherView';
import { RemindersView } from './components/RemindersView';
import { CajaView } from './components/CajaView';
import { SalesLogView } from './components/SalesLogView';
import { DivisasView } from './components/DivisasView';
import { SettingsView } from './components/SettingsView';
import { GraficaView } from './components/GraficaView';
import { NewSaleModal } from './components/NewSaleModal';
import { ReceiptModal } from './components/ReceiptModal';
import { getTomorrowDate, ensureSaleServices } from './utils/formatters';
import { EnergyProvider, useEnergy } from './context/EnergyModeContext';

function HeaderActions({ toggleDarkMode, isDark }: { toggleDarkMode: () => void; isDark: boolean }) {
  const { isPowerSaver, togglePowerSaver } = useEnergy();
  return (
    <div className="flex items-center gap-1">
      <button 
        onClick={togglePowerSaver} 
        className={`w-9 h-9 rounded-full flex items-center justify-center transition ${isPowerSaver ? 'bg-amber-400' : 'bg-slate-100 dark:bg-slate-800'}`}
        title={isPowerSaver ? 'Ahorro ON' : 'Ahorro OFF'}
      >
        {isPowerSaver ? '🪫' : '🔋'}
      </button>
    </div>
  );
}

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
  
  return (
    <EnergyProvider>
      <AppContent darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
    </EnergyProvider>
  );
}

function AppContent({ darkMode, toggleDarkMode }: { darkMode: boolean; toggleDarkMode: () => void }) {
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

  const [promptNombre, setPromptNombre] = useState<string>('');
  const [promptFecha, setPromptFecha] = useState<string>('');
  const [promptEmail, setPromptEmail] = useState<string>('');
  const [promptTelefono, setPromptTelefono] = useState<string>('');
  const [promptEmpresa, setPromptEmpresa] = useState<string>('');

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

  useEffect(() => {
    try {
      const viejo = localStorage.getItem('clima_cache');
      if (viejo && viejo.includes('latitude')) {
        localStorage.removeItem('clima_cache');
        console.log('Cache malo con latitude borrado automaticamente');
      }
    } catch(e){}
  }, []);

  useEffect(() => {
    // Forzar actualización si cache tiene más de 3 horas o si tiene menos de 24 horas
    try {
      const cache = JSON.parse(localStorage.getItem('clima_cache')||'{}');
      const ahora = Date.now();
      if (Object.keys(cache).length > 0 && (!cache.timestamp || ahora - cache.timestamp > 3*60*60*1000)){
        localStorage.removeItem('clima_cache'); // lo obliga a ir a Clima
      }
    } catch {}

    const c = localStorage.getItem('clima_cache');
    if (!c) {
      // Si nunca ha entrado a Clima, dispara el fetch una vez con 3 días y zona horaria de Cancún
      fetch('https://api.open-meteo.com/v1/forecast?latitude=21.52&longitude=-87.38&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=America/Cancun&forecast_days=3')
        .then(res => res.json())
        .then(data => {
          if (!data || !data.daily || !data.hourly) throw new Error('Invalid weather data');
          const rawTimes = Array.isArray(data.hourly.time) ? [...data.hourly.time].sort((a: string, b: string) => a.localeCompare(b)) : [];
          const hourlyList = rawTimes.map((t: string) => {
            const idx = data.hourly.time.indexOf(t);
            const timePart = t.includes('T') ? t.split('T')[1] : t;
            const hour = parseInt(timePart.split(':')[0], 10);
            return {
              time: t,
              timeStr: timePart,
              hour: isNaN(hour) ? 0 : hour,
              temp: data.hourly.temperature_2m?.[idx] ?? 28,
              windKmh: data.hourly.wind_speed_10m?.[idx] ?? 10,
              rain: data.hourly.precipitation_probability?.[idx] ?? 0,
              rainMm: data.hourly.precipitation?.[idx] ?? 0,
              weather_code: data.hourly.weather_code?.[idx] ?? 0,
            };
          });

          const datosParaChat = {
            resumen: `${data.daily.temperature_2m_max?.[0] || 'N/A'}°C / ${data.daily.temperature_2m_min?.[0] || 'N/A'}°C`,
            viento: `${data.hourly.wind_speed_10m?.[0] || 'N/A'}km/h`,
            lluvia: `${data.daily.precipitation_probability_max?.[0] || 'N/A'}%`,
            manana: {
              resumen: `${data.daily.temperature_2m_max?.[1] || 'N/A'}°C / ${data.daily.temperature_2m_min?.[1] || 'N/A'}°C`,
              viento: `${data.daily.wind_speed_10m_max?.[1] || 'N/A'}km/h`,
              lluvia: `${data.daily.precipitation_probability_max?.[1] || 'N/A'}%`
            },
            timestamp: Date.now(),
            hourly: hourlyList,
            daily: data.daily
          };
          localStorage.setItem('clima_cache', JSON.stringify(datosParaChat));
          (window as any).climaDataGlobal = datosParaChat;
        })
        .catch(() => {
          const fallback = {
            resumen: '31°C / 25°C',
            viento: '12km/h',
            lluvia: '10%',
            manana: { resumen: '30°C / 24°C', viento: '15km/h', lluvia: '20%' },
            timestamp: Date.now(),
            hourly: [],
            daily: {}
          };
          localStorage.setItem('clima_cache', JSON.stringify(fallback));
          (window as any).climaDataGlobal = fallback;
        });
    } else {
      try {
        (window as any).climaDataGlobal = JSON.parse(c);
      } catch {
        const fallback = {
          resumen: '31°C / 25°C',
          viento: '12km/h',
          lluvia: '10%',
          manana: { resumen: '30°C / 24°C', viento: '15km/h', lluvia: '20%' },
          timestamp: Date.now(),
          hourly: [],
          daily: {}
        };
        (window as any).climaDataGlobal = fallback;
      }
    }
  }, []);

  // 3. Tour Catalog (localStorage)
  const [tours, setTours] = useState<TourItem[]>(() => {
    try {
      const saved = localStorage.getItem('ht_tours');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 10) {
          return parsed.map((t: any) => ({
            ...t,
            category: migrateCategory(t.category),
            name: t.titulo || t.name
          }));
        }
      }
      return BASE_TOURS;
    } catch {
      return BASE_TOURS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ht_tours', JSON.stringify(tours));
      localStorage.setItem('holbox_tours', JSON.stringify(tours));
      localStorage.setItem('tours_catalog', JSON.stringify(tours));
    } catch {}
  }, [tours]);

  // 4. Sales State: REGLA 0KM - default empty array [], migrated automatically
  const [sales, setSales] = useState<Sale[]>(() => {
    try {
      const saved = localStorage.getItem('ventas');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(ensureSaleServices);
        }
      }
      return [ensureSaleServices({ id:'demo-1', folio:'LC-2026-0001', clientName:'Jose Garcia', phone:'9980000000', tourName:'3 Islas', tourDate:'2026-09-24', tourTime:'09:00', passengerCount:15, total:21000, advancePayment:0, balance:21000, status:'Con Saldo', createdAt: new Date().toISOString(), origin:'Holbox', pickup:'Hotel', paymentMethod:'Efectivo' } as unknown as Sale)];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ventas', JSON.stringify(sales));
    } catch {}
  }, [sales]);

  // Pagos diarios con fechaCobro real
  const [pagosDiarios, setPagosDiarios] = useState<PagoDiario[]>(() => {
    try {
      const saved = localStorage.getItem('pagosDiarios');
      return saved ? JSON.parse(saved) : [
        { id: '1', folio: 'TEST-1045', cliente: 'Cliente Migrado', monto: 1500, metodoPago: 'Efectivo', tipo: 'anticipo', fechaCobro: new Date().toISOString(), hora: '09:00' },
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pagosDiarios', JSON.stringify(pagosDiarios));
    } catch {}
  }, [pagosDiarios]);

  const registrarPago = (
    venta: any,
    monto: number,
    metodo: string,
    tipo: any = 'abono',
    fechaManualISO?: string,
    nota?: string
  ) => {
    const esDevolucion = tipo === 'devolucion' || Number(monto) < 0;
    const montoFinal = esDevolucion ? -Math.abs(Number(monto)) : Math.abs(Number(monto));
    const fechaCobroFinal = fechaManualISO && fechaManualISO.length > 5 ? fechaManualISO : new Date().toISOString();

    const nuevoPago: PagoDiario = {
      id: Date.now().toString(),
      folio: venta.folio || venta.id || '',
      cliente: venta.cliente || venta.clientName || '',
      monto: montoFinal,
      metodoPago: metodo,
      tipo: esDevolucion ? 'devolucion' : tipo,
      fechaCobro: fechaCobroFinal,
      hora: new Date(fechaCobroFinal).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    };

    setPagosDiarios((prev) => [nuevoPago, ...prev]);

    if (!esDevolucion && tipo === 'liquidacion') {
      setSales((prev) =>
        prev.map((v) =>
          v.folio === venta.folio || v.id === venta.id
            ? { ...v, status: 'Liquidado', balance: 0, advancePayment: v.total }
            : v
        )
      );
    }

    return nuevoPago;
  };

  // 5. Navigation & Modal States
  const [activeView, setActiveView] = useState<string>('dashboard');
  const currentTab = activeView as NavTab;
  const setCurrentTab = (tab: any) => setActiveView(tab);
  const [isNewSaleOpen, setIsNewSaleOpen] = useState<boolean>(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [viewingReceiptSale, setViewingReceiptSale] = useState<Sale | null>(null);
  const [receiptFormat, setReceiptFormat] = useState<'ticket' | 'media'>('media');

  // Count pending reminders for tomorrow
  const tomorrow = getTomorrowDate();
  const pendingRemindersCount = sales.filter(
    (s) => s.tourDate === tomorrow && s.status !== 'Cancelado'
  ).length;

  const handleOpenNewSale = () => {
    try {
      localStorage.removeItem('draftFolio');
    } catch (_) {}
    setEditingSale(null);
    setIsNewSaleOpen(true);
  };

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
    <div className="flex flex-col min-h-screen w-full">
      {/* Birthday Prompt Modal if missing */}
      {showBirthdayPrompt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
          <div className="bg-white dark:bg-slate-900 h-[100dvh] md:h-auto md:rounded-[28px] max-w-md w-full p-6 shadow-2xl border border-blue-100 dark:border-slate-800 animate-fade-in text-center space-y-3.5 overflow-y-auto pb-[350px]">
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
                  autoComplete="off"
                  value={promptNombre}
                  onChange={(e) => setPromptNombre(e.target.value)}
                  onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  placeholder="Tu nombre completo"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Fecha de nacimiento *
                </label>
                <input
                  type="date"
                  required
                  autoComplete="off"
                  value={promptFecha}
                  onChange={(e) => setPromptFecha(e.target.value)}
                  onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
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
                  autoComplete="off"
                  value={promptEmail}
                  onChange={(e) => setPromptEmail(e.target.value)}
                  onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  placeholder="correo@gmail.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  required
                  autoComplete="off"
                  value={promptTelefono}
                  onChange={(e) => setPromptTelefono(e.target.value)}
                  onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  placeholder="Ej. +52 998 000 0000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nombre de la empresa
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={promptEmpresa}
                  onChange={(e) => setPromptEmpresa(e.target.value)}
                  onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  placeholder="Ej. Tours Cancún"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 mt-2 text-xs font-bold text-white bg-[#003087] hover:bg-[#002266] rounded-xl shadow-md transition"
              >
                Guardar y Empezar ✨
              </button>
              <div className="h-40"></div>
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
        onOpenNewSale={handleOpenNewSale}
        config={config}
        pendingRemindersCount={pendingRemindersCount}
        extraActions={<HeaderActions toggleDarkMode={toggleDarkMode} isDark={darkMode} />}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden pb-32 bg-slate-50 dark:bg-slate-950">
        {currentTab === 'inicio' && (
          <DashboardView 
            sales={sales} 
            config={config} 
            onOpenNewSale={handleOpenNewSale}
            onViewReceipt={(sale) => setViewingReceiptSale(sale)}
            onGoToTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'dashboard' && (
          <ListaOPView sales={sales} config={config} tours={tours} onViewReceipt={(sale) => setViewingReceiptSale(sale)} />
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

        { (currentTab === 'cierre' || currentTab === 'caja' || (currentTab as string) === 'Caja') && (
          <CajaView
            sales={sales}
            ventas={sales}
            config={config}
            pagosDiarios={pagosDiarios}
            setPagosDiarios={setPagosDiarios}
          />
        )}

        { (activeView === 'sales-log' || activeView === 'reportes' || currentTab === 'bitacora' || currentTab === 'sales-log' || currentTab === 'reportes') && (
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
            onRegisterPayment={registrarPago}
          />
        )}

        {currentTab === 'divisas' && (
          <DivisasView onOpenNewSale={() => setIsNewSaleOpen(true)} />
        )}

        {currentTab === 'grafica' && (
          <GraficaView sales={sales} config={config} tours={tours} />
        )}

        {currentTab === 'ajuste' && (
          <SettingsView
            config={config}
            onSaveConfig={setConfig}
            tours={tours}
            onSaveTours={setTours}
            sales={sales}
            onSaveSales={setSales}
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
          onUpdateSale={handleUpdateSale}
          onDeleteSale={handleDeleteSale}
        />
      )}
    </div>
  );
}
