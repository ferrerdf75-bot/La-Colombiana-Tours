export const fmtMoney = (v: any): string => {
  if (v === '' || v == null || v === 0) return '';
  const n = Number(String(v).replace(/,/g, ''));
  if (isNaN(n)) return '';
  return new Intl.NumberFormat('en-US').format(n);
};

export const parseMoney = (s: string): number => {
  return Number(String(s).replace(/,/g, '')) || 0;
};

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
};

export const formatFolio = (prefix: string, year: number, seq: number): string => {
  const padSeq = String(seq).padStart(4, '0');
  return `${prefix}-${year}-${padSeq}`;
};

export function getHoyHolbox(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Cancun' }); // retorna 2026-09-24
}

export function getMananaHolbox(): string {
  const hoyStr = getHoyHolbox();
  const [y, m, d] = hoyStr.split('-').map(Number);
  const nextDate = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
  return nextDate.toLocaleDateString('en-CA', { timeZone: 'America/Cancun' }); // 2026-09-25
}

export function formatearFechaBonita(fechaISO: string): string {
  if (!fechaISO) return '';
  return new Date(fechaISO + 'T12:00:00').toLocaleDateString('es-MX', {
    timeZone: 'America/Cancun',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

if (typeof window !== 'undefined') {
  (window as any).getHoyHolbox = getHoyHolbox;
  (window as any).getMananaHolbox = getMananaHolbox;
  (window as any).formatearFechaBonita = formatearFechaBonita;
}

export const formatDateSpanish = (dateStr: string): string => {
  return formatearFechaBonita(dateStr);
};

export const getTomorrowDate = (): string => {
  return getMananaHolbox();
};

export const getTodayDate = (): string => {
  return getHoyHolbox();
};

export function cleanPhoneForWhatsApp(phone?: any): string {
  if (!phone) return '';
  return String(phone).replace(/[^0-9]/g, '');
}

export const formatDateTimeSimple = (dateStr?: string | Date): string => {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '';
  }
};

export const convertirNumeroALetras = (amount: number): string => {
  if (isNaN(amount) || amount <= 0) return 'CERO PESOS 00/100 M.N.';
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  function seccion(num: number): string {
    if (num === 0) return '';
    if (num === 100) return 'CIEN ';
    let str = '';
    const c = Math.floor(num / 100);
    const d = Math.floor((num % 100) / 10);
    const u = num % 10;
    if (c > 0) str += centenas[c] + ' ';
    if (d === 1) {
      str += especiales[u] + ' ';
    } else if (d === 2 && u > 0) {
      str += 'VEINTI' + unidades[u] + ' ';
    } else {
      if (d > 0) str += decenas[d] + (u > 0 ? ' Y ' : ' ');
      if (u > 0) str += unidades[u] + ' ';
    }
    return str;
  }

  const enteros = Math.floor(amount);
  const centavos = Math.round((amount - enteros) * 100);
  const centavosStr = centavos.toString().padStart(2, '0');

  let resultado = '';
  const miles = Math.floor(enteros / 1000);
  const resto = enteros % 1000;

  if (miles > 0) {
    if (miles === 1) {
      resultado += 'MIL ';
    } else {
      resultado += seccion(miles) + 'MIL ';
    }
  }

  if (resto > 0 || miles === 0) {
    resultado += seccion(resto);
  }

  return `${resultado.trim()} PESOS ${centavosStr}/100 M.N.`.trim();
};

export const ensureSaleServices = (sale: any): any => {
  if (!sale) return sale;
  if (Array.isArray(sale.servicios) && sale.servicios.length > 0) {
    return {
      ...sale,
      totalFolio: sale.totalFolio ?? sale.total,
      historialEdiciones: sale.historialEdiciones || [],
    };
  }

  const defaultService = {
    id: 'srv-' + (sale.id || '1') + '-0',
    tourId: sale.tourId || '',
    nombre: sale.tourName || 'Tour General',
    tipo: 'por_persona',
    cantidad: sale.passengerCount || 1,
    precioUnitario: sale.unitPrice || (sale.passengerCount ? Math.round(sale.subtotal / sale.passengerCount) : sale.total) || 0,
    subtotal: sale.subtotal || sale.total || 0,
    fechaServicio: sale.tourDate || (sale.createdAt ? sale.createdAt.split('T')[0] : getTodayDate()),
    horaServicio: sale.tourTime || '09:00 AM',
    puntoEncuentro: sale.meetingPoint || 'Muelle Principal Holbox',
    nota: sale.notes || '',
  };

  return {
    ...sale,
    totalFolio: sale.totalFolio ?? sale.total,
    servicios: [defaultService],
    historialEdiciones: sale.historialEdiciones || [],
  };
};
