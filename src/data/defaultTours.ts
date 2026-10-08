import { TourItem, BusinessConfig, TourCategory } from '../types';

export const migrateCategory = (cat: string): TourCategory => {
  const map: Record<string, TourCategory> = {
    'Náuticos': 'TOURS ESTRELLA HOLBOX',
    'Clásico': 'TOURS ESTRELLA HOLBOX',
    'Clasico': 'TOURS ESTRELLA HOLBOX',
    'Aventura': 'NATURALEZA Y EXPERIENCIA',
    'Pesca': 'PESCA DEPORTIVA',
    'Privado': 'LUJO Y PRIVADOS',
    'Traslados': 'TRANSPORTE Y TRASLADOS',
    'Rentas y Terrestre': 'FULL DAY TIERRA',
  };
  return map[cat] || (cat as TourCategory) || 'TOURS ESTRELLA HOLBOX';
};

export const DEFAULT_BUSINESS_CONFIG: BusinessConfig = {
  name: 'HOLBOX TOURS LA COLOMBIANA',
  owner: 'Judith tores',
  nombrePropietaria: 'Judith tores',
  fechaNacimiento: '1982-09-25',
  phone: '9984033303',
  email: 'ferrerdf75@gmail.com',
  correo: 'ferrerdf75@gmail.com',
  address: 'Isla Holbox, Q. Roo',
  usdExchangeRate: 16.8,
  nextFolioNumber: 1,
  folioPrefix: 'LC',
  currentYear: new Date().getFullYear(),
  ticketFooterNotes: 'Favor de presentarse 15 minutos antes de la hora indicada. No olvide bloqueador biodegradable, toalla y agua.',
};

