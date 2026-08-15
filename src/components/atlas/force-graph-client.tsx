"use client";

import { useEffect, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";

export type Canvas2D = CanvasRenderingContext2D;

export interface SimNodeBase {
  id: string;
  x?: number;
  y?: number;
}

export interface ForceGraphHandle {
  zoomToFit: (ms?: number, padding?: number) => void;
  centerAt: (x?: number, y?: number, ms?: number) => void;
  zoom: (k?: number, ms?: number) => number | void;
  graph2ScreenCoords?: (x: number, y: number) => { x: number; y: number };
  d3Force?: (name: string) => unknown;
  d3ReheatSimulation?: () => void;
}

export interface ForceGraphClientProps<
  N extends SimNodeBase,
  L extends { source: string | N; target: string | N },
> {
  graphData: { nodes: N[]; links: L[] };
  width: number;
  height: number;
  nodeCanvasObject: (node: N, ctx: Canvas2D, scale: number) => void;
  nodePointerAreaPaint: (node: N, color: string, ctx: Canvas2D) => void;
  nodeVal: (node: N) => number;
  linkColor: (link: L) => string;
  linkWidth: (link: L) => number;
  linkDirectionalParticles: (link: L) => number;
  particleColor: string;
  onNodeHover: (node: N | null) => void;
  onNodeClick: (node: N) => void;
  onBackgroundClick: () => void;
  onEngineStop: () => void;
  /**
   * `next/dynamic` does not reliably forward refs, so the imperative handle is
   * handed back through a callback instead.
   */
  onReady: (handle: ForceGraphHandle | null) => void;
}

/**
 * Thin client-only wrapper around react-force-graph-2d. Kept separate so the
 * canvas library is never pulled into the server bundle.
 */
export default function ForceGraphClient<
  N extends SimNodeBase,
  L extends { source: string | N; target: string | N },
>({
  graphData,
  width,
  height,
  nodeCanvasObject,
  nodePointerAreaPaint,
  nodeVal,
  linkColor,
  linkWidth,
  linkDirectionalParticles,
  particleColor,
  onNodeHover,
  onNodeClick,
  onBackgroundClick,
  onEngineStop,
  onReady,
}: ForceGraphClientProps<N, L>) {
  const ref = useRef<ForceGraphHandle | null>(null);

  useEffect(() => {
    onReady(ref.current);
    return () => onReady(null);
  }, [onReady]);

  const Graph = ForceGraph2D as unknown as React.ComponentType<Record<string, unknown>>;

  return (
    <Graph
      ref={ref}
      graphData={graphData}
      width={width}
      height={height}
      backgroundColor="rgba(0,0,0,0)"
      nodeId="id"
      nodeLabel={() => ""}
      nodeRelSize={4}
      nodeVal={nodeVal}
      nodeCanvasObject={nodeCanvasObject}
      nodePointerAreaPaint={nodePointerAreaPaint}
      linkColor={linkColor}
      linkWidth={linkWidth}
      linkDirectionalParticles={linkDirectionalParticles}
      linkDirectionalParticleWidth={1.7}
      linkDirectionalParticleColor={() => particleColor}
      onNodeHover={onNodeHover}
      onNodeClick={onNodeClick}
      onBackgroundClick={onBackgroundClick}
      onEngineStop={onEngineStop}
      cooldownTicks={140}
      warmupTicks={24}
      d3AlphaDecay={0.035}
      d3VelocityDecay={0.32}
      minZoom={0.2}
      maxZoom={8}
    />
  );
}
