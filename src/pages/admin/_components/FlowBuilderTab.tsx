import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase.ts";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  GripVertical,
  Trash2,
  X,
  User,
  UserCog,
  Monitor,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

type TurnRole = "interviewer" | "candidate" | "system";

type CanvasTrigger = {
  type: string;
  value?: string;
  data?: unknown;
};

type ExhibitReveal = {
  exhibitId: string;
  title: string;
  type: string;
  chartData?: string;
};

type TurnData = {
  id?: string;
  turnNumber: number;
  role: TurnRole;
  dialogueText: string;
  canvasTriggers: CanvasTrigger[];
  exhibitReveal?: ExhibitReveal;
  scoringDimension?: string;
  scoringWeight?: number;
};

const ROLE_CONFIG: Record<TurnRole, { color: string; bg: string; label: string; icon: typeof User }> = {
  interviewer: { color: "#0F9560", bg: "rgba(15,149,96,0.10)", label: "Interviewer", icon: UserCog },
  candidate: { color: "#3B82F6", bg: "rgba(59,130,246,0.10)", label: "Candidate", icon: User },
  system: { color: "#D97706", bg: "rgba(217,119,6,0.10)", label: "System", icon: Monitor },
};

const CANVAS_TRIGGER_TYPES = [
  "framework",
  "context_card",
  "pillar_activation",
  "exhibit",
  "set_focus",
  "add_context",
];

const EXHIBIT_TYPES = [
  "bar_chart",
  "data_table",
  "trend_line",
  "insight_card",
  "market_funnel",
];

const SCORING_DIMENSIONS = [
  "Structure",
  "Quantitative",
  "Communication",
  "Creativity",
  "Business Sense",
];

// ── Sortable Turn Card ────────────────────────────────────────────────

function SortableTurnCard({
  turn,
  isSelected,
  onSelect,
  onRemove,
}: {
  turn: TurnData;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: turn.turnNumber.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const config = ROLE_CONFIG[turn.role];
  const Icon = config.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      <div
        onClick={onSelect}
        style={{
          display: "flex",
          alignItems: "stretch",
          borderRadius: "8px",
          border: isSelected ? `2px solid ${config.color}` : "1px solid var(--bg-border)",
          background: isSelected ? config.bg : "var(--bg-surface)",
          cursor: "pointer",
          overflow: "hidden",
          transition: "all 150ms ease",
        }}
      >
        {/* Color stripe */}
        <div
          style={{
            width: "4px",
            background: config.color,
            flexShrink: 0,
          }}
        />

        {/* Drag handle */}
        <div
          {...listeners}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 8px",
            cursor: "grab",
            color: "var(--text-tertiary)",
          }}
        >
          <GripVertical size={14} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "10px 12px 10px 0", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Icon size={13} color={config.color} />
            <span
              className="mono"
              style={{ fontSize: "10px", fontWeight: 600, color: config.color, letterSpacing: "0.04em" }}
            >
              {config.label.toUpperCase()} — TURN {turn.turnNumber}
            </span>
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              lineHeight: "1.4",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {turn.dialogueText || "No dialogue yet..."}
          </p>
        </div>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 10px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            opacity: 0.6,
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Edit Panel ────────────────────────────────────────────────────────

