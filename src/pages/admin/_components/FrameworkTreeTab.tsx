import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase.ts";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, X, GitBranch, Circle } from "lucide-react";
import { toast } from "sonner";

type NodeQuality = "root" | "optimal" | "best" | "normal" | "poor" | "missed";

type NodeData = {
  id?: string;
  label: string;
  framework: string;
  quality: NodeQuality;
  analysisNote?: string;
  unlockTrigger: string;
  parentNodeId?: string;
  posX: number;
  posY: number;
};

const QUALITY_CONFIG: Record<NodeQuality, { color: string; bg: string; label: string }> = {
  root: { color: "#6B34D6", bg: "rgba(107,52,214,0.12)", label: "Root" },
  optimal: { color: "#0F9560", bg: "rgba(15,149,96,0.12)", label: "Optimal" },
  best: { color: "#3B82F6", bg: "rgba(59,130,246,0.12)", label: "Best" },
  normal: { color: "#64748B", bg: "rgba(100,116,139,0.12)", label: "Normal" },
  poor: { color: "#D97706", bg: "rgba(217,119,6,0.12)", label: "Poor" },
  missed: { color: "#EF4444", bg: "rgba(239,68,68,0.12)", label: "Missed" },
};

const UNLOCK_TRIGGERS = ["always", "optimal", "top_scorer", "expert_only"];

// ── Canvas Node ───────────────────────────────────────────────────────

