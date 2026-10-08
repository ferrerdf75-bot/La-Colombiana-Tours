import React from 'react';
import {
  Compass,
  Sun,
  Moon,
  PlusCircle,
  Clock,
  CircleDollarSign,
  ClipboardList,
  Settings,
  Wifi,
  WifiOff,
  LayoutDashboard,
  Coins,
  SlidersHorizontal,
  Cloud,
  Home,
  CloudSun,
  DollarSign,
  BookOpen,
  BarChart3
} from 'lucide-react';
import { BusinessConfig } from '../types';

export type NavTab = 'inicio' | 'dashboard' | 'clima' | 'recordatorios' | 'cierre' | 'caja' | 'bitacora' | 'sales-log' | 'reportes' | 'grafica' | 'divisas' | 'ajuste';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenNewSale: () => void;
  config: BusinessConfig;
  pendingRemindersCount: number;
  extraActions?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  isDark,
  onToggleTheme,
  onOpenNewSale,
  config,
  pendingRemindersCount,
  extraActions,
}) => {
  const navItems = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'clima', label: 'Clima', icon: CloudSun },
    { id: 'dashboard', label: 'Lista OP', icon: ClipboardList },
    { id: 'caja', label: 'Caja', icon: DollarSign },
    { id: 'sales-log', label: 'Reportes', icon: BarChart3 },
    { id: 'grafica', label: 'Gráfica', icon: BarChart3 },
    { id: 'ajuste', label: 'Ajuste', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      {/* Colombian Tricolor Bar */}
      <div className="flex w-full h-1.5 sm:h-2">
        <div className="w-1/2 bg-[#FFCC00]" />
        <div className="w-1/4 bg-[#003087]" />
        <div className="w-1/4 bg-[#CE1126]" />
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between py-1.5 mb-0.5 px-3 flex-wrap gap-2">
          {/* Logo & Business Brand */}
          <div
            onClick={() => onSelectTab('inicio')}
            className="flex items-center gap-1.5 cursor-pointer group flex-1 min-w-0"
          >
            <div className="w-8 h-8 rounded-lg bg-[#003087] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition overflow-hidden shrink-0">
              {(() => {
                try {
                  const logo = localStorage.getItem('holbox_logo');
                  if (logo) {
                    return <img src={logo} alt="Logo" className="w-full h-full object-cover" />;
                  }
                } catch {}
                return <span className="text-lg">🌴</span>;
              })()}
            </div>
            <div className="truncate">
              <h1 className="text-[14px] font-extrabold tracking-tight text-[#003087] dark:text-[#FFCC00] leading-tight truncate">
                {config.name}
              </h1>
              <p className="text-[10px] leading-none text-slate-500 dark:text-slate-400 truncate">
                {config.owner}
              </p>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {extraActions}
            {/* Dark / Light Toggle */}
            <button
              type="button"
              id="btn-toggle-tema"
              onClick={onToggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-[#FFCC00]" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700" />
              )}
            </button>

            {/* Primary Action Button: Nueva Venta */}
            <button
              type="button"
              id="btn-abrir-nueva-venta"
              onClick={onOpenNewSale}
              className="w-9 h-9 flex items-center justify-center text-white bg-[#003087] hover:bg-[#002266] rounded-full shadow-md shadow-blue-900/20 active:scale-95 transition"
              title="Nueva Venta"
            >
              <PlusCircle className="w-5 h-5 text-[#FFCC00]" />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Bar */}
        <div className="flex overflow-x-auto whitespace-nowrap gap-1 scrollbar-hide py-1.5 px-2 border-b border-slate-100 dark:border-slate-800">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id as NavTab)}
              className={`py-1.5 px-3 text-[13px] rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                currentTab === item.id
                  ? 'bg-white dark:bg-slate-800 text-[#0a4a7a] dark:text-[#00a8e8] font-bold shadow-sm'
                  : 'text-[#0a4a7a] dark:text-slate-300 font-normal hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
