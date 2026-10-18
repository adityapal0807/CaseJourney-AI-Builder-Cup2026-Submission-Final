import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import CaseInfoTab from "./CaseInfoTab.tsx";
import FlowBuilderTab from "./FlowBuilderTab.tsx";
import FrameworkTreeTab from "./FrameworkTreeTab.tsx";

type Tab = "info" | "flow" | "tree";

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

const EMPTY_FORM: CaseFormData = {
  name: "",
  problemStatement: "",
  caseType: "Profitability / P&L",
  industry: "",
  companyStyle: "Top Tier",
  round: "Buddy",
  difficulty: 2,
  tags: [],
  clarifyingQuestions: "",
  browniePoints: "",
  keepInMind: "",
};

// ── API helpers ──────────────────────────────────────────────────────────────

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET ?? "";

async function apiRequest(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": ADMIN_SECRET,
      ...(options?.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Request failed: ${res.status}`);
  return json;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CaseCreator({
  caseId,
  onBack,
}: {
  caseId: string | null | undefined;
  onBack: () => void;
}) {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [existingCase, setExistingCase] = useState<any | null>(null);
  const [form, setForm] = useState<CaseFormData>(EMPTY_FORM);
  const [savedCaseId, setSavedCaseId] = useState<string | null>(caseId ?? null);

  const fetchExistingCase = async (id: string) => {
    try {
      const data = await apiRequest(`/api/admin/cases/${id}`);
      if (data) {
        setExistingCase(data);
        setForm({
          name: data.name,
          problemStatement: data.problem_statement,
          caseType: data.case_type,
          industry: data.industry,
          companyStyle: data.company_style,
          round: data.round,
          difficulty: data.difficulty,
          tags: data.tags || [],
          clarifyingQuestions: data.clarifying_questions ?? "",
          browniePoints: data.brownie_points ?? "",
          keepInMind: data.keep_in_mind ?? "",
        });
      }
    } catch (err: any) {
      toast.error("Error loading case: " + err.message);
    }
  };

  useEffect(() => {
    if (savedCaseId) {
      fetchExistingCase(savedCaseId);
    } else {
      setExistingCase(null);
      setForm(EMPTY_FORM);
    }
  }, [savedCaseId]);

  const handleSaveDraft = async () => {
    if (!form.name.trim()) {
      toast.error("Case name is required");
      return;
    }
    if (!form.problemStatement.trim()) {
      toast.error("Problem statement is required");
      return;
    }
    if (!user?.id) {
      toast.error("User not loaded yet");
      return;
    }

    const payload = {
      name: form.name,
      problem_statement: form.problemStatement,
      case_type: form.caseType,
      industry: form.industry,
      company_style: form.companyStyle,
      round: form.round,
      difficulty: form.difficulty,
      tags: form.tags,
      clarifying_questions: form.clarifyingQuestions || null,
      brownie_points: form.browniePoints || null,
      keep_in_mind: form.keepInMind || null,
    };

    try {
      if (savedCaseId) {
        await apiRequest(`/api/admin/cases/${savedCaseId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Draft saved");
        fetchExistingCase(savedCaseId);
      } else {
        const data = await apiRequest("/api/admin/cases", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            author_id: user.id,
            status: "draft",
          }),
        });
        setSavedCaseId(data.id);
        toast.success("Case created as draft");
      }
    } catch (err: any) {
      toast.error("Error creating case: " + err.message);
    }
  };

  const handlePublish = async () => {
    if (!form.name.trim() || !form.problemStatement.trim()) {
      toast.error("Fill in required fields before publishing");
      return;
    }
    await handleSaveDraft();
    if (savedCaseId) {
      try {
        await apiRequest(`/api/admin/cases/${savedCaseId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "published" }),
        });
        toast.success("Case published!");
        fetchExistingCase(savedCaseId);
      } catch (err: any) {
        toast.error("Error publishing case: " + err.message);
      }
    }
  };

  const handleUnpublish = async () => {
    if (!savedCaseId) return;
    try {
      await apiRequest(`/api/admin/cases/${savedCaseId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "draft" }),
      });
      toast.success("Case unpublished");
      fetchExistingCase(savedCaseId);
    } catch (err: any) {
      toast.error("Error unpublishing case: " + err.message);
    }
  };

  const isPublished = existingCase?.status === "published";

  const TABS: { key: Tab; label: string }[] = [
    { key: "info", label: "Case Info" },
    { key: "flow", label: "Flow Builder" },
    { key: "tree", label: "Framework Tree" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid var(--bg-border)",
          background: "var(--bg-surface)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={onBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid var(--bg-border)",
              background: "var(--bg-elevated)",
              fontSize: "12px",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
              {savedCaseId ? form.name || "Untitled Case" : "New Case"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
              {isPublished ? "● Published" : "○ Draft"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleSaveDraft}
            style={{
              padding: "7px 14px",
              borderRadius: "6px",
              border: "1px solid var(--bg-border)",
              background: "var(--bg-elevated)",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            Save Draft
          </button>
          {isPublished ? (
            <button
              onClick={handleUnpublish}
              style={{
                padding: "7px 14px",
                borderRadius: "6px",
                border: "none",
                background: "#C93030",
                fontSize: "12px",
                fontWeight: 600,
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={handlePublish}
              style={{
                padding: "7px 14px",
                borderRadius: "6px",
                border: "none",
                background: "#0F9560",
                fontSize: "12px",
                fontWeight: 600,
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Check size={13} />
              Publish
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--bg-border)",
          background: "var(--bg-surface)",
          flexShrink: 0,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            disabled={t.key !== "info" && !savedCaseId}
            style={{
              padding: "10px 20px",
              border: "none",
              borderBottom: activeTab === t.key ? "2px solid #6B34D6" : "2px solid transparent",
              background: "transparent",
              fontSize: "13px",
              fontWeight: activeTab === t.key ? 700 : 500,
              color: activeTab === t.key ? "#6B34D6" : "var(--text-secondary)",
              cursor: t.key !== "info" && !savedCaseId ? "not-allowed" : "pointer",
              opacity: t.key !== "info" && !savedCaseId ? 0.4 : 1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        style={{ flex: 1, overflow: "auto", minHeight: 0 }}
      >
        {activeTab === "info" && (
          <CaseInfoTab form={form} setForm={setForm} />
        )}
        {activeTab === "flow" && savedCaseId && (
          <FlowBuilderTab caseId={savedCaseId} />
        )}
        {activeTab === "tree" && savedCaseId && (
          <FrameworkTreeTab caseId={savedCaseId} />
        )}
      </motion.div>
    </div>
  );
}