function CanvasNode({
  node,
  isSelected,
  onSelect,
  onDragStart,
}: {
  node: NodeData;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.PointerEvent) => void;
}) {
  const config = QUALITY_CONFIG[node.quality];

  return (
    <div
      onPointerDown={(e) => {
        onSelect();
        onDragStart(e);
      }}
      style={{
        position: "absolute",
        left: node.posX,
        top: node.posY,
        padding: "10px 16px",
        borderRadius: "8px",
        border: isSelected ? `2px solid ${config.color}` : "1px solid var(--bg-border)",
        background: isSelected ? config.bg : "var(--bg-surface)",
        cursor: "grab",
        userSelect: "none",
        minWidth: "120px",
        maxWidth: "200px",
        transition: "border-color 150ms ease, background 150ms ease",
        boxShadow: isSelected ? `0 0 0 3px ${config.color}20` : "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <Circle size={8} fill={config.color} color={config.color} />
        <span
          className="mono"
          style={{
            fontSize: "9px",
            fontWeight: 600,
            color: config.color,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {config.label}
        </span>
      </div>
      <p
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--text-primary)",
          lineHeight: "1.3",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {node.label || "Untitled node"}
      </p>
      {node.framework && (
        <p
          className="mono"
          style={{
            fontSize: "9px",
            color: "var(--text-tertiary)",
            marginTop: "2px",
          }}
        >
          {node.framework}
        </p>
      )}
    </div>
  );
}

// ── Connection Lines ──────────────────────────────────────────────────

function ConnectionLines({ nodes }: { nodes: NodeData[] }) {
  const lines: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];

  for (const node of nodes) {
    if (node.parentNodeId) {
      const parent = nodes.find((n) => n.id === node.parentNodeId);
      if (parent) {
        const config = QUALITY_CONFIG[node.quality];
        lines.push({
          x1: parent.posX + 60,
          y1: parent.posY + 40,
          x2: node.posX + 60,
          y2: node.posY,
          color: config.color,
        });
      }
    }
  }

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {lines.map((line, i) => (
        <path
          key={i}
          d={`M ${line.x1} ${line.y1} C ${line.x1} ${line.y1 + (line.y2 - line.y1) * 0.5}, ${line.x2} ${line.y2 - (line.y2 - line.y1) * 0.5}, ${line.x2} ${line.y2}`}
          fill="none"
          stroke={line.color}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.5"
        />
      ))}
    </svg>
  );
}

// ── Edit Panel ────────────────────────────────────────────────────────

function NodeEditPanel({
  node,
  nodes,
  onChange,
  onClose,
  onDelete,
}: {
  node: NodeData;
  nodes: NodeData[];
  onChange: (updated: NodeData) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const config = QUALITY_CONFIG[node.quality];
  const possibleParents = nodes.filter((n) => n.id && n.id !== node.id);

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        width: "340px",
        borderLeft: "1px solid var(--bg-border)",
        background: "var(--bg-surface)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--bg-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Circle size={8} fill={config.color} color={config.color} />
          <span className="mono" style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
            {node.label || "Untitled"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={onDelete}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444" }}
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)" }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Form */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {/* Label */}
        <label className="mono" style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", marginBottom: "6px", display: "block" }}>
          LABEL
        </label>
        <input
          value={node.label}
          onChange={(e) => onChange({ ...node, label: e.target.value })}
          placeholder="Node label..."
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid var(--bg-border)",
            background: "var(--bg-base)",
            fontSize: "12px",
            color: "var(--text-primary)",
            marginBottom: "16px",
          }}
        />

        {/* Framework category */}
        <label className="mono" style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", marginBottom: "6px", display: "block" }}>
          FRAMEWORK CATEGORY
        </label>
        <input
          value={node.framework}
          onChange={(e) => onChange({ ...node, framework: e.target.value })}
          placeholder="e.g. Revenue-Cost, 4Ps..."
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid var(--bg-border)",
            background: "var(--bg-base)",
            fontSize: "12px",
            color: "var(--text-primary)",
            marginBottom: "16px",
          }}
        />

        {/* Quality */}
        <label className="mono" style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", marginBottom: "6px", display: "block" }}>
          QUALITY
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
          {(Object.entries(QUALITY_CONFIG) as [NodeQuality, typeof QUALITY_CONFIG["root"]][]).map(([q, qc]) => (
            <button
              key={q}
              onClick={() => onChange({ ...node, quality: q })}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: node.quality === q ? `2px solid ${qc.color}` : "1px solid var(--bg-border)",
                background: node.quality === q ? qc.bg : "transparent",
                fontSize: "10px",
                fontWeight: 600,
                color: node.quality === q ? qc.color : "var(--text-tertiary)",
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              {qc.label}
            </button>
          ))}
        </div>

        {/* Unlock trigger */}
        <label className="mono" style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", marginBottom: "6px", display: "block" }}>
          UNLOCK TRIGGER
        </label>
        <select
          value={node.unlockTrigger}
          onChange={(e) => onChange({ ...node, unlockTrigger: e.target.value })}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid var(--bg-border)",
            background: "var(--bg-base)",
            fontSize: "12px",
            color: "var(--text-primary)",
            marginBottom: "16px",
          }}
        >
          {UNLOCK_TRIGGERS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Parent node */}
        <label className="mono" style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", marginBottom: "6px", display: "block" }}>
          PARENT NODE
        </label>
        <select
          value={node.parentNodeId ?? "none"}
          onChange={(e) => {
            const val = e.target.value;
            onChange({ ...node, parentNodeId: val === "none" ? undefined : val });
          }}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid var(--bg-border)",
            background: "var(--bg-base)",
            fontSize: "12px",
            color: "var(--text-primary)",
            marginBottom: "16px",
          }}
        >
          <option value="none">No parent (root level)</option>
          {possibleParents.map((p) => (
            <option key={p.id} value={p.id}>{p.label || "Untitled"}</option>
          ))}
        </select>

        {/* Analysis note */}
        <label className="mono" style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", marginBottom: "6px", display: "block" }}>
          ANALYSIS NOTE
        </label>
        <textarea
          value={node.analysisNote ?? ""}
          onChange={(e) => onChange({ ...node, analysisNote: e.target.value || undefined })}
          placeholder="What makes this node important..."
          style={{
            width: "100%",
            minHeight: "80px",
            borderRadius: "6px",
            border: "1px solid var(--bg-border)",
            background: "var(--bg-base)",
            padding: "10px 12px",
            fontSize: "12px",
            color: "var(--text-primary)",
            resize: "vertical",
            lineHeight: "1.5",
          }}
        />
      </div>
    </motion.div>
  );
}

