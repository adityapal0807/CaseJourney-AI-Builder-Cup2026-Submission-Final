import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { BookOpen, Plus, LogOut, ArrowLeft, Pencil, Trash2, Mail, User as UserIcon, Shield, X } from "lucide-react";
import { supabase } from "@/lib/supabase.ts";
import CaseCreator from "./_components/CaseCreator.tsx";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

type AdminView = "dashboard" | "create" | "edit" | "users" | "waitlist";

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

export default function AdminDashboard() {
  const { user } = useCurrentUser();
  const { signout } = useAuth();
  const [cases, setCases] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [preauthorizedList, setPreauthorizedList] = useState<any[]>([]);
  const [usageLogs, setUsageLogs] = useState<any[]>([]);
  const [waitlistList, setWaitlistList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [waitlistLoading, setWaitlistLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [addingUser, setAddingUser] = useState(false);

  const fetchCases = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Error loading cases: " + error.message);
    } else {
      setCases(data || []);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    setWaitlistLoading(true);
    try {
      const [uData, pData, lData, wData] = await Promise.all([
        apiRequest("/api/admin/users").catch(() => []),
        apiRequest("/api/admin/preauthorized_users").catch(() => []),
        apiRequest("/api/admin/usage_logs").catch(() => []),
        apiRequest("/api/admin/waitlist").catch(() => [])
      ]);
      setUsersList(uData || []);
      setPreauthorizedList(pData || []);
      setUsageLogs(lData || []);
      setWaitlistList(wData || []);
    } catch (err: any) {
      toast.error("Error loading admin data: " + err.message);
    } finally {
      setUsersLoading(false);
      setWaitlistLoading(false);
    }
  };

  const handleApproveWaitlist = async (id: string) => {
    try {
      toast.loading("Approving candidate and sending credentials...", { id: "wl-action" });
      await apiRequest(`/api/admin/waitlist/${id}/approve`, { method: "POST" });
      toast.success("Candidate approved and email credentials sent!", { id: "wl-action" });
      fetchUsers();
    } catch (err: any) {
      toast.error("Error approving candidate: " + err.message, { id: "wl-action" });
    }
  };

  const handleRejectWaitlist = async (id: string) => {
    if (confirm("Are you sure you want to reject this waitlist application?")) {
      try {
        toast.loading("Rejecting application...", { id: "wl-action" });
        await apiRequest(`/api/admin/waitlist/${id}/reject`, { method: "POST" });
        toast.success("Application rejected and notice email sent.", { id: "wl-action" });
        fetchUsers();
      } catch (err: any) {
        toast.error("Error rejecting application: " + err.message, { id: "wl-action" });
      }
    }
  };

  useEffect(() => {
    fetchCases();
    fetchUsers();
  }, []);

  // Derive view from URL params
  const viewParam = searchParams.get("view") as AdminView | null;
  const editIdParam = searchParams.get("caseId");
  const view: AdminView = viewParam === "create" || viewParam === "edit" || viewParam === "users" || viewParam === "waitlist" ? viewParam : "dashboard";
  const editingCaseId = view === "edit" ? editIdParam : null;


  const handleCreateNew = () => {
    setSearchParams({ view: "create" });
  };

  const handleEditCase = (caseId: string) => {
    setSearchParams({ view: "edit", caseId });
  };

  const handleDeleteCase = async (caseId: string) => {
    const { error } = await supabase.from("cases").delete().eq("id", caseId);
    if (error) {
      toast.error("Error deleting case: " + error.message);
    } else {
      toast.success("Case deleted");
      fetchCases();
    }
  };

  const handleBack = () => {
    setSearchParams({});
    fetchCases();
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    setAddingUser(true);
    try {
      await apiRequest("/api/admin/preauthorized_users", {
        method: "POST",
        body: JSON.stringify({
          email: newEmail.trim().toLowerCase(),
          name: newName.trim() || null,
          role: newRole,
        }),
      });

      toast.success("User pre-authorized successfully!");
      setIsAddUserOpen(false);
      setNewEmail("");
      setNewName("");
      setNewRole("user");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to add user");
    } finally {
      setAddingUser(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (confirm("Are you sure you want to revoke this invitation?")) {
      try {
        await apiRequest(`/api/admin/preauthorized_users/${inviteId}`, { method: "DELETE" });
        toast.success("Invitation revoked");
        fetchUsers();
      } catch (err: any) {
        toast.error("Error revoking invite: " + err.message);
      }
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (confirm(`Are you sure you want to delete this user and revoke their future access?`)) {
      try {
        await apiRequest(`/api/admin/users/${userId}?email=${encodeURIComponent(email)}`, { method: "DELETE" });
        toast.success("User deleted and access revoked");
        fetchUsers();
      } catch (err: any) {
        toast.error("Error deleting user: " + err.message);
      }
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          height: "56px",
          borderBottom: "1px solid var(--bg-border)",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {(view === "create" || view === "edit") && (
            <button
              onClick={handleBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                background: "transparent",
                border: "none",
                fontSize: "12px",
                color: "var(--text-secondary)",
                cursor: "pointer",
                marginRight: "6px",
              }}
            >
              <ArrowLeft size={14} />
            </button>
          )}
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "#6B34D6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 800,
              color: "#fff",
            }}
          >
            C
          </div>
          <span
            style={{
              fontSize: "15px",
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
            }}
          >
            CaseJourney
          </span>
          <span
            className="mono"
            style={{
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              padding: "3px 8px",
              borderRadius: "5px",
              background: "var(--accent-amber-light)",
              color: "var(--accent-amber)",
            }}
          >
            ADMIN
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            {user?.name ?? user?.email ?? "Admin"}
          </span>
          <button
            onClick={() => signout()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "6px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--bg-border)",
              fontSize: "12px",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      {(view === "dashboard" || view === "users" || view === "waitlist") && (
        <main style={{ padding: "40px 48px", maxWidth: "1100px", margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px" }}
          >
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em", marginBottom: "4px" }}>
                Admin Dashboard
              </h1>
              <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
                <button
                  onClick={() => setSearchParams({ view: "dashboard" })}
                  style={{
                    background: "none", border: "none", padding: "0 0 6px 0", cursor: "pointer",
                    fontSize: "14px", fontWeight: view === "dashboard" ? 700 : 500,
                    color: view === "dashboard" ? "var(--text-primary)" : "var(--text-secondary)",
                    borderBottom: view === "dashboard" ? "2px solid #6B34D6" : "2px solid transparent",
                    transition: "all 0.15s ease"
                  }}
                >
                  Cases
                </button>
                <button
                  onClick={() => setSearchParams({ view: "users" })}
                  style={{
                    background: "none", border: "none", padding: "0 0 6px 0", cursor: "pointer",
                    fontSize: "14px", fontWeight: view === "users" ? 700 : 500,
                    color: view === "users" ? "var(--text-primary)" : "var(--text-secondary)",
                    borderBottom: view === "users" ? "2px solid #6B34D6" : "2px solid transparent",
                    transition: "all 0.15s ease"
                  }}
                >
                  Users & Usage
                </button>
                <button
                  onClick={() => setSearchParams({ view: "waitlist" })}
                  style={{
                    background: "none", border: "none", padding: "0 0 6px 0", cursor: "pointer",
                    fontSize: "14px", fontWeight: view === "waitlist" ? 700 : 500,
                    color: view === "waitlist" ? "var(--text-primary)" : "var(--text-secondary)",
                    borderBottom: view === "waitlist" ? "2px solid #6B34D6" : "2px solid transparent",
                    transition: "all 0.15s ease"
                  }}
                >
                  Waitlist ({waitlistList.length})
                </button>
              </div>
            </div>
            {view === "dashboard" && (
              <button
                onClick={handleCreateNew}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 20px",
                  background: "#6B34D6",
                  color: "#fff",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(107,52,214,0.2)",
                }}
              >
                <Plus size={15} />
                New Case
              </button>
            )}
            {view === "users" && (
              <button
                onClick={() => setIsAddUserOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 20px",
                  background: "#6B34D6",
                  color: "#fff",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(107,52,214,0.2)",
                }}
              >
                <Plus size={15} />
                Add User
              </button>
            )}
          </motion.div>

          {/* Case list */}
          {view === "dashboard" && (!loading && cases.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {cases.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--bg-border)",
                    borderRadius: "10px",
                    padding: "16px 20px",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: c.status === "published" ? "#0F9560" : "var(--accent-amber)",
                      }}
                    />
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                        {c.case_type} &middot; {c.industry} &middot; {c.company_style} &middot;{" "}
                        <span style={{ textTransform: "capitalize" }}>{c.status}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleEditCase(c.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--bg-border)",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCase(c.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        background: "var(--accent-red-light)",
                        border: "1px solid rgba(201,48,48,0.15)",
                        fontSize: "12px",
                        color: "var(--accent-red)",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : loading ? (
            <div style={{ textAlign: "center", padding: "48px", color: "var(--text-secondary)" }}>
              Loading cases...
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.14 }}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                borderRadius: "12px",
                padding: "48px",
                textAlign: "center",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "14px",
                  background: "var(--bg-elevated)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <BookOpen size={24} color="var(--text-tertiary)" />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
                No cases yet
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
                Create your first case interview to get started.
              </p>
              <button
                onClick={handleCreateNew}
                style={{
                  padding: "10px 20px",
                  background: "#6B34D6",
                  color: "#fff",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(107,52,214,0.2)",
                }}
              >
                Create Your First Case
              </button>
            </motion.div>
          ))}

          {view === "users" && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
            >
              {usersLoading ? (
                <div style={{ textAlign: "center", padding: "48px", color: "var(--text-secondary)" }}>
                  Loading users...
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                  
                  {/* Category 1: Active Users */}
                  <div>
                    <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "12px", letterSpacing: "-0.01em" }}>
                      Active Users ({usersList.length})
                    </h2>
                    {usersList.length === 0 ? (
                      <div style={{ padding: "20px", textAlign: "center", background: "var(--bg-surface)", border: "1px dashed var(--bg-border)", borderRadius: "10px", color: "var(--text-tertiary)", fontSize: "13px" }}>
                        No active users yet. Pre-authorized users will appear here once they log in.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {usersList.map((u) => {
                          const logs = usageLogs.filter(l => l.user_id === u.id);
                          const logins = logs.filter(l => l.action_type === "login").length;
                          const lastActive = logs.length > 0 ? new Date(logs[0].created_at).toLocaleString() : "Never";
                          const isSelf = u.email?.toLowerCase() === user?.email?.toLowerCase();
                          
                          return (
                            <div
                              key={u.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                background: "var(--bg-surface)",
                                border: "1px solid var(--bg-border)",
                                borderRadius: "10px",
                                padding: "14px 18px",
                                boxShadow: "var(--shadow-card)",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{
                                  width: "36px", height: "36px", borderRadius: "50%",
                                  background: u.role === "admin" ? "rgba(107, 52, 214, 0.08)" : "var(--bg-elevated)",
                                  border: "1px solid var(--bg-border)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontWeight: 700, color: u.role === "admin" ? "#6B34D6" : "var(--text-secondary)",
                                  fontSize: "14px"
                                }}>
                                  {(u.name || u.email || "?").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                    {u.name || "Unnamed User"}
                                    <span style={{
                                      fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px",
                                      background: u.role === "admin" ? "rgba(107, 52, 214, 0.1)" : "var(--bg-elevated)",
                                      color: u.role === "admin" ? "#6B34D6" : "var(--text-secondary)",
                                      textTransform: "capitalize"
                                    }}>
                                      {u.role}
                                    </span>
                                    {isSelf && (
                                      <span style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>(You)</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "1px" }}>
                                    {u.email}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                                    {logins} {logins === 1 ? "Login" : "Logins"}
                                  </div>
                                  <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "1px" }}>
                                    Active: {lastActive}
                                  </div>
                                </div>
                                {!isSelf && (
                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.email)}
                                    style={{
                                      background: "none", border: "none", cursor: "pointer",
                                      padding: "6px", borderRadius: "6px", color: "var(--text-tertiary)",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      transition: "all 0.15s ease"
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.background = "var(--accent-red-light)";
                                      e.currentTarget.style.color = "var(--accent-red)";
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.background = "none";
                                      e.currentTarget.style.color = "var(--text-tertiary)";
                                    }}
                                    title="Revoke access and delete user profile"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Category 2: Pending Invites */}
                  <div>
                    <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "12px", letterSpacing: "-0.01em" }}>
                      Pending Invites ({preauthorizedList.filter(p => !usersList.some(u => u.email?.toLowerCase() === p.email?.toLowerCase())).length})
                    </h2>
                    {preauthorizedList.filter(p => !usersList.some(u => u.email?.toLowerCase() === p.email?.toLowerCase())).length === 0 ? (
                      <div style={{ padding: "20px", textAlign: "center", background: "var(--bg-surface)", border: "1px dashed var(--bg-border)", borderRadius: "10px", color: "var(--text-tertiary)", fontSize: "13px" }}>
                        No pending invites. All pre-authorized users have logged in.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {preauthorizedList
                          .filter(p => !usersList.some(u => u.email?.toLowerCase() === p.email?.toLowerCase()))
                          .map((p) => (
                            <div
                              key={p.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                background: "var(--bg-surface)",
                                border: "1px solid var(--bg-border)",
                                borderRadius: "10px",
                                padding: "14px 18px",
                                boxShadow: "var(--shadow-card)",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{
                                  width: "36px", height: "36px", borderRadius: "50%",
                                  background: "var(--bg-elevated)", border: "1px solid var(--bg-border)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontWeight: 700, color: "var(--text-tertiary)", fontSize: "14px"
                                }}>
                                  {(p.name || p.email || "?").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                    {p.name || "Invite Sent"}
                                    <span style={{
                                      fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px",
                                      background: p.role === "admin" ? "rgba(107, 52, 214, 0.1)" : "var(--bg-elevated)",
                                      color: p.role === "admin" ? "#6B34D6" : "var(--text-secondary)",
                                      textTransform: "capitalize"
                                    }}>
                                      {p.role}
                                    </span>
                                    <span style={{
                                      fontSize: "9px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px",
                                      background: "var(--accent-amber-light)", color: "var(--accent-amber)",
                                      animation: "pulse 2s infinite"
                                    }}>
                                      Invited
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "1px" }}>
                                    {p.email}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                                <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
                                  Added {new Date(p.created_at).toLocaleDateString()}
                                </div>
                                <button
                                  onClick={() => handleRevokeInvite(p.id)}
                                  style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    padding: "6px", borderRadius: "6px", color: "var(--text-tertiary)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    transition: "all 0.15s ease"
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.background = "var(--accent-red-light)";
                                    e.currentTarget.style.color = "var(--accent-red)";
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.background = "none";
                                    e.currentTarget.style.color = "var(--text-tertiary)";
                                  }}
                                  title="Revoke invitation"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </motion.div>
          )}

          {view === "waitlist" && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
            >
              {waitlistLoading ? (
                <div style={{ textAlign: "center", padding: "48px", color: "var(--text-secondary)" }}>
                  Loading waitlist...
                </div>
              ) : (
                <div>
                  <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "12px", letterSpacing: "-0.01em" }}>
                    Wishlist / Waitlist Applications ({waitlistList.length})
                  </h2>
                  {waitlistList.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center", background: "var(--bg-surface)", border: "1px dashed var(--bg-border)", borderRadius: "10px", color: "var(--text-tertiary)", fontSize: "13px" }}>
                      No waitlist entries yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {waitlistList.map((w) => (
                        <div
                          key={w.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "var(--bg-surface)",
                            border: "1px solid var(--bg-border)",
                            borderRadius: "10px",
                            padding: "14px 18px",
                            boxShadow: "var(--shadow-card)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{
                              width: "36px", height: "36px", borderRadius: "50%",
                              background: w.status === "approved" ? "rgba(14, 143, 90, 0.08)" : w.status === "rejected" ? "rgba(226, 75, 74, 0.08)" : "var(--bg-elevated)",
                              border: "1px solid var(--bg-border)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontWeight: 700, color: w.status === "approved" ? "#0e8f5a" : w.status === "rejected" ? "#e24b4a" : "var(--text-secondary)",
                              fontSize: "14px"
                            }}>
                              {(w.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                {w.name}
                                <span style={{
                                  fontSize: "9px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px",
                                  background: w.status === "approved" ? "rgba(14, 143, 90, 0.12)" : w.status === "rejected" ? "rgba(226, 75, 74, 0.12)" : "rgba(0, 0, 0, 0.05)",
                                  color: w.status === "approved" ? "#0e8f5a" : w.status === "rejected" ? "#e24b4a" : "var(--text-secondary)",
                                  textTransform: "capitalize"
                                }}>
                                  {w.status}
                                </span>
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "1px" }}>
                                {w.email} &middot; Targeting: <strong>{w.target_firm?.toUpperCase()}</strong> &middot; Timeline: <strong>{w.timeline}</strong>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
                              Applied: {new Date(w.created_at).toLocaleDateString()}
                            </div>
                            {w.status === "pending" && (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  onClick={() => handleApproveWaitlist(w.id)}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    background: "#0e8f5a",
                                    color: "#fff",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    cursor: "pointer"
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectWaitlist(w.id)}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    background: "#e24b4a",
                                    color: "#fff",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    cursor: "pointer"
                                  }}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </main>
      )}

      {(view === "create" || view === "edit") && (
        <CaseCreator caseId={editingCaseId ?? undefined} onBack={handleBack} />
      )}

      {/* Add User Modal */}
      <AnimatePresence>
        {isAddUserOpen && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "20px"
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                borderRadius: "16px",
                width: "100%",
                maxWidth: "460px",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
                position: "relative",
                overflow: "hidden"
              }}
            >
              {/* Modal Accent line */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "4px",
                background: "linear-gradient(90deg, #6B34D6, #2055C7, #0F9560)"
              }} />

              {/* Close Button */}
              <button
                onClick={() => {
                  setIsAddUserOpen(false);
                  setNewEmail("");
                  setNewName("");
                  setNewRole("user");
                }}
                style={{
                  position: "absolute", top: 16, right: 16,
                  background: "var(--bg-elevated)", border: "1px solid var(--bg-border)",
                  borderRadius: "50%", width: "28px", height: "28px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "var(--text-secondary)",
                  transition: "all 0.15s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.transform = "rotate(90deg)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.transform = "rotate(0deg)";
                }}
              >
                <X size={14} />
              </button>

              <form onSubmit={handleAddUserSubmit} style={{ padding: "28px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: "6px" }}>
                  Pre-authorize User
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "24px", lineHeight: 1.4 }}>
                  Allowed email addresses will bypass the sign-up restriction and be allowed to log into CaseJourney.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "28px" }}>
                  
                  {/* Email Input */}
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>
                      Email Address *
                    </label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", display: "flex", alignItems: "center" }}>
                        <Mail size={15} />
                      </span>
                      <input
                        type="email"
                        required
                        placeholder="candidate@company.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        style={{
                          width: "100%", padding: "10px 12px 10px 36px",
                          borderRadius: "8px", border: "1px solid var(--bg-border)",
                          background: "var(--bg-base)", fontSize: "13px",
                          color: "var(--text-primary)", outline: "none",
                          transition: "border-color 0.15s ease"
                        }}
                        onFocus={(e) => e.target.style.borderColor = "#6B34D6"}
                        onBlur={(e) => e.target.style.borderColor = "var(--bg-border)"}
                      />
                    </div>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>
                      Full Name (Optional)
                    </label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", display: "flex", alignItems: "center" }}>
                        <UserIcon size={15} />
                      </span>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        style={{
                          width: "100%", padding: "10px 12px 10px 36px",
                          borderRadius: "8px", border: "1px solid var(--bg-border)",
                          background: "var(--bg-base)", fontSize: "13px",
                          color: "var(--text-primary)", outline: "none",
                          transition: "border-color 0.15s ease"
                        }}
                        onFocus={(e) => e.target.style.borderColor = "#6B34D6"}
                        onBlur={(e) => e.target.style.borderColor = "var(--bg-border)"}
                      />
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>
                      Application Role
                    </label>
                    <div style={{ display: "flex", gap: "8px", background: "var(--bg-elevated)", padding: "4px", borderRadius: "8px" }}>
                      <button
                        type="button"
                        onClick={() => setNewRole("user")}
                        style={{
                          flex: 1, padding: "8px", border: "none",
                          background: newRole === "user" ? "var(--bg-surface)" : "transparent",
                          borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                          color: newRole === "user" ? "var(--text-primary)" : "var(--text-tertiary)",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                          boxShadow: newRole === "user" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                          transition: "all 150ms ease"
                        }}
                      >
                        <UserIcon size={13} />
                        Candidate (User)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRole("admin")}
                        style={{
                          flex: 1, padding: "8px", border: "none",
                          background: newRole === "admin" ? "var(--bg-surface)" : "transparent",
                          borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                          color: newRole === "admin" ? "var(--text-primary)" : "var(--text-tertiary)",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                          boxShadow: newRole === "admin" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                          transition: "all 150ms ease"
                        }}
                      >
                        <Shield size={13} />
                        Administrator
                      </button>
                    </div>
                  </div>

                </div>

                {/* Submit Action buttons */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddUserOpen(false);
                      setNewEmail("");
                      setNewName("");
                      setNewRole("user");
                    }}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "8px",
                      background: "var(--bg-elevated)", border: "1px solid var(--bg-border)",
                      fontSize: "13px", fontWeight: 600, color: "var(--text-primary)",
                      cursor: "pointer", transition: "all 0.15s ease"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingUser}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "8px",
                      background: "#6B34D6", border: "none",
                      fontSize: "13px", fontWeight: 600, color: "#fff",
                      cursor: "pointer", boxShadow: "0 4px 12px rgba(107,52,214,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {addingUser ? "Saving..." : "Authorize"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {(view === "create" || view === "edit") && (
        <CaseCreator caseId={editingCaseId ?? undefined} onBack={handleBack} />
      )}
    </div>
  );
}
