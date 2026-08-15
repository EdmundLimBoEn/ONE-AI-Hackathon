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
import { IconButton } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";

interface SimNode {
  id: string;
  node: GraphNode;
  role: "document" | "topic" | "subtopic";
  category: string;
  subtopic?: string;
  radius: number;
  clusterX: number;
  clusterY: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  vx?: number;
  vy?: number;
}

interface SimLink {
  source: string | SimNode;
  target: string | SimNode;
  kind: string;
  weight: number;
}

const ForceGraphClient = dynamic(() => import("./force-graph-client"), {
  ssr: false,
  loading: () => <GraphSkeleton />,
}) as unknown as ComponentType<ForceGraphClientProps<SimNode, SimLink>>;

const PINNED_LAYOUT_KEY = "singapore-law-atlas:pinned-nodes:v1";

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

  const data = useMemo(() => {
    const categoryBuckets = new Map<string, GraphNode[]>();
    for (const node of index.graph.nodes) {
      const category = categoryOf(node.categoryPath);
      const bucket = categoryBuckets.get(category) ?? [];
      bucket.push(node);
      categoryBuckets.set(category, bucket);
    }
    const categoryNames = [...categoryBuckets.keys()].sort();
    const clusterRadius = Math.max(300, categoryNames.length * 38);
    const nodes: SimNode[] = [];
    const links: SimLink[] = index.graph.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      kind: edge.kind,
      weight: edge.weight,
    }));
    const topicIds = new Map<string, string>();

    categoryNames.forEach((category, categoryIndex) => {
      const documents = categoryBuckets.get(category) ?? [];
      const clusterAngle =
        (categoryIndex / Math.max(1, categoryNames.length)) * Math.PI * 2 - Math.PI / 2;
      const clusterX = Math.cos(clusterAngle) * clusterRadius;
      const clusterY = Math.sin(clusterAngle) * clusterRadius;

      const topicId = `topic:${slugId(category)}`;
      topicIds.set(category, topicId);
      nodes.push({
        id: topicId,
        node: makeGuideNode(topicId, category, category, documents.length, "topic"),
        role: "topic",
        category,
        radius: Math.min(34, 18 + Math.sqrt(documents.length) * 2.05),
        clusterX,
        clusterY,
        x: clusterX,
        y: clusterY,
      });

      const subtopics = new Map<string, GraphNode[]>();
      for (const document of documents) {
        const subtopic = subtopicOf(document);
        const bucket = subtopics.get(subtopic) ?? [];
        bucket.push(document);
        subtopics.set(subtopic, bucket);
      }
      const branches = [...subtopics.entries()].sort(
        (left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]),
      );

      branches.forEach(([subtopic, branchDocuments], branchIndex) => {
        const hasSubtopicHub = branchDocuments.length >= 2;
        const branchAngle =
          clusterAngle +
          ((branchIndex + 1) / (branches.length + 1) - 0.5) * Math.min(Math.PI * 0.9, branches.length * 0.2);
        const branchDistance = hasSubtopicHub ? 78 + Math.sqrt(branchDocuments.length) * 7 : 42;
        const branchX = clusterX + Math.cos(branchAngle) * branchDistance;
        const branchY = clusterY + Math.sin(branchAngle) * branchDistance;
        let parentId = topicId;

        if (hasSubtopicHub) {
          const subtopicId = `subtopic:${slugId(category)}:${slugId(subtopic)}`;
          parentId = subtopicId;
          nodes.push({
            id: subtopicId,
            node: makeGuideNode(subtopicId, subtopic, category, branchDocuments.length, "subtopic"),
            role: "subtopic",
            category,
            subtopic,
            radius: Math.min(17, 7 + Math.sqrt(branchDocuments.length) * 1.8),
            clusterX: branchX,
            clusterY: branchY,
            x: branchX,
            y: branchY,
          });
          links.push({ source: topicId, target: subtopicId, kind: "branch", weight: 3 });
        }

        branchDocuments.forEach((node, ordinal) => {
          const localAngle = ordinal * 2.399963229728653 + hashUnit(node.id) * 0.8;
          const localRadius = 24 + Math.sqrt(ordinal) * 19;
          const radius = Math.min(28, 3.6 + Math.sqrt(Math.max(0, node.degree)) * 2.5);
          nodes.push({
            id: node.id,
            node,
            role: "document",
            category,
            subtopic,
            radius,
            clusterX: branchX,
            clusterY: branchY,
            x: branchX + Math.cos(localAngle) * localRadius,
            y: branchY + Math.sin(localAngle) * localRadius,
          });
          links.push({ source: parentId, target: node.id, kind: "branch", weight: 2 });
        });
      });
    });

    const categoryByDocument = new Map(
      index.graph.nodes.map((node) => [node.id, categoryOf(node.categoryPath)]),
    );
    const topicBridges = new Map<string, { left: string; right: string; weight: number }>();
    for (const edge of index.graph.edges) {
      const left = categoryByDocument.get(edge.source);
      const right = categoryByDocument.get(edge.target);
      if (!left || !right || left === right) continue;
      const key = pairKey(left, right);
      const bridge = topicBridges.get(key) ?? { left, right, weight: 0 };
      bridge.weight += Math.max(1, edge.weight);
      topicBridges.set(key, bridge);
    }
    for (const bridge of topicBridges.values()) {
      const source = topicIds.get(bridge.left);
      const target = topicIds.get(bridge.right);
      if (!source || !target || bridge.weight < 2) continue;
      links.push({ source, target, kind: "topic-bridge", weight: bridge.weight });
    }

    return { nodes, links };
  }, [index]);
  const nodeById = useMemo(() => new Map(data.nodes.map((node) => [node.id, node])), [data.nodes]);
  const visibleData = useMemo(() => {
    const nodes = data.nodes.filter((node) => activeCategories.has(node.category));
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
      charge?.strength?.((node) => -105 - node.radius * 7);
      charge?.distanceMax?.(720);

      const link = handle.d3Force?.("link") as {
        distance?: (value: number | ((edge: SimLink) => number)) => unknown;
        strength?: (value: number | ((edge: SimLink) => number)) => unknown;
      } | undefined;
      link?.distance?.((edge) => {
        if (edge.kind === "topic-bridge") return 360;
        if (edge.kind === "branch") {
          const { source, target } = linkIds(edge);
          const sourceRole = nodeById.get(source)?.role;
          const targetRole = nodeById.get(target)?.role;
          return sourceRole === "topic" || targetRole === "topic" ? 92 : 64;
        }
        return edge.kind === "shared-tag" ? 88 : 128;
      });
      link?.strength?.((edge) => {
        if (edge.kind === "topic-bridge") return 0.035;
        if (edge.kind === "branch") return 0.34;
        return edge.kind === "shared-tag" ? 0.08 : 0.2;
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
      if (focusRequest && node.category !== focusRequest.category) return true;
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
      const color = palette.category(node.category);

      // Search and topic filters reduce emphasis without removing any files.
      ctx.globalAlpha = dim ? 0.34 : 1;

      if (isActive || isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
        ctx.fillStyle = `${color}22`;
        ctx.fill();
      }

      if (node.role === "topic") {
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
        node.role === "topic" ||
        (node.role === "subtopic" && (scale > 0.72 || categoryFocused || isActive)) ||
        scale > 1.35 ||
        isActive ||
        isSelected ||
        node.node.degree >= 10;
      if (showLabel && !dim) {
        const baseFontSize = node.role === "topic" ? 13 : node.role === "subtopic" ? 10.5 : 11;
        const fontSize = Math.max(node.role === "topic" ? 10 : 8.5, baseFontSize / scale);
        const fontWeight = node.role === "topic" ? 700 : node.role === "subtopic" ? 650 : isSelected ? 600 : 500;
        ctx.font = `${fontWeight} ${fontSize}px ${palette.fontSans}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const label = node.role === "document" ? shortTitle(node.node.title) : node.node.title;
        const y = node.y + node.radius + (node.role === "topic" ? 7 : 4);
        ctx.lineWidth = (node.role === "topic" ? 5 : 3) / scale;
        ctx.strokeStyle = palette.surface;
        ctx.strokeText(label, node.x, y);
        ctx.fillStyle = node.role === "topic" || isActive || isSelected ? palette.ink : palette.muted;
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
      if (link.kind === "branch") {
        const branchNode = nodeById.get(target) ?? nodeById.get(source);
        return branchNode ? palette.category(branchNode.category) : palette.link;
      }
      return link.kind === "shared-tag" ? palette.linkDim : palette.link;
    },
    [endpoints, highlight, nodeById, palette],
  );

  const linkWidth = useCallback(
    (link: SimLink) => {
      const { source, target } = endpoints(link);
      if (highlight && (highlight.id === source || highlight.id === target)) return 1.8;
      if (link.kind === "topic-bridge") return Math.min(2.2, 0.7 + Math.log2(link.weight + 1) * 0.25);
      if (link.kind === "branch") return 1.05;
      return link.kind === "shared-tag" ? 0.5 : 0.9;
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
      const positioned = targets.filter(
        (node): node is SimNode & { x: number; y: number } =>
          node.x !== undefined && node.y !== undefined,
      );
      if (positioned.length === 0) return;
      const xs = positioned.map((node) => node.x);
      const ys = positioned.map((node) => node.y);
      const left = Math.min(...xs);
      const right = Math.max(...xs);
      const top = Math.min(...ys);
      const bottom = Math.max(...ys);
      const centreX = (left + right) / 2;
      const centreY = (top + bottom) / 2;
      const zoom = Math.max(
        0.55,
        Math.min(2.5, Math.min(size.width / Math.max(220, right - left + 170), size.height / Math.max(180, bottom - top + 150)) * 0.88),
      );
      graphRef.current?.centerAt(centreX, centreY, 520);
      graphRef.current?.zoom(zoom, 520);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusRequest, size.height, size.width, visibleData.nodes]);

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

  const tooltipNode = activeId ? index.docsById.get(activeId) : null;
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
              else onFocusCategory(node.category);
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
        {node.degree} connection{node.degree === 1 ? "" : "s"} · click to open
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

function hashUnit(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function slugId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function subtopicOf(node: GraphNode): string {
  const category = categoryOf(node.categoryPath);
  const raw = node.categoryPath[1]?.trim();
  if (!raw || raw.toLowerCase() === category.toLowerCase()) return "General";
  const concise = raw.split(/\s+[—–]\s+|\s*\|\s*/)[0].replace(/\]—\[/g, " — ").trim();
  return concise.length > 34 ? `${concise.slice(0, 33)}…` : concise;
}

function makeGuideNode(
  id: string,
  title: string,
  category: string,
  count: number,
  role: "topic" | "subtopic",
): GraphNode {
  return {
    id,
    title,
    citation: `${count} file${count === 1 ? "" : "s"}`,
    court: "Atlas",
    year: 0,
    categoryPath: role === "topic" ? [category] : [category, title],
    tags: [slugId(category), slugId(title)],
    summary:
      role === "topic"
        ? `A navigational hub for ${count} files in ${category}.`
        : `${count} files grouped under ${title} within ${category}.`,
    relatedIds: [],
    kind: "overview",
    degree: count,
  };
}

function pairKey(left: string, right: string): string {
  return left < right ? `${left}\u0000${right}` : `${right}\u0000${left}`;
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
