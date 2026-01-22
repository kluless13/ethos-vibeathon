"use client";

import { useEffect, useRef, useState } from "react";

interface Node {
  id: string;
  type: "center" | "outgoing" | "incoming";
  profile_id: number;
  x?: number;
  y?: number;
}

interface Edge {
  source: string;
  target: string;
  date: string | null;
  eth: number;
  direction: "in" | "out" | "peer";
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
  mutual: string[];
  stats: {
    total_outgoing: number;
    total_incoming: number;
    total_rings: number;
  };
}

export default function NetworkGraph() {
  const [data, setData] = useState<GraphData | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<Edge | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch("/data/serpin_graph.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="h-[500px] flex items-center justify-center text-zinc-500">
        Loading network...
      </div>
    );
  }

  // Layout calculation - position nodes in a circle around center
  const width = 800;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 180;

  // Separate incoming and outgoing for positioning
  const outgoingNodes = data.nodes.filter((n) => n.type === "outgoing");
  const incomingNodes = data.nodes.filter((n) => n.type === "incoming");
  const centerNode = data.nodes.find((n) => n.type === "center");

  // Position nodes
  const nodePositions: Record<string, { x: number; y: number }> = {};

  // Center node
  if (centerNode) {
    nodePositions[centerNode.id] = { x: centerX, y: centerY };
  }

  // Outgoing nodes on the right semicircle
  outgoingNodes.forEach((node, i) => {
    const angle = -Math.PI / 2 + (Math.PI * (i + 0.5)) / outgoingNodes.length;
    nodePositions[node.id] = {
      x: centerX + radius * 1.1 * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  // Incoming nodes on the left semicircle
  incomingNodes.forEach((node, i) => {
    const angle = Math.PI / 2 + (Math.PI * (i + 0.5)) / incomingNodes.length;
    nodePositions[node.id] = {
      x: centerX + radius * 1.1 * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  const getNodeColor = (node: Node) => {
    if (node.type === "center") return "#FF4000";
    if (data.mutual.includes(node.id)) return "#22c55e"; // Green for mutual
    if (node.type === "outgoing") return "#f97316"; // Orange for outgoing
    return "#3b82f6"; // Blue for incoming
  };

  const getEdgeColor = (edge: Edge) => {
    if (data.mutual.includes(edge.source) || data.mutual.includes(edge.target)) {
      if (edge.direction !== "peer") return "#22c55e";
    }
    if (edge.direction === "out") return "#f97316";
    if (edge.direction === "in") return "#3b82f6";
    return "#525252";
  };

  return (
    <div className="relative">
      {/* Legend */}
      <div className="absolute top-4 left-4 bg-zinc-900/90 backdrop-blur-sm rounded-xl p-4 border border-zinc-800/50 z-10">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Legend</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF4000]" />
            <span className="text-zinc-300">serpinxbt (center)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-zinc-300">Vouched for ({data.stats.total_outgoing})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-zinc-300">Vouched by ({data.stats.total_incoming})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-zinc-300">Mutual ({data.mutual.length})</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 bg-zinc-900/90 backdrop-blur-sm rounded-xl p-4 border border-zinc-800/50 z-10">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Network Stats</p>
        <div className="text-2xl font-bold text-[#FF4000]">{data.stats.total_rings.toLocaleString()}</div>
        <p className="text-xs text-zinc-400">rings detected</p>
      </div>

      {/* Hover tooltip */}
      {hoveredEdge && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/95 backdrop-blur-sm rounded-xl p-4 border border-zinc-800/50 z-10">
          <p className="text-white font-medium">
            {hoveredEdge.source} → {hoveredEdge.target}
          </p>
          <p className="text-zinc-400 text-sm">
            {hoveredEdge.eth > 0 ? `${hoveredEdge.eth} ETH staked` : "Connected"}
            {hoveredEdge.date && ` • ${hoveredEdge.date}`}
          </p>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[500px]"
      >
        {/* Background gradient */}
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF4000" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FF4000" stopOpacity="0" />
          </radialGradient>
          <marker
            id="arrowhead-orange"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#f97316" fillOpacity="0.6" />
          </marker>
          <marker
            id="arrowhead-blue"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" fillOpacity="0.6" />
          </marker>
          <marker
            id="arrowhead-green"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" fillOpacity="0.6" />
          </marker>
        </defs>

        {/* Center glow */}
        <circle cx={centerX} cy={centerY} r={120} fill="url(#centerGlow)" />

        {/* Edges */}
        {data.edges.map((edge, i) => {
          const source = nodePositions[edge.source];
          const target = nodePositions[edge.target];
          if (!source || !target) return null;

          const color = getEdgeColor(edge);
          const isHovered = hoveredEdge === edge;
          const isHighlighted = hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode);
          const opacity = hoveredNode ? (isHighlighted ? 1 : 0.15) : 0.5;

          // Calculate line endpoints (offset from node center)
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const offsetStart = edge.source === "serpinxbt" ? 30 : 20;
          const offsetEnd = edge.target === "serpinxbt" ? 30 : 20;

          const x1 = source.x + (dx / len) * offsetStart;
          const y1 = source.y + (dy / len) * offsetStart;
          const x2 = target.x - (dx / len) * offsetEnd;
          const y2 = target.y - (dy / len) * offsetEnd;

          const markerId = color === "#22c55e" ? "arrowhead-green" :
                          color === "#f97316" ? "arrowhead-orange" : "arrowhead-blue";

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth={isHovered ? 3 : edge.eth > 1 ? 2 : 1}
              strokeOpacity={isHovered ? 1 : opacity}
              markerEnd={`url(#${markerId})`}
              style={{ cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={() => setHoveredEdge(edge)}
              onMouseLeave={() => setHoveredEdge(null)}
            />
          );
        })}

        {/* Nodes */}
        {data.nodes.map((node) => {
          const pos = nodePositions[node.id];
          if (!pos) return null;

          const color = getNodeColor(node);
          const isCenter = node.type === "center";
          const isHovered = hoveredNode === node.id;
          const radius = isCenter ? 28 : isHovered ? 18 : 14;
          const connectedToHovered = hoveredNode && data.edges.some(
            e => (e.source === hoveredNode && e.target === node.id) ||
                 (e.target === hoveredNode && e.source === node.id)
          );
          const opacity = hoveredNode ? (isHovered || connectedToHovered || isCenter ? 1 : 0.3) : 1;

          return (
            <g
              key={node.id}
              style={{ cursor: "pointer", transition: "all 0.2s" }}
              opacity={opacity}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Node glow */}
              {(isCenter || isHovered) && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius + 8}
                  fill={color}
                  fillOpacity={0.2}
                />
              )}
              {/* Node circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius}
                fill="#0a0a0a"
                stroke={color}
                strokeWidth={isCenter ? 3 : 2}
              />
              {/* Node label */}
              <text
                x={pos.x}
                y={pos.y + (isCenter ? 45 : 28)}
                textAnchor="middle"
                fill={isHovered ? "#fff" : "#a1a1aa"}
                fontSize={isCenter ? 12 : 9}
                fontWeight={isCenter ? 600 : 400}
              >
                {node.id.length > 12 ? node.id.slice(0, 10) + "…" : node.id}
              </text>
              {/* Center label inside */}
              {isCenter && (
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fill="#FF4000"
                  fontSize={10}
                  fontWeight={700}
                >
                  CEO
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
