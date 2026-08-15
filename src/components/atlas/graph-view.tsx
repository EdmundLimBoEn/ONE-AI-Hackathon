"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Crosshair, Maximize2, Minus, PinOff, Plus } from "lucide-react";
import type { GraphNode } from "@/lib/types";
import { categoryOf, courtLabel, resolveCategoryColor } from "./lib/categories";
import type { AtlasIndex } from "./lib/atlas-data";
import type { Theme } from "./lib/use-theme";
import type {
  Canvas2D,
  ForceGraphClientProps,
  ForceGraphHandle,
} from "./force-graph-client";
import {
  buildLayeredGraph,
  type LayeredLink,
  type LayeredNode,
} from "./lib/graph-layout";
import { IconButton } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";

type SimNode = LayeredNode;
type SimLink = LayeredLink;

const ForceGraphClient = dynamic(() => import("./force-graph-client"), {
  ssr: false,
  loading: () => <GraphSkeleton />,
}) as unknown as ComponentType<ForceGraphClientProps<SimNode, SimLink>>;

const PINNED_LAYOUT_KEY = "singapore-law-atlas:pinned-nodes:v2";

function GraphSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-faint">
        <div className="relative size-16">
          <span className="absolute inset-0 rounded-full border border-line" />
          <span className="typing-dot absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-accent" />
          <span
            className="typing-dot absolute bottom-1 right-1 size-1.5 rounded-full bg-accent"
            style={{ animationDelay: "0.3s" }}
          />
          <span
            className="typing-dot absolute bottom-1 left-1 size-1.5 rounded-full bg-accent"
            style={{ animationDelay: "0.6s" }}
          />
        </div>
        <p className="text-xs">Laying out the precedent network…</p>
      </div>
    </div>
  );
}

export interface GraphViewProps {
  index: AtlasIndex;
  selectedId: string | null;
  onSelect: (id: string) => void;
  activeCategories: Set<string>;
  focusRequest: { category: string; sequence: number } | null;
  onFocusCategory: (category: string | null) => void;
  matchedIds: Set<string> | null;
  theme: Theme;
}

