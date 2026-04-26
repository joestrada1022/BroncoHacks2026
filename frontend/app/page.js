"use client";

import { useEffect, useState, useMemo } from "react";
import { socket } from "../socket"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import TacticalMap from "../components/TacticalMap";
import AlertPanel from "../components/AlertPanel";


const HISTORY_SIZE = 50;

function isKnownNodeId(nodeId) {
  return typeof nodeId === "string" && nodeId.trim() !== "" && nodeId.trim().toLowerCase() !== "unknown";
}

function sanitizeMetric(value) {
  const numeric = Number(value);
  return isNaN(numeric) ? null : numeric;
}

function normalizeSeries(series) {
  const sorted = [...series].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  if (sorted.length > HISTORY_SIZE) {
    return sorted.slice(sorted.length - HISTORY_SIZE);
  }
  return sorted;
}

const NODE_COLORS = ["#eab308", "#22d3ee", "#a855f7", "#22c55e", "#ef4444", "#f97316"];
const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");
  const [data, setData] = useState("No Data");
  const [chartMetric, setChartMetric] = useState("temp");
  const [feedMode, setFeedMode] = useState("live");
  const [showWelcome, setShowWelcome] = useState(true);

  const [nodeIds, setNodeIds] = useState([]);
  const [nodeSeries, setNodeSeries] = useState({});
  const [historyError, setHistoryError] = useState(null);

  const [alertLogs, setAlertLogs] = useState([]);

  const [incidentSummary, setIncidentSummary] = useState([
    "Loading incident briefing...",
  ])

  useEffect(() => {
    async function loadIncidentSummary() {
      try {
        const res = await fetch(`http://${NEXT_PUBLIC_API_URL}:3001/api/alert-logs/summary?limit=10`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json = await res.json();
        if (Array.isArray(json.bullets) && json.bullets.length > 0) {
          setIncidentSummary(json.bullets);
        } else {
          setIncidentSummary([
            "No briefing bullets available yet.",
            "Monitoring remains active for incoming incidents.",
          ]);
        }
      } catch (err) {
        console.error("Failed to fetch incident summary", err);
        setIncidentSummary([
          "Could not load AI incident briefing.",
          "Fallback mode active while telemetry and logging continue.",
        ]);
      }
    }

    loadIncidentSummary();
  }, [])

  useEffect(() => {
    async function loadLogs() {
      try {
        setAlertLogs([])
        const res = await fetch(`http://${NEXT_PUBLIC_API_URL}:3001/api/alert-logs?limit=10`)
        if (!res.ok) {
          throw new Error("http error for log. status: ", res.status)
        }

        const json = await res.json()

        if (json.count > 0 && json.results) {
          setAlertLogs(json.results)
        }
      } catch (err) {
        console.error("Failed to fetch log history", err);
      }
    }
    loadLogs()
  }, [])

  useEffect(() => {
    async function loadHistory() {
      try {
        setHistoryError(null);
        const res = await fetch(`http://${NEXT_PUBLIC_API_URL}:3001/api/node-data/history`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json = await res.json();

        if (json.nodes && json.data) {
          const knownNodes = json.nodes.filter(isKnownNodeId);
          setNodeIds(knownNodes);

          let nextSeries = {};
          for (const node of knownNodes) {
            nextSeries[node] = normalizeSeries(json.data[node] || []);
          }
          setNodeSeries(nextSeries);
        }
      } catch (err) {
        console.error("Failed to fetch graph history", err);
        setHistoryError(err.message);
      }
    }

    loadHistory();
  }, []);

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

      const { nodeId, temp, humidity, pressure, timestamp } = message;
      if (isKnownNodeId(nodeId)) {
        setNodeIds(prev => {
          if (!prev.includes(nodeId)) {
            return [...prev, nodeId];
          }
          return prev;
        });

        setNodeSeries(prev => {
          const existing = prev[nodeId] || [];
          // Use current time if timestamp is missing
          const safeTimestamp = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
          const newReading = { temp, humidity, pressure, timestamp: safeTimestamp };
          const updated = [...existing, newReading];

          return {
            ...prev,
            [nodeId]: normalizeSeries(updated)
          };
        });
      }
    })

    socket.on('alertLogUpdated', (payload) => {
      if (!payload || !payload.alert) return;

      const incoming = payload.alert;

      setAlertLogs((prev) => {
        const withoutExisting = prev.filter(
          (item) => String(item._id || item.id) !== String(incoming._id || incoming.id)
        );

        const next = [incoming, ...withoutExisting]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10);

        return next;
      });
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("dataReading");
      socket.off("alertLogUpdated");
    };
  }, []);

  const { chartRows, hasRenderablePoints } = useMemo(() => {
    if (nodeIds.length === 0) return { chartRows: [], hasRenderablePoints: false };

    let pointerIndices = {};
    nodeIds.forEach(id => (pointerIndices[id] = 0));

    let combined = [];
    const maxIters = nodeIds.length * HISTORY_SIZE * 2;
    let iters = 0;

    let hasRenderablePoints = false;

    while (iters < maxIters) {
      let oldestTime = null;
      let targetNode = null;

      nodeIds.forEach(id => {
        const series = nodeSeries[id] || [];
        const idx = pointerIndices[id];
        if (idx < series.length) {
          const t = new Date(series[idx].timestamp).getTime();
          if (oldestTime === null || t < oldestTime) {
            oldestTime = t;
            targetNode = id;
          }
        }
      });

      if (!targetNode) break;

      const thisTime = oldestTime;
      const dateObj = new Date(thisTime);
      let row = { time: `${dateObj.getHours().toString().padStart(2, "0")}:${dateObj.getMinutes().toString().padStart(2, "0")}:${dateObj.getSeconds().toString().padStart(2, "0")}` };

      nodeIds.forEach((id) => {
        const series = nodeSeries[id] || [];
        const idx = pointerIndices[id];
        if (idx < series.length) {
          const seriesT = new Date(series[idx].timestamp).getTime();

          if (Math.abs(seriesT - thisTime) < 1000) {
            const val = sanitizeMetric(series[idx][chartMetric]);
            row[id] = val;
            pointerIndices[id]++;
            if (val !== null) hasRenderablePoints = true;
          } else {
            row[id] = combined.length > 0 ? combined[combined.length - 1][id] : null;
          }
        } else {
          row[id] = combined.length > 0 ? combined[combined.length - 1][id] : null;
        }
      });

      combined.push(row);
      iters++;
    }

    return { chartRows: combined, hasRenderablePoints };
  }, [nodeIds, nodeSeries, chartMetric]);

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-8 selection:bg-green-900 selection:text-green-100">
      {showWelcome && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl border-2 border-green-700 bg-[#061006] shadow-[0_0_45px_rgba(34,197,94,0.18)] relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,0,0.05)_50%)] bg-[length:100%_4px] pointer-events-none"></div>

            <div className="relative z-10 p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 border-b border-green-800/60 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-green-700">Command Interface</p>
                  <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-widest text-green-300 mt-1">Welcome Back, Operator</h2>
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 border border-green-700 text-green-500">Hourly Brief</span>
              </div>

              <p className="mt-5 text-sm text-green-400/90 uppercase tracking-wider">
                Incident summary from the previous 60 minutes.
              </p>

              <div className="mt-4 border border-green-900 bg-black/45 p-4 space-y-3">
                {incidentSummary.map((line, index) => (
                  <div key={`sample-incident-${index}`} className="flex items-start gap-3 text-sm text-green-300/90">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]"></span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={() => setShowWelcome(false)}
                  className="px-5 py-2 border border-green-500 bg-green-500 text-black font-bold uppercase tracking-widest hover:bg-green-400 transition-colors"
                >
                  Enter Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          {/* Main Feed Panel */}
          <div className="border-2 border-green-800 bg-black p-6 relative group overflow-hidden flex flex-col h-[400px]">
            {/* Scanline effect */}
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,0,0.05)_50%)] bg-[length:100%_4px] pointer-events-none"></div>

            <div className="border-b border-green-800/50 pb-2 mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
              <h2 className="text-xl uppercase tracking-widest text-green-400">
                {feedMode === 'live' ? 'Live Sensor Feed' : 'Raw Data Stream'}
              </h2>

              <div className="flex gap-2 relative z-10">
                <button
                  onClick={() => setFeedMode("live")}
                  className={`px-3 py-1 text-xs uppercase tracking-widest border transition-colors ${feedMode === "live" ? "bg-green-500 text-black border-green-500 font-bold" : "border-green-800 text-green-700 hover:text-green-500 hover:border-green-500"}`}
                >
                  Live
                </button>
                <button
                  onClick={() => setFeedMode("raw")}
                  className={`px-3 py-1 text-xs uppercase tracking-widest border transition-colors ${feedMode === "raw" ? "bg-green-500 text-black border-green-500 font-bold" : "border-green-800 text-green-700 hover:text-green-500 hover:border-green-500"}`}
                >
                  Raw
                </button>
              </div>
            </div>

            {typeof data === 'object' ? (
              <div className="flex-1 relative z-10 overflow-hidden flex flex-col">
                {feedMode === 'live' ? (
                  <div className="space-y-6">
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
                  <div className="flex-1 overflow-auto bg-black/50 border border-green-900/50 p-4 text-xs text-green-600 block">
                    <pre>{JSON.stringify(data, null, 2)}</pre>
                    <div className="mt-4 opacity-50 space-y-1">
                      {/* <p>&gt; Validating checksum... OK</p> */}
                      {/* <p>&gt; Decrypting payload... OK</p> */}
                      <p>&gt; Ingesting into AtlasDB... OK</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 border border-dashed border-green-900 text-green-800 uppercase tracking-widest relative z-10">
                Awaiting Telemetry...
              </div>
            )}
          </div>

          {/* Incident Log / Alert Panel */}
          <div className="flex flex-col border-2 border-green-800 p-1 relative group overflow-hidden bg-black h-[400px]">
            {/* Scanline effect */}
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,0,0.05)_50%)] bg-[length:100%_4px] pointer-events-none z-0"></div>

            <div className="relative z-10 h-full flex flex-col">
              <AlertPanel alerts={alertLogs} />
            </div>
          </div>

          {/* Tactical Geographical Feed */}
          <div className="col-span-1 md:col-span-2 border border-green-900 bg-green-950/10 p-6 flex flex-col pt-4 mt-2">
            <div className="flex justify-between items-center border-b border-green-900 pb-2 mb-4">
              <h2 className="text-xl uppercase tracking-widest text-green-700">
                Global Positioning Network
              </h2>
              <span className="text-xs text-green-500 animate-pulse">[ SATELLITE LINK ACTIVE ]</span>
            </div>

            <TacticalMap />
          </div>

          {/* Historical Data Graph */}
          <div className="col-span-1 md:col-span-2 border-2 border-green-800 bg-black p-6 relative group overflow-hidden mt-2">
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,0,0.05)_50%)] bg-[length:100%_4px] pointer-events-none"></div>

            <div className="flex justify-between items-center border-b border-green-800/50 pb-2 mb-6">
              <h2 className="text-xl uppercase tracking-widest text-green-400">
                Telemetry Analytics
              </h2>

              <div className="flex gap-2 relative z-10">
                <button
                  onClick={() => setChartMetric("temp")}
                  className={`px-3 py-1 text-sm uppercase tracking-widest border transition-colors ${chartMetric === "temp" ? "bg-green-500 text-black border-green-500 font-bold" : "border-green-800 text-green-700 hover:text-green-500 hover:border-green-500"}`}
                >
                  Temp
                </button>
                <button
                  onClick={() => setChartMetric("humidity")}
                  className={`px-3 py-1 text-sm uppercase tracking-widest border transition-colors ${chartMetric === "humidity" ? "bg-cyan-500 text-black border-cyan-500 font-bold" : "border-green-800 text-green-700 hover:text-cyan-500 hover:border-cyan-500"}`}
                >
                  Humidity
                </button>
                <button
                  onClick={() => setChartMetric("pressure")}
                  className={`px-3 py-1 text-sm uppercase tracking-widest border transition-colors ${chartMetric === "pressure" ? "bg-purple-500 text-black border-purple-500 font-bold" : "border-green-800 text-green-700 hover:text-purple-500 hover:border-purple-500"}`}
                >
                  Pressure
                </button>
              </div>
            </div>

            <div className="h-64 w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f4220" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="#15803d"
                    tick={{ fill: '#15803d', fontSize: 12, fontFamily: 'monospace' }}
                  />
                  <YAxis
                    stroke="#15803d"
                    tick={{ fill: '#15803d', fontSize: 12, fontFamily: 'monospace' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'black', border: '1px solid #16a34a', color: '#22c55e', fontFamily: 'monospace' }}
                    itemStyle={{ color: '#22c55e' }}
                  />
                  <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 12 }} />

                  {nodeIds.length > 0 ? (
                    nodeIds.map((nodeId, index) => (
                      <Line
                        key={nodeId}
                        type="monotone"
                        dataKey={nodeId}
                        name={nodeId}
                        stroke={NODE_COLORS[index % NODE_COLORS.length]}
                        strokeWidth={2}
                        connectNulls
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {nodeIds.length === 0 && !historyError && (
              <p className="mt-4 text-sm text-green-700 uppercase tracking-widest text-center">Awaiting node telemetry stream or checking history...</p>
            )}

            {!hasRenderablePoints && nodeIds.length > 0 && (
              <p className="mt-2 text-sm text-yellow-400 uppercase tracking-widest text-center">No valid data points for selected metric in recent history.</p>
            )}

            {historyError && (
              <p className="mt-2 text-sm text-red-500 uppercase tracking-widest text-center">Warning: {historyError}</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}