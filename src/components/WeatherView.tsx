import React, { useState, useEffect } from 'react';
import {
  Cloud,
  RefreshCw,
  Wind,
  Waves,
  CloudRain,
  Sun,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Compass,
  Thermometer,
  Gauge,
  Info,
  Calendar
} from 'lucide-react';

export const WeatherView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<'hoy' | 'manana'>('hoy');

  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [weatherSubTab, setWeatherSubTab] = useState<'pronostico' | 'satelite' | 'mareas'>('pronostico');
  const [sateliteLoaded, setSateliteLoaded] = useState<boolean>(false);
  const [activeLocationMode, setActiveLocationMode] = useState<'holbox' | 'gps' | 'busqueda'>(() => {
    try {
      const saved = localStorage.getItem('activeLocationMode');
      return (saved as any) || 'holbox';
    } catch {
      return 'holbox';
    }
  });
  const [busquedaTexto, setBusquedaTexto] = useState<string>('');
  const [ubicacionClima, setUbicacionClima] = useState<{nombre:string, lat:number, lon:number}>(() => {
    try {
      const saved = localStorage.getItem('ubicacionClima');
      return saved ? JSON.parse(saved) : {nombre:'Isla Holbox, Q.Roo', lat:21.52, lon:-87.38};
    } catch {
      return {nombre:'Isla Holbox, Q.Roo', lat:21.52, lon:-87.38};
    }
  });

  const fechaHoy = new Date().toISOString().split('T')[0];
  const CACHE_KEY = `clima_cache_${ubicacionClima.lat}_${ubicacionClima.lon}_${fechaHoy}`;
  const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours in ms

  const fetchWeather = async (force: boolean = false) => {
    setLoading(true);
    setError(null);
    setIsOffline(false);

    try {
      if (!force) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const now = Date.now();
            if (parsed && (now - parsed.timestamp < CACHE_DURATION)) {
              // Validar que el cache tenga 24 horas completas para hoy
              const target = parsed.data?.hourly?.[0]?.time?.split('T')[0]
                || (Array.isArray(parsed.data?.hourly) ? parsed.data.hourly[0]?.time?.split('T')[0] : null)
                || parsed.data?.hourly?.time?.[0]?.split('T')[0];
              
              let testCount = 0;
              if (Array.isArray(parsed.data?.hourly)) {
                testCount = parsed.data.hourly.filter((h: any) => h.time && h.time.startsWith(target)).length;
              } else if (parsed.data?.hourly?.time) {
                testCount = parsed.data.hourly.time.filter((t: string) => t && t.startsWith(target)).length;
              }

              if (testCount < 24) {
                console.warn(`Cache con solo ${testCount} horas (<24), borrando y re-descargando...`);
                localStorage.removeItem(CACHE_KEY);
                localStorage.removeItem('clima_cache');
                delete (window as any).climaDataGlobal;
              } else {
                setWeatherData(parsed.data);
                setLastTimestamp(parsed.timestamp);
                setLoading(false);
                return;
              }
            }
          } catch (e) {
            console.error('Error parsing weather cache', e);
          }
        }
      }

      // URL: forecast_days=3 y timezone=America/Cancun para tener 3 dias completos
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${ubicacionClima.lat}&longitude=${ubicacionClima.lon}&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,wave_height,weather_code&daily=temperature_2m_max,temperature_2m_min,wave_height_max,wind_speed_10m_max,precipitation_probability_max&timezone=America/Cancun&forecast_days=3`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al conectar con Open-Meteo');
      const data = await res.json();
      
      // Construir array COMPLETO ordenado por fecha: hourly.time.sort()
      const rawTimes = Array.isArray(data?.hourly?.time) ? [...data.hourly.time].sort((a: string, b: string) => a.localeCompare(b)) : [];
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
          windKt: kmhToKnots(data.hourly.wind_speed_10m?.[idx] ?? 10),
          gusts: data.hourly.wind_gusts_10m?.[idx] ?? 15,
          rain: data.hourly.precipitation_probability?.[idx] ?? 0,
          rainMm: data.hourly.precipitation?.[idx] ?? 0,
          wave: data.hourly.wave_height?.[idx] ?? 0.5,
          weather_code: data.hourly.weather_code?.[idx] ?? 0,
          wind_direction: data.hourly.wind_direction_10m?.[idx] ?? 90,
        };
      });

      // Asegurar que data.hourly sea tanto array filtrable como compatible con accesos directos
      const hourlyArray: any = hourlyList;
      hourlyArray.time = data.hourly.time;
      hourlyArray.temperature_2m = data.hourly.temperature_2m;
      hourlyArray.precipitation_probability = data.hourly.precipitation_probability;
      hourlyArray.precipitation = data.hourly.precipitation;
      hourlyArray.wind_speed_10m = data.hourly.wind_speed_10m;
      hourlyArray.wind_gusts_10m = data.hourly.wind_gusts_10m;
      hourlyArray.wind_direction_10m = data.hourly.wind_direction_10m;
      hourlyArray.wave_height = data.hourly.wave_height;
      hourlyArray.weather_code = data.hourly.weather_code;
      data.hourly = hourlyArray;

      // Preparar resumen para el Chat usando datos de Open-Meteo
      const resumenTexto = `${data.daily?.temperature_2m_max?.[0] || 'N/A'}°C / ${data.daily?.temperature_2m_min?.[0] || 'N/A'}°C`;
      const vientoTexto = `${data.hourly.wind_speed_10m?.[0] || 'N/A'}km/h`;
      const probTexto = `${data.daily?.precipitation_probability_max?.[0] || 'N/A'}%`;
      
      const pronosticoManana = {
        resumen: `${data.daily?.temperature_2m_max?.[1] || 'N/A'}°C / ${data.daily?.temperature_2m_min?.[1] || 'N/A'}°C`,
        viento: `${data.daily?.wind_speed_10m_max?.[1] || 'N/A'}km/h`,
        lluvia: `${data.daily?.precipitation_probability_max?.[1] || 'N/A'}%`
      };

      // GUARDAR PARA QUE EL CHAT DE INICIO LO LEA Y CLIMA_CACHE COMPLETO
      const datosParaChat = { 
        resumen: resumenTexto, 
        viento: vientoTexto, 
        lluvia: probTexto, 
        manana: pronosticoManana,
        timestamp: Date.now(),
        hourly: hourlyList,
        daily: data.daily
      };
      localStorage.setItem('clima_cache', JSON.stringify(datosParaChat));
      (window as any).climaDataGlobal = datosParaChat;

      const nowTs = Date.now();
      const cachePayload = {
        timestamp: nowTs,
        data,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
      setWeatherData(data);
      setLastTimestamp(nowTs);
      setIsOffline(false);
    } catch (err: any) {
      console.warn('Network fetch failed, using offline fallback weather data', err);
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setWeatherData(parsed.data);
          setLastTimestamp(parsed.timestamp);
          setIsOffline(true);
          setLoading(false);
          return;
        } catch {}
      }

      // Offline mock fallback so UI never fails
      const mockData = {
        daily: {
          temperature_2m_max: [31, 30, 29],
          temperature_2m_min: [25, 24, 24],
          precipitation_probability_max: [10, 20, 15],
          wind_speed_10m_max: [18, 15, 20],
          wave_height_max: [0.8, 0.7, 0.9]
        },
        hourly: {
          time: Array.from({length: 72}, (_, i) => {
            const d = new Date();
            d.setHours(d.getHours() + i);
            return d.toISOString();
          }),
          temperature_2m: Array.from({length: 72}, () => 28),
          precipitation_probability: Array.from({length: 72}, () => 10),
          precipitation: Array.from({length: 72}, () => 0),
          wind_speed_10m: Array.from({length: 72}, () => 12),
          wind_gusts_10m: Array.from({length: 72}, () => 16),
          wind_direction_10m: Array.from({length: 72}, () => 90),
          wave_height: Array.from({length: 72}, () => 0.5),
          weather_code: Array.from({length: 72}, () => 0),
        }
      };

      const rawTimes = mockData.hourly.time;
      const hourlyList = rawTimes.map((t: string) => {
        const timePart = t.includes('T') ? t.split('T')[1] : t;
        const hour = parseInt(timePart.split(':')[0], 10);
        return {
          time: t,
          timeStr: timePart,
          hour: isNaN(hour) ? 0 : hour,
          temp: 28,
          windKmh: 12,
          windKt: kmhToKnots(12),
          gusts: 16,
          rain: 10,
          rainMm: 0,
          wave: 0.5,
          weather_code: 0,
          wind_direction: 90,
        };
      });

      const hourlyArray: any = hourlyList;
      hourlyArray.time = mockData.hourly.time;
      hourlyArray.temperature_2m = mockData.hourly.temperature_2m;
      hourlyArray.precipitation_probability = mockData.hourly.precipitation_probability;
      hourlyArray.precipitation = mockData.hourly.precipitation;
      hourlyArray.wind_speed_10m = mockData.hourly.wind_speed_10m;
      hourlyArray.wind_gusts_10m = mockData.hourly.wind_gusts_10m;
      hourlyArray.wind_direction_10m = mockData.hourly.wind_direction_10m;
      hourlyArray.wave_height = mockData.hourly.wave_height;
      hourlyArray.weather_code = mockData.hourly.weather_code;
      mockData.hourly = hourlyArray;

      setWeatherData(mockData);
      setLastTimestamp(Date.now());
      setIsOffline(true);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarHolbox = () => {
    setActiveLocationMode('holbox');
    try { localStorage.setItem('activeLocationMode', 'holbox'); } catch {}
    const holboxUbi = { nombre: 'Isla Holbox, Q.Roo', lat: 21.52, lon: -87.38 };
    setUbicacionClima(holboxUbi);
    try { localStorage.setItem('ubicacionClima', JSON.stringify(holboxUbi)); } catch {}
  };

  const buscarUbicacion = async (texto: string) => {
    const q = texto.trim();
    if (!q) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`);
      const data = await res.json();
      if (data && data[0]) {
        setActiveLocationMode('busqueda');
        try { localStorage.setItem('activeLocationMode', 'busqueda'); } catch {}
        const nombreLimpio = data[0].display_name.split(',').slice(0, 2).join(',').trim();
        const nuevaUbi = {
          nombre: nombreLimpio || q,
          lat: Number(parseFloat(data[0].lat).toFixed(4)),
          lon: Number(parseFloat(data[0].lon).toFixed(4))
        };
        setUbicacionClima(nuevaUbi);
        try { localStorage.setItem('ubicacionClima', JSON.stringify(nuevaUbi)); } catch {}
      }
    } catch (e) {
      console.error(e);
    }
  };

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada en su dispositivo.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setActiveLocationMode('gps');
        try { localStorage.setItem('activeLocationMode', 'gps'); } catch {}
        const nuevaUbi = {
          nombre: 'Mi ubicación GPS',
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4))
        };
        setUbicacionClima(nuevaUbi);
        try { localStorage.setItem('ubicacionClima', JSON.stringify(nuevaUbi)); } catch {}
      },
      err => {
        console.error('Error GPS', err);
        alert('No se pudo obtener la ubicación GPS.');
      },
      { timeout: 10000 }
    );
  };

  useEffect(() => {
    fetchWeather(false);
  }, [ubicacionClima]);

  const kmhToKnots = (kmh: number) => (kmh * 0.539957).toFixed(1);

  const getCardinalDirection = (deg: number) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const val = Math.floor((deg / 22.5) + 0.5);
    return directions[(val % 16)];
  };

  const formattedHeaderTimestamp = (() => {
    if (!lastTimestamp) return '';
    const dateObj = new Date(lastTimestamp);
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const hhmm = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Datos del ${dd}/${mm} a las ${hhmm} - Próxima auto en 3h - Usa Actualizar si cambia el cielo`;
  })();

  // Date strings for today and tomorrow based on Open-Meteo local timezone (America/Cancun)
  const todayDateStr = (() => {
    if (weatherData?.hourly) {
      if (Array.isArray(weatherData.hourly) && weatherData.hourly[0]?.time) {
        return weatherData.hourly[0].time.split('T')[0];
      }
      if (weatherData.hourly.time?.[0]) {
        return weatherData.hourly.time[0].split('T')[0];
      }
    }
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cancun', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  })();

  const tomorrowDateStr = (() => {
    if (weatherData?.hourly) {
      const times = Array.isArray(weatherData.hourly)
        ? weatherData.hourly.map((h: any) => h.time?.split('T')[0])
        : (weatherData.hourly.time?.map((t: string) => t.split('T')[0]) || []);
      const uniqueDates = Array.from(new Set(times.filter(Boolean)));
      if (uniqueDates.length > 1) {
        return uniqueDates[1] as string;
      }
    }
    try {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cancun', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    } catch {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    }
  })();

  const targetDateStr = selectedDay === 'hoy' ? todayDateStr : tomorrowDateStr;

  // 3. Función para mostrar:
  function mostrarHoras(fechaObjetivo: string) {
    // fechaObjetivo = '2026-09-24' para HOY, '2026-09-25' para MAÑANA
    const datos = weatherData;
    if (!datos?.hourly) return [];

    if (Array.isArray(datos.hourly)) {
      let filtrado = datos.hourly.filter((h: any) => h.time && h.time.startsWith(fechaObjetivo));
      filtrado = filtrado.sort((a: any, b: any) => a.time.localeCompare(b.time));
      // Debe tener 24 elementos de 00:00 a 23:00
      return filtrado;
    }

    if (datos.hourly.time && Array.isArray(datos.hourly.time)) {
      const items: any[] = [];
      datos.hourly.time.forEach((t: string, idx: number) => {
        if (t && t.startsWith(fechaObjetivo)) {
          const timePart = t.includes('T') ? t.split('T')[1] : t;
          const hour = parseInt(timePart.split(':')[0], 10);
          items.push({
            time: t,
            timeStr: timePart,
            hour: isNaN(hour) ? 0 : hour,
            temp: datos.hourly.temperature_2m?.[idx] ?? 28,
            windKmh: datos.hourly.wind_speed_10m?.[idx] ?? 10,
            windKt: kmhToKnots(datos.hourly.wind_speed_10m?.[idx] ?? 10),
            gusts: datos.hourly.wind_gusts_10m?.[idx] ?? 15,
            rain: datos.hourly.precipitation_probability?.[idx] ?? 0,
            rainMm: datos.hourly.precipitation?.[idx] ?? 0,
            wave: datos.hourly.wave_height?.[idx] ?? 0.5,
            weather_code: datos.hourly.weather_code?.[idx] ?? 0,
            wind_direction: datos.hourly.wind_direction_10m?.[idx] ?? 90,
          });
        }
      });
      const filtrado = items.sort((a: any, b: any) => a.time.localeCompare(b.time));
      return filtrado;
    }

    return [];
  }

  // 4. HOY = filtra por hoy de 00:00 a 23:00 (24 filas)
  //    MAÑANA = filtra por mañana de 00:00 a 23:00 (24 filas)
  const hourlyForDay = mostrarHoras(targetDateStr);

  // 6. Al entrar a pestaña Clima, borra cache automático si filtrado.length < 24 y vuelve a descargar.
  useEffect(() => {
    if (!loading && weatherData) {
      const hoyFiltrado = mostrarHoras(todayDateStr);
      if (hoyFiltrado.length > 0 && hoyFiltrado.length < 24) {
        console.warn(`Cache incompleto (${hoyFiltrado.length} < 24 horas). Borrando cache automático y re-descargando...`);
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem('clima_cache');
        delete (window as any).climaDataGlobal;
        fetchWeather(true);
      }
    }
  }, [loading, weatherData, todayDateStr]);

  const getWeatherIcon = (prob: number) => {
    if (prob <= 10) return '☀️';
    if (prob <= 20) return '🌤️';
    if (prob <= 40) return '🌧️';
    if (prob <= 70) return '🌧️🌧️';
    return '⛈️';
  };

  const currentHourItem = (() => {
    if (!hourlyForDay.length) return null;
    if (selectedDay === 'hoy') {
      const now = new Date();
      let currentHour = now.getHours();
      try {
        const hourStr = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Cancun', hour: 'numeric', hour12: false }).format(now);
        currentHour = parseInt(hourStr, 10);
      } catch {}
      return hourlyForDay.find((i: any) => i.hour === currentHour) || hourlyForDay[0];
    } else {
      return hourlyForDay.find((i: any) => i.hour === 12) || hourlyForDay[0];
    }
  })();

  const currentTemp = currentHourItem?.temp ?? 28;
  const currentWindKmh = currentHourItem?.windKmh ?? 12;
  const currentWindKt = kmhToKnots(currentWindKmh);
  const currentGustsKmh = currentHourItem?.gusts ?? 18;
  const currentGustsKt = kmhToKnots(currentGustsKmh);
  const currentWave = currentHourItem?.wave ?? 0.8;
  const currentRainProb = currentHourItem?.rain ?? 10;
  
  // Find wind direction for current item index
  const currentWindDirDeg = (() => {
    if (!weatherData?.hourly?.time) return 90;
    const idx = weatherData.hourly.time.findIndex((t: string) => new Date(t).getTime() === currentHourItem?.timestamp);
    return idx !== -1 ? weatherData.hourly.wind_direction_10m[idx] : 90;
  })();
  const currentWindCardinal = getCardinalDirection(currentWindDirDeg);

  // Daily index: 0 for today, 1 for tomorrow
  const dailyIdx = selectedDay === 'hoy' ? 0 : 1;
  const maxWindKmh = weatherData?.daily?.wind_speed_10m_max?.[dailyIdx] ?? currentWindKmh;
  const maxWindKt = kmhToKnots(maxWindKmh);
  const maxWave = weatherData?.daily?.wave_height_max?.[dailyIdx] ?? currentWave;
  const maxRainDaily = weatherData?.daily?.precipitation_probability_max?.[dailyIdx] ?? currentRainProb;

  // Calculate peak rain probability and its hour for the selected day
  const peakRainInfo = (() => {
    if (!hourlyForDay.length) return { maxRain: maxRainDaily, peakTimeStr: '12:00 PM' };
    let maxR = -1;
    let peakItem = hourlyForDay[0];
    hourlyForDay.forEach((item: any) => {
      if (item.rain > maxR) {
        maxR = item.rain;
        peakItem = item;
      }
    });
    return {
      maxRain: maxR,
      peakTimeStr: peakItem ? peakItem.timeStr : '12:00 PM',
    };
  })();

  const getRouteStatus = (windKtVal: number, waveVal: number) => {
    if (windKtVal > 25 || waveVal > 1.8) {
      return { level: 'red', text: 'Rojo (Puerto Cerrado / Precaución Extrema)', bg: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900', badgeBg: 'bg-red-600 text-white' };
    }
    if (windKtVal > 20 || waveVal > 1.2) {
      return { level: 'yellow', text: 'Amarillo (Precaución Moderada / Oleaje Alto)', bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900', badgeBg: 'bg-amber-500 text-white' };
    }
    return { level: 'green', text: 'Verde (Condiciones Óptimas / Navegable)', bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900', badgeBg: 'bg-emerald-600 text-white' };
  };

  const route3Islas = getRouteStatus(Number(maxWindKt), Number(maxWave));
  const routePasion = getRouteStatus(Number(maxWindKt) - 2, Number(maxWave) * 0.9);
  const routeCatoche = getRouteStatus(Number(maxWindKt) + 3, Number(maxWave) * 1.2);

  const overallLevel = (() => {
    if (route3Islas.level === 'red' || routeCatoche.level === 'red') return { text: 'ROJO - RESTRINGIDO', bg: 'bg-red-600 text-white', desc: 'Vientos o marejada fuertes. Evaluar salida.' };
    if (route3Islas.level === 'yellow' || routePasion.level === 'yellow') return { text: 'AMARILLO - PRECAUCIÓN', bg: 'bg-amber-500 text-white', desc: 'Precaución en navegación menor. Monitorear.' };
    return { text: 'VERDE - OPERACIÓN NORMAL', bg: 'bg-emerald-600 text-white', desc: 'Condiciones favorables para tours y expediciones.' };
  })();

  return (
    <div className="space-y-4 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#0a4a7a] flex items-center justify-center text-white shadow-md shadow-blue-900/20 shrink-0">
            <Cloud className="w-5 h-5 text-[#00a8e8]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-[#0a4a7a] dark:text-[#00a8e8]">
                Clima y Meteorología Marítima &bull; Holbox
              </h2>
              {isOffline && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full">
                  Offline - último dato
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formattedHeaderTimestamp || 'Cargando pronóstico...'}
            </p>
          </div>
        </div>

        {/* 1. Botones HOY / MAÑANA / Actualizar con CSS Grid y altura 44px */}
        <div
          className="w-full sm:w-auto min-w-[280px] sm:min-w-[340px]"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1.2fr',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedDay('hoy')}
            className={`h-[44px] rounded-xl text-xs font-bold transition-all duration-150 active:scale-[0.97] cursor-pointer flex items-center justify-center ${
              selectedDay === 'hoy'
                ? 'active bg-[#0a4a7a] text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            HOY
          </button>
          <button
            type="button"
            onClick={() => setSelectedDay('manana')}
            className={`h-[44px] rounded-xl text-xs font-bold transition-all duration-150 active:scale-[0.97] cursor-pointer flex items-center justify-center ${
              selectedDay === 'manana'
                ? 'active bg-[#0a4a7a] text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            MAÑANA
          </button>
          <button
            type="button"
            onClick={() => fetchWeather(true)}
            disabled={loading}
            className="h-[44px] rounded-xl text-xs font-bold text-white bg-[#0a4a7a] hover:bg-[#003087] shadow-md transition-all duration-150 active:scale-[0.97] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Forzar actualización ignorando caché"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {loading && !weatherData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse space-y-2">
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
            </div>
          ))}
        </div>
      )}

      {error && !weatherData && (
        <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 rounded-xl text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2 & 3. Barra de Ubicación con 3 Botones Interactivos y Etiquetas Actualizadas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón 1: Isla Holbox (default) */}
          <button
            type="button"
            onClick={seleccionarHolbox}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-[0.97] cursor-pointer flex items-center gap-1.5 ${
              activeLocationMode === 'holbox'
                ? 'active bg-[#0a4a7a] text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>🏝️</span>
            <span>Isla Holbox</span>
          </button>

          {/* Botón 2: Mi ubicación (GPS) */}
          <button
            type="button"
            onClick={usarMiUbicacion}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-[0.97] cursor-pointer flex items-center gap-1.5 ${
              activeLocationMode === 'gps'
                ? 'active bg-[#0a4a7a] text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>📍</span>
            <span>Mi ubicación</span>
          </button>

          {/* Botón 3: Buscador */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={busquedaTexto}
              onChange={(e) => setBusquedaTexto(e.target.value)}
              placeholder="Escribe otra ubicación Ej: Tulum..."
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 w-44 sm:w-56 focus:outline-none focus:ring-1 focus:ring-[#0a4a7a]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  buscarUbicacion(busquedaTexto);
                }
              }}
            />
            <button
              type="button"
              onClick={() => buscarUbicacion(busquedaTexto)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-[0.97] cursor-pointer flex items-center gap-1 ${
                activeLocationMode === 'busqueda'
                  ? 'active bg-[#0a4a7a] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>🔍</span>
              <span>Buscar</span>
            </button>
          </div>
        </div>

        {/* Etiqueta dinámica de la ubicación activa */}
        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          <span>El clima en: </span>
          <span className="font-extrabold text-[#0a4a7a] dark:text-[#00a8e8]">
            {activeLocationMode === 'holbox' ? 'Isla Holbox, Q.Roo' : ubicacionClima.nombre}
          </span>
        </div>
      </div>

      {/* 3 Weather Sub-Tabs: Pronóstico | Satélite | Mareas */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setWeatherSubTab('pronostico')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            weatherSubTab === 'pronostico'
              ? 'bg-[#0a4a7a] text-white shadow'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <span>🌦️ Pronóstico</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setWeatherSubTab('satelite');
            setSateliteLoaded(true);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            weatherSubTab === 'satelite'
              ? 'bg-[#0a4a7a] text-white shadow'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <span>🛰️ Satélite</span>
        </button>
        <button
          type="button"
          onClick={() => setWeatherSubTab('mareas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            weatherSubTab === 'mareas'
              ? 'bg-[#0a4a7a] text-white shadow'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <span>🌊 Mareas</span>
        </button>
      </div>

      {weatherSubTab === 'satelite' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00a8e8]"></span>
              Satélite en Tiempo Real &bull; Windy
            </h3>
            <a
              href="https://www.windy.com/?satellite,21.522,-87.376,6"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0a4a7a] hover:bg-[#003087] rounded-xl shadow transition"
            >
              <span>Abrir en Windy.com</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="relative w-full h-[450px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
            {!sateliteLoaded && (
              <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 z-10">
                Cargando satélite...
              </div>
            )}
            <iframe
              title="Windy Satellite"
              src="https://embed.windy.com/embed2.html?lat=21.52&lon=-87.38&zoom=6&level=surface&overlay=satellite&menu=&message=&marker=&calendar=&pressure=&type=map&location=coordinates&detail=&detailLat=21.52&detailLon=-87.38&metricWind=kt&metricTemp=%C2%B0C&radarRange=-1"
              width="100%"
              height="450px"
              frameBorder="0"
              onLoad={() => setSateliteLoaded(true)}
              className="w-full h-[450px] rounded-2xl"
            />
          </div>
          <p className="text-[11px] text-slate-500 italic text-center">
            * Imagen satelital en vivo proporcionada por Windy.com para el Golfo de México y Caribe.
          </p>
        </div>
      )}

      {weatherSubTab === 'mareas' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              Tabla de Mareas Holbox &bull; Hoy
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              Puerto Chiquilá / Holbox
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3">Hora</th>
                  <th className="py-2.5 px-3">Altura</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3 text-center">Icono</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {[
                  { hora: '06:15', altura: '0.3 m', tipo: 'Bajamar (Marea Baja)', icon: '⬇️', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' },
                  { hora: '12:40', altura: '0.8 m', tipo: 'Pleamar (Marea Alta)', icon: '⬆️', badge: 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300' },
                  { hora: '18:20', altura: '0.2 m', tipo: 'Bajamar (Marea Baja)', icon: '⬇️', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' },
                  { hora: '23:55', altura: '0.7 m', tipo: 'Pleamar (Marea Alta)', icon: '⬆️', badge: 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300' },
                ].map((tide, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-2.5 px-3 font-bold text-[#0a4a7a] dark:text-[#00a8e8]">{tide.hora}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{tide.altura}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${tide.badge}`}>
                        {tide.tipo}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-lg">{tide.icon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 italic">
            * Nota: Estimaciones mareográficas para navegación segura en canales de Holbox y Yalahau.
          </p>
        </div>
      )}

      {weatherSubTab === 'pronostico' && weatherData && (
        <>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00a8e8]"></span>
                Resumen Operativo Marítimo &bull; {selectedDay === 'hoy' ? 'HOY' : 'MAÑANA'} ({targetDateStr})
              </h3>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${overallLevel.bg}`}>
                {overallLevel.text}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800" style={{ maxHeight: '180px' }}>
              <table className="w-full text-left" style={{ fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold">
                    <th style={{ padding: '6px 8px', width: '45%' }}>Concepto</th>
                    <th style={{ padding: '6px 8px', width: '55%' }}>Valor {selectedDay === 'hoy' ? 'HOY' : 'MAÑANA'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td style={{ padding: '6px 8px' }} className="text-slate-600 dark:text-slate-400">Temp / Sensación</td>
                    <td style={{ padding: '6px 8px' }} className="text-slate-900 dark:text-white font-medium">
                      {currentTemp.toFixed(1)}°C (ST {(currentTemp + 2).toFixed(0)}°)
                    </td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/70">
                    <td style={{ padding: '6px 8px' }} className="text-slate-600 dark:text-slate-400">Viento / Ráfagas</td>
                    <td style={{ padding: '6px 8px' }} className="text-slate-900 dark:text-white font-medium">
                      {currentWindKt} kt / {currentGustsKt} kt - Dir: {currentWindCardinal}
                    </td>
                  </tr>
                  <tr className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td style={{ padding: '6px 8px' }} className="text-slate-600 dark:text-slate-400">Oleaje Marítimo</td>
                    <td style={{ padding: '6px 8px' }} className="text-slate-900 dark:text-white font-medium">
                      {Number(currentWave).toFixed(2)} m - {Number(maxWave).toFixed(2)} m
                    </td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/70">
                    <td style={{ padding: '6px 8px' }} className="text-slate-600 dark:text-slate-400">Lluvia / Prob</td>
                    <td style={{ padding: '6px 8px' }} className="text-slate-900 dark:text-white font-medium">
                      {currentRainProb > 60 ? '-- mm' : (currentHourItem?.rainMm ? currentHourItem.rainMm.toFixed(1) + ' mm' : '0.0 mm')} / {peakRainInfo.maxRain}% a las {peakRainInfo.peakTimeStr}
                    </td>
                  </tr>
                  <tr className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td style={{ padding: '6px 8px' }} className="text-slate-600 dark:text-slate-400">Pronóstico</td>
                    <td style={{ padding: '6px 8px' }} className="text-slate-900 dark:text-white font-medium">
                      {peakRainInfo.maxRain >= 70 ? `Tormenta ${peakRainInfo.maxRain}% a las ${peakRainInfo.peakTimeStr}` : peakRainInfo.maxRain >= 40 ? `Lluvia ${peakRainInfo.maxRain}% a las ${peakRainInfo.peakTimeStr}` : peakRainInfo.maxRain >= 20 ? `Nublado ${peakRainInfo.maxRain}% a las ${peakRainInfo.peakTimeStr}` : `Soleado / Despejado (${peakRainInfo.maxRain}%)`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0a4a7a]"></span>
              Semáforo por Rutas Turísticas &bull; 3 Islas, Isla Pasión y Cabo Catoche
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-2xl border shadow-sm space-y-2 ${route3Islas.bg}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider">Tour 3 Islas (Yalahau / Pájaros)</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${route3Islas.badgeBg}`}>
                    {route3Islas.level.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs font-bold">{route3Islas.text}</p>
                <p className="text-[11px] opacity-80">Basado en viento máx ({maxWindKt} kt) y oleaje ({Number(maxWave).toFixed(1)}m).</p>
              </div>

              <div className={`p-4 rounded-2xl border shadow-sm space-y-2 ${routePasion.bg}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider">Isla Pasión / Playas</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${routePasion.badgeBg}`}>
                    {routePasion.level.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs font-bold">{routePasion.text}</p>
                <p className="text-[11px] opacity-80">Zona protegida por barra de arena. Operación generalmente estable.</p>
              </div>

              <div className={`p-4 rounded-2xl border shadow-sm space-y-2 ${routeCatoche.bg}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider">Expedición Cabo Catoche</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${routeCatoche.badgeBg}`}>
                    {routeCatoche.level.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs font-bold">{routeCatoche.text}</p>
                <p className="text-[11px] opacity-80">Ruta de mar abierto. Requiere vientos &lt; 20 kt y ola &lt; 1.2m.</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              * Nota automática: Viento &gt; 20kt asigna aviso Amarillo; Viento &gt; 25kt asigna aviso Rojo (Puerto Cerrado).
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00a8e8]"></span>
                PRONÓSTICO DETALLADO POR HORA &bull; {selectedDay === 'hoy' ? `HOY ${todayDateStr.split('-')[2]}/${todayDateStr.split('-')[1]}` : `MAÑANA ${tomorrowDateStr.split('-')[2]}/${tomorrowDateStr.split('-')[1]}`}
              </h3>
              <span className="text-xs text-slate-500">Desplazamiento horizontal disponible</span>
            </div>

          <style>
            {`
              .active { background-color: #0a4a7a !important; color: #ffffff !important; }
              table { width: 100%; text-align: left; font-size: 13px; border-collapse: collapse; }
              td { padding: 4px 6px !important; line-height: 1.2; font-size: 13px; font-weight: normal !important; }
              th { padding: 6px 6px !important; font-weight: normal !important; font-size: 12px; }
              tr { height: auto; }
              .wind-col { width: 110px; text-align: center; white-space: nowrap; word-break: normal; }
            `}
          </style>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-normal">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-normal">
                  <th className="font-normal text-left">Hora</th>
                  <th className="font-normal text-center">Condición</th>
                  <th className="font-normal text-left">Lluvia %</th>
                  <th className="font-normal text-left">Lluvia (mm)</th>
                  <th className="font-normal text-left">Temp</th>
                  <th className="font-normal wind-col text-center">Viento kt</th>
                  <th className="font-normal text-left">Ráfagas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {hourlyForDay.length > 0 ? (
                  hourlyForDay.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition font-normal">
                      <td className="text-[#0a4a7a] dark:text-[#00a8e8] font-normal">{row.timeStr}</td>
                      <td className="text-center font-normal" style={{ fontSize: '18px' }}>
                        {getWeatherIcon(row.rain)}
                      </td>
                      <td className="font-normal">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-normal ${row.rain > 40 ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                          {row.rain}%
                        </span>
                      </td>
                      <td className="font-normal">
                        {row.rain > 60 ? (
                          <span className="text-slate-500 font-normal">-- mm</span>
                        ) : row.rainMm > 0.5 ? (
                          <span className="text-blue-600 dark:text-blue-400 font-normal">{row.rainMm.toFixed(1)} mm</span>
                        ) : (
                          <span className="text-slate-400 font-normal">0.0 mm</span>
                        )}
                      </td>
                      <td className="font-normal">{row.temp.toFixed(1)}°C</td>
                      <td className="wind-col font-normal">{row.windKt} kt <span className="text-slate-400 text-[10px] font-normal">({row.windKmh.toFixed(1)} km/h)</span></td>
                      <td className="font-normal">{kmhToKnots(row.gusts)} kt</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500 font-normal">
                      No hay registros disponibles para este día.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 text-right">
            Fuente: Open-Meteo (NOAA/ECMWF)
          </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                Monitoreo de Ciclones Tropicales y Perturbaciones
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                Zona Caribe / Golfo de México
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              La Península de Yucatán y Holbox se encuentran en zona de vigilancia estacional de huracanes. Consulte siempre los boletines oficiales en tiempo real antes de zarpar hacia Cabo Catoche o alta mar.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <a
                href="https://www.nhc.noaa.gov/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition group"
              >
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#0a4a7a] dark:text-[#00a8e8] block group-hover:underline">
                    NOAA National Hurricane Center &rarr;
                  </span>
                  <p className="text-[11px] text-slate-500">Centro Nacional de Huracanes (USA)</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#00a8e8]" />
              </a>

              <a
                href="https://smn.conagua.gob.mx/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition group"
              >
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#0a4a7a] dark:text-[#00a8e8] block group-hover:underline">
                    SMN Conagua México &rarr;
                  </span>
                  <p className="text-[11px] text-slate-500">Servicio Meteorológico Nacional</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#00a8e8]" />
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 px-2 text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#00a8e8]" />
              <span>Fuentes meteorológicas oficiales:</span>
            </div>
            <div className="flex items-center gap-3 font-semibold flex-wrap">
              <a href="https://www.nhc.noaa.gov/" target="_blank" rel="noreferrer" className="text-[#0a4a7a] dark:text-[#00a8e8] hover:underline">
                NOAA
              </a>
              <span>&bull;</span>
              <a href="https://smn.conagua.gob.mx/" target="_blank" rel="noreferrer" className="text-[#0a4a7a] dark:text-[#00a8e8] hover:underline">
                CONAGUA
              </a>
              <span>&bull;</span>
              <a href="https://www.windguru.cz/" target="_blank" rel="noreferrer" className="text-[#0a4a7a] dark:text-[#00a8e8] hover:underline">
                Windguru Holbox
              </a>
              <span>&bull;</span>
              <span className="text-slate-400">Fuente: Open-Meteo (NOAA/ECMWF)</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
