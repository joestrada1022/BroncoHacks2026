import React from 'react';

export default function AlertPanel({ alerts = [] }) {

    const displayAlerts = alerts.length > 0 ? alerts : [
        { id: '1', nodeId: 'ALPHA_01', reason: 'Sudden Temp Shift (+6.2°C)', status: 'open', timestamp: new Date().toISOString() },
        { id: '2', nodeId: 'BRAVO_04', reason: 'Humidity Spike (+12%)', status: 'resolved', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
        { id: '3', nodeId: 'ALPHA_01', reason: 'Thermal Anomaly (+5.1°C)', status: 'resolved', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
        { id: '4', nodeId: 'CHARLIE_09', reason: 'Signal Degraded', status: 'resolved', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
        { id: '5', nodeId: 'CHARLIE_09', reason: 'Signal Degraded', status: 'resolved', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
        { id: '6', nodeId: 'CHARLIE_09', reason: 'Signal Degraded', status: 'resolved', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
        { id: '7', nodeId: 'CHARLIE_09', reason: 'Signal Degraded', status: 'resolved', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
        { id: '8', nodeId: 'CHARLIE_09', reason: 'Signal Degraded', status: 'resolved', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
        { id: '9', nodeId: 'CHARLIE_09', reason: 'Signal Degraded', status: 'resolved', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
    ];

    return (
        <div className="flex flex-col h-full bg-black/80 border border-slate-800 rounded font-mono text-sm overflow-hidden backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)]">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 p-3 flex justify-between items-center">
                <h2 className="text-green-500 font-bold tracking-widest uppercase flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Incident Log
                </h2>
                <span className="text-slate-400 text-[10px] tracking-widest">
                    {displayAlerts.filter(a => a.status === 'open').length} ACTIVE
                </span>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {displayAlerts.map((alert) => (
                    <div
                        key={alert.id}
                        className={`p-3 rounded border-l-4 bg-slate-900/50 flex flex-col gap-1.5 transition-all ${alert.status === 'open'
                            ? 'border-red-500 shadow-[inset_4px_0_15px_rgba(239,68,68,0.15)]' // Red glow for open
                            : 'border-green-500 opacity-70' // Subdued green for resolved
                            }`}
                    >
                        {/* Upper row: Node ID and Status Badge */}
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-200 font-bold tracking-wider text-xs">
                                    [NODE_{alert.nodeId}]
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest border ${alert.status === 'open'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/50'
                                    : 'bg-green-500/20 text-green-500 border-green-500/50'
                                    }`}>
                                    {alert.status}
                                </span>
                            </div>
                            <span className="text-slate-500 text-[10px]">
                                {new Date(alert.timestamp).toLocaleTimeString([], { hour12: false })}
                            </span>
                        </div>

                        {/* Lower row: Reason */}
                        <div className={`text-xs tracking-wide ${alert.status === 'open' ? 'text-red-300' : 'text-slate-400'}`}>
                            {alert.reason}
                        </div>
                    </div>
                ))}

                {displayAlerts.length === 0 && (
                    <div className="text-center p-4 text-slate-600 text-xs tracking-widest border border-dashed border-slate-700 m-2">
                        NO ANOMALIES IN SYSTEM.
                    </div>
                )}
            </div>
        </div>
    );
}
