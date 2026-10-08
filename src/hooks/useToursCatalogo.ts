import { useState, useEffect } from 'react';
import { BASE_TOURS } from '../data/defaultTours';

export interface TourCatalogoItem {
  id: string;
  titulo?: string;
  name?: string;
  subtitulo?: string;
  descripcion?: string;
  precio?: number;
  precio_base?: number;
  defaultPrice?: number;
  activo?: boolean;
  active?: boolean;
  categoria?: string;
  category?: string;
  horario?: string;
  defaultTime?: string;
  punto_encuentro?: string;
  meetingPoint?: string;
  providerCost?: number;
  providerType?: string;
  [key: string]: any;
}

const getCatalogoFromStorage = (): TourCatalogoItem[] => {
  try {
    const raw = localStorage.getItem('tours_catalog') || localStorage.getItem('ht_tours') || localStorage.getItem('holbox_tours');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return BASE_TOURS as TourCatalogoItem[];
};

export const useToursCatalogo = () => {
  const [catalogo, setCatalogo] = useState<TourCatalogoItem[]>(getCatalogoFromStorage);

  useEffect(() => {
    const handler = () => {
      setCatalogo(getCatalogoFromStorage());
    };

    window.addEventListener('catalogo-actualizado', handler);
    window.addEventListener('storage', handler);

    return () => {
      window.removeEventListener('catalogo-actualizado', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return catalogo.filter((t: any) => t.activo !== false && t.active !== false);
};

export default useToursCatalogo;
