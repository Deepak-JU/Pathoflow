import React, { useState } from 'react';
import { Slide } from '../types/lims';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RefreshCw,
  Eye,
  Info,
  Layers,
  Sparkles,
  Tag
} from 'lucide-react';

interface SlideViewerMockProps {
  slide: Slide | null;
  patientName?: string;
  mrn?: string;
  accessionNumber?: string;
}

export const SlideViewerMock: React.FC<SlideViewerMockProps> = ({
  slide,
  patientName = 'Anonymous Patient',
  mrn = 'MRN-000000',
  accessionNumber = 'ACC-XXXX'
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(10); // 1, 4, 10, 20, 40
  const [activeStain, setActiveStain] = useState<string>(slide?.stain_type || 'H&E');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const zoomLevels = [1, 4, 10, 20, 40];

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoomLevel(10);
    setPanOffset({ x: 0, y: 0 });
  };

  if (!slide) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-[420px] text-slate-400">
        <Layers className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
        <h4 className="text-base font-semibold text-slate-300">No Slide Selected</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
          Select a glass slide from the specimen lineage tree on the left to load its high-resolution digitized whole-slide image.
        </p>
      </div>
    );
  }

  // Visual simulation patterns based on stain type
  const getSlideBackground = () => {
    if (activeStain.includes('IHC')) {
      // Immunohistochemistry: Brown DAB chromogen + Blue nuclear counterstain
      return 'radial-gradient(circle at 45% 55%, #78350f 0%, #451a03 15%, #1e1b4b 60%, #09090b 100%)';
    } else if (activeStain.includes('FISH')) {
      // FISH: Fluorescent probe signals on black background
      return 'radial-gradient(circle at 50% 50%, #064e3b 5%, #022c22 30%, #030712 90%)';
    } else {
      // H&E: Classic Hematoxylin (deep purple-blue) and Eosin (vibrant pink)
      return 'radial-gradient(circle at 40% 40%, #be185d 0%, #831843 20%, #312e81 60%, #0f172a 100%)';
    }
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col ${
      isFullscreen ? 'fixed inset-4 z-50 bg-slate-950 border-brand-500' : 'h-full min-h-[520px]'
    }`}>
      {/* Top Controls Bar */}
      <div className="bg-slate-850 border-b border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-mono font-bold text-slate-200">SLIDE: {slide.slide_number}</span>
            <span className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 font-mono font-semibold">
              {slide.stain_type}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-slate-400 font-mono border-l border-slate-700 pl-3">
            <span>{slide.slide_barcode}</span>
            <span>•</span>
            <span className={slide.status === 'SCANNED' ? 'text-emerald-400' : 'text-amber-400'}>
              STATUS: {slide.status}
            </span>
          </div>
        </div>

        {/* Magnification controls */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {zoomLevels.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setZoomLevel(lvl)}
              className={`px-2 py-0.5 rounded font-mono font-semibold text-xs transition-colors ${
                zoomLevel === lvl
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {lvl}x
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`p-1.5 rounded border text-xs flex items-center gap-1 transition-colors ${
              showAnnotations
                ? 'bg-purple-950/60 border-purple-700 text-purple-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle Cellular Annotations"
          >
            <Tag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Annotations</span>
          </button>

          <button
            onClick={resetView}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
            title="Reset View"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div
        className="relative flex-1 overflow-hidden select-none cursor-grab active:cursor-grabbing bg-slate-950 flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Virtual Whole-Slide Glass Slide Canvas */}
        <div
          className="relative rounded-2xl shadow-2xl transition-transform duration-100 ease-out border border-slate-800"
          style={{
            width: '640px',
            height: '420px',
            background: getSlideBackground(),
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 8})`,
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9)'
          }}
        >
          {/* Microscope Field-of-View Reticle / Tissue Texture Mock */}
          <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>

          {/* Cellular features simulation based on magnification */}
          {zoomLevel >= 10 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-72 h-48 border border-white/20 rounded-full blur-[1px] opacity-70 animate-pulse bg-white/5"></div>
            </div>
          )}

          {/* Interactive Pathology Findings Annotations */}
          {showAnnotations && zoomLevel >= 4 && (
            <>
              <div className="absolute top-20 left-28 bg-rose-950/90 text-rose-200 border border-rose-500/80 px-2 py-1 rounded text-[10px] font-mono shadow-lg flex items-center gap-1 pointer-events-auto">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>ROI 1: Atypical Nuclear Hyperchromasia</span>
              </div>

              <div className="absolute bottom-24 right-32 bg-amber-950/90 text-amber-200 border border-amber-500/80 px-2 py-1 rounded text-[10px] font-mono shadow-lg flex items-center gap-1 pointer-events-auto">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>ROI 2: Glandular Architect Disarray</span>
              </div>

              {activeStain.includes('IHC') && (
                <div className="absolute top-36 right-20 bg-emerald-950/90 text-emerald-200 border border-emerald-500/80 px-2 py-1 rounded text-[10px] font-mono shadow-lg flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                  <span>DAB 3+ Intense Membrane Staining</span>
                </div>
              )}
            </>
          )}

          {/* Slide Glass Physical Barcode Label Mock (Left edge) */}
          <div className="absolute left-3 top-3 bottom-3 w-36 bg-slate-900/95 border border-slate-700/80 rounded-lg p-2 text-slate-300 font-mono text-[9px] shadow-md flex flex-col justify-between backdrop-blur-sm pointer-events-none">
            <div>
              <div className="font-bold text-slate-100 text-[10px] border-b border-slate-700 pb-1 flex items-center justify-between">
                <span>PATHOLOGY</span>
                <span className="text-[8px] bg-brand-500/20 text-brand-300 px-1 rounded">WSI</span>
              </div>
              <div className="mt-1 text-slate-400 leading-tight">
                <div>ACC: <strong className="text-slate-200">{accessionNumber}</strong></div>
                <div>MRN: {mrn}</div>
                <div>PT: {patientName.slice(0, 14)}</div>
              </div>
            </div>

            <div>
              <div className="text-center font-bold text-slate-100 text-[10px] bg-slate-800 py-0.5 rounded">
                {slide.slide_number} • {slide.stain_type}
              </div>
              <div className="mt-1 flex items-center justify-center gap-0.5 opacity-80 h-4 bg-white/10 rounded">
                <div className="w-0.5 h-full bg-slate-300"></div>
                <div className="w-1 h-full bg-slate-300"></div>
                <div className="w-0.5 h-full bg-slate-300"></div>
                <div className="w-1.5 h-full bg-slate-300"></div>
                <div className="w-0.5 h-full bg-slate-300"></div>
                <div className="w-1 h-full bg-slate-300"></div>
              </div>
              <div className="text-[7px] text-center text-slate-400 mt-0.5 truncate">{slide.slide_barcode}</div>
            </div>
          </div>
        </div>

        {/* Reticle Overlay Crosshair in Center */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
          <div className="w-8 h-8 border border-white/60 rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        </div>

        {/* Viewport HUD Info at bottom */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-400 backdrop-blur-md flex items-center gap-3">
          <span>MAG: <strong className="text-brand-400">{zoomLevel}x</strong></span>
          <span>•</span>
          <span>STAIN: <strong className="text-slate-200">{slide.stain_type}</strong></span>
          <span>•</span>
          <span>PAN: X:{Math.round(panOffset.x)} Y:{Math.round(panOffset.y)}</span>
        </div>

        <div className="absolute bottom-3 right-3 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-400 backdrop-blur-md flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>Click & drag to navigate tissue plane</span>
        </div>
      </div>
    </div>
  );
};
