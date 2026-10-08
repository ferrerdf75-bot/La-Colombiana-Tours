import React from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ReciboMediaCartaDesglosado } from './ReciboMediaCartaDesglosado';
import { Sale, BusinessConfig } from '../types';

interface PreviewReciboFinalProps {
  folio?: Sale;
  sale?: Sale;
  data?: Sale;
  config?: BusinessConfig;
  idPrint?: string;
}

export function PreviewReciboFinal({
  folio,
  sale,
  data,
  config,
  idPrint = 'recibo-media-carta',
}: PreviewReciboFinalProps) {
  const activeFolio = folio || sale || data;

  if (!activeFolio) return null;

  return (
    <div className="w-full bg-[#f1f5f9] dark:bg-slate-900 rounded-xl p-2 overflow-hidden flex flex-col items-center">
      <TransformWrapper
        initialScale={0.7}
        minScale={0.5}
        maxScale={3.5}
        limitToBounds={false}
        centerOnInit={true}
        centerZoomedOut={true}
        pinch={{ step: 5 }}
        doubleClick={{ mode: 'reset' }}
        panning={{
          velocityDisabled: true, // Queda completamente fijo al soltar el paneo
          lockAxisX: false,
          lockAxisY: false,
          excluded: ['button'],
        }}
        wheel={{ disabled: true }}
      >
        <TransformComponent
          wrapperStyle={{
            width: '100%',
            maxHeight: '75vh',
            minHeight: '380px',
            background: '#e2e8f0',
            borderRadius: '12px',
            overflow: 'auto',
          }}
          contentStyle={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            padding: '16px',
            minHeight: '100%',
          }}
        >
          <div
            className="bg-white shadow-2xl rounded-lg overflow-visible"
            style={{
              width: '5.5in',
              minWidth: '5.5in',
              maxWidth: 'none',
              transformOrigin: 'top center',
            }}
          >
            <ReciboMediaCartaDesglosado folio={activeFolio} config={config} idPrint={idPrint} />
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}

export default PreviewReciboFinal;
