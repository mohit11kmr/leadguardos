import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main className="shell">
      <p className="eyebrow">Infrastructure</p>
      <h1>LeadGuard OS V6 Web Shell</h1>
      <p>This is temporary infrastructure. The existing V5 frontend remains the live application.</p>
      <code>API: {import.meta.env.VITE_API_URL || "http://localhost:3000"}</code>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
