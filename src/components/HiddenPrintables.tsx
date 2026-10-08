import React from 'react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import { QRCodeCanvas } from 'qrcode.react';
import { Sale, BusinessConfig } from '../types';
import { formatCurrency, formatDateTimeSimple } from '../utils/formatters';
import { ReciboMediaCartaDesglosado } from './ReciboMediaCartaDesglosado';

// Helper para convertir número a letras en pesos mexicanos
function convertirNumeroALetras(amount: number): string {
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

  if (resto > 0) {
    resultado += seccion(resto);
  }

  return `${resultado.trim()} PESOS ${centavosStr}/100 M.N.`.trim();
}

export const HiddenPrintables = ({ sale, config }: { sale: Sale; config: BusinessConfig }) => {
  if (!sale) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        width: '850px',
        height: 'auto',
        overflow: 'visible',
        background: '#fff',
      }}
    >
      {/* TICKET 58mm MONOCROMÁTICO V5.8 - DESGLOSADO LÍNEA POR LÍNEA */}
      <div
        id="ticket-captura-print"
        style={{
          width: '302px',
          background: '#fff',
          color: '#000',
          padding: '10px',
          fontFamily: '"Arial Narrow", Arial, Helvetica, sans-serif',
          boxSizing: 'border-box',
          imageRendering: 'crisp-edges',
          WebkitFontSmoothing: 'none'
        }}
      >
        <div style={{ textAlign: 'center', lineHeight: '1.1', marginBottom: '4px' }}>
          <img src="/logo-tiket-final.jpg" style={{ width: '34mm', height: 'auto', display: 'block', margin: '0 auto 3px auto' }} crossOrigin="anonymous" alt="Logo" />
          <p style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '1px', margin: '0', lineHeight: '1.1', color: '#000' }}>HOLBOX TOURS</p>
          <p style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '1px', margin: '1px 0 0 0', lineHeight: '1.1', color: '#000' }}>LA COLOMBIANA</p>
          <p style={{ fontSize: '8.5px', fontWeight: 600, margin: '4px 0 0 0', color: '#000' }}>Julieth Torres • Holbox, Q. Roo</p>
          <p style={{ fontSize: '8.5px', fontWeight: 600, margin: '0', color: '#000' }}>Tel: 9984033303</p>
        </div>
        <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

        {/* METADATOS CLAROS */}
        <div style={{ fontSize: '10px', fontWeight: 600, lineHeight: '14px', color: '#000' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Fecha:</span><span>{sale.createdAt ? formatDateTimeSimple(sale.createdAt) : `${sale.tourDate} ${sale.tourTime || ''}`}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Folio:</span><span style={{ fontWeight: 900, fontSize: '12px' }}>{sale.folio}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cliente:</span><span>{sale.clientName}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tel:</span><span>{sale.clientPhone || 'Sin tel.'}</span></div>
          {sale.meetingPoint && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span>Punto:</span>
              <span style={{ fontWeight: 600 }}>{sale.meetingPoint}</span>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

        {/* ENCABEZADO DE TABLA: CANT  DESCRIPCIÓN         SUBTOTAL */}
        <div style={{ display: 'flex', fontSize: '9px', fontWeight: 900, borderBottom: '1px solid #000', paddingBottom: '2px', color: '#000' }}>
          <span style={{ width: '22px' }}>CANT</span>
          <span style={{ flex: 1, paddingLeft: '4px' }}>DESCRIPCIÓN</span>
          <span style={{ width: '82px', textAlign: 'right' }}>SUBTOTAL</span>
        </div>

        {/* LISTADO DESGLOSADO LÍNEA POR LÍNEA */}
        <div style={{ padding: '4px 0', borderBottom: '1px dashed #000' }}>
          {(sale.servicios && sale.servicios.length > 0
            ? sale.servicios
            : [
                {
                  nombre: sale.tourName,
                  cantidad: sale.passengerCount || 1,
                  precioUnitario: sale.unitPrice || sale.total,
                  subtotal: sale.subtotal || sale.total,
                  fechaServicio: sale.tourDate,
                },
              ]
          ).map((srv, idx) => (
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

        <div style={{ marginTop: '8px', fontSize: '10px', lineHeight: '16px', fontWeight: 600, color: '#000' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
            <span>TOTAL:</span>
            <span>{formatCurrency(sale.total)} MXN</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>ANTICIPO:</span>
            <span style={{ fontWeight: 700 }}>{formatCurrency(sale.advancePayment)}</span>
          </div>
          <div style={{ border: '1px solid #000', padding: '3px', marginTop: '4px', fontWeight: 900, fontSize: '12px' }} className="flex justify-between">
            <span>SALDO:</span>
            <span>{formatCurrency(sale.balance)}</span>
          </div>
        </div>

        {/* QR + FIRMA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', borderTop: '1px dashed #000', paddingTop: '6px', gap: '8px' }}>
          <div style={{ width: '60px' }}>
            <QRCodeCanvas value={sale.folio} size={60} bgColor="#fff" fgColor="#000" level="H" />
          </div>
          <div style={{ flex: 1, textAlign: 'center', fontSize: '9px', fontWeight: 600, color: '#000' }}>
            <p style={{ margin: '0 0 2px 0' }}>FIRMA</p>
            {sale.clientSignature || sale.firma?.base64 ? (
              <img src={sale.firma?.base64 || sale.clientSignature} style={{ width: '80px', height: '30px', margin: '0 auto', borderBottom: '1px solid #000' }} />
            ) : (
              <div style={{ height: '30px', borderBottom: '1px solid #000' }} />
            )}
            <p style={{ margin: '2px 0 0 0' }}>{sale.clientName}</p>
          </div>
        </div>

        {/* POLÍTICAS PARA TICKET */}
        {(() => {
          const rawHtml = (config as any)?.ticketFooterNotes || '';
          if (!rawHtml) return null;
          let texto = rawHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p><p>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ');
          let lineas = texto.split('\n').map((s:string)=>s.trim()).filter((s:string)=>s.length>5);
          lineas = lineas.filter((l:string)=> !l.toLowerCase().includes('favor de presentarse') && !l.toLowerCase().includes('políticas de cancelac') && !l.toLowerCase().includes('politicas de cancelac'));
          return (
            <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1.5px dashed black', fontSize: '10px', lineHeight: '1.3', color: '#000' }}>
              <p style={{ textAlign: 'center', fontWeight: 900, fontSize: '10px', margin: '0 0 4px 0' }}>POLÍTICAS DE CANCELACIÓN</p>
              <ol style={{ paddingLeft: '14px', margin: 0, fontSize: '10px', lineHeight: '1.30', color: '#000', textAlign: 'justify' }}>
                {lineas.map((linea:string, i:number)=>{
                  const idx = linea.indexOf(':');
                  let titulo = linea;
                  let desc = '';
                  if (idx > 0) {
                    titulo = linea.substring(0, idx+1);
                    desc = linea.substring(idx+1).trim();
                  }
                  return (
                    <li key={i} style={{ marginBottom: '4px', textAlign: 'justify' }}>
                      <span style={{ fontWeight: 800 }}>{titulo}</span>
                      {desc ? <span style={{ fontWeight: 400 }}> {desc}</span> : null}
                    </li>
                  );
                })}
              </ol>
              <p style={{ textAlign: 'center', marginTop: '6px', fontSize: '9px', fontWeight: 700 }}>Favor de presentarse 15 min antes de la hora indicada.</p>
            </div>
          );
        })()}
        <p style={{ textAlign: 'center', fontSize: '10px', marginTop: '10px', fontWeight: 900 }}>
          ✂ - - - - - - - - - - - - - - -
        </p>
      </div>

      {/* RECIBO MEDIA CARTA 816px DESGLOSADO OFICIAL */}
      <ReciboMediaCartaDesglosado
        folio={sale}
        config={config}
        idPrint="media-carta-captura-print"
      />
    </div>
  );
};

export const exportarCompleto = async (idPrint: string, folio: string, tipo: 'png' | 'pdf') => {
  const el = document.getElementById(idPrint) as HTMLElement;
  if (!el) return;

  // Espera que cargue el logo y QR
  await new Promise((r) => setTimeout(r, 500));

  // FIX anti-rayas
  const canvas = await html2canvas(el, {
    scale: 3,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    allowTaint: false,
    onclone: (doc) => {
      doc.querySelectorAll('*').forEach((el: any) => {
        el.style.textRendering = 'optimizeLegibility';
      });
    },
  });

  const imgData = canvas.toDataURL('image/png', 1.0);

  if (tipo === 'png') {
    const a = document.createElement('a');
    a.download = `${idPrint}-${folio}.png`;
    a.href = imgData;
    a.click();
    return;
  }

  const isTicket = idPrint.includes('ticket');
  if (isTicket) {
    const pdfW = 58;
    const pdfH = (canvas.height * pdfW) / canvas.width;
    const pdf = new jsPDF({ unit: 'mm', format: [pdfW, pdfH + 5], orientation: 'portrait' });
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH, undefined, 'FAST');
    pdf.save(`Ticket-${folio}-58mm.pdf`);
  } else {
    const pdf = new jsPDF('p', 'mm', 'a5');
    const pdfW = pdf.internal.pageSize.getWidth();
    const imgH = (canvas.height * pdfW) / canvas.width;
    let hLeft = imgH;
    let pos = 0;
    pdf.addImage(imgData, 'PNG', 0, pos, pdfW, imgH, undefined, 'FAST');
    hLeft -= pdf.internal.pageSize.getHeight();
    while (hLeft > 0) {
      pos = hLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, pos, pdfW, imgH, undefined, 'FAST');
      hLeft -= pdf.internal.pageSize.getHeight();
    }
    pdf.save(`Recibo-${folio}-MediaCarta.pdf`);
  }
};

export const generarTicketTermico = async (folio: string, tipo: 'png' | 'pdf' = 'pdf') => {
  return exportarCompleto('ticket-captura-print', folio, tipo);
};

export const generarPDFMediaCarta = async (folio: string) => {
  return exportarCompleto('media-carta-captura-print', folio, 'pdf');
};

export const generarPNGMediaCarta = async (folio: string) => {
  return exportarCompleto('media-carta-captura-print', folio, 'png');
};

export const generarReciboPNG = async (idPrint: string = 'media-carta-captura-print'): Promise<Blob | null> => {
  const el = document.getElementById(idPrint) as HTMLElement;
  if (!el) return null;
  await new Promise((r) => setTimeout(r, 500));
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    allowTaint: false,
  });
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
  });
};

