import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Sale, BusinessConfig } from '../types';
import {
  formatCurrency,
  formatDateTimeSimple,
} from '../utils/formatters';

interface PreviewTicketTermicoProps {
  folio?: Sale;
  sale?: Sale;
  config?: BusinessConfig;
  className?: string;
  isPrintable?: boolean;
}

export const PreviewTicketTermico: React.FC<PreviewTicketTermicoProps> = ({
  folio: propFolio,
  sale: propSale,
  config,
  className = '',
  isPrintable = false,
}) => {
  const currentSale = propFolio || propSale;
  if (!currentSale) return null;

  // Extraer fecha y hora formateadas (ej: 22/09/2026 16:30)
  const fechaHora = currentSale.createdAt
    ? formatDateTimeSimple(currentSale.createdAt)
    : `${currentSale.tourDate || '22/09/2026'} ${currentSale.tourTime || '09:00'}`;

  // Extraer lista de servicios desglosados línea por línea (sin resúmenes)
  const servicios =
    currentSale.servicios && currentSale.servicios.length > 0
      ? currentSale.servicios
      : [
          {
            cantidad: currentSale.passengerCount || 1,
            nombre: currentSale.tourName || 'Tour General',
            precioUnitario: currentSale.unitPrice || currentSale.total,
            subtotal: currentSale.subtotal || currentSale.total,
            fechaServicio: currentSale.tourDate,
            horaServicio: currentSale.tourTime,
            puntoEncuentro: currentSale.meetingPoint,
          },
        ];

  const advanceVal = currentSale.advancePayment ?? 0;
  const balanceVal = currentSale.balance ?? (currentSale.total - advanceVal);
  const signatureBase64 = currentSale.firma?.base64 || currentSale.clientSignature;

  return (
    <div
      className={`bg-white text-black p-[10px] select-none text-left shadow-md rounded-lg ${className}`}
      style={{
        width: '302px',
        minWidth: '302px',
        maxWidth: '302px',
        margin: '0 auto',
        fontFamily: '"Arial Narrow", Arial, Helvetica, sans-serif',
        fontSize: '10px',
        lineHeight: '1.2',
        color: '#000000',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        imageRendering: 'crisp-edges',
        WebkitFontSmoothing: 'none'
      }}
    >
      {/* 1. ENCABEZADO COMPACTO */}
      <div style={{ textAlign: 'center', lineHeight: '1.1', marginBottom: '4px' }}>
        <img src="/logo-tiket-final.jpg" style={{ width: '34mm', height: 'auto', display: 'block', margin: '0 auto 3px auto' }} crossOrigin="anonymous" alt="Logo" />
        <p style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '1px', margin: '0', lineHeight: '1.1', color: '#000' }}>HOLBOX TOURS</p>
        <p style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '1px', margin: '1px 0 0 0', lineHeight: '1.1', color: '#000' }}>LA COLOMBIANA</p>
        <p style={{ fontSize: '8.5px', fontWeight: 600, margin: '4px 0 0 0', color: '#000' }}>Julieth Torres • Holbox, Q. Roo</p>
        <p style={{ fontSize: '8.5px', fontWeight: 600, margin: '0', color: '#000' }}>Tel: 9984033303</p>
      </div>

      {/* SEPARADOR PUNTUADO */}
      <div className="border-t border-dashed border-black my-2.5" />

      {/* 2. METADATOS OBLIGATORIOS SEGÚN ESPECIFICACIÓN */}
      <div className="text-[12px] space-y-0.5 font-bold">
        <div className="flex justify-between">
          <span>Fecha:</span>
          <span className="font-normal">{fechaHora}</span>
        </div>
        <div className="flex justify-between">
          <span>Folio:</span>
          <span className="font-black text-[13px]">{currentSale.folio}</span>
        </div>
        <div className="flex justify-between">
          <span>Cliente:</span>
          <span className="font-extrabold uppercase">{currentSale.clientName}</span>
        </div>
        <div className="flex justify-between">
          <span>Tel:</span>
          <span className="font-normal">{currentSale.clientPhone || 'Sin tel.'}</span>
        </div>
        {currentSale.meetingPoint && (
          <div className="flex justify-between text-[11px] text-slate-800 pt-0.5">
            <span>Punto:</span>
            <span className="font-normal truncate max-w-[240px]">{currentSale.meetingPoint}</span>
          </div>
        )}
      </div>

      {/* SEPARADOR PUNTUADO */}
      <div className="border-t-2 border-dashed border-black my-2.5" />

      {/* 3. TABLA DESGLOSADA OPTIMIZADA */}
      <div>
        <div style={{ display: 'flex', fontSize: '9px', fontWeight: 900, borderBottom: '1px solid #000', paddingBottom: '2px' }}>
          <span style={{ width: '22px' }}>CANT</span>
          <span style={{ flex: 1, paddingLeft: '4px' }}>DESCRIPCIÓN</span>
          <span style={{ width: '82px', textAlign: 'right' }}>SUBTOTAL</span>
        </div>

        <div className="py-1">
          {servicios.map((srv, idx) => (
            <div key={idx} style={{ marginBottom: '6px', fontSize: '10px', fontWeight: 600, color: '#000' }}>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '22px', fontWeight: 900 }}>{srv.cantidad}x</span>
                <span style={{ flex: 1, paddingLeft: '4px', lineHeight: '1.2' }}>{srv.nombre}</span>
                <span style={{ width: '82px', textAlign: 'right', fontWeight: 900 }}>{formatCurrency(srv.subtotal)}</span>
              </div>
              {srv.precioUnitario && (
                <div style={{ fontSize: '7.5px', fontWeight: 600, color: '#000', marginLeft: '26px', marginTop: '1px' }}>
                  @ {formatCurrency(srv.precioUnitario)} c/u
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SEPARADOR PUNTUADO */}
      <div className="border-t-2 border-dashed border-black my-2.5" />

      {/* 4. TOTALES Y PAGOS (Alineados) */}
      <div className="space-y-1 text-[12px] font-bold">
        <div className="flex justify-between">
          <span>TOTAL:</span>
          <span>{formatCurrency(currentSale.total)} MXN</span>
        </div>

        <div className="flex justify-between">
          <span>ANTICIPO (USD):</span>
          <span>{formatCurrency(advanceVal)}</span>
        </div>

        <div className="border-[1.5px] border-solid border-[#000] p-[4px] mt-2 flex justify-between items-center font-bold text-[14px]">
          <span>SALDO PENDIENTE:</span>
          <span>{formatCurrency(balanceVal)}</span>
        </div>
      </div>

      {/* 5. QR CODE Y FIRMA DIGITAL DEL CLIENTE */}
      <div className="flex items-start justify-between mt-6 pt-2 border-t border-dashed border-black gap-[20px]">
        {/* QR IZQUIERDA (80x80px) */}
        <div className="text-center w-[80px] flex-shrink-0">
          <QRCodeCanvas
            value={`${currentSale.folio}|${currentSale.clientName}|${currentSale.total}|${currentSale.status}`}
            size={80}
            style={{ width: '80px', height: '80px', display: 'block', margin: '0 auto' }}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            includeMargin={false}
          />
        </div>

        {/* FIRMA CLIENTE DERECHA */}
        <div className="flex-1 text-center pl-2">
          <p className="text-[9px] font-bold uppercase mb-1">
            FIRMA DEL CLIENTE
          </p>
          {signatureBase64 ? (
            <div>
              <img
                src={signatureBase64}
                alt="Firma del Pasajero"
                className="w-[120px] h-[55px] object-contain mx-auto block border-b border-black"
              />
              <p className="text-[8px] text-[#000000] mt-1 font-semibold">
                {currentSale.clientName}
              </p>
            </div>
          ) : (
            <div className="h-[55px] border-b border-black w-[120px] mx-auto flex items-end justify-center pb-1">
              <span className="text-[8.5px] text-[#000000] italic">Sin firma</span>
            </div>
          )}
        </div>
      </div>

      {/* NOTAS AL PIE / POLÍTICAS */}
      <div className="mt-4 pt-2 border-t border-dashed border-black/30" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        {(() => {
          const rawHtml = (config as any)?.ticketFooterNotes || '';
          if (!rawHtml) return null;
          
          let texto = rawHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p><p>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ');
          let lineas = texto.split('\n').map((s:string)=>s.trim()).filter((s:string)=>s.length>5);

          lineas = lineas.filter((l:string)=> !l.toLowerCase().includes('favor de presentarse') && !l.toLowerCase().includes('políticas de cancelac') && !l.toLowerCase().includes('politicas de cancelac') && !l.toLowerCase().includes('dinero está asegurado'));

          return (
            <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1.5px dashed black', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <p style={{ textAlign: 'center', fontWeight: 900, fontSize: '11px', margin: '0 0 8px 0', color: '#000' }}>POLÍTICAS DE CANCELACIÓN</p>
              <ol style={{ paddingLeft: '16px', margin: 0, fontSize: '10px', lineHeight: '1.30', color: '#000', textAlign: 'justify' }}>
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
              <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '9px', fontWeight: 700 }}>Favor de presentarse 15 min antes de la hora indicada.</p>
            </div>
          );
        })()}
      </div>

      <div className="text-center text-[11px] font-bold mt-2.5 tracking-widest text-slate-500">
        ✂ - - - - - - - - - - - - - - - - - -
      </div>
    </div>
  );
};
