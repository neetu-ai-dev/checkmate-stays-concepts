import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import "./styles/tailwind.css";
import "./shared/base.css";
import { Hub } from "./pages/Hub";
import { Credits } from "./pages/Credits";

const Checkmate = lazy(() => import("./concepts/checkmate/CheckmateConcept"));
const LivingGreen = lazy(() => import("./concepts/living-green/LivingGreenConcept"));
const Ridgelight = lazy(() => import("./concepts/ridgelight/RidgelightConcept"));
const Approach = lazy(() => import("./concepts/approach/ApproachConcept"));

function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollReset />
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0b0a0c" }} />}>
        <Routes>
          <Route path="/" element={<Hub />} />
          <Route path="/concepts/checkmate" element={<Checkmate />} />
          <Route path="/concepts/highlands" element={<LivingGreen />} />
          <Route path="/concepts/living-green" element={<Navigate to="/concepts/highlands" replace />} />
          {/* Night Watch was retired; its old preview link returns to the overview */}
          <Route path="/concepts/night-watch" element={<Navigate to="/" replace />} />
          <Route path="/concepts/ridgelight" element={<Ridgelight />} />
          <Route path="/concepts/approach" element={<Approach />} />
          {/* Winterline was restarted as Ridgelight; keep the old preview link working */}
          <Route path="/concepts/winterline" element={<Navigate to="/concepts/ridgelight" replace />} />
          <Route path="/credits" element={<Credits />} />
          <Route path="*" element={<Hub />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