export function GraphView({
  index,
  selectedId,
  onSelect,
  activeCategories,
  focusRequest,
  onFocusCategory,
  matchedIds,
  theme,
}: GraphViewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphHandle | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [anchoredTooltipPosition, setAnchoredTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipAnchor, setTooltipAnchor] = useState<"pointer" | "node">("pointer");
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());

  const palette = usePalette(theme);

  const data = useMemo(() => buildLayeredGraph(index.graph), [index.graph]);
  const nodeById = useMemo(() => new Map(data.nodes.map((node) => [node.id, node])), [data.nodes]);
  const visibleData = useMemo(() => {
    const nodes = data.nodes.filter((node) =>
      node.role === "root" || node.role === "domain"
        ? node.memberCategories.some((category) => activeCategories.has(category))
        : activeCategories.has(node.category),
    );
    const visibleIds = new Set(nodes.map((node) => node.id));
    const links = data.links.filter((link) => {
      const source = typeof link.source === "string" ? link.source : link.source.id;
      const target = typeof link.target === "string" ? link.target : link.target.id;
      return visibleIds.has(source) && visibleIds.has(target);
    });
    return { nodes, links };
  }, [activeCategories, data]);

  useEffect(() => {
    const positions = readPinnedPositions();
    const restored = new Set<string>();
    for (const [id, position] of Object.entries(positions)) {
      const node = nodeById.get(id);
      if (!node) continue;
      node.x = position.x;
      node.y = position.y;
      node.fx = position.x;
      node.fy = position.y;
      restored.add(id);
    }
    setPinnedIds(restored);
    if (restored.size > 0) graphRef.current?.d3ReheatSimulation?.();
  }, [nodeById]);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setSize({
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height)),
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleReady = useCallback((handle: ForceGraphHandle | null) => {
    graphRef.current = handle;
    if (!handle) return;
    try {
      const charge = handle.d3Force?.("charge") as {
        strength?: (value: number | ((node: SimNode) => number)) => unknown;
        distanceMax?: (value: number) => unknown;
      } | undefined;
      charge?.strength?.((node) => {
        if (node.role === "root") return -2_100;
        if (node.role === "domain") return -1_450;
        if (node.role === "topic") return -520;
        if (node.role === "subtopic") return -170;
        return -55;
      });
      charge?.distanceMax?.(620);

      const link = handle.d3Force?.("link") as {
        distance?: (value: number | ((edge: SimLink) => number)) => unknown;
        strength?: (value: number | ((edge: SimLink) => number)) => unknown;
      } | undefined;
      link?.distance?.((edge) => {
        if (edge.kind === "root-branch") return 220;
        if (edge.kind === "domain-branch") return 150;
        if (edge.kind === "branch") {
          const { source, target } = linkIds(edge);
          const sourceRole = nodeById.get(source)?.role;
          const targetRole = nodeById.get(target)?.role;
          return sourceRole === "topic" || targetRole === "topic" ? 88 : 48;
        }
        return 125;
      });
      link?.strength?.((edge) => {
        if (edge.kind === "root-branch") return 0.82;
        if (edge.kind === "domain-branch") return 0.68;
        if (edge.kind === "branch") return 0.56;
        return 0.075;
      });

      handle.d3Force?.("clusters", createClusterForce());
      handle.d3Force?.("collide", createCollisionForce(7));
      handle.d3ReheatSimulation?.();
    } catch {
      // The graph remains usable if a future force-graph release changes its internals.
    }
  }, [nodeById]);

  const zoomBy = useCallback((factor: number) => {
    const graph = graphRef.current;
    if (!graph) return;
    const current = graph.zoom();
    if (typeof current === "number") graph.zoom(current * factor, 220);
  }, []);

  const activeId = hoveredId ?? focusedId ?? selectedId;

  const graphNeighbours = useMemo(() => {
    const neighbours = new Map<string, Set<string>>();
    const link = (from: string, to: string) => {
      const set = neighbours.get(from) ?? new Set<string>();
      set.add(to);
      neighbours.set(from, set);
    };
    for (const edge of visibleData.links) {
      const { source, target } = linkIds(edge);
      link(source, target);
      link(target, source);
    }
    return neighbours;
  }, [visibleData.links]);

  const highlight = useMemo(() => {
    if (!activeId) return null;
    return {
      id: activeId,
      neighbours: graphNeighbours.get(activeId) ?? new Set<string>(),
    };
  }, [activeId, graphNeighbours]);

  const isDimmed = useCallback(
    (node: SimNode) => {
      if (focusRequest && !node.memberCategories.includes(focusRequest.category)) return true;
      if (matchedIds && node.role === "document" && !matchedIds.has(node.id)) return true;
      if (highlight && highlight.id !== node.id && !highlight.neighbours.has(node.id)) return true;
      return false;
    },
    [focusRequest, matchedIds, highlight],
  );

  const paintNode = useCallback(
    (node: SimNode, ctx: Canvas2D, scale: number) => {
      if (node.x === undefined || node.y === undefined) return;
      const dim = isDimmed(node);
      const isActive = highlight?.id === node.id;
      const isSelected = selectedId === node.id;
      const isFocused = focusedId === node.id;
      const color = node.role === "root" ? palette.accent : node.role === "domain" ? palette.ink : palette.category(node.category);

      // Search and topic filters reduce emphasis without removing any files.
      ctx.globalAlpha = dim ? 0.34 : 1;

      if (isActive || isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
        ctx.fillStyle = `${color}22`;
        ctx.fill();
      }

      if (node.role === "root") {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 9, 0, Math.PI * 2);
        ctx.fillStyle = `${palette.accent}20`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = palette.accent;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(6, node.radius * 0.2), 0, Math.PI * 2);
        ctx.fillStyle = palette.surface;
        ctx.fill();
      } else if (node.role === "domain") {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = palette.surface;
        ctx.fill();
        ctx.strokeStyle = `${palette.ink}65`;
        ctx.lineWidth = 1.5 / scale;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = palette.ink;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(5, node.radius * 0.2), 0, Math.PI * 2);
        ctx.fillStyle = palette.surface;
        ctx.fill();
      } else if (node.role === "topic") {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}70`;
        ctx.lineWidth = 2.4 / scale;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(4, node.radius * 0.26), 0, Math.PI * 2);
        ctx.fillStyle = palette.surface;
        ctx.fill();
      } else if (node.role === "subtopic") {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = palette.surface;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3 / scale;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      if (node.role === "document" && node.node.kind === "statute") {
        // Legislation renders as a ring so it separates from case law at a glance.
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(1.4, node.radius - 2.4), 0, Math.PI * 2);
        ctx.fillStyle = palette.surface;
        ctx.fill();
      }

      if (isSelected || isFocused) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 3.2, 0, Math.PI * 2);
        ctx.strokeStyle = isFocused ? palette.accent : palette.ink;
        ctx.lineWidth = 1.6 / scale;
        ctx.stroke();
      }

      if (pinnedIds.has(node.id)) {
        ctx.save();
        ctx.setLineDash([2.5 / scale, 2.5 / scale]);
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 6.5, 0, Math.PI * 2);
        ctx.strokeStyle = palette.ink;
        ctx.lineWidth = 1.15 / scale;
        ctx.stroke();
        ctx.restore();
      }

      const categoryFocused = focusRequest?.category === node.category;
      const showLabel =
        node.role === "root" ||
        node.role === "domain" ||
        node.role === "topic" ||
        (node.role === "subtopic" && (scale > 0.72 || categoryFocused || isActive)) ||
        scale > 2.15 ||
        isActive ||
        isSelected;
      if (showLabel && !dim) {
        const baseFontSize = node.role === "root" ? 17 : node.role === "domain" ? 15 : node.role === "topic" ? 12 : node.role === "subtopic" ? 10 : 10.5;
        const fontSize = Math.max(node.role === "root" ? 12 : node.role === "domain" ? 11 : node.role === "topic" ? 9.5 : 8, baseFontSize / scale);
        const fontWeight = node.role === "root" ? 780 : node.role === "domain" ? 750 : node.role === "topic" ? 700 : node.role === "subtopic" ? 620 : isSelected ? 600 : 500;
        ctx.font = `${fontWeight} ${fontSize}px ${palette.fontSans}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const label = node.role === "document" ? shortTitle(node.node.title) : node.node.title;
        const y = node.y + node.radius + (node.role === "root" ? 10 : node.role === "domain" ? 9 : node.role === "topic" ? 6 : 4);
        ctx.lineWidth = (node.role === "root" || node.role === "domain" || node.role === "topic" ? 5 : 3) / scale;
        ctx.strokeStyle = palette.surface;
        ctx.strokeText(label, node.x, y);
        ctx.fillStyle = node.role === "root" ? palette.accent : node.role === "domain" || node.role === "topic" || isActive || isSelected ? palette.ink : palette.muted;
        ctx.fillText(label, node.x, y);
      }

      ctx.globalAlpha = 1;
    },
    [focusRequest?.category, focusedId, highlight, isDimmed, palette, pinnedIds, selectedId],
  );

  const paintPointerArea = useCallback((node: SimNode, color: string, ctx: Canvas2D) => {
    if (node.x === undefined || node.y === undefined) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius + 4, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const endpoints = useCallback((link: SimLink) => {
    return linkIds(link);
  }, []);

  const linkColor = useCallback(
    (link: SimLink) => {
      const { source, target } = endpoints(link);
      if (highlight && (highlight.id === source || highlight.id === target)) {
        return palette.accent;
      }
      if (highlight) return palette.linkDim;
      if (link.kind === "root-branch") return palette.link;
      if (link.kind === "branch" || link.kind === "domain-branch") {
        const branchNode = nodeById.get(target) ?? nodeById.get(source);
        return branchNode ? palette.category(branchNode.category) : palette.link;
      }
      return palette.linkDim;
    },
    [endpoints, highlight, nodeById, palette],
  );

  const linkWidth = useCallback(
    (link: SimLink) => {
      const { source, target } = endpoints(link);
      if (highlight && (highlight.id === source || highlight.id === target)) return 1.8;
      if (link.kind === "root-branch") return 2.1;
      if (link.kind === "domain-branch") return 1.65;
      if (link.kind === "branch") return 1.05;
      return 0.42;
    },
    [endpoints, highlight],
  );

  const particles = useCallback(
    (link: SimLink) => {
      if (!selectedId) return 0;
      const { source, target } = endpoints(link);
      return source === selectedId || target === selectedId ? 2 : 0;
    },
    [endpoints, selectedId],
  );

  const nodeVal = useCallback((node: SimNode) => Math.max(1, (node.radius * node.radius) / 18), []);

  const orderedNodes = useMemo(
    () =>
      index.graph.nodes
        .filter((node) => activeCategories.has(categoryOf(node.categoryPath)))
        .sort((a, b) => b.degree - a.degree || a.title.localeCompare(b.title)),
    [activeCategories, index.graph.nodes],
  );

  const focusNode = useCallback(
    (id: string | null, center = true) => {
      setFocusedId(id);
      setTooltipAnchor("node");
      if (!id || !center) return;
      const target = nodeById.get(id);
      if (target?.x !== undefined && target.y !== undefined) {
        graphRef.current?.centerAt(target.x, target.y, 320);
        const screen = graphRef.current?.graph2ScreenCoords?.(target.x, target.y);
        if (screen) setAnchoredTooltipPosition(screen);
      }
    },
    [nodeById],
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (orderedNodes.length === 0) return;
      const currentIndex = orderedNodes.findIndex((n) => n.id === (focusedId ?? selectedId));
      const step = (delta: number) => {
        event.preventDefault();
        const nextIndex =
          currentIndex < 0
            ? 0
            : (currentIndex + delta + orderedNodes.length) % orderedNodes.length;
        focusNode(orderedNodes[nextIndex].id);
      };

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          step(1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          step(-1);
          break;
        case "Home":
          event.preventDefault();
          focusNode(orderedNodes[0].id);
          break;
        case "End":
          event.preventDefault();
          focusNode(orderedNodes[orderedNodes.length - 1].id);
          break;
        case "Enter":
        case " ":
          if (focusedId) {
            event.preventDefault();
            onSelect(focusedId);
          }
          break;
        case "Escape":
          setFocusedId(null);
          break;
        case "+":
        case "=":
          event.preventDefault();
          zoomBy(1.35);
          break;
        case "-":
          event.preventDefault();
          zoomBy(1 / 1.35);
          break;
        case "0":
          event.preventDefault();
          onFocusCategory(null);
          graphRef.current?.zoomToFit(400, 70);
          break;
        default:
          break;
      }
    },
    [focusNode, focusedId, onFocusCategory, onSelect, orderedNodes, selectedId, zoomBy],
  );

  const handleEngineStop = useCallback(() => undefined, []);

  const frameNodes = useCallback(
    (targets: SimNode[], duration = 520) => {
      const positioned = targets.filter(
        (node): node is SimNode & { x: number; y: number } =>
          node.x !== undefined && node.y !== undefined,
      );
      if (positioned.length === 0 || size.width === 0 || size.height === 0) return;
      const xs = positioned.map((node) => node.x);
      const ys = positioned.map((node) => node.y);
      const left = Math.min(...xs);
      const right = Math.max(...xs);
      const top = Math.min(...ys);
      const bottom = Math.max(...ys);
      const centreX = (left + right) / 2;
      const centreY = (top + bottom) / 2;
      const zoom = Math.max(
        0.5,
        Math.min(
          2.6,
          Math.min(
            size.width / Math.max(220, right - left + 170),
            size.height / Math.max(180, bottom - top + 150),
          ) * 0.88,
        ),
      );
      graphRef.current?.centerAt(centreX, centreY, duration);
      graphRef.current?.zoom(zoom, duration);
    },
    [size.height, size.width],
  );

  const fittedRef = useRef(false);
  useEffect(() => {
    if (fittedRef.current || size.width === 0) return;
    const timer = window.setTimeout(() => {
      graphRef.current?.zoomToFit(600, 80);
      fittedRef.current = true;
    }, 900);
    return () => window.clearTimeout(timer);
  }, [size.width]);

  useEffect(() => {
    if (!focusRequest || size.width === 0 || size.height === 0) return;
    const timer = window.setTimeout(() => {
      const targets = visibleData.nodes.filter((node) => node.category === focusRequest.category);
      frameNodes(targets);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusRequest, frameNodes, size.height, size.width, visibleData.nodes]);

  const fitAll = useCallback(() => {
    onFocusCategory(null);
    graphRef.current?.zoomToFit(400, 70);
  }, [onFocusCategory]);

  const pinNode = useCallback((node: SimNode) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
    const x = node.x as number;
    const y = node.y as number;
    node.fx = x;
    node.fy = y;
    node.vx = 0;
    node.vy = 0;
    const positions = readPinnedPositions();
    positions[node.id] = { x, y };
    writePinnedPositions(positions);
    setPinnedIds((current) => {
      if (current.has(node.id)) return current;
      const next = new Set(current);
      next.add(node.id);
      return next;
    });
  }, []);

  const releasePinnedNodes = useCallback(() => {
    for (const id of pinnedIds) {
      const node = nodeById.get(id);
      if (!node) continue;
      node.fx = undefined;
      node.fy = undefined;
    }
    window.localStorage.removeItem(PINNED_LAYOUT_KEY);
    setPinnedIds(new Set());
    graphRef.current?.d3ReheatSimulation?.();
  }, [nodeById, pinnedIds]);

  const tooltipNode = activeId ? nodeById.get(activeId)?.node : null;
  const tooltipPosition = tooltipAnchor === "node" ? anchoredTooltipPosition : pointer;

  return (
    <div className="relative h-full w-full overflow-hidden bg-panel">
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-paper" />

      <div
        ref={wrapRef}
        role="application"
        aria-label="Precedent graph. Use the arrow keys to move between authorities and Enter to open one."
        aria-describedby="graph-live"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onMouseMove={(event) => {
          const rect = wrapRef.current?.getBoundingClientRect();
          if (!rect) return;
          setPointer({ x: event.clientX - rect.left, y: event.clientY - rect.top });
        }}
        onBlur={() => setFocusedId(null)}
        className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        {size.width > 0 && size.height > 0 ? (
          <ForceGraphClient
            graphData={visibleData}
            width={size.width}
            height={size.height}
            nodeVal={nodeVal}
            nodeCanvasObject={paintNode}
            nodePointerAreaPaint={paintPointerArea}
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkDirectionalParticles={particles}
            particleColor={palette.accent}
            onNodeHover={(node) => {
              setHoveredId(node?.id ?? null);
              setTooltipAnchor("pointer");
            }}
            onNodeClick={(node) => {
              setFocusedId(node.id);
              if (node.role === "document") onSelect(node.id);
              else if (node.role === "root") {
                onFocusCategory(null);
                frameNodes(visibleData.nodes);
              } else if (node.role === "domain") {
                onFocusCategory(null);
                frameNodes(visibleData.nodes.filter((candidate) => candidate.domain === node.domain));
              } else onFocusCategory(node.category);
            }}
            onNodeDrag={(node) => {
              if (node.x !== undefined) node.fx = node.x;
              if (node.y !== undefined) node.fy = node.y;
            }}
            onNodeDragEnd={pinNode}
            onBackgroundClick={() => setFocusedId(null)}
            onEngineStop={handleEngineStop}
            onReady={handleReady}
          />
        ) : null}
      </div>

      {tooltipNode ? (
        <GraphTooltip node={tooltipNode} position={tooltipPosition} palette={palette} />
      ) : null}

      <div className="pointer-events-none absolute bottom-0 left-0 p-3">
        <GraphLegend index={index} activeCategories={activeCategories} palette={palette} />
      </div>

      <div className="pointer-events-auto absolute top-3 right-3 flex flex-col gap-1 rounded-lg border border-line bg-panel/90 p-1 backdrop-blur">
          <IconButton label="Zoom in" size="sm" onClick={() => zoomBy(1.35)}>
            <Plus className="size-4" />
          </IconButton>
          <IconButton label="Zoom out" size="sm" onClick={() => zoomBy(1 / 1.35)}>
            <Minus className="size-4" />
          </IconButton>
          <IconButton
            label="Fit graph to view"
            size="sm"
            onClick={fitAll}
          >
            <Maximize2 className="size-4" />
          </IconButton>
          <IconButton
            label="Centre on the open authority"
            size="sm"
            disabled={!selectedId}
            onClick={() => selectedId && focusNode(selectedId)}
          >
            <Crosshair className="size-4" />
          </IconButton>
          <IconButton
            label={
              pinnedIds.size === 0
                ? "No pinned nodes"
                : `Release ${pinnedIds.size} pinned node${pinnedIds.size === 1 ? "" : "s"}`
            }
            size="sm"
            disabled={pinnedIds.size === 0}
            onClick={releasePinnedNodes}
          >
            <PinOff className="size-4" />
          </IconButton>
      </div>

      <p id="graph-live" aria-live="polite" className="sr-only">
        {tooltipNode
          ? `${tooltipNode.title}, ${tooltipNode.citation}, ${courtLabel(tooltipNode.court)}, ${tooltipNode.degree} connections.`
          : `${orderedNodes.length} authorities in view.`}
      </p>

      <ul className="sr-only">
        {orderedNodes.map((node) => (
          <li key={node.id}>
            <button
              type="button"
              onFocus={() => focusNode(node.id)}
              onClick={() => onSelect(node.id)}
            >
              {node.title}, {node.citation}, {courtLabel(node.court)}, {node.degree} connections
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GraphTooltip({
  node,
  position,
  palette,
}: {
  node: GraphNode;
  position: { x: number; y: number };
  palette: Palette;
}) {
  const category = categoryOf(node.categoryPath);
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 w-72 max-w-[78vw] animate-fade-up rounded-lg border border-line bg-raised p-3 panel-shadow"
      style={{ left: position.x + 16, top: position.y + 16 }}
    >
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: palette.category(category) }}
        />
        <span className="eyebrow truncate">{category}</span>
      </div>
      <p className="rule-heading mt-1.5 text-sm leading-snug font-semibold text-ink">
        {node.title}
      </p>
      <p className="citation mt-1">
        {node.citation} · {courtLabel(node.court)}
      </p>
      {node.summary ? (
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted">{node.summary}</p>
      ) : null}
      <p className="mt-2 text-[10px] text-faint">
        {node.degree} connection{node.degree === 1 ? "" : "s"} · {node.kind === "overview" ? "click to focus" : "click to open"}
      </p>
    </div>
  );
}

function GraphLegend({
  index,
  activeCategories,
  palette,
}: {
  index: AtlasIndex;
  activeCategories: Set<string>;
  palette: Palette;
}) {
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of index.graph.nodes) {
      const category = categoryOf(node.categoryPath);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [index]);

  return (
    <div className="hidden max-w-[min(58ch,60%)] flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-panel/85 px-2.5 py-1.5 backdrop-blur sm:flex">
      {categories.map(([category, count]) => (
        <span
          key={category}
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px] whitespace-nowrap",
            activeCategories.has(category) ? "text-muted" : "text-faint line-through",
          )}
        >
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{ background: palette.category(category) }}
          />
          {category}
          <span className="text-faint">{count}</span>
        </span>
      ))}
    </div>
  );
}

