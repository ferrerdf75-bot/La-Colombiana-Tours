export type TourCategory = 'TOURS ESTRELLA HOLBOX' | 'NATURALEZA Y EXPERIENCIA' | 'PESCA DEPORTIVA' | 'LUJO Y PRIVADOS' | 'FULL DAY TIERRA' | 'TRANSPORTE Y TRASLADOS';

export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'SPEI' | 'Tarjeta' | 'CoDi' | 'USD' | 'EUR' | 'GBP' | 'CAD';

export type SaleStatus = 'Con Saldo' | 'Liquidado' | 'Cancelado' | 'Cancelado Parcial' | 'Pendiente';

export interface SaleServiceItem {
  id: string;
  tourId: string;
  nombre: string;
  tipo?: string; // "por_persona" | "por_unidad" | "por_hora" | string
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  fechaServicio: string;
  horaServicio?: string;
  puntoEncuentro?: string;
  nota?: string;
  fecha_tour?: string;
  hora_tour?: string;
  punto_encuentro?: string;
  pax?: number;
  timestamp?: number;
  providerCost?: number;
  providerType?: string;
  utilidad?: number; // precioUnitario - providerCost
  cancelado?: boolean;
}

export interface SaleFirma {
  bloqueada: boolean;
  timestampBloqueo?: string; // ISO string
  base64?: string;
}

export interface SaleEditionHistory {
  fecha: string;
  cambio: string;
  usuario?: string;
}

export interface TourItem {
  id: string;
  name: string;
  category: TourCategory;
  defaultPrice: number;
  priceUnit: string;
  defaultTime: string;
  meetingPoint: string;
  active: boolean;
  tipo_servicio?: string;
  descripcion?: string;
  titulo?: string;
  nombre_completo?: string;
  providerCost?: number; // Honorarios del prestador - ej 1600 capitán
  providerType?: 'Lanchero' | 'Capitán' | 'Taxista' | 'Bicicletas' | 'Carritos Golf' | 'Can-Am' | 'Guía' | 'Transfer' | 'Otro';
  cancelado?: boolean;
}

export interface Payment {
  id: string;
  amount: number;
  method: string; // Efectivo, Transferencia Bancaria, SPEI, Tarjeta (Terminal), CoDi, USD, etc.
  date: string; // YYYY-MM-DD fecha real del pago
  time: string; // HH:mm
  note?: string; // "Anticipo mañana", "Abono tarde 50 pesos"
  createdAt: string;
}

export interface PagoDiario {
  id: string;
  folio: string;
  cliente: string;
  monto: number;
  metodoPago: string;
  tipo: 'anticipo' | 'liquidacion' | 'abono' | 'devolucion';
  fechaCobro: string; // ISO - fecha REAL cuando entró el dinero
  hora: string;
}

export interface Sale {
  id: string;
  folio: string;
  createdAt: string; // ISO string
  tourId: string;
  tourName: string;
  tourCategory: TourCategory;
  tourDate: string; // YYYY-MM-DD
  tourTime: string;
  meetingPoint: string;
  clientName: string;
  clientPhone: string;
  clientHotel?: string;
  clientSignature?: string; // data:image/png;base64,...
  firma?: SaleFirma;
  passengerCount: number;
  unitPrice: number;
  subtotal: number;
  discountType: 'none' | 'percent' | 'amount' | 'courtesy';
  discountValue: number;
  discountAmount: number;
  total: number;
  totalFolio?: number;
  servicios?: SaleServiceItem[];
  historialEdiciones?: SaleEditionHistory[];
  payments?: Payment[];
  advancePayment: number; // Anticipo / pagos hechos
  balance: number; // Saldo pendiente
  paymentMethod: PaymentMethod;
  balancePaymentMethod?: PaymentMethod;
  balancePaidAt?: string;
  notes?: string;
  status: SaleStatus;
  sellerName: string;
  isPrueba?: boolean;
  esReserva?: boolean;
}

export interface BusinessConfig {
  name: string;
  owner: string;
  phone: string;
  address: string;
  email?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  usdExchangeRate: number;
  nextFolioNumber: number;
  folioPrefix: string;
  currentYear: number;
  ticketFooterNotes: string;
  nombrePropietaria?: string;
  correo?: string;
  fechaNacimiento?: string;
}

export interface CashClosingSummary {
  date: string;
  initialCash: number;
  totalSalesCount: number;
  totalPassengers: number;
  totalContracted: number;
  totalCollected: number;
  totalPendingBalance: number;
  byMethod: Record<PaymentMethod, number>;
}
