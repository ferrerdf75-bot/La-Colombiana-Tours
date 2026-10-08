import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Building2,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  HelpCircle,
  Share2,
  Mail,
  CloudUpload,
  Download
} from 'lucide-react';
import { BusinessConfig, TourItem, TourCategory, Sale } from '../types';
import { BASE_TOURS } from '../data/defaultTours';
import { formatCurrency, formatFolio } from '../utils/formatters';

interface SettingsViewProps {
  config: BusinessConfig;
  onSaveConfig: (config: BusinessConfig) => void;
  tours: TourItem[];
  onSaveTours: (tours: TourItem[]) => void;
  sales: Sale[];
  onSaveSales: (sales: Sale[]) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onSaveConfig,
  tours,
  onSaveTours,
  sales,
  onSaveSales,
}) => {
  // Business Config state
  const [businessFormData, setBusinessFormData] = useState<BusinessConfig>(config);
  const [tourForm, setTourForm] = useState<any>({
    titulo: '',
    descripcion: '',
    categoria: 'Náuticos',
    precio_base: '600',
    horario: '10:00 AM',
    punto_encuentro: 'Muelle Principal Holbox'
  });

  const setFormData = (val: any) => {
    if (val && typeof val === 'object' && ('titulo' in val || 'descripcion' in val || 'categoria' in val || 'precio_base' in val || 'horario' in val || 'punto_encuentro' in val)) {
      setTourForm(val);
    } else {
      setBusinessFormData(val);
    }
  };

  const formData: any = {
    ...businessFormData,
    ...tourForm
  };

  const [isSavedMsg, setIsSavedMsg] = useState(false);
  const [isRecentlySaved, setIsRecentlySaved] = useState(false);

  const [tcMulti, setTcMulti] = useState<{ USD: string | number; EUR: string | number; CAD: string | number; GBP: string | number }>(() => {
    try {
      const stored = localStorage.getItem('tcMulti');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return {
      USD: config.usdExchangeRate || 16.00,
      EUR: 17.80,
      CAD: 12.50,
      GBP: 20.10,
    };
  });

  const usarAuto = (codigo: 'USD' | 'EUR' | 'CAD' | 'GBP') => {
    let value = 16.00;
    try {
      const windowTasas = (window as any).tasasDivisas;
      if (windowTasas && windowTasas[codigo]) {
        value = Number(windowTasas[codigo].compra || value);
      } else {
        const saved = localStorage.getItem('holbox_oficiales_table');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const match = parsed.find((item: any) => item.code === codigo || item.codigo === codigo);
            if (match && match.compra) {
              value = Number(match.compra);
            }
          }
        } else {
          if (codigo === 'USD') value = 16.80;
          else if (codigo === 'EUR') value = 19.75;
          else if (codigo === 'CAD') value = 12.70;
          else if (codigo === 'GBP') value = 22.90;
        }
      }
    } catch (_) {}

    const updated = { ...tcMulti, [codigo]: value };
    setTcMulti(updated);
    try {
      localStorage.setItem('tcMulti', JSON.stringify(updated));
    } catch {}
    showToast(`🔄 TC ${codigo} actualizado a $${value} desde Divisas`);
  };

  // Clima Cache State
  const [cacheSize, setCacheSize] = useState(() => new Blob([localStorage.getItem('clima_cache') || '']).size);
  const [toast, setToast] = useState<{message: string, visible: boolean}>({ message: '', visible: false });
  const [isPressed, setIsPressed] = useState(false);

  const showToast = (msg: string) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 2500);
  };

  const handleClearWeatherCache = () => {
    setIsPressed(true);
    if (navigator.vibrate) navigator.vibrate(50);
    setTimeout(() => setIsPressed(false), 150);

    localStorage.removeItem('clima_cache');
    localStorage.removeItem('clima_cache_timestamp');
    delete (window as any).climaDataGlobal;
    setCacheSize(0);
    showToast("✅ Cache clima borrado - entra a pestaña Clima 5 seg");
  };

  const [tourToEdit, setTourToEdit] = useState<TourItem | null>(null);
  const [showTourModal, setShowTourModal] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (showTourModal && modalContainerRef.current) {
      modalContainerRef.current.scrollTop = 0;
    }
  }, [showTourModal]);
  const [tourToDelete, setTourToDelete] = useState<TourItem | null>(null);

  // Dummy states to keep legacy form code happy
  const [showAddTour, setShowAddTour] = useState(false);
  const [newTourTitulo, setNewTourTitulo] = useState('');
  const [newTourDescripcion, setNewTourDescripcion] = useState('');
  const [newTourCat, setNewTourCat] = useState<TourCategory>('TOURS ESTRELLA HOLBOX');
  const [newTourPrice, setNewTourPrice] = useState(600);
  const [newTourUnit, setNewTourUnit] = useState('por persona');
  const [newTourTime, setNewTourTime] = useState('10:00 AM');
  const [newTourMeeting, setNewTourMeeting] = useState('Muelle Principal Holbox');
  const handleAddTour = (e: any) => { e.preventDefault(); };

  // Logo state
  const [logoBase64, setLogoBase64] = useState<string | null>(() => {
    try {
      return localStorage.getItem('holbox_logo');
    } catch {
      return null;
    }
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const maxDim = 300;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setLogoBase64(dataUrl);
          try {
            localStorage.setItem('holbox_logo', dataUrl);
          } catch {}
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoBase64(null);
    try {
      localStorage.removeItem('holbox_logo');
    } catch {}
  };

  // 3-step 0km modal state
  const [show0kmModal, setShow0kmModal] = useState(false);
  const [step0km, setStep0km] = useState<1 | 2 | 3>(1);
  const [borrarInput, setBorrarInput] = useState('');
  const [captchaNum1, setCaptchaNum1] = useState(1);
  const [captchaNum2, setCaptchaNum2] = useState(1);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  const start0kmWipeFlow = () => {
    setStep0km(1);
    setBorrarInput('');
    setCaptchaAnswer('');
    setCaptchaError(null);
    setShow0kmModal(true);
  };

  const handleBackupAndContinue = () => {
    handleExportBackup();
    setStep0km(2);
    setBorrarInput('');
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (borrarInput === 'BorRAr') {
      const n1 = Math.floor(Math.random() * 9) + 1;
      const n2 = Math.floor(Math.random() * 9) + 1;
      setCaptchaNum1(n1);
      setCaptchaNum2(n2);
      setStep0km(3);
      setCaptchaAnswer('');
      setCaptchaError(null);
    }
  };

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ans = Number(captchaAnswer);
    if (ans === captchaNum1 + captchaNum2) {
      localStorage.clear();
      sessionStorage.clear();
      alert('¡Borrado seguro 0km completado con éxito!');
      window.location.reload();
    } else {
      setCaptchaError('Suma incorrecta. Inténtalo de nuevo.');
      const n1 = Math.floor(Math.random() * 9) + 1;
      const n2 = Math.floor(Math.random() * 9) + 1;
      setCaptchaNum1(n1);
      setCaptchaNum2(n2);
      setCaptchaAnswer('');
    }
  };

  // Email validation state
  const [emailError, setEmailError] = useState<string | null>(() => {
    if (config.email && config.email.trim() !== '') {
      const isGmail = /^[a-z0-9._%+-]+@gmail\.com$/i.test(config.email.trim());
      return isGmail ? null : 'Solo Gmail';
    }
    return null;
  });

  // Auto-save interval state
  const [autoSaveInterval, setAutoSaveInterval] = useState<string>(() => {
    try {
      return localStorage.getItem('holbox_autosave_interval') || 'Manual';
    } catch {
      return 'Manual';
    }
  });

  const [saveAllToast, setSaveAllToast] = useState(false);

  // Migrate existing tours if they don't have a titulo
  const processedTours = tours.map(tour => {
    if (tour.titulo) return tour;
    const words = (tour.name || "").trim().split(/\s+/);
    const titulo = words.slice(0, 3).join(" ");
    const descripcion = words.slice(3).join(" ");
    return {
      ...tour,
      titulo,
      descripcion: descripcion ? descripcion : ""
    };
  });

  const generarArchivoBackup = (): File => {
    const backupData = {
      version: '5.0',
      exportDate: new Date().toISOString(),
      holbox_config: formData,
      holbox_tours: tours,
      holbox_bitacora: JSON.parse(localStorage.getItem('ventas') || '[]'),
      holbox_caja: JSON.parse(localStorage.getItem('holbox_caja') || '[]'),
      holbox_divisas: JSON.parse(localStorage.getItem('holbox_oficiales_table') || '[]'),
      holbox_logo: localStorage.getItem('holbox_logo') || null,
      holbox_darkMode: localStorage.getItem('holbox_darkMode') || 'false',
      holbox_autosave_interval: autoSaveInterval,
    };
    const dateStr = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    return new File([blob], `colombiana-backup-${dateStr}.json`, { type: 'application/json' });
  };

  const showBackupToast = () => {
    setSaveAllToast(true);
    setTimeout(() => setSaveAllToast(false), 2500);
  };

  const handleExportBackup = async () => {
    const file = generarArchivoBackup();
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showBackupToast();
  };

  const handleWhatsAppShare = async () => {
    const file = generarArchivoBackup();
    const nav = navigator as any;
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({
          files: [file],
          title: 'Backup La Colombiana',
          text: `Respaldo La Colombiana - ${new Date().toLocaleDateString()}`,
        });
        showBackupToast();
        return;
      } catch (err) {
        console.warn('WhatsApp share with files failed, falling back to text & clipboard:', err);
      }
    }
    // Fallback copy & wa.me
    try {
      const textContent = await file.text();
      await navigator.clipboard.writeText(textContent);
      const textParam = encodeURIComponent(
        `Backup La Colombiana ${new Date().toLocaleString()} \n\n${textContent.slice(0, 1500)}... copia completa en portapapeles`
      );
      window.open(`https://wa.me/?text=${textParam}`, '_blank');
      showBackupToast();
      alert('¡Backup copiado en el portapapeles! Pégalo en tu chat de WhatsApp.');
    } catch {
      handleExportBackup();
    }
  };

  const handleEmailShare = async () => {
    const file = generarArchivoBackup();
    const nav = navigator as any;
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({
          files: [file],
          title: 'Backup La Colombiana Email',
          text: `Adjunto respaldo de La Colombiana`,
        });
        showBackupToast();
        return;
      } catch (err) {
        console.warn('Email share with files failed, falling back to download + mailto:', err);
      }
    }
    // Fallback: download file + mailto
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const subject = encodeURIComponent(`Backup La Colombiana - ${new Date().toISOString().slice(0, 10)}`);
    const body = encodeURIComponent(
      `Hola,\n\nAdjunto encontrarás el respaldo de Holbox Tours.\n\n*(Nota: El archivo ${file.name} se ha descargado en tu dispositivo para que puedas adjuntarlo a este correo).*`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    showBackupToast();
  };

  const handleCloudDriveShare = async () => {
    const file = generarArchivoBackup();
    const nav = navigator as any;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({
          files: [file],
          title: 'Guardar Backup en Google Drive / Nube',
        });
        showBackupToast();
        return;
      } catch (err) {
        console.warn('Cloud share via Web Share API failed:', err);
      }
    }
    // Fallback for Studio / environments without share files support
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showBackupToast();
    alert('Se descargó, súbelo manual a tu Drive');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.holbox_config) {
          localStorage.setItem('holbox_config', JSON.stringify(json.holbox_config));
          localStorage.setItem('ht_config', JSON.stringify(json.holbox_config));
          setFormData(json.holbox_config);
          onSaveConfig(json.holbox_config);
        }
        if (json.holbox_tours) {
          localStorage.setItem('holbox_tours', JSON.stringify(json.holbox_tours));
          localStorage.setItem('ht_tours', JSON.stringify(json.holbox_tours));
          onSaveTours(json.holbox_tours);
        }
        if (json.holbox_bitacora) {
          localStorage.setItem('ventas', JSON.stringify(json.holbox_bitacora));
        }
        if (json.holbox_caja) {
          localStorage.setItem('holbox_caja', JSON.stringify(json.holbox_caja));
        }
        if (json.holbox_divisas) {
          localStorage.setItem('holbox_oficiales_table', JSON.stringify(json.holbox_divisas));
        }
        if (json.holbox_logo !== undefined) {
          if (json.holbox_logo) {
            localStorage.setItem('holbox_logo', json.holbox_logo);
            setLogoBase64(json.holbox_logo);
          } else {
            localStorage.removeItem('holbox_logo');
            setLogoBase64(null);
          }
        }
        if (json.holbox_darkMode) {
          localStorage.setItem('holbox_darkMode', json.holbox_darkMode);
        }
        if (json.holbox_autosave_interval) {
          localStorage.setItem('holbox_autosave_interval', json.holbox_autosave_interval);
          setAutoSaveInterval(json.holbox_autosave_interval);
        }
        alert('¡Respaldo importado correctamente!');
        window.location.reload();
      } catch (err) {
        alert('Error al procesar el archivo JSON de respaldo.');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveAllNow = () => {
    if (formData.email && formData.email.trim() !== '') {
      const isGmail = /^[a-z0-9._%+-]+@gmail\.com$/i.test(formData.email.trim());
      if (!isGmail) {
        setEmailError('Solo Gmail');
        return;
      }
    }
    const cleanTc = {
      USD: Number(tcMulti.USD) || 16.00,
      EUR: Number(tcMulti.EUR) || 17.80,
      CAD: Number(tcMulti.CAD) || 12.50,
      GBP: Number(tcMulti.GBP) || 20.10,
    };
    const updatedForm = { ...formData, usdExchangeRate: cleanTc.USD };
    onSaveConfig(updatedForm);
    try {
      localStorage.setItem('holbox_config', JSON.stringify(updatedForm));
      localStorage.setItem('ht_config', JSON.stringify(updatedForm));
      localStorage.setItem('holbox_autosave_interval', autoSaveInterval);
      localStorage.setItem('tcMulti', JSON.stringify(cleanTc));
    } catch {}
    setSaveAllToast(true);
    setTimeout(() => setSaveAllToast(false), 3000);
  };

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.email && formData.email.trim() !== '') {
      const isGmail = /^[a-z0-9._%+-]+@gmail\.com$/i.test(formData.email.trim());
      if (!isGmail) {
        setEmailError('Solo Gmail');
        return;
      }
    }
    if (formData.correo && formData.correo.trim() !== '') {
      const isGmail = /^[a-z0-9._%+-]+@gmail\.com$/i.test(formData.correo.trim());
      if (!isGmail) {
        setEmailError('Solo Gmail');
        return;
      }
    }
    const cleanTc = {
      USD: Number(tcMulti.USD) || 16.00,
      EUR: Number(tcMulti.EUR) || 17.80,
      CAD: Number(tcMulti.CAD) || 12.50,
      GBP: Number(tcMulti.GBP) || 20.10,
    };
    const updatedForm = { ...formData, usdExchangeRate: cleanTc.USD };
    onSaveConfig(updatedForm);
    try {
      localStorage.setItem('ht_config', JSON.stringify(updatedForm));
      localStorage.setItem('holbox_config', JSON.stringify(updatedForm));
      localStorage.setItem('tcMulti', JSON.stringify(cleanTc));
    } catch {}
    setIsSavedMsg(true);
    setIsRecentlySaved(true);
    setTimeout(() => {
      setIsSavedMsg(false);
      setIsRecentlySaved(false);
    }, 1500);
  };

  const startEditTour = (tour: TourItem) => {
    const nameVal = tour.name || "";
    const words = nameVal.trim().split(/\s+/);
    const initialTitulo = tour.titulo || tour.tipo_servicio || words.slice(0, 3).join(" ");
    const initialDescripcion = tour.descripcion || words.slice(3).join(" ");

    setTourToEdit(tour);
    setFormData({
      titulo: initialTitulo,
      descripcion: initialDescripcion,
      categoria: tour.category || 'Náuticos',
      precio_base: String(tour.defaultPrice || 0),
      horario: tour.defaultTime || '10:00 AM',
      punto_encuentro: tour.meetingPoint || 'Muelle Principal Holbox',
      providerCost: tour.providerCost || 0,
      providerType: tour.providerType || 'Lanchero'
    });
    setShowTourModal(true);
  };

  const handleEdit = startEditTour;

  const handleSaveTourForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim()) return;

    const tourTitle = formData.titulo.trim();

    if (tourToEdit) {
      // Editing
      const updatedTour: TourItem = {
        ...tourToEdit,
        titulo: tourTitle,
        tipo_servicio: tourTitle,
        descripcion: (formData.descripcion || '').trim(),
        name: tourTitle,
        nombre_completo: tourTitle,
        category: formData.categoria,
        defaultPrice: Number(formData.precio_base) || 0,
        priceUnit: 'por persona',
        defaultTime: formData.horario,
        meetingPoint: formData.punto_encuentro,
        providerCost: Number(formData.providerCost) || 0,
        providerType: formData.providerType || 'Lanchero',
      };
      const updatedTours = tours.map((t) => (t.id === tourToEdit.id ? updatedTour : t));
      try {
        localStorage.setItem('ht_tours', JSON.stringify(updatedTours));
        localStorage.setItem('holbox_tours', JSON.stringify(updatedTours));
        localStorage.setItem('tours_catalog', JSON.stringify(updatedTours));
        window.dispatchEvent(new CustomEvent('catalogo-actualizado', { detail: updatedTours }));
      } catch {}
      onSaveTours(updatedTours);
    } else {
      // Creating
      const newTour: TourItem = {
        id: 'tour-' + Date.now(),
        name: tourTitle,
        category: formData.categoria,
        defaultPrice: Number(formData.precio_base) || 0,
        priceUnit: 'por persona',
        defaultTime: formData.horario,
        meetingPoint: formData.punto_encuentro,
        active: true,
        tipo_servicio: tourTitle,
        descripcion: (formData.descripcion || '').trim(),
        titulo: tourTitle,
        nombre_completo: tourTitle,
        providerCost: Number(formData.providerCost) || 0,
        providerType: formData.providerType || 'Lanchero',
      };
      const updated = [...tours, newTour];
      try {
        localStorage.setItem('ht_tours', JSON.stringify(updated));
        localStorage.setItem('holbox_tours', JSON.stringify(updated));
        localStorage.setItem('tours_catalog', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('catalogo-actualizado', { detail: updated }));
      } catch {}
      onSaveTours(updated);
    }

    setShowTourModal(false);
    setTourToEdit(null);
  };

  const generateTestData = () => {
    const mockSales: Sale[] = [];
    const tourNames = ["3 Islas con Yalahau", "3 Islas sin Cenote", "Tour Cabo Catoche ok", "Tour Especial Mini Pesca y 3 Islas", "Nado con Tiburon Ballena", "Tour Bioluminiscencia", "Tour Amanecer", "Tour Atardecer"];
    const names = ["Juan Pérez", "María García", "John Smith", "Emily Johnson", "Carlos Ruiz", "Sophie Martin", "Luis Hernández", "Anna Müller", "Pedro López", "Chloe Lefebvre"];
    
    for (let i = 0; i < 50; i++) {
      const isReserva = i >= 40;
      const pax = Math.floor(Math.random() * 8) + 1;
      const date = new Date();
      date.setDate(date.getDate() + (Math.floor(Math.random() * 5) + 1));
      const dateStr = date.toISOString().split('T')[0];

      const tour = tourNames[Math.floor(Math.random() * tourNames.length)];
      const total = pax * 1000;

      mockSales.push({
        id: `test-${Date.now()}-${i}`,
        folio: `TEST-${1000 + i}`,
        createdAt: new Date().toISOString(),
        tourId: 'tour-test',
        tourName: tour,
        tourCategory: 'TOURS ESTRELLA HOLBOX',
        tourDate: dateStr,
        tourTime: '10:00',
        meetingPoint: 'Muelle Principal',
        clientName: names[Math.floor(Math.random() * names.length)],
        clientPhone: '9980000000',
        passengerCount: pax,
        unitPrice: 1000,
        subtotal: total,
        discountType: 'none',
        discountValue: 0,
        discountAmount: 0,
        total: total,
        advancePayment: isReserva ? 0 : total / 2,
        balance: isReserva ? total : total / 2,
        paymentMethod: 'Efectivo',
        status: isReserva ? 'Con Saldo' : 'Liquidado',
        sellerName: 'Judith',
        isPrueba: true,
        esReserva: isReserva,
        notes: `FOLIO DE PRUEBA - GENERADO AUTOMÁTICO ${dateStr}`
      });
    }
    onSaveSales([...sales, ...mockSales]);
    // @ts-ignore
    if(window.showToast) window.showToast("Se generaron 50 folios de prueba distribuidos en los próximos 5 días con PAX, anticipos y formas de pago variadas");
  };

  const deleteTestData = () => {
    if (confirm("¿Borrar los 50 folios de prueba?")) {
      onSaveSales(sales.filter(s => !s.isPrueba));
      // @ts-ignore
      if(window.showToast) window.showToast("Se borraron los folios de prueba");
    }
  };

  const handleToggleTourActive = (id: string) => {
    const updated = tours.map((t) => (t.id === id ? { ...t, active: !t.active } : t));
    try {
      localStorage.setItem('ht_tours', JSON.stringify(updated));
      localStorage.setItem('holbox_tours', JSON.stringify(updated));
      localStorage.setItem('tours_catalog', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('catalogo-actualizado', { detail: updated }));
    } catch {}
    onSaveTours(updated);
  };

  const handleDeleteTour = (id: string) => {
    if (confirm('¿Eliminar este tour del catálogo?')) {
      const updated = tours.filter((t) => t.id !== id);
      try {
        localStorage.setItem('ht_tours', JSON.stringify(updated));
        localStorage.setItem('holbox_tours', JSON.stringify(updated));
        localStorage.setItem('tours_catalog', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('catalogo-actualizado', { detail: updated }));
      } catch {}
      onSaveTours(updated);
    }
  };

  const handle0kmWipe = () => {
    // REGLA DE ORO PROMPT V5.0:
    // Botón Borrar Todo hace localStorage.clear() + location.reload().
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="w-full pb-40">
      {/* Settings Header */}
      <div className="bg-white dark:bg-slate-900 px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#003087] dark:text-[#FFCC00]" />
            <h2 className="text-[14px] leading-tight font-bold text-slate-900 dark:text-white">
              Configuración General &amp; Catálogo de Tours
            </h2>
          </div>
          <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400 mt-1">
            Datos fiscales and comerciales, control de folios consecutivos y catálogo editable en memoria local.
          </p>
        </div>

        {/* 0km Clear Buttons */}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={handleClearWeatherCache}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-[11px] font-medium text-blue-700 leading-tight cursor-pointer"
          >
            🧹 <span>Borrar cache<br/><span className="text-[9px] opacity-70">{cacheSize > 0 ? `${cacheSize} bytes` : "0 bytes - ya limpio"}</span></span>
          </button>
          <button
            type="button"
            id="btn-borrado-0km"
            onClick={start0kmWipeFlow}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-red-50 border border-red-100 text-[11px] font-medium text-red-700 leading-tight cursor-pointer"
          >
            🔄 <span>Restauración<br/>de fábrica</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl transition-opacity duration-[2500ms]" style={{ opacity: toast.visible ? 1 : 0 }}>
          {toast.message}
        </div>
      )}

      {/* 1. Business Info Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#003087] dark:text-[#0284c7]" />
            Datos de la Empresa &amp; Emisión de Recibos
          </h3>
          {isSavedMsg && (
            <span className="text-xs font-bold text-[#059669] flex items-center gap-1">
              <Check className="w-4 h-4" /> Cambios guardados
            </span>
          )}
        </div>

        <form onSubmit={handleSaveBusiness} className="space-y-4">
          {/* Logo Management Section */}
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 sm:col-span-2">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {logoBase64 ? (
                <img src={logoBase64} alt="Logotipo Empresa" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">🌴</span>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white block">
                Logotipo Oficial de la Empresa (80x80)
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="px-3 py-1.5 text-xs font-bold text-white bg-[#003087] hover:bg-[#002266] rounded-xl cursor-pointer shadow transition">
                  Cambiar Logotipo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
                {logoBase64 && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl border border-red-200 dark:border-red-900 transition"
                  >
                    Quitar Logo
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Se recomienda imagen cuadrada. Compresión automática a 300x300px. Aparece en Header y Recibos.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nombre Propietaria *
              </label>
              <input
                type="text"
                required
                value={formData.nombrePropietaria || formData.owner || ''}
                onFocus={(e)=>(e.target as any).select()}
                onChange={(e) => setFormData({ ...formData, nombrePropietaria: e.target.value, owner: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                placeholder="Ej. Julieth"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Correo (Opcional)
              </label>
              <input
                type="email"
                value={formData.correo || formData.email || ''}
                onFocus={(e)=>(e.target as any).select()}
                onChange={(e) => setFormData({ ...formData, correo: e.target.value, email: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                placeholder="ejemplo@gmail.com"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tu fecha de cumpleaños 🎂 - Para sorprenderte en tu día *
              </label>
              <input
                type="date"
                required
                value={formData.fechaNacimiento || ''}
                onFocus={(e)=>(e.target as any).select()}
                onClick={(e)=>(e.target as any).select()}
                onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nombre Comercial del Negocio
              </label>
              <input
                type="text"
                value={formData.name}
                onFocus={(e)=>(e.target as any).select()}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Propietaria / Titular
              </label>
              <input
                type="text"
                value={formData.owner}
                onFocus={(e)=>(e.target as any).select()}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Teléfono / WhatsApp Oficial
              </label>
              <input
                type="text"
                value={formData.phone}
                onFocus={(e)=>(e.target as any).select()}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ubicación / Dirección de la Oficina
              </label>
              <input
                type="text"
                value={formData.address}
                onFocus={(e)=>(e.target as any).select()}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Correo Oficial (@gmail.com)
              </label>
              <input
                type="email"
                placeholder="ejemplo@gmail.com"
                value={formData.email || ''}
                onFocus={(e)=>(e.target as any).select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, email: val });
                  if (val.trim() === '') {
                    setEmailError(null);
                  } else {
                    const isGmail = /^[a-z0-9._%+-]+@gmail\.com$/i.test(val.trim());
                    setEmailError(isGmail ? null : 'Solo Gmail');
                  }
                }}
                className={`w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl font-medium text-slate-900 dark:text-white ${
                  emailError ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {emailError && (
                <p className="text-[11px] text-red-600 font-bold">{emailError}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Facebook URL
              </label>
              <input
                type="text"
                placeholder="https://facebook.com/tupagina"
                value={formData.facebookUrl || ''}
                onFocus={(e)=>(e.target as any).select()}
                onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Instagram URL
              </label>
              <input
                type="text"
                placeholder="https://instagram.com/tuusuario"
                value={formData.instagramUrl || ''}
                onFocus={(e)=>(e.target as any).select()}
                onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Prefijo y Consecutivo del Folio (LC-YYYY-NNNN)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={formData.folioPrefix}
                  onFocus={(e)=>(e.target as any).select()}
                  onChange={(e) => setFormData({ ...formData, folioPrefix: e.target.value.toUpperCase() })}
                  className="w-20 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold uppercase"
                  placeholder="LC"
                />
                <span className="text-slate-400 font-bold">-</span>
                <input
                  type="number"
                  value={formData.nextFolioNumber}
                  onFocus={(e)=>(e.target as any).select()}
                  onChange={(e) => setFormData({ ...formData, nextFolioNumber: Math.max(1, Number(e.target.value)) })}
                  className="w-28 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                />
                <span className="text-xs text-slate-500">
                  Próximo folio:{' '}
                  <strong className="text-[#003087] dark:text-[#FFCC00]">
                    {formatFolio(formData.folioPrefix, new Date().getFullYear(), formData.nextFolioNumber)}
                  </strong>
                </span>
              </div>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 col-span-1 sm:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#003087] dark:text-[#0284c7]">
                💱 Tipos de Cambio Sugeridos
              </h4>
              <p className="text-[11px] text-slate-500">
                Este valor se usa cuando el cliente paga en su moneda. Puedes editarlo manualmente o jalar el valor bancario (de compra) registrado en la pestaña Divisas.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* USD */}
                <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1">
                    <span className="text-base">🇺🇸</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">USD</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      id="tc_USD"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={tcMulti.USD}
                      onFocus={(e) => (e.target as HTMLInputElement).select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, '');
                        const updated = { ...tcMulti, USD: raw };
                        setTcMulti(updated as any);
                        localStorage.setItem('tcMulti', JSON.stringify(updated));
                      }}
                      className="w-full h-8 px-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => usarAuto('USD')}
                      title="Obtener tipo de cambio de compra desde Divisas"
                      className="h-8 px-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-900/50 text-[#003087] dark:text-[#FFCC00] text-[10px] font-extrabold rounded-lg transition"
                    >
                      Auto
                    </button>
                  </div>
                </div>

                {/* EUR */}
                <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1">
                    <span className="text-base">🇪🇺</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">EUR</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      id="tc_EUR"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={tcMulti.EUR}
                      onFocus={(e) => (e.target as HTMLInputElement).select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, '');
                        const updated = { ...tcMulti, EUR: raw };
                        setTcMulti(updated as any);
                        localStorage.setItem('tcMulti', JSON.stringify(updated));
                      }}
                      className="w-full h-8 px-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => usarAuto('EUR')}
                      title="Obtener tipo de cambio de compra desde Divisas"
                      className="h-8 px-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-900/50 text-[#003087] dark:text-[#FFCC00] text-[10px] font-extrabold rounded-lg transition"
                    >
                      Auto
                    </button>
                  </div>
                </div>

                {/* CAD */}
                <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1">
                    <span className="text-base">🇨🇦</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">CAD</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      id="tc_CAD"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={tcMulti.CAD}
                      onFocus={(e) => (e.target as HTMLInputElement).select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, '');
                        const updated = { ...tcMulti, CAD: raw };
                        setTcMulti(updated as any);
                        localStorage.setItem('tcMulti', JSON.stringify(updated));
                      }}
                      className="w-full h-8 px-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => usarAuto('CAD')}
                      title="Obtener tipo de cambio de compra desde Divisas"
                      className="h-8 px-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-900/50 text-[#003087] dark:text-[#FFCC00] text-[10px] font-extrabold rounded-lg transition"
                    >
                      Auto
                    </button>
                  </div>
                </div>

                {/* GBP */}
                <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1">
                    <span className="text-base">🇬🇧</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">GBP</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      id="tc_GBP"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={tcMulti.GBP}
                      onFocus={(e) => (e.target as HTMLInputElement).select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, '');
                        const updated = { ...tcMulti, GBP: raw };
                        setTcMulti(updated as any);
                        localStorage.setItem('tcMulti', JSON.stringify(updated));
                      }}
                      className="w-full h-8 px-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => usarAuto('GBP')}
                      title="Obtener tipo de cambio de compra desde Divisas"
                      className="h-8 px-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-900/50 text-[#003087] dark:text-[#FFCC00] text-[10px] font-extrabold rounded-lg transition"
                    >
                      Auto
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full">
            <label className="text-[11px] font-bold px-1 text-slate-700 dark:text-slate-300">Términos y Políticas al pie del Ticket / Recibo</label>
            <textarea
              defaultValue={formData.ticketFooterNotes || "Favor de presentarse 15 minutos antes..."}
              onBlur={(e)=> setFormData({...formData, ticketFooterNotes: e.target.value})}
              placeholder="Escribe aquí tus políticas..."
              rows={5}
              className="w-full text-[12px] leading-snug p-2.5 mt-1 rounded-xl border border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-y min-h-[120px] max-h-[400px] overflow-y-auto"
              style={{resize: 'vertical'}}
            />
            <p className="text-[9px] text-slate-400 mt-1 px-1">Toca fuera para guardar • No se congela</p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              id="btn-guardar-configuracion"
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(50);
              }}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#003087] hover:bg-[#002266] rounded-xl shadow active:scale-95 transition-transform duration-100 cursor-pointer"
            >
              <Check className="w-4 h-4 text-[#FFCC00]" />
              {isRecentlySaved ? "✓ Guardado" : "Guardar Configuración"}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Tour Catalog Management */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <button
          onClick={() => {
            localStorage.removeItem('ht_tours');
            localStorage.removeItem('tours');
            localStorage.removeItem('catalogo_tours');
            localStorage.removeItem('tours_catalog');
            localStorage.removeItem('la_colombiana_tours');
            localStorage.removeItem('holbox_tours');
            localStorage.clear();
            window.location.reload();
          }}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-2xl shadow-lg transition text-sm flex items-center justify-center gap-2 mb-3 cursor-pointer"
        >
          🔄 Restaurar Catálogo La Colombiana (24 tours)
        </button>
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-[19px] leading-none text-slate-900 dark:text-white">Catálogo de Tours</h2>
          <p className="font-normal text-[12px] text-slate-500 mt-1">({tours.length} servicios)</p>
          <p className="font-normal text-[13px] text-slate-500 mt-1">Crea y personaliza tus servicios</p>
          <button onClick={()=>{setTourToEdit(null); setFormData({titulo:'', descripcion:'', categoria:'Náuticos', precio_base:'', horario:'', punto_encuentro:'Muelle Principal Holbox'}); setShowTourModal(true)}} className="mt-3 bg-[#1E40AF] text-white px-4 py-1.5 rounded-full text-[12px] font-medium cursor-pointer">+ Nuevo Tour</button>
        </div>

        {/* Add Tour Form */}
        {false && (
          <form
            onSubmit={handleAddTour}
            className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3"
          >
            <h4 className="text-xs font-bold text-[#003087] dark:text-[#FFCC00] uppercase tracking-wider">
              Registrar Nuevo Tour o Servicio
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Título del Tour (negritas) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Tour 3 Islas"
                  value={newTourTitulo}
                  onChange={(e) => setNewTourTitulo(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg font-bold"
                />
              </div>

              <div className="sm:col-span-3 space-y-1 col-span-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Descripción del Tour (sin negritas)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. (Pasión, Pájaros y Cenote Yalahau)"
                  value={newTourDescripcion}
                  onChange={(e) => setNewTourDescripcion(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Categoría
                </label>
                <select
                  value={newTourCat}
                  onChange={(e) => setNewTourCat(e.target.value as TourCategory)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"
                >
                  <option value="TOURS ESTRELLA HOLBOX">TOURS ESTRELLA HOLBOX</option>
                  <option value="NATURALEZA Y EXPERIENCIA">NATURALEZA Y EXPERIENCIA</option>
                  <option value="PESCA DEPORTIVA">PESCA DEPORTIVA</option>
                  <option value="LUJO Y PRIVADOS">LUJO Y PRIVADOS</option>
                  <option value="FULL DAY TIERRA">FULL DAY TIERRA</option>
                  <option value="TRANSPORTE Y TRASLADOS">TRANSPORTE Y TRASLADOS</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Precio Base (MXN)
                </label>
                <input
                  type="number"
                  value={newTourPrice}
                  onChange={(e) => setNewTourPrice(Number(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Unidad de Cobro
                </label>
                <input
                  type="text"
                  placeholder="por persona / por vehículo"
                  value={newTourUnit}
                  onChange={(e) => setNewTourUnit(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Horario Predeterminado
                </label>
                <input
                  type="text"
                  placeholder="09:00 AM"
                  value={newTourTime}
                  onChange={(e) => setNewTourTime(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Punto de Encuentro Predeterminado
                </label>
                <input
                  type="text"
                  placeholder="Muelle Principal Holbox / Oficina La Colombiana"
                  value={newTourMeeting}
                  onChange={(e) => setNewTourMeeting(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddTour(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#003087] rounded-lg"
              >
                Agregar al Catálogo
              </button>
            </div>
          </form>
        )}

        {/* Tour Table */}
        {/* DESKTOP >=768px: TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[850px] text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="pb-3 font-semibold min-w-[200px] w-[35%]">Tour / Servicio</th>
                <th className="pb-3 font-semibold w-[110px]">Categoría</th>
                <th className="pb-3 font-semibold w-[120px] text-right">Precio Base</th>
                <th className="pb-3 font-semibold w-[100px]">Horario Habitual</th>
                <th className="pb-3 font-semibold w-[80px] text-center">Estado</th>
                <th className="pb-3 font-semibold w-[90px] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {processedTours.map((tour) => (
                <tr
                  key={tour.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    !tour.active ? 'opacity-50' : ''
                  }`}
                >
                  <td className="py-3">
                    <div>
                      <div className="font-bold text-[14px] text-slate-900 dark:text-white">{tour.titulo || tour.name}</div>
                      {tour.descripcion && <div className="font-normal text-[12px] text-slate-500 dark:text-slate-400">{tour.descripcion}</div>}
                      <div className="text-[11px] text-slate-400 font-normal">Punto: {tour.meetingPoint}</div>
                      {tour.providerCost ? (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Honorarios: <b>${tour.providerCost}</b> ({tour.providerType || 'Lanchero'}) &bull; Utilidad: <b className="text-emerald-600 dark:text-emerald-400">${(Number(tour.defaultPrice || 0) - Number(tour.providerCost || 0))}</b>
                        </div>
                      ) : null}
                    </div>
                  </td>

                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      {tour.category}
                    </span>
                  </td>

                  <td className="py-3 text-right">
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(tour.defaultPrice)}
                      <span className="text-[10px] font-normal text-slate-400 ml-1">
                        {tour.priceUnit}
                      </span>
                    </span>
                  </td>

                  <td className="py-3 text-slate-600 dark:text-slate-300">
                    {tour.defaultTime}
                  </td>

                  <td className="py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleTourActive(tour.id)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        tour.active
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {tour.active ? 'Activo' : 'Pausado'}
                    </button>
                  </td>

                  <td className="py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startEditTour(tour)}
                        className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        title="Editar Tour"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setTourToDelete(tour)}
                        className="w-10 h-10 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center cursor-pointer"
                        title="Eliminar tour"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE <768px: CARDS */}
        <div className="md:hidden px-1 space-y-2 mt-2">
          {processedTours.map((tour) => (
            <div
              key={tour.id}
              className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 w-full shadow-sm ${
                !tour.active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[13px] leading-tight text-slate-900 dark:text-white truncate">{tour.titulo || tour.name?.split('(')[0]}</h3>
                  <p className="font-normal text-[11px] text-slate-500 truncate mt-0.5">{tour.descripcion || ''}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 shrink-0">
                  {tour.category}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 text-[11px] flex-wrap">
                <span className="font-bold text-slate-900 dark:text-white">${(tour as any).precio_base || (tour as any).precio || tour.defaultPrice}</span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-slate-700 dark:text-slate-300">{(tour as any).horario || tour.defaultTime}</span>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
                <span className="text-[10px] text-slate-500 truncate hidden sm:inline">📍 {(tour as any).punto_encuentro || tour.meetingPoint}</span>
                <div className="ml-auto flex items-center gap-4">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full ${tour.active ? 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900/40' : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                    {tour.active ? 'Activo' : 'Pausado'}
                  </span>
                  <button type="button" onClick={()=>handleEdit(tour)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[12px] cursor-pointer">✏️</button>
                  <button type="button" onClick={()=>setTourToDelete(tour)} className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center text-[12px] cursor-pointer">🗑️</button>
                </div>
              </div>
              {tour.providerCost ? (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Honorarios: <b>${tour.providerCost}</b> ({tour.providerType || 'Lanchero'}) &bull; Utilidad: <b className="text-emerald-600 dark:text-emerald-400">${(Number(tour.defaultPrice || 0) - Number(tour.providerCost || 0))}</b>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Respaldo y Nube ☁️ */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>☁️</span>
            Respaldo y Nube &bull; Gestión de Datos
          </h3>
          {saveAllToast && (
            <span className="text-xs font-bold text-[#059669] flex items-center gap-1 animate-fade-in">
              <Check className="w-4 h-4" /> ¡Guardado total exitoso!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* 1. Export button */}
          <button
            type="button"
            id="btn-exportar-backup"
            onClick={handleExportBackup}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Descargar Backup</span>
          </button>

          {/* 2. WhatsApp Share */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition"
          >
            <Share2 className="w-4 h-4 text-white" />
            <span>Enviar por WhatsApp</span>
          </button>

          {/* 3. Email Share */}
          <button
            type="button"
            onClick={handleEmailShare}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow transition"
          >
            <Mail className="w-4 h-4 text-white" />
            <span>Enviar por Email</span>
          </button>

          {/* 4. Google Drive / Cloud */}
          <button
            type="button"
            onClick={handleCloudDriveShare}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition"
          >
            <CloudUpload className="w-4 h-4 text-white" />
            <span>Guardar en Drive / Nube</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2">
          {/* Import button */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Importar Respaldo JSON
            </label>
            <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition">
              <span className="text-sm">📤</span>
              <span>Importar Backup</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>

          {/* Auto guardado selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Auto guardado:
            </label>
            <select
              value={autoSaveInterval}
              onChange={(e) => {
                const val = e.target.value;
                setAutoSaveInterval(val);
                try {
                  localStorage.setItem('holbox_autosave_interval', val);
                } catch {}
              }}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
            >
              <option value="Manual">Manual</option>
              <option value="1 día">1 día</option>
              <option value="2 días">2 días</option>
              <option value="3 días">3 días</option>
              <option value="7 días">7 días</option>
            </select>
          </div>
        </div>

        {/* Big blue button with floppy disk icon 💾 Guardar Ahora Todo */}
        <div className="pt-3">
          <button
            type="button"
            id="btn-guardar-ahora-todo"
            onClick={handleSaveAllNow}
            className="w-full py-3.5 px-6 rounded-2xl font-extrabold text-sm text-white bg-[#003087] hover:bg-[#002266] shadow-md shadow-blue-900/30 flex items-center justify-center gap-3 transition active:scale-[0.99]"
          >
            <span className="text-lg">💾</span>
            <span>Guardar Ahora Todo</span>
          </button>
        </div>
      </div>

      {/* 3-Step 0km Wipe Modal */}
      {show0kmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-red-200 dark:border-red-900/60 space-y-4 animate-fade-in">
            {step0km === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-[#CE1126]">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      ⚠️ Acción Irreversible (Paso 1 de 3)
                    </h3>
                    <p className="text-xs text-slate-500">Advertencia de Borrado Seguro 0km</p>
                  </div>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2 bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-900/50">
                  <p className="font-bold text-red-700 dark:text-red-400">
                    Se borrará permanentemente:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 font-medium">
                    <li>Bitácora y ventas</li>
                    <li>Caja y cierres</li>
                    <li>Folios consecutivos</li>
                    <li>Catálogo de tours y precios</li>
                    <li>Datos de empresa (incluye logotipo, correo y redes)</li>
                    <li>Divisas y cotizaciones</li>
                  </ul>
                  <p className="font-extrabold text-[#CE1126] pt-1">
                    Haz backup primero antes de continuar.
                  </p>
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShow0kmModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleBackupAndContinue}
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow transition"
                  >
                    Hacer Backup Primero 📥
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep0km(2); setBorrarInput(''); }}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#CE1126] hover:bg-red-700 rounded-xl shadow transition"
                  >
                    Sí, continuar &rarr;
                  </button>
                </div>
              </div>
            )}

            {step0km === 2 && (
              <form onSubmit={handleStep2Submit} className="space-y-4">
                <div className="flex items-center gap-3 text-[#CE1126]">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Confirmación Exacta (Paso 2 de 3)
                    </h3>
                    <p className="text-xs text-slate-500">Validación de seguridad case-sensitive</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Escribe exactamente: <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-red-600 font-mono font-bold">BorRAr</code>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Escribe BorRAr aquí..."
                    value={borrarInput}
                    onFocus={(e)=>(e.target as any).select()}
                    onChange={(e) => setBorrarInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                  />
                  <p className="text-[11px] text-slate-500">
                    Nota: Distingue mayúsculas y minúsculas exactamente. ('borrar' o 'BORRAR' no funcionarán).
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShow0kmModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={borrarInput !== 'BorRAr'}
                    className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow transition ${
                      borrarInput === 'BorRAr'
                        ? 'bg-[#CE1126] hover:bg-red-700 cursor-pointer'
                        : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    Continuar al CAPTCHA &rarr;
                  </button>
                </div>
              </form>
            )}

            {step0km === 3 && (
              <form onSubmit={handleStep3Submit} className="space-y-4">
                <div className="flex items-center gap-3 text-[#CE1126]">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Verificación Humana (Paso 3 de 3)
                    </h3>
                    <p className="text-xs text-slate-500">CAPTCHA matemático</p>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <label className="text-xs font-bold text-slate-900 dark:text-white block text-center text-sm">
                    ¿Cuánto es <span className="text-[#003087] dark:text-[#FFCC00] text-base">{captchaNum1} + {captchaNum2}</span>?
                  </label>
                  <input
                    type="number"
                    required
                    autoFocus
                    placeholder="Resultado numérico"
                    value={captchaAnswer}
                    onFocus={(e)=>(e.target as any).select()}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    className="w-full text-center px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                  {captchaError && (
                    <p className="text-xs text-red-600 font-bold text-center">{captchaError}</p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShow0kmModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-[#CE1126] hover:bg-red-700 rounded-xl shadow transition"
                  >
                    Ejecutar Borrado 0km ⚡
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit/New Tour Form Modal */}
      {showTourModal && (
        <div className="fixed inset-0 overflow-y-auto flex items-start justify-center p-2 mt-2 z-[9998] bg-black/60 backdrop-blur-sm animate-fade-in">
          <div ref={modalContainerRef} className="bg-white dark:bg-slate-800 rounded-xl p-0 w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700/80 my-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 z-10 flex justify-between items-center border-b border-slate-100 dark:border-slate-700/80 py-3 px-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>{tourToEdit ? "📝" : "✨"}</span> {tourToEdit ? "Editar Ficha del Tour" : "Registrar Nuevo Tour o Servicio"}
              </h3>
              <button 
                type="button"
                onClick={() => setShowTourModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold cursor-pointer p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveTourForm} className="p-3 space-y-3 overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Nombre del Tour *
                </label>
                <input
                  id="tour-name"
                  type="text"
                  required
                  placeholder="Ej. Tour 3 Islas"
                  value={formData.titulo || ''}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Descripción del Tour
                </label>
                <textarea
                  rows={2}
                  placeholder="con Cenote Yalahau"
                  value={formData.descripcion || ''}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  onInput={(e) => {
                    e.currentTarget.style.height = 'auto';
                    e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                  }}
                  onFocus={(e) => e.target.select()}
                  style={{ fieldSizing: 'content' } as any}
                  className="w-full min-h-[60px] max-h-[200px] resize-y overflow-auto text-sm px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Categoría
                  </label>
                  <select
                    value={formData.categoria || 'TOURS ESTRELLA HOLBOX'}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-medium"
                  >
                    <option value="TOURS ESTRELLA HOLBOX">TOURS ESTRELLA HOLBOX</option>
                    <option value="NATURALEZA Y EXPERIENCIA">NATURALEZA Y EXPERIENCIA</option>
                    <option value="PESCA DEPORTIVA">PESCA DEPORTIVA</option>
                    <option value="LUJO Y PRIVADOS">LUJO Y PRIVADOS</option>
                    <option value="FULL DAY TIERRA">FULL DAY TIERRA</option>
                    <option value="TRANSPORTE Y TRASLADOS">TRANSPORTE Y TRASLADOS</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Precio Base (MXN)
                  </label>
                  <input
                    type="number"
                    value={formData.precio_base || ''}
                    onChange={(e) => setFormData({ ...formData, precio_base: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">💰 Honorarios Prestador (MXN)</label>
                  <input type="number" value={formData.providerCost || ''} onChange={e=>setFormData({...formData, providerCost: parseFloat(e.target.value)||0})} placeholder="Ej: 400 lanchero" className="w-full mt-1 px-3 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl text-sm font-bold" />
                  <span className="text-[9px] text-slate-500 dark:text-slate-400">Lo que te cobra el prestador</span>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">👤 Tipo Prestador</label>
                  <select value={formData.providerType || 'Lanchero'} onChange={e=>setFormData({...formData, providerType: e.target.value})} className="w-full mt-1 px-3 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl text-sm font-medium bg-white dark:bg-slate-700">
                    <option>Lanchero</option><option>Capitán</option><option>Taxista</option><option>Bicicletas</option><option>Carritos Golf</option><option>Can-Am</option><option>Guía</option><option>Transfer</option><option>Otro</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900/50 rounded-xl flex justify-between items-center">
                <span className="text-[11px] font-bold text-yellow-800 dark:text-yellow-300">💛 Utilidad x persona</span>
                <span className="text-sm font-black text-yellow-900 dark:text-yellow-200">${((Number(formData.precio_base || formData.defaultPrice || 0) - Number(formData.providerCost || 0)) || 0).toFixed(0)} MXN</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Unidad de Cobro
                  </label>
                  <input
                    type="text"
                    placeholder="por persona / por vehículo"
                    value="por persona"
                    disabled
                    className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Horario Predeterminado
                  </label>
                  <input
                    type="text"
                    placeholder="09:00 AM"
                    value={formData.horario || ''}
                    onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Punto de Encuentro Predeterminado
                </label>
                <input
                  type="text"
                  placeholder="Muelle Principal Holbox / Oficina La Colombiana"
                  value={formData.punto_encuentro || ''}
                  onChange={(e) => setFormData({ ...formData, punto_encuentro: e.target.value })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-slate-800 z-10 py-2.5 px-3 border-t border-slate-100 dark:border-slate-700/80 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowTourModal(false)}
                  className="flex-1 py-2.5 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded-full transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-[#003087] hover:bg-[#002266] rounded-full shadow transition cursor-pointer"
                >
                  {tourToEdit ? "Guardar Cambios" : "Agregar al Catálogo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tour Delete Confirmation Modal */}
      {tourToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3 text-lg">⚠️</div>
            <h3 className="font-bold text-[16px] text-center text-slate-900 dark:text-white">¿Borrar este tour?</h3>
            <p className="font-bold text-[14px] text-center mt-2 text-[#CE1126]">"{tourToDelete.titulo || tourToDelete.name}"</p>
            <p className="font-normal text-[12px] text-slate-500 dark:text-slate-400 text-center mt-2">Esta acción no se puede deshacer. El tour desaparecerá del catálogo.</p>
            
            <div className="flex gap-3 mt-6">
              <button 
                type="button"
                onClick={() => setTourToDelete(null)}
                className="flex-1 py-3 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={() => {
                  const updated = tours.filter((t) => t.id !== tourToDelete.id);
                  onSaveTours(updated);
                  setTourToDelete(null);
                }}
                className="flex-1 py-3 rounded-full bg-[#CE1126] hover:bg-red-700 text-white text-xs font-bold transition shadow-md shadow-red-900/20 cursor-pointer"
              >
                Confirmar Borrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ZONA DE PRUEBAS */}
      <div className="mt-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 border-dashed rounded-3xl">
        <h3 className="font-bold text-lg text-yellow-800 dark:text-yellow-200 mb-4">🧪 ZONA DE PRUEBAS - DATOS FICTICIOS</h3>
        <div className="flex gap-3 justify-start">
          <button 
            onClick={generateTestData} 
            className="px-4 py-2.5 text-sm font-bold rounded-full bg-amber-400 hover:bg-amber-500 text-amber-900 shadow-sm active:scale-95 active:shadow-inner transition-all duration-150 flex items-center gap-2"
          >
            Generar 50 Folios Aleatorios
          </button>
          <button 
            onClick={deleteTestData} 
            className="px-4 py-2.5 text-sm font-bold rounded-full bg-red-400 hover:bg-red-500 text-red-900 shadow-sm active:scale-95 active:shadow-inner transition-all duration-150 flex items-center gap-2"
          >
            Borrar Folios de Prueba
          </button>
        </div>
      </div>
    </div>
  );
};
