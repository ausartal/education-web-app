'use client';

import { FC, useState, useRef, useCallback, useEffect } from 'react';
import { X, Check, Plus, Minus, Undo2 } from 'lucide-react';

interface PhotoAdjustModalProps {
  imageUrl: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
  uploading?: boolean;
}

/**
 * Photo position/zoom adjuster modal.
 * User drags to reposition and uses +/- to zoom, then confirms.
 * Crops to a square via canvas before returning the blob.
 */
const PhotoAdjustModal: FC<PhotoAdjustModalProps> = ({ imageUrl, onConfirm, onCancel, uploading }) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

  const CONTAINER_SIZE = 280;

  // Reset on new image
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [imageUrl]);

  const clampOffset = useCallback((ox: number, oy: number) => {
    const img = imgRef.current;
    if (!img || !naturalSize.w) return { x: ox, y: oy };
    // Fit scale: image fills the container
    const fitScale = Math.max(CONTAINER_SIZE / naturalSize.w, CONTAINER_SIZE / naturalSize.h);
    const displayW = naturalSize.w * fitScale * scale;
    const displayH = naturalSize.h * fitScale * scale;
    const maxX = Math.max(0, (displayW - CONTAINER_SIZE) / 2);
    const maxY = Math.max(0, (displayH - CONTAINER_SIZE) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }, [scale, naturalSize]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    startOffset.current = { ...offset };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const newOffset = clampOffset(startOffset.current.x + dx, startOffset.current.y + dy);
    setOffset(newOffset);
  }, [isDragging, clampOffset]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoom = useCallback((delta: number) => {
    setScale(prev => {
      const next = Math.max(1, Math.min(3, prev + delta));
      // Re-clamp offset at new scale
      setOffset(prevOffset => clampOffset(prevOffset.x, prevOffset.y));
      return next;
    });
  }, [clampOffset]);

  const handleReset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handleConfirm = useCallback(async () => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const canvas = document.createElement('canvas');
    const size = CONTAINER_SIZE * 2; // 2x for quality
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fitScale = Math.max(CONTAINER_SIZE / naturalSize.w, CONTAINER_SIZE / naturalSize.h);
    const displayW = naturalSize.w * fitScale * scale;
    const displayH = naturalSize.h * fitScale * scale;

    // Source rect calculation: map container coords to image coords
    const srcScaleX = naturalSize.w / displayW;
    const srcScaleY = naturalSize.h / displayH;

    const srcW = CONTAINER_SIZE * srcScaleX * (size / CONTAINER_SIZE);
    const srcH = CONTAINER_SIZE * srcScaleY * (size / CONTAINER_SIZE);

    const centeredX = (naturalSize.w - displayW * srcScaleX) / 2;
    const centeredY = (naturalSize.h - displayH * srcScaleY) / 2;

    const srcX = (0 - offset.x) * srcScaleX * (size / CONTAINER_SIZE) - centeredX * (size / CONTAINER_SIZE) + ((displayW * srcScaleX - naturalSize.w) / 2) * (size / CONTAINER_SIZE);
    const srcY = (0 - offset.y) * srcScaleY * (size / CONTAINER_SIZE) - centeredY * (size / CONTAINER_SIZE) + ((displayH * srcScaleY - naturalSize.h) / 2) * (size / CONTAINER_SIZE);

    // Simpler: draw the image with the same transform as the preview
    ctx.imageSmoothingQuality = 'high';

    const drawScale = fitScale * scale * (size / CONTAINER_SIZE);
    const drawX = size / 2 - (naturalSize.w * drawScale) / 2 + offset.x * (size / CONTAINER_SIZE);
    const drawY = size / 2 - (naturalSize.h * drawScale) / 2 + offset.y * (size / CONTAINER_SIZE);

    ctx.drawImage(img, drawX, drawY, naturalSize.w * drawScale, naturalSize.h * drawScale);

    canvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
      else onConfirm(new Blob([], { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  }, [naturalSize, scale, offset, onConfirm]);

  // Style for the image inside the container
  const fitScale = naturalSize.w
    ? Math.max(CONTAINER_SIZE / naturalSize.w, CONTAINER_SIZE / naturalSize.h)
    : 1;
  const imgWidth = naturalSize.w ? naturalSize.w * fitScale * scale : CONTAINER_SIZE;
  const imgHeight = naturalSize.h ? naturalSize.h * fitScale * scale : CONTAINER_SIZE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-[#1B1B1B] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 text-sm font-semibold text-white/80 transition hover:text-white"
          >
            <X size={18} />
          </button>
          <p className="text-sm font-semibold text-white/80">Seret gambar untuk menyesuaikan</p>
          <button
            onClick={handleConfirm}
            disabled={uploading}
            className="flex items-center gap-1.5 text-sm font-semibold text-white/80 transition hover:text-white disabled:opacity-40"
          >
            <Undo2 size={16} />
            Unggah
          </button>
        </div>

        {/* Image container */}
        <div className="relative flex items-center justify-center px-6 pb-2">
          <div
            ref={containerRef}
            className="relative touch-none overflow-hidden rounded-2xl bg-white/5"
            style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Preview"
              draggable={false}
              className="absolute select-none"
              style={{
                width: imgWidth,
                height: imgHeight,
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                cursor: isDragging ? 'grabbing' : 'grab',
                maxWidth: 'none',
              }}
              onLoad={(e) => {
                const img = e.currentTarget;
                setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
              }}
            />
          </div>

          {/* Zoom controls — right side */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2.5">
            <button
              onClick={() => handleZoom(0.2)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white shadow-sm transition hover:bg-white/20 active:scale-95"
            >
              <Plus size={18} />
            </button>
            <div className="h-12 w-1 rounded-full bg-white/10">
              <div
                className="w-full rounded-full bg-white/50 transition-all"
                style={{ height: `${((scale - 1) / 2) * 100}%`, marginTop: `${(1 - (scale - 1) / 2) * 100}%` }}
              />
            </div>
            <button
              onClick={() => handleZoom(-0.2)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white shadow-sm transition hover:bg-white/20 active:scale-95"
            >
              <Minus size={18} />
            </button>
          </div>
        </div>

        {/* Bottom bar: Reset + Confirm */}
        <div className="flex items-center justify-between px-6 pb-6 pt-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white/80 active:scale-95"
          >
            <Undo2 size={13} />
            Reset
          </button>

          <button
            onClick={handleConfirm}
            disabled={uploading}
            className="flex h-13 w-13 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/25 transition hover:bg-[#1DA851] active:scale-95 disabled:opacity-40"
            style={{ width: 52, height: 52 }}
          >
            {uploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Check size={22} strokeWidth={3} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoAdjustModal;
