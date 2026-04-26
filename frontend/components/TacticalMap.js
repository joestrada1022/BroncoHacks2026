"use client";

import dynamic from "next/dynamic";

// MapInner must be dynamically imported to prevent SSR errors (window is not defined)
const MapInner = dynamic(() => import("./MapInner"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black">
            <div className="w-8 h-8 border-4 border-green-800 border-t-green-400 rounded-full animate-spin mb-4"></div>
            <p className="text-green-500 uppercase tracking-widest text-sm animate-pulse">Initializing Satellite Uplink...</p>
        </div>
    ),
});

export default function TacticalMap() {
    return (
        <div className="relative w-full h-96 border border-green-800 bg-black/50 overflow-hidden flex">
            {/* Scanline effect */}
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,0,0.05)_50%)] bg-[length:100%_4px] pointer-events-none z-[500]"></div>

            <div className="flex-grow w-full h-full relative z-0 relative">
                <MapInner />
            </div>

            {/* Crosshairs decoration */}
            <div className="absolute top-0 left-1/2 w-px h-full bg-green-900/40 pointer-events-none z-40"></div>
            <div className="absolute top-1/2 left-0 w-full h-px bg-green-900/40 pointer-events-none z-40"></div>
        </div>
    );
}