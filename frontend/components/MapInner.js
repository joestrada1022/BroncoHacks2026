"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Mock locations for ESP Nodes around Pomona
// Note: Leaflet uses [latitude, longitude] arrays
const NODES = [
    { id: "alpha", name: "Node Alpha (Bldg 17)", coordinates: [34.0560, -117.8188], temp: 24, humidity: 45 },
    { id: "beta", name: "Node Beta (CLA)", coordinates: [34.0565, -117.8214], temp: 22, humidity: 50 },
    { id: "gamma", name: "Node Gamma (Library)", coordinates: [34.0583, -117.8216], temp: 18, humidity: 65 },
];

export default function MapInner() {
    const [selectedNode, setSelectedNode] = useState(null);

    // Center on Cal Poly Pomona
    const center = [34.0565, -117.8200];

    return (
        <>
            <MapContainer
                center={center}
                zoom={16}
                style={{ height: "100%", width: "100%", background: "#0a1a0f", cursor: "crosshair" }}
                zoomControl={false}
            >
                <TileLayer
                    // Using CartoDB Dark Matter for the tactical look
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                {NODES.map((node) => (
                    <CircleMarker
                        key={node.id}
                        center={node.coordinates}
                        radius={8}
                        pathOptions={{
                            color: "#4ade80",
                            fillColor: selectedNode?.id === node.id ? "#ffffff" : "#22c55e",
                            fillOpacity: 0.7,
                            weight: selectedNode?.id === node.id ? 4 : 2,
                        }}
                        eventHandlers={{
                            click: () => setSelectedNode(node),
                        }}
                    />
                ))}
            </MapContainer>

            {/* Target Info Panel Overlay */}
            {selectedNode && (
                <div className="absolute top-4 right-4 w-64 bg-black border border-green-500 p-4 z-[400] shadow-[0_0_15px_theme(colors.green.900)]">
                    <div className="flex justify-between items-center mb-2 border-b border-green-800 pb-1">
                        <h3 className="font-bold text-green-400 uppercase tracking-widest text-sm">Target Detail</h3>
                        <button
                            onClick={() => setSelectedNode(null)}
                            className="text-red-500 hover:text-red-400 font-bold"
                        >
                            X
                        </button>
                    </div>
                    <div className="space-y-2 text-sm text-green-300 font-mono">
                        <p>
                            <span className="text-green-700">ID:</span> {selectedNode.name}
                        </p>
                        <p>
                            <span className="text-green-700">LAT:</span>{" "}
                            {selectedNode.coordinates[0].toFixed(4)}
                        </p>
                        <p>
                            <span className="text-green-700">LNG:</span>{" "}
                            {selectedNode.coordinates[1].toFixed(4)}
                        </p>
                        <div className="mt-4 pt-2 border-t border-green-800/50">
                            <p>
                                <span className="text-green-700">TEMP:</span> {selectedNode.temp}°C
                            </p>
                            <p>
                                <span className="text-green-700">HUMIDITY:</span> {selectedNode.humidity}%
                            </p>
                        </div>
                        <p className="text-xs text-green-500 mt-2 animate-pulse">
                            [ SIGNAL SECURE ]
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}