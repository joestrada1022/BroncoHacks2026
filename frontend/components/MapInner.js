"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL

// Helper component to dynamically pan and zoom the Leaflet camera to fit all nodes
function MapPanner({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 17 });
        }
    }, [bounds, map]);
    return null;
}

// Sample coordinates to assign to dynamically fetched nodes
const SAMPLE_COORDINATES = [
    [34.0560, -117.8188],
    [34.0575, -117.8214],
    [34.0584, -117.8216],
    [34.0685, -117.8217],
    [34.0687, -117.8218],
    [34.0688, -117.8219],
    [34.0671, -117.8220],
];

export default function MapInner() {
    const [mappedNodes, setMappedNodes] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [nodeData, setNodeData] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // 1. Fetch available nodes on mount
    useEffect(() => {
        const fetchNodes = async () => {
            try {
                const response = await fetch(`http://${NEXT_PUBLIC_API_URL}:3001/api/node-data/nodes`);
                if (response.ok) {
                    const nodeIds = await response.json();

                    // Assign sample coordinates cyclically to the fetched nodes
                    const nodesWithCoords = nodeIds.map((id, index) => ({
                        id: id,
                        name: `Node ${id}`,
                        coordinates: SAMPLE_COORDINATES[index % SAMPLE_COORDINATES.length],
                    }));
                    setMappedNodes(nodesWithCoords);
                }
            } catch (err) {
                console.error("Error fetching nodes:", err);
            }
        };

        fetchNodes();
    }, []);

    // 2. Fetch specific data when a node is clicked
    const fetchNodeData = async (nodeId) => {
        setIsLoadingData(true);
        setNodeData(null); // clear old data

        try {
            const response = await fetch(`http://${NEXT_PUBLIC_API_URL}:3001/api/node-data?nodeId=${encodeURIComponent(nodeId)}`);
            if (response.ok) {
                const data = await response.json();

                // Get the most recent entry
                if (data && data.length > 0) {
                    setNodeData(data[0]);
                } else {
                    setNodeData({ temp: "N/A", humidity: "N/A" });
                }
            }
        } catch (err) {
            console.error("Error fetching node data:", err);
            setNodeData({ temp: "ERR", humidity: "ERR" });
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleNodeClick = (node) => {
        setSelectedNode(node);
        fetchNodeData(node.id);
    };

    // Dynamically calculate bounding box based on mapped backend nodes
    let bounds = null;
    if (mappedNodes.length > 0) {
        const lats = mappedNodes.map(n => n.coordinates[0]);
        const lngs = mappedNodes.map(n => n.coordinates[1]);
        bounds = [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)]
        ];
    }

    return (
        <>
            <MapContainer
                center={[34.0565, -117.8200]} // Cal Poly Pomona Fallback initially
                zoom={16}
                style={{ height: "100%", width: "100%", background: "#0a1a0f", cursor: "crosshair" }}
                zoomControl={false}
            >
                <MapPanner bounds={bounds} />
                <TileLayer
                    // Using CartoDB Dark Matter for the tactical look
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                {mappedNodes.map((node) => (
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
                            click: () => handleNodeClick(node),
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
                            onClick={() => fetchNodeData(selectedNode.id)} // Reload button functionality
                            className="text-green-500 hover:text-green-400 font-bold"
                            title="Refresh Data"
                        >
                            ⟳
                        </button>
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
                        <div className="mt-4 pt-2 border-t border-green-800/50 min-h-[60px]">
                            {/* Handle Loading State explicitly */}
                            {isLoadingData ? (
                                <p className="text-green-500 animate-pulse mt-2 uppercase tracking-widest">
                                    [ FETCHING UPLINK... ]
                                </p>
                            ) : (
                                <>
                                    <p>
                                        <span className="text-green-700">TEMP:</span> {nodeData?.temp ?? "N/A"}{typeof nodeData?.temp === "number" ? "°C" : ""}
                                    </p>
                                    <p>
                                        <span className="text-green-700">HUMIDITY:</span> {nodeData?.humidity ?? "N/A"}{typeof nodeData?.humidity === "number" ? "%" : ""}
                                    </p>
                                    <p>
                                        <span className="text-green-700">PRESSURE:</span> {nodeData?.pressure ?? "N/A"}{typeof nodeData?.pressure === "number" ? " mb" : ""}
                                    </p>
                                </>
                            )}
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