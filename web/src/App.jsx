import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import ThemeProvider from "./context/ThemeProvider";
import AuthProvider from "./context/AuthProvider";
import { useAuth } from "./hooks/useAuth";
import DemoBanner from "./components/DemoBanner";
import NotificationProvider from "./context/NotificationProvider";
import MenuProvider from "./context/MenuProvider";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import GuestRoute from "./components/auth/GuestRoute";
import ProjectRoute from "./components/auth/ProjectRoute";
import RbacRoute from "./components/auth/RbacRoute";
import TaskRoute from "./components/auth/TaskRoute";
import BoardRoute from "./components/auth/BoardRoute";
import InvoiceRoute from "./components/auth/InvoiceRoute";
import HoursRoute from "./components/auth/HoursRoute";
import NotificationRoute from "./components/auth/NotificationRoute";
import CompanySettingsRoute from "./components/auth/CompanySettingsRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { PageShell } from "./components/page/PageLayout";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ProjectsPage from "./pages/ProjectsPage";
import RbacPage from "./pages/RbacPage";
import SettingsUsersPage from "./pages/SettingsUsersPage";
import SettingsCompanyPage from "./pages/SettingsCompanyPage";
import SettingsMenuPage from "./pages/SettingsMenuPage";
import TasksPage from "./pages/TasksPage";
import BoardsPage from "./pages/BoardsPage";
import BoardEditorPage from "./pages/BoardEditorPage";
import InvoicesPage from "./pages/InvoicesPage";
import HoursPage from "./pages/HoursPage";
import NotificationsPage from "./pages/NotificationsPage";

function PlaceholderPage() {
  const location = useLocation();
  const name = location.pathname.replace("/", "").replace(/^\w/, (c) => c.toUpperCase());
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
          style={{ backgroundColor: "var(--color-surface-muted)" }}
        >
          🚧
        </div>
        <h2 className="text-title-lg" style={{ color: "var(--color-txt-primary)" }}>
          {name}
        </h2>
        <p className="max-w-xs text-center text-body" style={{ color: "var(--color-txt-secondary)" }}>
          This section is under construction. Check back soon.
        </p>
      </div>
    </PageShell>
  );
}

function AppShellLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas-lime transition-colors duration-200">
      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <DemoBanner />
        <main className="scrollbar-themed flex-1 overflow-y-auto px-0 py-8 md:px-0 lg:px-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { dataVersion } = useAuth();
  return (
          <ErrorBoundary>
          <Routes key={dataVersion}>
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />

            <Route
              element={
                <ProtectedRoute>
                  <NotificationProvider>
                    <MenuProvider>
                      <AppShellLayout />
                    </MenuProvider>
                  </NotificationProvider>
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route
                path="/projects"
                element={
                  <ProjectRoute>
                    <ProjectsPage />
                  </ProjectRoute>
                }
              />
              <Route
                path="/settings/users"
                element={
                  <RbacRoute>
                    <SettingsUsersPage />
                  </RbacRoute>
                }
              />
              <Route
                path="/settings/company"
                element={
                  <CompanySettingsRoute>
                    <SettingsCompanyPage />
                  </CompanySettingsRoute>
                }
              />
              <Route
                path="/settings/menu"
                element={
                  <CompanySettingsRoute>
                    <SettingsMenuPage />
                  </CompanySettingsRoute>
                }
              />
              <Route
                path="/rbac"
                element={
                  <RbacRoute>
                    <RbacPage />
                  </RbacRoute>
                }
              />
              <Route
                path="/hours"
                element={
                  <HoursRoute>
                    <HoursPage />
                  </HoursRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <InvoiceRoute>
                    <InvoicesPage />
                  </InvoiceRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <TaskRoute>
                    <TasksPage />
                  </TaskRoute>
                }
              />
              <Route
                path="/boards"
                element={
                  <BoardRoute>
                    <BoardsPage />
                  </BoardRoute>
                }
              />
              <Route
                path="/boards/:boardUuid"
                element={
                  <BoardRoute>
                    <BoardEditorPage />
                  </BoardRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <NotificationRoute>
                    <NotificationsPage />
                  </NotificationRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
