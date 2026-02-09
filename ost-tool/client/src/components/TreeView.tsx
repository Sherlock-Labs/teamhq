import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";
import type { OSTNode, Session } from "../types";

// --- Dagre layout (left-to-right) ---

function getLayoutedElements(
  ostNodes: OSTNode[],
  selectedIds: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 24, ranksep: 60 });

  const nodeWidth = 240;
  const nodeHeights: Record<string, number> = {
    outcome: 72,
    opportunity: 64,
    solution: 64,
    experiment: 56,
  };

  for (const n of ostNodes) {
    g.setNode(n.id, {
      width: nodeWidth,
      height: nodeHeights[n.type] ?? 64,
    });
  }

  const edges: Edge[] = [];
  for (const n of ostNodes) {
    if (n.parentId) {
      edges.push({
        id: `e-${n.parentId}-${n.id}`,
        source: n.parentId,
        target: n.id,
        style: { stroke: "var(--color-zinc-700)" },
      });
      g.setEdge(n.parentId, n.id);
    }
  }

  dagre.layout(g);

  const nodes: Node[] = ostNodes.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: n.type,
      position: { x: pos.x - nodeWidth / 2, y: pos.y - (nodeHeights[n.type] ?? 64) / 2 },
      data: {
        label: n.label,
        description: n.description,
        ostType: n.type,
        selected: selectedIds.has(n.id),
      },
    };
  });

  return { nodes, edges };
}

// --- Custom node components (handles on Left/Right for LR layout) ---

function OutcomeNode({ data }: NodeProps) {
  return (
    <div className="rounded-xl bg-indigo-500/90 px-4 py-3 text-white shadow-lg shadow-indigo-500/20 max-w-[240px]">
      <Handle type="source" position={Position.Right} className="!bg-indigo-300 !w-2 !h-2" />
      <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200 mb-0.5">
        Outcome
      </div>
      <div className="text-sm font-bold leading-snug" title={data.description as string}>
        {data.label as string}
      </div>
    </div>
  );
}

function OpportunityNode({ data }: NodeProps) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 max-w-[240px]">
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-zinc-500 !w-2 !h-2" />
      <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 mb-0.5">
        Opportunity
      </div>
      <div className="text-sm text-zinc-200 leading-snug" title={data.description as string}>
        {data.label as string}
      </div>
    </div>
  );
}

function SolutionNode({ data }: NodeProps) {
  const selected = data.selected as boolean;
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 max-w-[240px] transition-colors cursor-pointer ${
        selected
          ? "border-indigo-500 bg-indigo-500/10"
          : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-zinc-500 !w-2 !h-2" />
      <div className="flex items-start gap-2">
        <div
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
            selected
              ? "border-indigo-500 bg-indigo-500"
              : "border-zinc-600 bg-zinc-900"
          }`}
        >
          {selected && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-0.5">
            Solution
          </div>
          <div className="text-sm text-zinc-200 leading-snug" title={data.description as string}>
            {data.label as string}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExperimentNode({ data }: NodeProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 max-w-[240px]">
      <Handle type="target" position={Position.Left} className="!bg-zinc-600 !w-2 !h-2" />
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-0.5">
        Experiment
      </div>
      <div className="text-xs text-zinc-400 leading-snug" title={data.description as string}>
        {data.label as string}
      </div>
    </div>
  );
}

const nodeTypes = {
  outcome: OutcomeNode,
  opportunity: OpportunityNode,
  solution: SolutionNode,
  experiment: ExperimentNode,
};

// --- TreeView (combined explore + select) ---

type Props = {
  session: Session;
  onComplete: (solutionIds: string[]) => void;
};

export default function TreeView({ session, onComplete }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(session.selectedSolutions ?? []),
  );

  const ostNodes = session.ost?.nodes ?? [];
  const solutionIds = useMemo(
    () => new Set(ostNodes.filter((n) => n.type === "solution").map((n) => n.id)),
    [ostNodes],
  );

  const { nodes, edges } = useMemo(
    () => getLayoutedElements(ostNodes, selectedIds),
    [ostNodes, selectedIds],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!solutionIds.has(node.id)) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    },
    [solutionIds],
  );

  return (
    <div className="flex flex-col h-[calc(100vh-160px)]">
      <div className="px-6 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Opportunity Solution Tree</h2>
          <p className="text-zinc-400 text-sm mt-0.5">
            Click solution nodes to select them for debate. {selectedIds.size} selected.
          </p>
        </div>
      </div>

      <div className="flex-1 rounded-xl mx-6 border border-zinc-800 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Background color="var(--color-zinc-800)" gap={20} />
        </ReactFlow>
      </div>

      <div className="px-6 py-4">
        <button
          onClick={() => onComplete([...selectedIds])}
          disabled={selectedIds.size === 0}
          className="w-full rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue to Debate ({selectedIds.size} solution{selectedIds.size !== 1 ? "s" : ""} selected)
        </button>
      </div>
    </div>
  );
}
