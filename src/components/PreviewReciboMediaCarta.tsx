import React from 'react';
import { PreviewReciboFinal } from './PreviewReciboFinal';
import { Sale, BusinessConfig } from '../types';

export default function PreviewReciboMediaCarta(props: {
  folio?: Sale;
  sale?: Sale;
  data?: Sale;
  config?: BusinessConfig;
  idPrint?: string;
}) {
  return <PreviewReciboFinal {...props} />;
}
export { PreviewReciboFinal as PreviewReciboMediaCarta };
