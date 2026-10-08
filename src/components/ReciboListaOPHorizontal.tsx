import React from 'react';
import { Sale, BusinessConfig } from '../types';

interface ReciboListaOPHorizontalProps {
  config: BusinessConfig;
  sales: Sale[];
  targetDate: string;
  dia: string;
  tourFiltro: string;
  totalPax: number;
  getShortName: (name: string) => string;
  getTourBadgeColor: (name: string) => string;
}

export const ReciboListaOPHorizontal: React.FC<ReciboListaOPHorizontalProps> = ({
  config,
  sales,
  targetDate,
  dia,
  tourFiltro,
  totalPax,
  getShortName,
  getTourBadgeColor
}) => {
  const getLogo = () => {
    const c: any = config || {};
    if (c.logo) return c.logo;
    if (c.logoUrl) return c.logoUrl;
    if (c.businessLogo) return c.businessLogo;
    if (c.businessLogoUrl) return c.businessLogoUrl;
    try {
      const ls = localStorage.getItem('business_config');
      if (ls) { const p = JSON.parse(ls); if (p.logo) return p.logo; if (p.logoUrl) return p.logoUrl; }
      const ls2 = localStorage.getItem('holbox_logo'); if (ls2) return ls2;
      const ls3 = localStorage.getItem('settings'); if (ls3) { const p = JSON.parse(ls3); if (p.logo) return p.logo; if (p.logoUrl) return p.logoUrl; }
      const ls4 = localStorage.getItem('ht_config'); if (ls4) { const p = JSON.parse(ls4); if (p.logo) return p.logo; if (p.logoUrl) return p.logoUrl; }
    } catch {}
    return null;
  };

  const nombre = config.owner || (config as any).nombrePropietaria || (config as any).propietaria || (config as any).ownerName || 'Judith Torres';
  const tel = config.phone || (config as any).telefono || (config as any).tel || '9984033303';
  const correo = config.email || (config as any).correo || 'ferrerdf75@gmail.com';
  const empresa = (config as any).nombreEmpresa || config.name || (config as any).companyName || 'HOLBOX TOURS LA COLOMBIANA';
  const slogan = (config as any).slogan || 'Descubre, Explora y Vive - Isla Holbox, México';

  const esHoy = dia === 'Hoy';
  const targetDateObj = targetDate ? new Date(targetDate + 'T12:00:00') : new Date();
  const fechaLarga = targetDateObj.toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const fechaCorta = targetDateObj.toLocaleDateString('es-MX');
  const titulo1 = esHoy ? 'LISTA DE TOURS PROGRAMADOS PARA HOY' : (dia === 'Mañana' ? 'LISTA DE TOURS PROGRAMADOS PARA MAÑANA' : 'LISTA DE TOURS PROGRAMADOS');

  return (
    <div className="recibo-horizontal bg-white p-4 max-w-[1050px] mx-auto border rounded-xl overflow-hidden font-sans">
      <div className="header flex justify-between items-center pb-3 border-b-2 border-[#1e3a5f]">
        <div className="header-left flex gap-3 items-center">
          {getLogo() ? (
            <img src={getLogo()} crossOrigin="anonymous" style={{width: '68px', height:'68px', objectFit:'contain', borderRadius:'6px'}} alt="Logo" onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display='none' }} />
          ) : (
            <div style={{width:'68px', height:'68px', display:'flex', alignItems:'center', justifyContent:'center', background:'#f1f5f9', borderRadius:'6px'}}>🌴</div>
          )}
          <div>
            <p className="header-title text-[#1e3a5f] font-black text-sm m-0">{empresa}</p>
            <p className="header-sub text-red-700 text-xs italic m-0">{slogan}</p>
            <p className="header-contact text-[10px] text-slate-700 m-0">{nombre} • Tel: {tel} • {correo}</p>
          </div>
        </div>
        <div className="text-right text-xs">
          <b>Fecha: {fechaCorta}</b><br/>
          Total PAX: {totalPax}
        </div>
      </div>
      <div className="titulo-central text-center bg-slate-50 py-2.5 border-b my-2">
        <h2 className="m-0 text-[15px] font-black text-[#0f172a]">{titulo1}</h2>
        <p className="m-0 text-xs font-semibold text-slate-600 capitalize">{fechaLarga} - Total PAX: {totalPax} {tourFiltro !== 'Todos' ? `• ${tourFiltro}` : ''}</p>
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#2c4a6b] text-white">
            <th className="py-2 px-1.5 text-left text-[10px]">Folio</th>
            <th className="py-2 px-1.5 text-left text-[10px]">Tour</th>
            <th className="py-2 px-1.5 text-left text-[10px]">Hora</th>
            <th className="py-2 px-1.5 text-left text-[10px]">Cliente</th>
            <th className="py-2 px-1.5 text-center text-[10px]">PAX</th>
            <th className="py-2 px-1.5 text-left text-[10px]">Tel</th>
            <th className="py-2 px-1.5 text-left text-[10px]">Hotel</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sales.map(sale => {
            const tName = sale.tourName || sale.servicios?.[0]?.nombre || '';
            return (
              <tr key={sale.id} className="hover:bg-slate-50">
                <td className="py-1.5 px-1.5 font-mono text-blue-600 font-semibold">{sale.folio}</td>
                <td className="py-1.5 px-1.5">
                  <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold inline-block ${getTourBadgeColor(tName)}`}>
                    {getShortName(tName)}
                  </span>
                </td>
                <td className="py-1.5 px-1.5">{sale.tourTime}</td>
                <td className="py-1.5 px-1.5 font-medium">{sale.clientName}</td>
                <td className="py-1.5 px-1.5 text-center font-bold">{sale.passengerCount}</td>
                <td className="py-1.5 px-1.5">{sale.clientPhone}</td>
                <td className="py-1.5 px-1.5">{sale.clientHotel || sale.meetingPoint || '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="footer bg-slate-50 p-2 text-center text-[10px] text-slate-600 border-t-2 border-[#1e3a5f] mt-3">
        Propietaria: {nombre} • Isla Holbox • Total PAX: {totalPax} • {tel} • Generado: {new Date().toLocaleString('es-MX')}
      </div>
    </div>
  );
};