export const BASE_TOURS: TourItem[] = [
  {id:'3islascenote', name:'Tour 3 Islas con Cenote Yalahau', category:'TOURS ESTRELLA HOLBOX', defaultPrice:600, priceUnit:'por persona', defaultTime:'10:00 AM', meetingPoint:'Muelle Principal Holbox', active:true},
  {id:'3islassincenote', name:'Tour 3 Islas sin Cenote', category:'TOURS ESTRELLA HOLBOX', defaultPrice:500, priceUnit:'por persona', defaultTime:'10:00 AM', meetingPoint:'Muelle Principal', active:true},
  {id:'cabocatoche', name:'Tour Cabo Catoche', category:'TOURS ESTRELLA HOLBOX', defaultPrice:1400, priceUnit:'por persona', defaultTime:'07:30 AM', meetingPoint:'Muelle Principal', active:true},
  {id:'especialpesca3islas', name:'Tour Especial Mini Pesca y 3 Islas', category:'TOURS ESTRELLA HOLBOX', defaultPrice:1200, priceUnit:'por persona', defaultTime:'07:00 AM', meetingPoint:'Muelle Principal', active:true},
  {id:'ballena', name:'Nado con Tiburon Ballena', category:'NATURALEZA Y EXPERIENCIA', defaultPrice:2800, priceUnit:'por persona', defaultTime:'07:00 AM', meetingPoint:'Muelle Principal', active:true},
  {id:'bio', name:'Tour Bioluminiscencia', category:'NATURALEZA Y EXPERIENCIA', defaultPrice:700, priceUnit:'por persona', defaultTime:'08:00 PM', meetingPoint:'Muelle Principal', active:true},
  {id:'amanecer', name:'Tour Amanecer', category:'NATURALEZA Y EXPERIENCIA', defaultPrice:500, priceUnit:'por persona', defaultTime:'05:30 AM', meetingPoint:'Muelle Principal', active:true},
  {id:'atardecer', name:'Tour Atardecer', category:'NATURALEZA Y EXPERIENCIA', defaultPrice:500, priceUnit:'por persona', defaultTime:'05:30 PM', meetingPoint:'Muelle Principal', active:true},
  {id:'kayakman', name:'Kayak al Manglar Amanecer', category:'NATURALEZA Y EXPERIENCIA', defaultPrice:600, priceUnit:'por persona', defaultTime:'05:30 AM', meetingPoint:'Muelle Principal', active:true},
  {id:'kayakatar', name:'Kayak Atardecer', category:'NATURALEZA Y EXPERIENCIA', defaultPrice:600, priceUnit:'por persona', defaultTime:'05:30 PM', meetingPoint:'Muelle Principal', active:true},
  {id:'riolagartos', name:'Tour Rio Lagartos', category:'NATURALEZA Y EXPERIENCIA', defaultPrice:1800, priceUnit:'por persona', defaultTime:'07:00 AM', meetingPoint:'Muelle Principal', active:true},
  {id:'minipesca', name:'Mini Pesca', category:'PESCA DEPORTIVA', defaultPrice:5000, priceUnit:'por lancha', defaultTime:'07:00 AM', meetingPoint:'Muelle Principal', active:true},
  {id:'pescaaltura', name:'Pesca de Altura', category:'PESCA DEPORTIVA', defaultPrice:15000, priceUnit:'por lancha', defaultTime:'06:00 AM', meetingPoint:'Muelle Principal', active:true},
  {id:'flyfishing', name:'Fly Fishing', category:'PESCA DEPORTIVA', defaultPrice:6000, priceUnit:'por lancha', defaultTime:'06:00 AM', meetingPoint:'Muelle Principal', active:true},
  {id:'catamaran', name:'Catamaran Privado', category:'LUJO Y PRIVADOS', defaultPrice:18000, priceUnit:'por tour', defaultTime:'10:00 AM', meetingPoint:'Muelle Principal', active:true},
  {id:'yate', name:'Tour en Yate Privado', category:'LUJO Y PRIVADOS', defaultPrice:25000, priceUnit:'por tour', defaultTime:'10:00 AM', meetingPoint:'Muelle Principal', active:true},
  {id:'chichen', name:'Tour Chichen Itza', category:'FULL DAY TIERRA', defaultPrice:2200, priceUnit:'por persona', defaultTime:'05:00 AM', meetingPoint:'Muelle Principal', active:true},
  {id:'carrito24', name:'Renta de Carrito de Golf 24 Horas', category:'FULL DAY TIERRA', defaultPrice:1800, priceUnit:'Flexible (24 Horas)', defaultTime:'Flexible', meetingPoint:'Centro Holbox', active:true},
  {id:'carritohora', name:'Renta de Carrito de Golf por Hora', category:'FULL DAY TIERRA', defaultPrice:350, priceUnit:'Por hora convenida', defaultTime:'Flexible', meetingPoint:'Centro Holbox', active:true},
  {id:'bici', name:'Renta de Bicicleta Playera', category:'FULL DAY TIERRA', defaultPrice:250, priceUnit:'Día completo', defaultTime:'08:00 AM - 08:00 PM', meetingPoint:'Centro Holbox', active:true},
  {id:'trasladocancun', name:'Traslado Terrestre Cancun Aeropuerto', category:'TRANSPORTE Y TRASLADOS', defaultPrice:1800, priceUnit:'por servicio', defaultTime:'A coordinar', meetingPoint:'Holbox-Aeropuerto', active:true},
  {id:'tourchichenpriv', name:'Tour Privado Chichen Itza & Cenote', category:'TRANSPORTE Y TRASLADOS', defaultPrice:4500, priceUnit:'por persona', defaultTime:'06:00 AM', meetingPoint:'Muelle Principal', active:true},
  {id:'transcompartido', name:'Transporte Compartido', category:'TRANSPORTE Y TRASLADOS', defaultPrice:700, priceUnit:'por persona', defaultTime:'Varios', meetingPoint:'Holbox-Chiquila', active:true},
  {id:'transmerida', name:'Transporte Privado Merida', category:'TRANSPORTE Y TRASLADOS', defaultPrice:6000, priceUnit:'por servicio', defaultTime:'A coordinar', meetingPoint:'Holbox-Merida', active:true}
];
