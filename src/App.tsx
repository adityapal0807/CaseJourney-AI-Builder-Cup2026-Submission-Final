import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Component, type ReactNode } from "react";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import AppShell from "./pages/AppShell.tsx";
import NotFound from "./pages/NotFound.tsx";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "monospace", color: "red", background: "#fff", minHeight: "100vh" }}>
          <h2>Runtime Error</h2>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 16 }}>{String(this.state.error)}</pre>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 8, color: "#666" }}>{(this.state.error as any).stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <DefaultProviders>
        <BrowserRouter>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/*" element={<AppShell />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DefaultProviders>
    </ErrorBoundary>
  );
}
