"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Move,
  RotateCcw,
  RotateCw,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface AvatarCropperProps {
  initialPreviewUrl: string;
  onApplyCroppedDataUrl: (dataUrl: string) => void;
}

const VIEWPORT_SIZE = 220;
const EXPORT_SIZE = 256;

export default function AvatarCropper({
  initialPreviewUrl,
  onApplyCroppedDataUrl,
}: AvatarCropperProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  const [hasLoadedFile, setHasLoadedFile] = useState(false);
  const [zoom, setZoom] = useState<number>(1);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
    ctx.fillStyle = "#09090B";
    ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);

    ctx.save();
    ctx.translate(EXPORT_SIZE / 2 + pan.x, EXPORT_SIZE / 2 + pan.y);
    ctx.rotate((rotationDeg * Math.PI) / 180);

    // Base cover scale so image fills the square at zoom = 1
    const baseScale = Math.max(
      EXPORT_SIZE / Math.max(1, img.naturalWidth),
      EXPORT_SIZE / Math.max(1, img.naturalHeight)
    );
    const finalScale = baseScale * zoom;

    const drawW = img.naturalWidth * finalScale;
    const drawH = img.naturalHeight * finalScale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  };

  useEffect(() => {
    if (hasLoadedFile) {
      drawCanvas();
    }
  }, [zoom, rotationDeg, pan, hasLoadedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        imageObjRef.current = img;
        setZoom(1);
        setRotationDeg(0);
        setPan({ x: 0, y: 0 });
        setHasLoadedFile(true);
        setTimeout(() => {
          drawCanvas();
          if (canvasRef.current) {
            onApplyCroppedDataUrl(
              canvasRef.current.toDataURL("image/webp", 0.92)
            );
          }
        }, 20);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const commitCropToParent = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasLoadedFile) return;
    drawCanvas();
    const outUrl = canvas.toDataURL("image/webp", 0.92);
    onApplyCroppedDataUrl(outUrl);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!hasLoadedFile) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !hasLoadedFile) return;
    const dx = (e.clientX - dragStartRef.current.x) * (EXPORT_SIZE / VIEWPORT_SIZE);
    const dy = (e.clientY - dragStartRef.current.y) * (EXPORT_SIZE / VIEWPORT_SIZE);
    setPan({
      x: Math.max(-180, Math.min(180, dragStartRef.current.panX + dx)),
      y: Math.max(-180, Math.min(180, dragStartRef.current.panY + dy)),
    });
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    commitCropToParent();
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        {/* Interactive Crop Viewport */}
        <div className="relative flex flex-col items-center">
          <div
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            className="relative overflow-hidden rounded-2xl border-2 border-[#D4FF00] bg-zinc-950 shadow-[0_0_25px_rgba(212,255,0,0.15)]"
          >
            {hasLoadedFile ? (
              <canvas
                ref={canvasRef}
                width={EXPORT_SIZE}
                height={EXPORT_SIZE}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={(e) => {
                  e.preventDefault();
                  const nextZoom = Math.min(
                    3.5,
                    Math.max(0.6, zoom - e.deltaY * 0.0015)
                  );
                  setZoom(Number(nextZoom.toFixed(2)));
                  setTimeout(commitCropToParent, 20);
                }}
                className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
              />
            ) : (
              <img
                src={initialPreviewUrl}
                alt="Current Avatar"
                className="h-full w-full object-cover"
              />
            )}

            {/* Corner Crop Guides */}
            <div className="pointer-events-none absolute inset-2 rounded-xl border border-dashed border-white/25" />
            {hasLoadedFile && (
              <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded bg-black/75 px-2 py-0.5 font-mono text-[9px] font-bold text-[#D4FF00]">
                <Move className="h-2.5 w-2.5" />
                <span>Тяни мышкой</span>
              </div>
            )}
          </div>
        </div>

        {/* Upload & Scale Controls */}
        <div className="flex flex-1 flex-col justify-between space-y-3 self-stretch">
          <div>
            <div className="font-mono text-[11px] font-black uppercase text-white">
              Загрузка аватарки с компьютера
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Выбери любое фото (PNG, JPG, WEBP, GIF), приблизь и выровняй
              мышкой прямо в рамке
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#D4FF00]/50 bg-[#D4FF00]/15 px-4 py-2.5 font-mono text-xs font-black uppercase text-[#D4FF00] transition hover:bg-[#D4FF00] hover:text-zinc-950"
            >
              <Upload className="h-4 w-4" />
              <span>Выбрать файл с ПК</span>
            </button>
          </div>

          {/* Zoom & Rotation Controls */}
          <div
            className={`space-y-2.5 rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-3 transition ${
              hasLoadedFile ? "opacity-100" : "pointer-events-none opacity-40"
            }`}
          >
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-zinc-400">Масштаб фото:</span>
              <span className="font-black text-[#D4FF00]">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))));
                  setTimeout(commitCropToParent, 20);
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-300 hover:text-white"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>

              <input
                type="range"
                min={0.6}
                max={3.5}
                step={0.05}
                value={zoom}
                onChange={(e) => {
                  setZoom(Number(e.target.value));
                  setTimeout(commitCropToParent, 15);
                }}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-[#D4FF00]"
              />

              <button
                type="button"
                onClick={() => {
                  setZoom((z) => Math.min(3.5, Number((z + 0.15).toFixed(2))));
                  setTimeout(commitCropToParent, 20);
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-300 hover:text-white"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setRotationDeg((r) => (r + 90) % 360);
                  setTimeout(commitCropToParent, 20);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 py-1.5 font-mono text-[10px] font-bold uppercase text-zinc-300 hover:text-white"
              >
                <RotateCw className="h-3 w-3" />
                <span>Повернуть 90°</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setRotationDeg(0);
                  setPan({ x: 0, y: 0 });
                  setTimeout(commitCropToParent, 20);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 py-1.5 font-mono text-[10px] font-bold uppercase text-zinc-300 hover:text-white"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Сбросить</span>
              </button>

              <button
                type="button"
                onClick={commitCropToParent}
                className="flex items-center justify-center gap-1 rounded-lg bg-[#D4FF00]/20 px-2.5 py-1.5 font-mono text-[10px] font-black uppercase text-[#D4FF00]"
              >
                <Check className="h-3 w-3" />
                <span>ОК</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
