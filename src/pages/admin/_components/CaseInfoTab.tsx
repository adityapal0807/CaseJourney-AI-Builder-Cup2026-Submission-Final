import { useState } from "react";
import { X, Plus, Star } from "lucide-react";

type CaseFormData = {
  name: string;
  problemStatement: string;
  caseType: string;
  industry: string;
  companyStyle: string;
  round: string;
  difficulty: number;
  tags: string[];
  clarifyingQuestions: string;
  browniePoints: string;
  keepInMind: string;
};

const CASE_TYPES = [
  "Profitability / P&L",
  "Market Entry",
  "Market Sizing",
  "Pricing",
  "M&A",
  "Growth Strategy",
  "Operations",
  "Digital / Tech",
];

const COMPANY_STYLES = ["Top Tier", "Strategy", "Operations", "Generic"];
const ROUNDS = ["Buddy", "1st", "2nd", "Final"];

export default function CaseInfoTab({
  form,
  setForm,
}: {
  form: CaseFormData;
  setForm: React.Dispatch<React.SetStateAction<CaseFormData>>;
}) {
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div style={{ padding: "36px 48px", maxWidth: "780px" }}>
      {/* Case Name */}
      <FieldGroup label="Case Name" required>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Toy Story"
          style={inputStyle}
        />
      </FieldGroup>

      {/* Problem Statement */}
      <FieldGroup label="Problem Statement" required>
        <textarea
          value={form.problemStatement}
          onChange={(e) => setForm((f) => ({ ...f, problemStatement: e.target.value }))}
          placeholder="The year is 2021. Your client is a toy manufacturer and has been facing a decline in revenue..."
          rows={4}
          style={{ ...inputStyle, resize: "vertical", minHeight: "100px" }}
        />
        <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "6px" }}>
          This is the first thing the candidate sees. Be specific about year, client type, and the core question.
        </p>
      </FieldGroup>

      {/* Case Type + Industry row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <FieldGroup label="Case Type" required>
          <select
            value={form.caseType}
            onChange={(e) => setForm((f) => ({ ...f, caseType: e.target.value }))}
            style={inputStyle}
          >
            {CASE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </FieldGroup>

        <FieldGroup label="Industry" required>
          <input
            type="text"
            value={form.industry}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            placeholder="e.g. Toy, Retail, SaaS"
            style={inputStyle}
          />
        </FieldGroup>
      </div>

      {/* Company / Firm Style */}
      <FieldGroup label="Company / Firm Style">
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {COMPANY_STYLES.map((style) => (
            <button
              key={style}
              onClick={() => setForm((f) => ({ ...f, companyStyle: style }))}
              style={{
                padding: "7px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                border: form.companyStyle === style ? "1.5px solid var(--text-primary)" : "1px solid var(--bg-border)",
                background: form.companyStyle === style ? "var(--text-primary)" : "var(--bg-surface)",
                color: form.companyStyle === style ? "#fff" : "var(--text-secondary)",
                transition: "all 150ms ease",
              }}
            >
              {style}
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* Round */}
      <FieldGroup label="Round">
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {ROUNDS.map((round) => (
            <button
              key={round}
              onClick={() => setForm((f) => ({ ...f, round }))}
              style={{
                padding: "7px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                border: form.round === round ? "1.5px solid #0F9560" : "1px solid var(--bg-border)",
                background: form.round === round ? "#0F9560" : "var(--bg-surface)",
                color: form.round === round ? "#fff" : "var(--text-secondary)",
                transition: "all 150ms ease",
              }}
            >
              {round}
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* Difficulty */}
      <FieldGroup label="Difficulty">
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {[1, 2, 3].map((level) => (
            <button
              key={level}
              onClick={() => setForm((f) => ({ ...f, difficulty: level }))}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                background: level <= form.difficulty ? "#B87A00" : "var(--bg-elevated)",
                border: "1px solid",
                borderColor: level <= form.difficulty ? "#B87A00" : "var(--bg-border)",
                transition: "all 150ms ease",
              }}
            >
              <Star
                size={14}
                fill={level <= form.difficulty ? "#fff" : "none"}
                color={level <= form.difficulty ? "#fff" : "var(--text-tertiary)"}
              />
            </button>
          ))}
          <span
            className="mono"
            style={{ fontSize: "12px", color: "var(--text-tertiary)", marginLeft: "10px" }}
          >
            {form.difficulty === 1 ? "Easy" : form.difficulty === 2 ? "Medium" : "Hard"}
          </span>
        </div>
      </FieldGroup>

      {/* Tags */}
      <FieldGroup label="Tags">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {form.tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 10px",
                borderRadius: "5px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--bg-border)",
                fontSize: "12px",
                color: "var(--text-secondary)",
              }}
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  padding: 0,
                }}
              >
                <X size={11} />
              </button>
            </span>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="+ Add tag"
              style={{
                padding: "4px 10px",
                borderRadius: "5px",
                border: "1px solid var(--bg-border)",
                background: "var(--bg-surface)",
                fontSize: "12px",
                width: "100px",
                outline: "none",
              }}
            />
            {tagInput.trim() && (
              <button
                onClick={handleAddTag}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                  borderRadius: "4px",
                  background: "#6B34D6",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Plus size={12} color="#fff" />
              </button>
            )}
          </div>
        </div>
      </FieldGroup>

      {/* Divider + Coaching Notes */}
      <div
        style={{
          marginTop: "32px",
          marginBottom: "24px",
          borderTop: "1px solid var(--bg-border)",
          paddingTop: "28px",
        }}
      >
        <h3
          style={{
            fontSize: "15px",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "4px",
          }}
        >
          Coaching notes
        </h3>
        <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "20px" }}>
          Shown in review mode after the session.
        </p>
      </div>

      {/* Clarifying Questions */}
      <FieldGroup label="Clarifying Questions">
        <textarea
          value={form.clarifyingQuestions}
          onChange={(e) => setForm((f) => ({ ...f, clarifyingQuestions: e.target.value }))}
          placeholder="Type of board game? Have competitors faced a decline?"
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "6px" }}>
          Shown in the sidebar for candidates reviewing this case post-session.
        </p>
      </FieldGroup>

      {/* Brownie Points + Keep In Mind row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <FieldGroup label="Brownie Points">
          <textarea
            value={form.browniePoints}
            onChange={(e) => setForm((f) => ({ ...f, browniePoints: e.target.value }))}
            placeholder="Proposing the idea of launching a digital application..."
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </FieldGroup>

        <FieldGroup label="Keep In Mind">
          <textarea
            value={form.keepInMind}
            onChange={(e) => setForm((f) => ({ ...f, keepInMind: e.target.value }))}
            placeholder="Always keep the current context in mind when given a case."
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </FieldGroup>
      </div>
    </div>
  );
}

// ── Shared components ──────────────────────────────────────────────────

function FieldGroup({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "22px" }}>
      <label
        className="mono"
        style={{
          display: "block",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: "8px",
        }}
      >
        {label}
        {required && <span style={{ color: "var(--accent-red)", marginLeft: "4px" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid var(--bg-border)",
  background: "var(--bg-surface)",
  fontSize: "14px",
  color: "var(--text-primary)",
  outline: "none",
  transition: "border-color 150ms ease",
  fontFamily: "inherit",
};
