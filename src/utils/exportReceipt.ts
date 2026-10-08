import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const exportarCompleto = async (idPrint: string, folio: string, tipo: 'png'|'pdf') => {
  const el = document.getElementById(idPrint) as HTMLElement;
  if(!el) return;
  
  // Espera que cargue el QR canvas
  await new Promise(r=>setTimeout(r, 800));
  
  // FIX anti-rayas: scale 1 y limitar tamaño
  const canvas = await html2canvas(el, {
    scale: 1, // NO 1.5, NO 2 - 1 para evitar el glitch de tu captura
    useCORS: true,
    backgroundColor: '#ffffff',
    width: el.offsetWidth,
    height: el.offsetHeight,
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
    logging: false,
    allowTaint: false,
    foreignObjectRendering: false,
  });
  
  const imgData = canvas.toDataURL('image/png', 1.0);
  
  if(tipo==='png'){
    const a=document.createElement('a');
    a.download=`${idPrint}-${folio}.png`;
    a.href=imgData;
    a.click();
    return;
  }
  
  const isTicket = idPrint.includes('ticket');
  if(isTicket){
    const pdfW=58;
    const pdfH=(canvas.height*pdfW)/canvas.width;
    const pdf=new jsPDF({unit:'mm', format:[pdfW, pdfH+5], orientation:'portrait'});
    pdf.addImage(imgData,'PNG',0,0,pdfW,pdfH,undefined,'FAST');
    pdf.save(`Ticket-${folio}-58mm.pdf`);
  } else {
    const pdf=new jsPDF('p','mm','a5');
    const pdfW=pdf.internal.pageSize.getWidth();
    const imgH=(canvas.height*pdfW)/canvas.width;
    let hLeft=imgH;
    let pos=0;
    pdf.addImage(imgData,'PNG',0,pos,pdfW,imgH,undefined,'FAST');
    hLeft-=pdf.internal.pageSize.getHeight();
    while(hLeft>0){
      pos=hLeft-imgH;
      pdf.addPage();
      pdf.addImage(imgData,'PNG',0,pos,pdfW,imgH,undefined,'FAST');
      hLeft-=pdf.internal.pageSize.getHeight();
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

