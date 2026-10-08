import React from 'react';
import { PreviewTicketTermico } from './PreviewTicketTermico';
import { Sale, BusinessConfig } from '../types';

interface PreviewTicketFinalProps {
  folio?: Sale;
  sale?: Sale;
  data?: Sale;
  config?: BusinessConfig;
}

export function PreviewTicketFinal({
  folio,
  sale,
  data,
  config,
}: PreviewTicketFinalProps) {
  const activeFolio = folio || sale || data;
  if (!activeFolio) return null;

  return (
    <div
      className="w-full flex justify-center bg-gray-100 dark:bg-slate-900 p-3 overflow-x-hidden"
      style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
    >
      <div
        id="recibo-ticket-termico"
        style={{ width: '302px', minWidth: '302px', maxWidth: '100%', margin: '0 auto' }}
      >
        <PreviewTicketTermico folio={activeFolio} config={config} />
      </div>
    </div>
  );
}

export const Ticket80mm = PreviewTicketTermico;
export default PreviewTicketFinal;