// ── Main Framework Tree Tab ───────────────────────────────────────────

export default function FrameworkTreeTab({ caseId }: { caseId: string | null | undefined }) {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  const fetchNodes = async () => {
    if (!caseId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("framework_nodes")
      .select("*")
      .eq("case_id", caseId);

    if (error) {
      toast.error("Error loading framework nodes: " + error.message);
    } else if (data) {
      setNodes(
        data.map((n) => ({
          id: n.id,
          label: n.label,
          framework: n.framework,
          quality: n.quality as NodeQuality,
          analysisNote: n.analysis_note ?? undefined,
          unlockTrigger: n.unlock_trigger,
          parentNodeId: n.parent_node_id ?? undefined,
          posX: Number(n.pos_x),
          posY: Number(n.pos_y),
        }))
      );
    }
    setLoading(false);
  };

  // Sync from DB
  useEffect(() => {
    if (caseId) {
      fetchNodes();
    }
  }, [caseId]);

  // Drag handling
  const handlePointerDown = useCallback((idx: number, e: React.PointerEvent) => {
    const node = nodes[idx];
    setDraggingIdx(idx);
    setDragOffset({ x: e.clientX - node.posX, y: e.clientY - node.posY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [nodes]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (draggingIdx === null) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    const updated = [...nodes];
    updated[draggingIdx] = {
      ...updated[draggingIdx],
      posX: Math.max(0, newX),
      posY: Math.max(0, newY),
    };
    setNodes(updated);
    setHasLocalChanges(true);
  }, [draggingIdx, dragOffset, nodes]);

  const handlePointerUp = useCallback(() => {
    setDraggingIdx(null);
  }, []);

  const addNode = (quality: NodeQuality) => {
    const baseX = 60 + (nodes.length % 4) * 180;
    const baseY = 60 + Math.floor(nodes.length / 4) * 100;
    const newNode: NodeData = {
      id: crypto.randomUUID(),
      label: "",
      framework: "",
      quality,
      unlockTrigger: "always",
      posX: baseX,
      posY: baseY,
    };
    setNodes([...nodes, newNode]);
    setSelectedIdx(nodes.length);
    setHasLocalChanges(true);
  };

  const removeNodeLocal = async (idx: number) => {
    const node = nodes[idx];
    if (node.id) {
      const { error } = await supabase.from("framework_nodes").delete().eq("id", node.id);
      if (error) {
        toast.error("Error removing node: " + error.message);
        return;
      }
    }
    const updated = nodes.filter((_, i) => i !== idx);
    setNodes(updated);
    if (selectedIdx === idx) setSelectedIdx(null);
    else if (selectedIdx !== null && selectedIdx > idx) setSelectedIdx(selectedIdx - 1);
    setHasLocalChanges(true);
  };

  const updateNodeLocal = (idx: number, updated: NodeData) => {
    const copy = [...nodes];
    copy[idx] = updated;
    setNodes(copy);
    setHasLocalChanges(true);
  };

  const saveAll = async () => {
    if (!caseId) {
      toast.error("Save the case info first to create framework nodes");
      return;
    }

    try {
      for (const node of nodes) {
        const payload = {
          case_id: caseId,
          label: node.label,
          framework: node.framework,
          quality: node.quality,
          analysis_note: node.analysisNote || null,
          unlock_trigger: node.unlockTrigger,
          parent_node_id: node.parentNodeId || null,
          pos_x: node.posX,
          pos_y: node.posY,
        };

        if (node.id) {
          const { error } = await supabase
            .from("framework_nodes")
            .update(payload)
            .eq("id", node.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("framework_nodes")
            .insert(payload)
            .select()
            .single();
          if (error) throw error;
          if (data) {
            node.id = data.id;
          }
        }
      }
      setHasLocalChanges(false);
      toast.success("Framework tree saved!");
      fetchNodes();
    } catch (err: any) {
      toast.error("Error saving tree: " + err.message);
    }
  };

  if (!caseId) {
    return (
      <div style={{ padding: "48px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
          Save the case info first, then build the framework tree here.
        </p>
      </div>
    );
  }

  const maxRight = Math.max(800, ...nodes.map((n) => n.posX + 250));
  const maxBottom = Math.max(600, ...nodes.map((n) => n.posY + 150));

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Canvas area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 24px",
            borderBottom: "1px solid var(--bg-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <GitBranch size={14} color="var(--text-tertiary)" />
            <span className="mono" style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
              {nodes.length} node{nodes.length !== 1 ? "s" : ""}
            </span>
            {hasLocalChanges && (
              <span className="mono" style={{ fontSize: "10px", color: "#D97706" }}>
                Unsaved changes
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => addNode("root")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 10px",
                borderRadius: "6px",
                border: `1px solid ${QUALITY_CONFIG.root.color}40`,
                background: QUALITY_CONFIG.root.bg,
                fontSize: "10px",
                fontWeight: 600,
                color: QUALITY_CONFIG.root.color,
                cursor: "pointer",
              }}
            >
              <Plus size={11} /> Root
            </button>
            <button
              onClick={() => addNode("optimal")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 10px",
                borderRadius: "6px",
                border: `1px solid ${QUALITY_CONFIG.optimal.color}40`,
                background: QUALITY_CONFIG.optimal.bg,
                fontSize: "10px",
                fontWeight: 600,
                color: QUALITY_CONFIG.optimal.color,
                cursor: "pointer",
              }}
            >
              <Plus size={11} /> Optimal
            </button>
            <button
              onClick={() => addNode("normal")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 10px",
                borderRadius: "6px",
                border: `1px solid ${QUALITY_CONFIG.normal.color}40`,
                background: QUALITY_CONFIG.normal.bg,
                fontSize: "10px",
                fontWeight: 600,
                color: QUALITY_CONFIG.normal.color,
                cursor: "pointer",
              }}
            >
              <Plus size={11} /> Normal
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            flex: 1,
            position: "relative",
            overflow: "auto",
            background: "var(--bg-base)",
            backgroundImage:
              "radial-gradient(circle, var(--bg-border) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          {loading ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Loading framework nodes...</p>
            </div>
          ) : nodes.length === 0 ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <GitBranch size={28} style={{ color: "var(--text-tertiary)", margin: "0 auto 12px" }} />
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  No framework nodes yet
                </p>
                <p style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                  Add root, optimal, or normal nodes to build the tree
                </p>
              </div>
            </div>
          ) : (
            <div style={{ minWidth: maxRight, minHeight: maxBottom, position: "relative" }}>
              <ConnectionLines nodes={nodes} />
              {nodes.map((node, idx) => (
                <CanvasNode
                  key={node.id ?? `new-${idx}`}
                  node={node}
                  isSelected={selectedIdx === idx}
                  onSelect={() => setSelectedIdx(idx)}
                  onDragStart={(e) => handlePointerDown(idx, e)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Save button */}
        {nodes.length > 0 && (
          <div
            style={{
              padding: "12px 24px",
              borderTop: "1px solid var(--bg-border)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={saveAll}
              style={{
                padding: "8px 20px",
                borderRadius: "6px",
                background: hasLocalChanges ? "#6B34D6" : "var(--bg-elevated)",
                border: "none",
                fontSize: "12px",
                fontWeight: 600,
                color: hasLocalChanges ? "#fff" : "var(--text-tertiary)",
                cursor: hasLocalChanges ? "pointer" : "default",
                transition: "all 150ms ease",
              }}
            >
              Save tree
            </button>
          </div>
        )}
      </div>

      {/* Right: Edit panel */}
      <AnimatePresence>
        {selectedIdx !== null && nodes[selectedIdx] && (
          <NodeEditPanel
            key={selectedIdx}
            node={nodes[selectedIdx]}
            nodes={nodes}
            onChange={(updated) => updateNodeLocal(selectedIdx, updated)}
            onClose={() => setSelectedIdx(null)}
            onDelete={() => removeNodeLocal(selectedIdx)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