interface Palette {
  category: (category: string) => string;
  ink: string;
  muted: string;
  surface: string;
  accent: string;
  link: string;
  linkDim: string;
  fontSans: string;
}

/** Canvas cannot read CSS variables, so resolve them once per theme change. */
function usePalette(theme: Theme): Palette {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setVersion((value) => value + 1);
  }, [theme]);

  return useMemo(() => {
    void version;
    const fallback: Palette = {
      category: () => "#77808f",
      ink: "#16181c",
      muted: "#5c6068",
      surface: "#fbfaf8",
      accent: "#c8102e",
      link: "#c8c2b5",
      linkDim: "#ded9cf",
      fontSans: "system-ui, sans-serif",
    };
    if (typeof window === "undefined") return fallback;

    const styles = getComputedStyle(document.documentElement);
    const read = (name: string, alt: string) => styles.getPropertyValue(name).trim() || alt;
    const cache = new Map<string, string>();

    return {
      category: (category: string) => {
        const hit = cache.get(category);
        if (hit) return hit;
        const value = resolveCategoryColor(category, styles);
        cache.set(category, value);
        return value;
      },
      ink: read("--ink", fallback.ink),
      muted: read("--ink-muted", fallback.muted),
      surface: read("--panel", fallback.surface),
      accent: read("--accent", fallback.accent),
      link: read("--line-strong", fallback.link),
      linkDim: read("--line", fallback.linkDim),
      fontSans: "var(--font-geist-sans), system-ui, sans-serif",
    };
  }, [version]);
}

