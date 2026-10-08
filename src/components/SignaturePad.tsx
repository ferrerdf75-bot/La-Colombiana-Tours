import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CheckCircle2, PenLine, Trash2, Lock, Unlock } from 'lucide-react';
import { SaleFirma } from '../types';

interface SignaturePadProps {
  onSignatureChange: (
    dataUrl: string | undefined,
    firmaMeta?: SaleFirma
  ) => void;
  initialSignature?: string;
  initialFirma?: SaleFirma;
  onBlockedAttempt?: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureChange,
  initialSignature,
  initialFirma,
  onBlockedAttempt,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(Boolean(initialSignature || initialFirma?.base64));
  const [isBlocked, setIsBlocked] = useState<boolean>(
    Boolean(initialFirma?.bloqueada ?? false)
  );
  const [timestampBloqueo, setTimestampBloqueo] = useState<string | undefined>(
    initialFirma?.timestampBloqueo || undefined
  );
  const [canvasWidth, setCanvasWidth] = useState(400);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set high-DPI canvas buffer
    canvas.width = rect.width * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';

    // If there's an initial signature, render it
    const sigSrc = initialFirma?.base64 || initialSignature;
    if (sigSrc) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, 200);
      };
      img.src = sigSrc;
    }
  }, [initialSignature, initialFirma]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setCanvasWidth(width > 0 ? width : 400);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    initCanvas();
  }, [canvasWidth, initCanvas]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isBlocked) {
      if (onBlockedAttempt) onBlockedAttempt();
      return;
    }
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignored if pointer capture not supported
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isBlocked) return;
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isBlocked) return;
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignored
    }

    setIsDrawing(false);
    
    // NOT blocking on pointer up! Just update state / draft data without locking.
    const dataUrl = canvas.toDataURL('image/png');
    setHasDrawn(true);

    onSignatureChange(dataUrl, {
      bloqueada: false,
      timestampBloqueo: undefined,
      base64: dataUrl,
    });
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          if (canvas.hasPointerCapture(e.pointerId)) {
            canvas.releasePointerCapture(e.pointerId);
          }
        } catch {}
        const dataUrl = canvas.toDataURL('image/png');
        setHasDrawn(true);
        onSignatureChange(dataUrl, {
          bloqueada: false,
          timestampBloqueo: undefined,
          base64: dataUrl,
        });
      }
    }
  };

  // Botón 1: Confirmar y Bloquear Firma
  const handleConfirmAndLock = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const nowIso = new Date().toISOString();

    setIsBlocked(true);
    setTimestampBloqueo(nowIso);

    onSignatureChange(dataUrl, {
      bloqueada: true,
      timestampBloqueo: nowIso,
      base64: dataUrl,
    });
  };

  // Botón 2: Borrar y volver a intentar (Limpiar canvas)
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';

    setHasDrawn(false);
    setIsBlocked(false);
    setTimestampBloqueo(undefined);
    onSignatureChange(undefined, {
      bloqueada: false,
      timestampBloqueo: undefined,
      base64: undefined,
    });
  };

  // Botón 3: Desbloquear para corregir
  const handleUnlock = () => {
    setIsBlocked(false);
    setTimestampBloqueo(undefined);

    const canvas = canvasRef.current;
    const dataUrl = canvas ? canvas.toDataURL('image/png') : undefined;

    onSignatureChange(dataUrl, {
      bloqueada: false,
      timestampBloqueo: undefined,
      base64: dataUrl,
    });
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <PenLine className="w-3.5 h-3.5 text-[#003087] dark:text-[#0284c7]" />
          Firma Digital del Cliente (Táctil / Puntero 1:1)
        </label>
        <div className="flex items-center gap-2">
          {isBlocked && (
            <span className="inline-flex items-center text-[11px] font-medium text-[#059669] gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Registrada y Bloqueada
            </span>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={containerRef}
        onClick={() => {
          if (isBlocked && onBlockedAttempt) {
            onBlockedAttempt();
          }
        }}
        style={{ touchAction: 'none' }}
        className="touch-none overscroll-contain select-none w-full relative"
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={200}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          style={{
            touchAction: 'none',
            pointerEvents: isBlocked ? 'none' : 'auto',
            width: '100%',
            height: '200px',
            border: isBlocked ? '2px solid #10b981' : '2px dashed #003087',
            borderRadius: '8px',
            cursor: isBlocked ? 'not-allowed' : 'crosshair',
          }}
          className={`touch-none overscroll-contain ${isBlocked ? 'bg-slate-50 dark:bg-slate-900/60 opacity-90' : 'bg-white'}`}
        />
        {!hasDrawn && !isBlocked && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-xs">
            <span>Firme aquí con el dedo o stylus (permite varios trazos)</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Captura directa de conformidad</span>
          </div>
        )}
      </div>

      {/* 3 Botones de Control de Firma */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          {/* Botón Borrar / Limpiar */}
          <button
            type="button"
            id="btn-limpiar-firma"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            <span>🗑️ Borrar y volver a intentar</span>
          </button>

          {/* Botón Desbloquear (solo si está confirmada/bloqueada) */}
          {isBlocked && (
            <button
              type="button"
              id="btn-desbloquear-firma"
              onClick={handleUnlock}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl border border-amber-200 dark:border-amber-800 transition shadow-sm"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>🔓 Desbloquear para corregir</span>
            </button>
          )}
        </div>

        {/* Botón Confirmar y Bloquear (solo si no está bloqueada y hay trazos) */}
        {!isBlocked && (
          <button
            type="button"
            id="btn-confirmar-firma"
            disabled={!hasDrawn}
            onClick={handleConfirmAndLock}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-extrabold rounded-xl shadow transition ${
              hasDrawn
                ? 'text-white bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'
                : 'text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-800 opacity-50 cursor-not-allowed'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-white" />
            <span>✓ Confirmar y Bloquear Firma</span>
          </button>
        )}
      </div>
    </div>
  );
};