function EditPanel({
  turn,
  onChange,
  onClose,
}: {
  turn: TurnData;
  onChange: (updated: TurnData) => void;
  onClose: () => void;
}) {
  const config = ROLE_CONFIG[turn.role];

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        width: "380px",
        borderLeft: "1px solid var(--bg-border)",
        background: "var(--bg-surface)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
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
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: config.color,
            }}
          />
          <span className="mono" style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
            Turn {turn.turnNumber} — {config.label}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)" }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable form */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {/* Role selector */}
        <label className="mono" style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", marginBottom: "6px", display: "block" }}>
          ROLE
        </label>
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
          {(Object.entries(ROLE_CONFIG) as [TurnRole, typeof ROLE_CONFIG["interviewer"]][]).map(([role, rc]) => (
            <button
              key={role}
              onClick={() => onChange({ ...turn, role })}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: "6px",
                border: turn.role === role ? `2px solid ${rc.color}` : "1px solid var(--bg-border)",
                background: turn.role === role ? rc.bg : "transparent",
                fontSize: "11px",
                fontWeight: 600,
                color: turn.role === role ? rc.color : "var(--text-tertiary)",
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              {rc.label}
            </button>
          ))}
        </div>

        {/* Dialogue text */}
        <label className="mono" style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", marginBottom: "6px", display: "block" }}>
          DIALOGUE TEXT
        </label>
        <textarea
          value={turn.dialogueText}
          onChange={(e) => onChange({ ...turn, dialogueText: e.target.value })}
          placeholder="Enter what is said at this turn..."
          style={{
            width: "100%",
            minHeight: "100px",
            borderRadius: "6px",
            border: "1px solid var(--bg-border)",
            background: "var(--bg-base)",
            padding: "10px 12px",
            fontSize: "12px",
            color: "var(--text-primary)",
            resize: "vertical",
            marginBottom: "20px",
            lineHeight: "1.5",
          }}
        />

        {/* Canvas triggers */}
        <label className="mono" style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", marginBottom: "6px", display: "block" }}>
          CANVAS TRIGGERS
        </label>
        {turn.canvasTriggers.map((trigger, idx) => (
          <div key={idx} style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
            <select
              value={trigger.type}
              onChange={(e) => {
                const updated = [...turn.canvasTriggers];
                updated[idx] = { ...trigger, type: e.target.value };
                onChange({ ...turn, canvasTriggers: updated });
              }}
              style={{
                width: "140px",
                padding: "7px 10px",
                borderRadius: "6px",
                border: "1px solid var(--bg-border)",
                background: "var(--bg-base)",
                fontSize: "11px",
                color: "var(--text-primary)",
              }}
            >
              {CANVAS_TRIGGER_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              value={
                trigger.value !== undefined
                  ? trigger.value
                  : trigger.data
                  ? JSON.stringify(trigger.data)
                  : ""
              }
              onChange={(e) => {
                const updated = [...turn.canvasTriggers];
                const rawValue = e.target.value;
                try {
                  // If it's valid JSON, save it as a data object
                  const parsed = JSON.parse(rawValue);
                  updated[idx] = { ...trigger, data: parsed, value: undefined };
                } catch {
                  // Otherwise, save it as a simple string
                  updated[idx] = { ...trigger, value: rawValue, data: undefined };
                }
                onChange({ ...turn, canvasTriggers: updated });
              }}
              placeholder="Value or JSON payload..."
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: "6px",
                border: "1px solid var(--bg-border)",
                background: "var(--bg-base)",
                fontSize: "11px",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={() => {
                const updated = turn.canvasTriggers.filter((_, i) => i !== idx);
                onChange({ ...turn, canvasTriggers: updated });
              }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)" }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange({ ...turn, canvasTriggers: [...turn.canvasTriggers, { type: "framework", value: "" }] })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "11px",
            color: "#6B34D6",
            fontWeight: 500,
            marginBottom: "20px",
          }}
        >
          <Plus size={12} /> Add trigger
        </button>

        {/* Exhibit reveal */}
        <label className="mono" style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", marginBottom: "6px", display: "block" }}>
          EXHIBIT / ARTIFACT REVEAL
        </label>
        {turn.exhibitReveal ? (
          <div style={{ border: "1px solid var(--bg-border)", borderRadius: "6px", padding: "12px", marginBottom: "20px", background: "var(--bg-base)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="mono" style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>EXHIBIT</span>
              <button
                onClick={() => onChange({ ...turn, exhibitReveal: undefined })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)" }}
              >
                <X size={12} />
              </button>
            </div>
            <input
              value={turn.exhibitReveal.title}
              onChange={(e) => onChange({ ...turn, exhibitReveal: { ...turn.exhibitReveal!, title: e.target.value } })}
              placeholder="Exhibit title..."
              style={{ width: "100%", padding: "7px 10px", borderRadius: "4px", border: "1px solid var(--bg-border)", background: "var(--bg-surface)", fontSize: "11px", color: "var(--text-primary)", marginBottom: "6px" }}
            />
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                value={turn.exhibitReveal.exhibitId}
                onChange={(e) => onChange({ ...turn, exhibitReveal: { ...turn.exhibitReveal!, exhibitId: e.target.value } })}
                placeholder="Exhibit ID..."
                style={{ flex: 1, padding: "7px 10px", borderRadius: "4px", border: "1px solid var(--bg-border)", background: "var(--bg-surface)", fontSize: "11px", color: "var(--text-primary)" }}
              />
              <select
                value={turn.exhibitReveal.type}
                onChange={(e) => onChange({ ...turn, exhibitReveal: { ...turn.exhibitReveal!, type: e.target.value } })}
                style={{ padding: "7px 10px", borderRadius: "4px", border: "1px solid var(--bg-border)", background: "var(--bg-surface)", fontSize: "11px", color: "var(--text-primary)" }}
              >
                {EXHIBIT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <button
            onClick={() => onChange({ ...turn, exhibitReveal: { exhibitId: "", title: "", type: "bar_chart" } })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "11px",
              color: "#6B34D6",
              fontWeight: 500,
              marginBottom: "20px",
            }}
          >
            <Plus size={12} /> Attach exhibit
          </button>
        )}

        {/* Scoring (only for candidate) */}
        {turn.role === "candidate" && (
          <>
            <label className="mono" style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", marginBottom: "6px", display: "block" }}>
              SCORING
            </label>
            <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
              <select
                value={turn.scoringDimension ?? ""}
                onChange={(e) => onChange({ ...turn, scoringDimension: e.target.value || undefined })}
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--bg-border)",
                  background: "var(--bg-base)",
                  fontSize: "11px",
                  color: "var(--text-primary)",
                }}
              >
                <option value="">No scoring</option>
                {SCORING_DIMENSIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                max={100}
                value={turn.scoringWeight ?? ""}
                onChange={(e) => onChange({ ...turn, scoringWeight: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Weight"
                style={{
                  width: "70px",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--bg-border)",
                  background: "var(--bg-base)",
                  fontSize: "11px",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Flow Builder Tab ─────────────────────────────────────────────

export default function FlowBuilderTab({ caseId }: { caseId: string | null | undefined }) {
  const [turns, setTurns] = useState<TurnData[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTurns = async () => {
    if (!caseId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("case_turns")
      .select("*")
      .eq("case_id", caseId)
      .order("turn_number", { ascending: true });

    if (error) {
      toast.error("Error loading turns: " + error.message);
    } else if (data) {
      setTurns(
        data.map((t) => ({
          id: t.id,
          turnNumber: t.turn_number,
          role: t.role as TurnRole,
          dialogueText: t.dialogue_text,
          canvasTriggers: t.canvas_triggers || [],
          exhibitReveal: t.exhibit_reveal ?? undefined,
          scoringDimension: t.scoring_dimension ?? undefined,
          scoringWeight: t.scoring_weight ? Number(t.scoring_weight) : undefined,
        }))
      );
    }
    setLoading(false);
  };

  // Sync from DB
  useEffect(() => {
    if (caseId) {
      fetchTurns();
    }
  }, [caseId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = turns.findIndex((t) => t.turnNumber.toString() === active.id);
    const newIdx = turns.findIndex((t) => t.turnNumber.toString() === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(turns, oldIdx, newIdx).map((t, i) => ({
      ...t,
      turnNumber: i + 1,
    }));
    setTurns(reordered);
    setHasLocalChanges(true);

    // Keep selection tracking the same card
    if (selectedIdx === oldIdx) {
      setSelectedIdx(newIdx);
    } else if (selectedIdx !== null) {
      if (oldIdx < selectedIdx && newIdx >= selectedIdx) {
        setSelectedIdx(selectedIdx - 1);
      } else if (oldIdx > selectedIdx && newIdx <= selectedIdx) {
        setSelectedIdx(selectedIdx + 1);
      }
    }
  };

  const addTurn = (role: TurnRole) => {
    const newTurn: TurnData = {
      turnNumber: turns.length + 1,
      role,
      dialogueText: "",
      canvasTriggers: [],
    };
    setTurns([...turns, newTurn]);
    setSelectedIdx(turns.length);
    setHasLocalChanges(true);
  };

  const removeTurnLocal = async (idx: number) => {
    const turn = turns[idx];
    if (turn.id) {
      const { error } = await supabase.from("case_turns").delete().eq("id", turn.id);
      if (error) {
        toast.error("Error removing turn: " + error.message);
        return;
      }
    }
    const updated = turns.filter((_, i) => i !== idx).map((t, i) => ({ ...t, turnNumber: i + 1 }));
    setTurns(updated);
    if (selectedIdx === idx) setSelectedIdx(null);
    else if (selectedIdx !== null && selectedIdx > idx) setSelectedIdx(selectedIdx - 1);
    setHasLocalChanges(true);
  };

  const updateTurnLocal = (idx: number, updated: TurnData) => {
    const copy = [...turns];
    copy[idx] = updated;
    setTurns(copy);
    setHasLocalChanges(true);
  };

  const saveAll = async () => {
    if (!caseId) {
      toast.error("Save the case info first to create turns");
      return;
    }

    try {
      for (const turn of turns) {
        const payload = {
          case_id: caseId,
          turn_number: turn.turnNumber,
          role: turn.role,
          dialogue_text: turn.dialogueText,
          canvas_triggers: turn.canvasTriggers,
          exhibit_reveal: turn.exhibitReveal || null,
          scoring_dimension: turn.scoringDimension || null,
          scoring_weight: turn.scoringWeight || null,
        };

        if (turn.id) {
          const { error } = await supabase
            .from("case_turns")
            .update(payload)
            .eq("id", turn.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("case_turns")
            .insert(payload)
            .select()
            .single();
          if (error) throw error;
          if (data) {
            turn.id = data.id;
          }
        }
      }
      setHasLocalChanges(false);
      toast.success("Flow saved!");
      fetchTurns();
    } catch (err: any) {
      toast.error("Error saving turns: " + err.message);
    }
  };

  if (!caseId) {
    return (
      <div style={{ padding: "48px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
          Save the case info first, then build the conversation flow here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Left: Turn list */}
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
            <span className="mono" style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
              {turns.length} turn{turns.length !== 1 ? "s" : ""}
            </span>
            {hasLocalChanges && (
              <span className="mono" style={{ fontSize: "10px", color: "#D97706" }}>
                Unsaved changes
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {(["interviewer", "candidate", "system"] as TurnRole[]).map((role) => {
              const rc = ROLE_CONFIG[role];
              return (
                <button
                  key={role}
                  onClick={() => addTurn(role)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${rc.color}40`,
                    background: rc.bg,
                    fontSize: "10px",
                    fontWeight: 600,
                    color: rc.color,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={11} /> {rc.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Turn list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-secondary)" }}>
              Loading turns...
            </div>
          ) : turns.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <Monitor size={28} style={{ color: "var(--text-tertiary)", margin: "0 auto 12px" }} />
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                No turns yet
              </p>
              <p style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                Add an interviewer, candidate, or system turn above
              </p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={turns.map((t) => t.turnNumber.toString())}
                strategy={verticalListSortingStrategy}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {turns.map((turn, idx) => (
                    <div key={turn.turnNumber} style={{ position: "relative" }}>
                      <SortableTurnCard
                        turn={turn}
                        isSelected={selectedIdx === idx}
                        onSelect={() => setSelectedIdx(idx)}
                        onRemove={() => removeTurnLocal(idx)}
                      />
                      {/* Connector arrow */}
                      {idx < turns.length - 1 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            padding: "2px 0",
                            color: "var(--text-tertiary)",
                            opacity: 0.4,
                          }}
                        >
                          <ChevronRight size={12} style={{ transform: "rotate(90deg)" }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Save button */}
        {turns.length > 0 && (
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
              Save flow
            </button>
          </div>
        )}
      </div>

      {/* Right: Edit panel */}
      <AnimatePresence>
        {selectedIdx !== null && turns[selectedIdx] && (
          <EditPanel
            key={selectedIdx}
            turn={turns[selectedIdx]}
            onChange={(updated) => updateTurnLocal(selectedIdx, updated)}
            onClose={() => setSelectedIdx(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
