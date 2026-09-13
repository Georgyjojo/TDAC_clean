import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { PortfolioPage } from "./pages/Home";
import { LoginPage } from "./pages/Login";
import { ProjectWorkspacePage } from "./pages/ProjectWorkspace";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { HOME, LOGIN, PROJECT } from "./routes";
import {CreateProjectPage} from "./pages/CreateProject";
// @ts-expect-error CSS imports are handled by the bundler at runtime.
import "./shell.css";

export default function App() {
  return (
    <HashRouter>
      <Routes>

        {/* Public route */}
        <Route path={LOGIN} element={<LoginPage />} />

        {/* Protected application routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<PortfolioPage />} />
            <Route path="/projects/new" element={<CreateProjectPage />} />
            <Route path={PROJECT} element={<ProjectWorkspacePage />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to={HOME} replace />} />

      </Routes>
    </HashRouter>
  );
}