import { lazy, Suspense } from "react";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";

const AdminDashboard = lazy(() => import("./admin/page.tsx"));
const CandidateApp = lazy(() => import("./CandidateApp.tsx"));

export default function AuthenticatedApp() {
  const { user, isLoading } = useCurrentUser();

  if (isLoading || !user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-base)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#6B34D6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              fontWeight: 800,
              color: "#fff",
            }}
          >
            C
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (user.role === "admin") {
    return (
      <Suspense fallback={null}>
        <AdminDashboard />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <CandidateApp />
    </Suspense>
  );
}
