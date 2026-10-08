import React, { useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Sale, BusinessConfig } from '../types';
import {
  formatDateSpanish,
  formatDateTimeSimple,
} from '../utils/formatters';

// Formato de dinero SIN signo $ para evitar doble $$ en JSX
const formatoDinero = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : Number(String(val || 0).replace(/[^0-9.-]+/g, '')) || 0;
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

interface ReciboMediaCartaDesglosadoProps {
  folio: Sale;
  config?: BusinessConfig;
  className?: string;
  idPrint?: string;
}

export const ReciboMediaCartaDesglosado: React.FC<ReciboMediaCartaDesglosadoProps> = ({
  folio,
  config,
  className = '',
  idPrint = 'recibo-media-carta',
}) => {
  if (!folio) return null;

  const saleDate =
    folio.createdAt
      ? formatDateTimeSimple(folio.createdAt).split(' ')[0]
      : folio.tourDate || '22/09/2026';

  const logoSrc = useMemo(() => {
    try {
      return localStorage.getItem('holbox_logo') || (config as any)?.businessLogo || '/logo-holbox-oficial.png';
    } catch {
      return (config as any)?.businessLogo || '/logo-holbox-oficial.png';
    }
  }, [config]);

  const advanceVal = folio.advancePayment ?? 0;
  const balanceVal = folio.balance ?? Math.max(0, folio.total - advanceVal);
  const signatureBase64 = folio.firma?.base64 || folio.clientSignature;

  // Extraer servicios desglosados - NUNCA un texto resumido cortado
  const servicios =
    folio.servicios && folio.servicios.length > 0
      ? folio.servicios
      : [
          {
            cantidad: folio.passengerCount || 1,
            nombre: folio.tourName || 'Tour General',
            precioUnitario: folio.unitPrice || folio.total,
            subtotal: folio.subtotal || folio.total,
            fechaServicio: folio.tourDate || saleDate,
          },
        ];

  return (
    <div
      id={idPrint || 'recibo-media-carta'}
      className={`w-[5.5in] min-h-[8.5in] h-auto bg-white p-4 flex flex-col overflow-visible print:min-h-[8.5in] text-slate-800 shadow-md font-['Arial'] select-none sm:select-auto ${className}`}
      style={{
        width: '5.5in',
        minHeight: '8.5in',
        height: 'auto',
        overflow: 'visible',
        backgroundColor: '#ffffff',
        color: '#1e293b',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. HEADER LA COLOMBIANA CON LOGO */}
      <div className="flex items-start justify-between gap-4 pb-2 border-b-2 border-[#1e3a8a]">
        <img
          src={logoSrc}
          alt="Holbox Tours"
          width={70}
          height={70}
          style={{ width: '70px', height: '70px', minWidth: '70px', objectFit: 'contain', display: 'block' }}
          className="shrink-0 rounded-lg bg-white"
          loading="eager"
          decoding="sync"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/logo-holbox-oficial.png';
          }}
        />
        <div className="flex-1 pt-1 min-w-0">
          <h1 className="text-[15px] font-black text-[#1e3a8a] tracking-tight leading-none font-['Arial'] whitespace-nowrap">HOLBOX TOURS LA COLOMBIANA</h1>
          <p className="text-[10px] italic font-bold text-[#7D0A2F] mt-1">Descubre, Explora y Vive - Isla Holbox, México</p>
          <p className="text-[9px] text-black font-normal mt-1 truncate">Judith Torres • Tel: 9984033303 • ferrerdt75@gmail.com</p>
        </div>
        <div className="w-[110px] shrink-0 border-2 border-[#1e3a8a] rounded-lg overflow-hidden text-center">
          <div className="bg-[#1e3a8a] text-white text-[12px] font-black py-1.5 tracking-widest">FOLIO</div>
          <div className="bg-white text-black text-[10px] font-mono font-bold py-2">{folio.folio}</div>
        </div>
      </div>
      <div className="flex justify-end mt-1">
        <p className="text-[10px]">
          <span className="text-[#1e3a8a] font-black">Fecha:</span> <span className="text-[#222] font-bold">{new Date().toLocaleDateString('es-MX')}</span>
        </p>
      </div>

      {/* DATOS DEL CLIENTE */}
      <div className="bg-white border-2 border-slate-300 rounded-md px-3 py-2 mt-3 flex gap-6 text-[10.5px] font-['Arial']">
        <p><span className="font-black text-[#1e3a8a]">Cliente:</span> <span className="font-bold text-black">{folio.clientName}</span></p>
        <p><span className="font-black text-[#1e3a8a]">Tel:</span> {folio.clientPhone || 'Sin tel.'}</p>
        <p><span className="font-black text-[#1e3a8a]">Hotel:</span> {folio.clientHotel || 'No especificado'}</p>
      </div>

      {/* 3. TABLA DESGLOSADA EXACTA */}
      <table className="w-full mt-4 text-[13px] border-collapse min-h-[200px] flex-1">
        <thead className="text-[10px] font-black bg-[#1e3a8a] text-white">
          <tr>
            <th className="py-1.5 w-[22px]">#</th>
            <th className="py-1.5 text-left">Servicio</th>
            <th className="py-1.5 w-[35px]">Cant</th>
            <th className="py-1.5 w-[75px]">P.Unit</th>
            <th className="py-1.5 w-[80px] text-right pr-2">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {servicios.map((s, i) => {
            const parts = s.nombre.split('(');
            const nombreTour = parts[0].trim();
            const detalle = parts[1] ? '(' + parts[1] : '';

            return (
              <tr key={i} className="py-2.5 border-b">
                <td className="py-2.5 text-center text-[11px] font-bold text-black">{i + 1}</td>
                <td className="py-2.5 px-1 leading-tight">
                  <p className="text-[8.5px] font-bold text-[#1e3a8a] uppercase">{new Date(s.fechaServicio || saleDate).toLocaleDateString('es-MX', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}</p>
                  <p className="text-[10.5px] font-black text-black leading-tight">{nombreTour}</p>
                  <p className="text-[8.5px] text-slate-700">{detalle}</p>
                </td>
                <td className="py-2.5 text-center text-[11px] font-bold text-black">{s.cantidad}</td>
                <td className="py-2.5 text-center text-[11px] font-bold text-black">${formatoDinero(s.precioUnitario)}</td>
                <td className="py-2.5 text-right pr-2 text-[11px] font-bold text-black">${formatoDinero(s.subtotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* === BLOQUE INFERIOR ALINEADO - LINEA VERDE ES EL TOPE === */}
      <div className="mt-2 flex flex-col flex-1 justify-between">

        {/* FILA INFERIOR - QR | FIRMA | TOTALES */}
        <div className="flex justify-between items-start mt-6 gap-8">
          <div className="text-center p-2">
            <QRCodeCanvas value={folio.folio} size={80} />
            <p className="text-[7px] font-mono mt-1 font-bold">{folio.folio}</p>
          </div>
          
          <div className="w-[220px] flex flex-col items-center justify-end mt-10">
            {signatureBase64 && <img src={signatureBase64} className="max-h-[55px] mb-[2px]" />}
            <div className="w-full border-t border-black mb-[4px]"></div>
            <p className="text-[10px] font-black">Firma {folio.clientName}</p>
          </div>
          
          <div className="w-[200px] ml-auto border border-[#d1d5db]">
            <div className="flex h-[26px] border-b border-[#d1d5db]">
              <div className="w-[70px] bg-[#1e3a8a] text-white text-[10px] font-extrabold px-1 flex items-center justify-center whitespace-nowrap overflow-hidden">TOTAL</div>
              <div className="flex-1 bg-[#f8f9fa] text-[#000000] text-[11px] font-bold px-2 flex items-center justify-end whitespace-nowrap overflow-hidden tracking-tight">
                {formatoDinero(folio.total)} MXN
              </div>
            </div>
            <div className="flex h-[26px] border-b border-[#d1d5db]">
              <div className="w-[70px] bg-[#1e3a8a] text-white text-[10px] font-extrabold px-1 flex items-center justify-center whitespace-nowrap overflow-hidden">ANTICIPO</div>
              <div className="flex-1 bg-[#f8f9fa] text-[#000000] text-[11px] font-bold px-2 flex items-center justify-end whitespace-nowrap overflow-hidden tracking-tight">
                {formatoDinero(advanceVal || 0)} MXN
              </div>
            </div>
            <div className="flex h-[26px]">
              <div className="w-[70px] bg-[#1e3a8a] text-white text-[10px] font-extrabold px-1 flex items-center justify-center whitespace-nowrap overflow-hidden">SALDO</div>
              <div className="flex-1 bg-[#f8f9fa] text-[#000000] text-[11px] font-bold px-2 flex items-center justify-end whitespace-nowrap overflow-hidden tracking-tight">
                {formatoDinero(balanceVal)} MXN
              </div>
            </div>
          </div>
        </div>

        {/* PIE DE PAGINA - TODO LO ANCHO - RESPETA ENTERS */}
        <div className="mt-auto pt-6 border-t">
          {(() => {
            const rawHtml = (config as any)?.ticketFooterNotes || (config as any)?.politicasCancelacion || '';
            if (!rawHtml) return null;
            let texto = rawHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p><p>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ');
            let lineas = texto.split('\n').map((s:string)=>s.trim()).filter((s:string)=>s.length>5);
            lineas = lineas.filter((l:string)=> {
              const low = l.toLowerCase();
              return !low.startsWith('favor de presentarse') && !low.includes('dinero está asegurado') && !low.includes('politicas de cancelacion, en tour');
            });

            return (
              <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '2px dashed #1e3a8a', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <p style={{ textAlign: 'center', fontWeight: 900, fontSize: '12px', margin: '0 0 10px 0', color: '#1e3a8a', letterSpacing: '0.5px' }}>POLÍTICAS DE CANCELACIÓN</p>
              <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '10.5px', lineHeight: '1.30', color: '#000', textAlign: 'justify' }}>
                {lineas.map((linea:string, i:number)=>{
                  const idx = linea.indexOf(':');
                  let titulo = linea;
                  let desc = '';
                  if (idx > 0) {
                    titulo = linea.substring(0, idx+1);
                    desc = linea.substring(idx+1).trim();
                  }
                  return (
                    <li key={i} style={{ marginBottom: '4px', textAlign: 'justify', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <span style={{ fontWeight: 800 }}>{titulo}</span>
                      {desc ? <span style={{ fontWeight: 400 }}> {desc}</span> : null}
                    </li>
                  );
                })}
              </ol>
                <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '10.5px', fontWeight: 700 }}>Favor de presentarse 15 minutos antes de la hora indicada.</p>
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
};



