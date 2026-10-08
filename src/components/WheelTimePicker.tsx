import React, { useState, useRef, useEffect, memo } from 'react';
import { Clock, Check, X, Volume2, VolumeX } from 'lucide-react';

interface WheelTimePickerProps {
  value: string;
  onChange: (newTime: string) => void;
  label?: string;
  placeholder?: string;
}

export const WheelTimePicker: React.FC<WheelTimePickerProps> = ({
  value,
  onChange,
  label = 'Seleccionar Hora',
  placeholder = 'Seleccionar hora'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('holbox_wheel_sound');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('holbox_wheel_sound', JSON.stringify(next));
    } catch {}
  };

  const parseTime = (val: string) => {
    let h = 9;
    let m = 0;
    let ap = 'AM';

    if (val) {
      const upper = val.toUpperCase().trim();
      const isPm = upper.includes('PM');
      const isAm = upper.includes('AM');
      if (isPm) ap = 'PM';
      else if (isAm) ap = 'AM';

      const nums = val.replace(/[^0-9:]/g, '').split(':');
      if (nums.length >= 1 && nums[0]) {
        const parsedH = parseInt(nums[0], 10);
        if (!isNaN(parsedH)) {
          if (parsedH >= 1 && parsedH <= 12) h = parsedH;
          else if (parsedH === 0) h = 12;
          else if (parsedH > 12 && parsedH <= 23) {
            h = parsedH > 12 ? parsedH - 12 : parsedH;
            ap = 'PM';
          }
        }
      }
      if (nums.length >= 2 && nums[1]) {
        const parsedM = parseInt(nums[1], 10);
        if (!isNaN(parsedM)) {
          m = Math.round(parsedM / 5) * 5;
          if (m >= 60) m = 55;
        }
      }
    }
    return { hour: h, minute: m, ampm: ap };
  };

  const initial = parseTime(value);
  const [selectedHour, setSelectedHour] = useState<number>(initial.hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(initial.minute);
  const [selectedAmPm, setSelectedAmPm] = useState<string>(initial.ampm);

  useEffect(() => {
    const parsed = parseTime(value);
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
    setSelectedAmPm(parsed.ampm);
  }, [value]);

  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const ampms = ['AM', 'PM'];

  const ITEM_HEIGHT = 44; // 44px per row
  const CONTAINER_HEIGHT = 132; // 3 rows visible (3 * 44 = 132px)

  const handleOpen = () => {
    const parsed = parseTime(value);
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
    setSelectedAmPm(parsed.ampm);
    setIsOpen(true);
  };

  const handleConfirm = () => {
    const minStr = selectedMinute < 10 ? `0${selectedMinute}` : `${selectedMinute}`;
    const hrStr = selectedHour < 10 ? `0${selectedHour}` : `${selectedHour}`;
    const formatted = `${hrStr}:${minStr} ${selectedAmPm}`;
    onChange(formatted);
    setIsOpen(false);
  };

  return (
    <>
      <div
        onClick={handleOpen}
        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white flex items-center justify-between cursor-pointer hover:border-blue-500 transition shadow-sm"
      >
        <span className={value ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-400'}>
          {value || placeholder}
        </span>
        <Clock className="w-4 h-4 text-[#003087] dark:text-[#FFCC00] shrink-0" />
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          onTouchStart={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-[#003087] dark:text-[#FFCC00]">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{label}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSound}
                  title={soundEnabled ? 'Silenciar sonido de engrane' : 'Activar sonido de engrane'}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1 text-[11px] font-medium px-2.5"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600 dark:text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                  <span>{soundEnabled ? 'Sonido ON' : 'OFF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Wheel Container Structure: exactly 132px height (3 rows) */}
            <div className="p-6 flex items-center justify-center relative">
              <div className="relative h-[132px] w-full max-w-[280px] overflow-hidden bg-transparent box-border">
                {/* Center Highlight Bar (1 row high = 44px) */}
                <div className="absolute top-1/2 -translate-y-1/2 h-[44px] w-full bg-blue-50/90 dark:bg-blue-950/60 border-y border-blue-200 dark:border-blue-800 pointer-events-none z-10 rounded-xl shadow-inner"></div>

                {/* 4 Columns Grid: Hours, separator, Minutes, AM/PM */}
                <div className="grid grid-cols-4 h-full relative z-20">
                  <MemoizedInertialWheel
                    items={hours}
                    selectedValue={selectedHour}
                    onChange={setSelectedHour}
                    itemHeight={ITEM_HEIGHT}
                    containerHeight={CONTAINER_HEIGHT}
                    formatItem={(h) => (h < 10 ? `0${h}` : `${h}`)}
                    soundEnabled={soundEnabled}
                  />

                  <div className="h-full flex items-center justify-center text-xl font-black text-slate-400 pointer-events-none">
                    :
                  </div>

                  <MemoizedInertialWheel
                    items={minutes}
                    selectedValue={selectedMinute}
                    onChange={setSelectedMinute}
                    itemHeight={ITEM_HEIGHT}
                    containerHeight={CONTAINER_HEIGHT}
                    formatItem={(m) => (m < 10 ? `0${m}` : `${m}`)}
                    soundEnabled={soundEnabled}
                  />

                  <MemoizedInertialWheel
                    items={ampms}
                    selectedValue={selectedAmPm}
                    onChange={setSelectedAmPm}
                    itemHeight={ITEM_HEIGHT}
                    containerHeight={CONTAINER_HEIGHT}
                    formatItem={(ap) => ap}
                    soundEnabled={soundEnabled}
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
              <div className="text-xs font-medium text-slate-500">
                Seleccionado:{' '}
                <strong className="text-slate-900 dark:text-white font-extrabold">
                  {selectedHour < 10 ? `0${selectedHour}` : selectedHour}:
                  {selectedMinute < 10 ? `0${selectedMinute}` : selectedMinute} {selectedAmPm}
                </strong>
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#003087] hover:bg-[#002266] text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
              >
                <Check className="w-4 h-4 text-[#FFCC00]" />
                OK / Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface InertialWheelProps {
  items: (number | string)[];
  selectedValue: number | string;
  onChange: (val: any) => void;
  itemHeight: number;
  containerHeight: number;
  formatItem: (item: any) => string;
  soundEnabled: boolean;
}

const InertialWheel: React.FC<InertialWheelProps> = ({
  items,
  selectedValue,
  onChange,
  itemHeight,
  containerHeight,
  formatItem,
  soundEnabled
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const scrollTopStart = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  const lastTickIndex = useRef<number>(0);
  const lastTickTime = useRef<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    } catch {}
    return audioCtxRef.current;
  };

  const playTick = () => {
    if (!soundEnabled) return;
    try {
      const now = Date.now();
      if (now - lastTickTime.current < 40) return;
      lastTickTime.current = now;

      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.value = 1200;
      osc.type = 'sine';

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);

      if (navigator.vibrate) {
        navigator.vibrate(5);
      }
    } catch {}
  };

  // 3 copies buffer for seamless infinite loop
  const extendedItems = [...items, ...items, ...items];
  const totalItems = items.length;

  useEffect(() => {
    if (containerRef.current) {
      const idx = items.indexOf(selectedValue);
      const initialIndex = idx !== -1 ? idx + totalItems : totalItems;
      const targetScroll = initialIndex * itemHeight;
      containerRef.current.scrollTop = targetScroll;
      lastTickIndex.current = initialIndex;
    }
  }, [selectedValue]);

  const checkTick = (st: number) => {
    const currentIndex = Math.round(st / itemHeight);
    if (currentIndex !== lastTickIndex.current) {
      playTick();
      lastTickIndex.current = currentIndex;
    }
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    isDragging.current = true;
    getAudioContext();

    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    startY.current = clientY;
    lastY.current = clientY;
    lastTime.current = Date.now();
    if (containerRef.current) {
      scrollTopStart.current = containerRef.current.scrollTop;
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const now = Date.now();
    const dt = now - lastTime.current;
    const dy = clientY - lastY.current;

    if (dt > 0) {
      velocity.current = dy / dt;
    }

    lastY.current = clientY;
    lastTime.current = now;

    const newScroll = scrollTopStart.current - (clientY - startY.current);
    containerRef.current.scrollTop = newScroll;
    checkTick(newScroll);
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || !containerRef.current) return;
    isDragging.current = false;

    const totalDelta = startY.current - lastY.current;
    const absDelta = Math.abs(totalDelta);

    let targetIndex = Math.round(containerRef.current.scrollTop / itemHeight);

    if (absDelta < 80) {
      const step = totalDelta > 0 ? 1 : totalDelta < 0 ? -1 : 0;
      targetIndex = Math.round(scrollTopStart.current / itemHeight) + step;
    } else {
      const rawDeltaItems = Math.round(velocity.current * 8);
      const clampedDeltaItems = Math.min(Math.max(rawDeltaItems, -2), 2);
      targetIndex = Math.round(scrollTopStart.current / itemHeight) - clampedDeltaItems;
    }

    const targetScroll = targetIndex * itemHeight;

    containerRef.current.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });

    setTimeout(() => {
      if (containerRef.current) {
        normalizeScroll(targetIndex);
      }
    }, 200);
  };

  const normalizeScroll = (rawIndex: number) => {
    if (!containerRef.current) return;
    const modIndex = ((rawIndex % totalItems) + totalItems) % totalItems;
    const normalizedIndex = modIndex + totalItems;
    containerRef.current.scrollTop = normalizedIndex * itemHeight;
    lastTickIndex.current = normalizedIndex;
    onChange(items[modIndex]);
  };

  const handleScroll = () => {
    if (isDragging.current || !containerRef.current) return;
    const st = containerRef.current.scrollTop;
    const minScroll = totalItems * itemHeight;
    const maxScroll = totalItems * 2 * itemHeight;

    checkTick(st);

    if (st < minScroll || st >= maxScroll) {
      const rawIndex = Math.round(st / itemHeight);
      const modIndex = ((rawIndex % totalItems) + totalItems) % totalItems;
      const normalizedIndex = modIndex + totalItems;
      containerRef.current.scrollTop = normalizedIndex * itemHeight;
      lastTickIndex.current = normalizedIndex;
      onChange(items[modIndex]);
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="h-full overflow-y-scroll scrollbar-none select-none cursor-grab active:cursor-grabbing box-border"
      style={{
        paddingTop: `${containerHeight / 2 - itemHeight / 2}px`, // Exactly 44px padding
        paddingBottom: `${containerHeight / 2 - itemHeight / 2}px`, // Exactly 44px padding
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch',
        willChange: 'transform',
        transform: 'translateZ(0)',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
    >
      {extendedItems.map((item, idx) => {
        // Precise center calculation matching scrollTop exactly
        const centerIndex = containerRef.current ? Math.round(containerRef.current.scrollTop / itemHeight) : -1;
        const isSelected = idx === centerIndex;

        return (
          <div
            key={idx}
            className={`h-[44px] min-h-[44px] max-h-[44px] leading-[44px] flex items-center justify-center box-border pointer-events-none transition-all duration-75 ${
              isSelected
                ? 'font-bold text-blue-900 dark:text-[#FFCC00] text-xl opacity-100 scale-105'
                : 'text-gray-400 opacity-35 text-base scale-95'
            }`}
          >
            {formatItem(item)}
          </div>
        );
      })}
    </div>
  );
};

const MemoizedInertialWheel = memo(InertialWheel);
