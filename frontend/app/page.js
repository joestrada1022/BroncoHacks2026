"use client";

import { useEffect, useState } from "react";
import { socket } from "../socket"

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");
  const [data, setData] = useState("No Data");

  useEffect(() => {
    if (socket.connected) {
      onConnect();
    }

    function onConnect() {
      setIsConnected(true);
      setTransport(socket.io.engine.transport.name);

      socket.io.engine.on("upgrade", (transport) => {
        setTransport(transport.name);
      });
    }

    function onDisconnect() {
      setIsConnected(false);
      setTransport("N/A");
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on('dataReading', message => {
      console.log(message)
      setData(message)
    })

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-8 selection:bg-green-900 selection:text-green-100">
      <div className="max-w-4xl mx-auto">
        <header className="border-b-2 border-green-800 pb-4 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-widest uppercase">Crop Recon</h1>
            <p className="text-green-700 text-sm mt-1 uppercase tracking-widest">System Monitor - Node Alpha</p>
          </div>
          <div className="text-right border border-green-800 p-3 bg-green-950/20">
            <div className="flex items-center gap-3">
              <span className="uppercase text-sm font-bold tracking-wider">Uplink Status:</span>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 shadow-[0_0_8px_theme(colors.green.500)] animate-pulse" : "bg-red-500 shadow-[0_0_8px_theme(colors.red.500)]"}`}></div>
                <span className={`font-bold uppercase tracking-wider ${isConnected ? "text-green-400" : "text-red-500"}`}>
                  {isConnected ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
            </div>
            <div className="text-xs text-green-700 mt-1 uppercase">Comm Protocol: {transport}</div>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Data Readout Panel */}
          <div className="border-2 border-green-800 bg-black p-6 relative group overflow-hidden">
            {/* Scanline effect */}
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,0,0.05)_50%)] bg-[length:100%_4px] pointer-events-none"></div>

            <h2 className="text-xl border-b border-green-800/50 pb-2 mb-6 uppercase tracking-widest text-green-400 flex justify-between">
              <span>Live Sensor Feed</span>
              {typeof data === 'object' && <span className="text-green-700 text-sm animate-pulse">Receiving...</span>}
            </h2>

            {typeof data === 'object' ? (
              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-center border-b border-green-900 pb-2">
                  <span className="text-green-700 uppercase tracking-widest">Active Node ID</span>
                  <span className="text-2xl font-bold">{data.nodeId || "UNKNOWN"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-green-900 pb-2">
                  <span className="text-green-700 uppercase tracking-widest">Core Temp</span>
                  <span className="text-3xl font-bold text-yellow-400">{data.temp || "ERR"} <span className="text-sm text-green-700">°C/F</span></span>
                </div>
                <div className="flex justify-between items-center border-b border-green-900 pb-2">
                  <span className="text-green-700 uppercase tracking-widest">Ambient Humidity</span>
                  <span className="text-3xl font-bold text-cyan-400">{data.humidity || "ERR"} <span className="text-sm text-green-700">%</span></span>
                </div>
                <div className="flex justify-between items-center border-b border-green-900 pb-2">
                  <span className="text-green-700 uppercase tracking-widest">Pressure</span>
                  <span className="text-3xl font-bold text-cyan-400">{data.pressure || "ERR"} <span className="text-sm text-green-700">mb</span></span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 border border-dashed border-green-900 text-green-800 uppercase tracking-widest">
                Awaiting Telemetry...
              </div>
            )}
          </div>

          {/* Raw Log Panel */}
          <div className="border border-green-900 bg-green-950/10 p-6 flex flex-col h-full">
            <h2 className="text-sm border-b border-green-900 pb-2 mb-4 uppercase tracking-widest text-green-700">
              Raw Data Stream
            </h2>
            <div className="flex-1 overflow-auto bg-black border border-green-900 p-4 text-xs text-green-600">
              {typeof data === 'object' ? (
                <pre>{JSON.stringify(data, null, 2)}</pre>
              ) : (
                <span className="opacity-50"># ENCRYPTED TRANSMISSION PENDING...</span>
              )}
              {/* Fake historical logs for military feel */}
              {typeof data === 'object' && (
                <div className="mt-4 opacity-50 space-y-1">
                  <p>&gt; Validating checksum... OK</p>
                  <p>&gt; Decrypting payload... OK</p>
                  <p>&gt; Ingesting into AtlasDB... AWAITING CONFIRMATION</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}