function shortTitle(title: string): string {
  const primary = title.split(/\s+v\s+/i)[0];
  const trimmed = primary.replace(/\s+(Pte|Ltd|LLC|LLP)\.?/gi, "").trim();
  const base = trimmed.length > 2 ? trimmed : title;
  return base.length > 26 ? `${base.slice(0, 25)}…` : base;
}

function linkIds(link: SimLink): { source: string; target: string } {
  return {
    source: typeof link.source === "string" ? link.source : link.source.id,
    target: typeof link.target === "string" ? link.target : link.target.id,
  };
}

type AtlasForce = ((alpha: number) => void) & { initialize: (nodes: SimNode[]) => void };

function createClusterForce(): AtlasForce {
  let nodes: SimNode[] = [];
  const force = ((alpha: number) => {
    const pull = alpha * 0.115;
    for (const node of nodes) {
      if (node.x === undefined || node.y === undefined) continue;
      if (node.fx !== undefined || node.fy !== undefined) continue;
      node.vx = (node.vx ?? 0) + (node.clusterX - node.x) * pull;
      node.vy = (node.vy ?? 0) + (node.clusterY - node.y) * pull;
    }
  }) as AtlasForce;
  force.initialize = (next) => {
    nodes = next;
  };
  return force;
}

function createCollisionForce(padding: number): AtlasForce {
  let nodes: SimNode[] = [];
  const force = ((alpha: number) => {
    const push = Math.max(0.18, alpha) * 0.42;
    for (let leftIndex = 0; leftIndex < nodes.length; leftIndex++) {
      const left = nodes[leftIndex];
      if (left.x === undefined || left.y === undefined) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex++) {
        const right = nodes[rightIndex];
        if (right.x === undefined || right.y === undefined) continue;
        let dx = right.x - left.x;
        let dy = right.y - left.y;
        if (dx === 0 && dy === 0) dx = 0.01;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minimum = left.radius + right.radius + padding;
        if (distance >= minimum) continue;
        const overlap = ((minimum - distance) / distance) * push;
        dx *= overlap;
        dy *= overlap;
        if (left.fx === undefined && left.fy === undefined) {
          left.vx = (left.vx ?? 0) - dx;
          left.vy = (left.vy ?? 0) - dy;
        }
        if (right.fx === undefined && right.fy === undefined) {
          right.vx = (right.vx ?? 0) + dx;
          right.vy = (right.vy ?? 0) + dy;
        }
      }
    }
  }) as AtlasForce;
  force.initialize = (next) => {
    nodes = next;
  };
  return force;
}

interface PinnedPosition {
  x: number;
  y: number;
}

function readPinnedPositions(): Record<string, PinnedPosition> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PINNED_LAYOUT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<PinnedPosition>>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, PinnedPosition] =>
          Number.isFinite(entry[1]?.x) && Number.isFinite(entry[1]?.y),
      ),
    );
  } catch {
    return {};
  }
}

function writePinnedPositions(positions: Record<string, PinnedPosition>): void {
  try {
    window.localStorage.setItem(PINNED_LAYOUT_KEY, JSON.stringify(positions));
  } catch {
    // A dropped node remains pinned for this session if browser storage is unavailable.
  }
}
