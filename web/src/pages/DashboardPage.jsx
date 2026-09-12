import { useMemo } from "react";
import { Link } from "react-router-dom";
import MetricRing from "../components/MetricRing";
import { PageShell, Panel } from "../components/page/PageLayout";
import { BOARD_NAV_PERMISSIONS, INVOICE_NAV_PERMISSIONS, PROJECT_NAV_PERMISSIONS, RBAC_NAV_PERMISSIONS, TASK_NAV_PERMISSIONS, TIME_NAV_PERMISSIONS } from "../constants/rbacPermissions";
import { useWorkspaceOverview } from "../hooks/useWorkspaceOverview";
import { useAuth } from "../hooks/useAuth";

function formatShortDate(iso) {
  if (!iso) return "—";
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
}

/** Dashboard KPI — matches Hours page duration display. */
function formatDurationMinutes(totalMinutes) {
  const m = Math.max(0, Number(totalMinutes) || 0);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r}m`;
  return `${h}h ${r}m`;
}

export default function DashboardPage() {
  const { isAuthenticated, hasPermission, hasAnyPermission } = useAuth();

  const canReadProjects = hasPermission("project.read");
  const canReadTasks = hasPermission("task.read");
  const canReadBoards = hasPermission("board.read");
  const canReadInvoices = hasPermission("invoice.read");
  const canRbacUsers = hasPermission("rbac.user.read");
  const canRbacRoles = hasPermission("rbac.role.read");

  const showProjectsLink = hasAnyPermission(PROJECT_NAV_PERMISSIONS);
  const showTasksLink = hasAnyPermission(TASK_NAV_PERMISSIONS);
  const showBoardsLink = hasAnyPermission(BOARD_NAV_PERMISSIONS);
  const showInvoicesLink = hasAnyPermission(INVOICE_NAV_PERMISSIONS);
  const showRbacLink = hasAnyPermission(RBAC_NAV_PERMISSIONS);
  const showHoursLink = hasAnyPermission(TIME_NAV_PERMISSIONS);

  const {
    loading,
    error,
    refresh,
    activeProjects,
    archivedProjects,
    totalProjects,
    totalTasks,
    openTasks,
    doneTasks,
    columnChart,
    maxCol,
    recent,
    projectProgress,
    totalBoards,
    draftInvoices,
    sentInvoices,
    paidInvoices,
    overdueInvoices,
    timeThisMonth,
  } = useWorkspaceOverview({
    isAuthenticated,
    canReadProjects,
    canReadTasks,
    canReadBoards,
    canReadInvoices,
    canRbacUsers,
    canRbacRoles,
    canAccessTime: showHoursLink,
  });

  const kpiTiles = useMemo(() => {
    const tiles = [];

    if (canReadProjects) {
      tiles.push({
        key: "projects",
        value: String(activeProjects),
        label: "Active projects",
        sub: `${totalProjects} total · ${archivedProjects} archived`,
        change: archivedProjects > 0 ? `${archivedProjects} archived` : null,
        changeUp: archivedProjects === 0,
        icon: (
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
        ),
      });
    }

    if (canReadTasks && canReadProjects) {
      tiles.push({
        key: "tasks",
        value: String(totalTasks),
        label: "Cards in workspace",
        sub: `${openTasks} open · ${doneTasks} complete`,
        change: `${openTasks} open`,
        changeUp: openTasks === 0,
        icon: (
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        ),
      });
    }

    if (canReadTasks && canReadProjects) {
      const donePct =
        totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
      tiles.push({
        key: "done",
        value: `${donePct}%`,
        label: "Completion rate",
        sub: doneTasks > 0 ? `${doneTasks} cards in Complete` : "No cards yet",
        change: `${doneTasks} done`,
        changeUp: donePct >= 50,
        icon: (
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14 9 11" />
          </svg>
        ),
      });
    }

    if (canReadBoards) {
      tiles.push({
        key: "boards",
        value: String(totalBoards),
        label: "Shared boards",
        sub: totalBoards > 0 ? "Excalidraw boards available" : "No boards yet",
        change: totalBoards > 0 ? "Active" : null,
        changeUp: totalBoards > 0,
        icon: (
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      });
    }

    if (timeThisMonth.applicable) {
      const mins = timeThisMonth.minutes ?? 0;
      const ok = !timeThisMonth.error;
      tiles.push({
        key: "hours",
        value: ok ? formatDurationMinutes(mins) : "—",
        label: "Logged this month",
        sub: ok ? "Month to date · workspace total" : "Could not load time summary.",
        change: ok && mins > 0 ? "MTD" : null,
        changeUp: ok && mins > 0,
        icon: (
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ),
      });
    }

    return tiles;
  }, [
    canReadProjects,
    canReadTasks,
    activeProjects,
    archivedProjects,
    totalProjects,
    totalTasks,
    openTasks,
    doneTasks,
    canReadBoards,
    totalBoards,
    timeThisMonth,
  ]);

  if (!isAuthenticated) return null;

  return (
    <PageShell>
      {!canReadProjects ? (
        <Panel>
          <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
            Workspace overview
          </h2>
          <p className="mt-2 text-body" style={{ color: "var(--color-txt-secondary)" }}>
            You don&apos;t have permission to load project data yet. Explore other areas you have access to from the sidebar.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {showTasksLink ? (
              <Link to="/tasks" className="btn-primary !py-2 !px-4 !text-body">
                Open Tasks
              </Link>
            ) : null}
            {showBoardsLink ? (
              <Link to="/boards" className="btn-secondary !py-2 !px-4 !text-body">
                Open Boards
              </Link>
            ) : null}
            {showInvoicesLink ? (
              <Link to="/invoices" className="btn-secondary !py-2 !px-4 !text-body">
                Open Invoices
              </Link>
            ) : null}
            {showHoursLink ? (
              <Link to="/hours" className="btn-secondary !py-2 !px-4 !text-body">
                Hours
              </Link>
            ) : null}
            {showRbacLink ? (
              <Link to="/rbac" className="btn-secondary !py-2 !px-4 !text-body">
                Access control
              </Link>
            ) : null}
          </div>
        </Panel>
      ) : loading ? (
        <Panel className="animate-pulse">
          <div className="h-6 w-48 rounded-lg" style={{ backgroundColor: "var(--color-border)" }} />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 rounded-2xl" style={{ backgroundColor: "var(--color-surface-muted)" }} />
            ))}
          </div>
        </Panel>
      ) : (
        <>
          {error ? (
            <Panel>
              <p className="text-body" style={{ color: "var(--color-txt-secondary)" }}>
                {error}
              </p>
              <button type="button" className="btn-secondary mt-4 px-4 py-2 text-caption" onClick={() => void refresh()}>
                Try again
              </button>
            </Panel>
          ) : null}

          {!error ? (
          <>
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {kpiTiles.map((k) => (
                <div key={k.key} className="card !p-5">
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{ backgroundColor: "var(--color-surface-muted)", color: "var(--color-txt-secondary)" }}
                    >
                      {k.icon}
                    </div>
                    {k.change ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-caption font-semibold ${
                          k.changeUp ? "bg-green-100 text-green-700 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900/35 dark:text-amber-100"
                        }`}
                      >
                        {k.change}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-title-lg font-semibold" style={{ color: "var(--color-txt-primary)" }}>
                    {k.value}
                  </p>
                  <p className="mt-0.5 text-caption" style={{ color: "var(--color-txt-secondary)" }}>
                    {k.label}
                  </p>
                  <p className="mt-0.5 text-caption" style={{ color: "var(--color-txt-muted)" }}>
                    {k.sub}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
              <div className="flex flex-col gap-6 lg:col-span-2">
                {canReadTasks ? (
                  <div className="card">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h2 className="text-title-md" style={{ color: "var(--color-txt-primary)" }}>
                          Tasks by column
                        </h2>
                        <p className="mt-0.5 text-caption" style={{ color: "var(--color-txt-secondary)" }}>
                          Same columns as the Kanban board
                        </p>
                      </div>
                    </div>
                    <div className="flex h-32 items-end gap-2">
                      {columnChart.map((col) => (
                        <div key={col.id} className="flex flex-1 flex-col items-center gap-1.5">
                          <div className="flex h-20 w-full items-end">
                            <div
                              className="w-full rounded-t-lg transition-all duration-500 hover:opacity-75"
                              style={{
                                height: `${Math.max(col.count / maxCol, 0.02) * 100}%`,
                                minHeight: col.count > 0 ? "6px" : "2px",
                                backgroundColor:
                                  col.count > 0 ? "var(--color-accent-purple)" : "var(--color-border)",
                              }}
                            />
                          </div>
                          <span className="text-center text-caption" style={{ color: "var(--color-txt-muted)" }}>
                            {col.label}
                          </span>
                          <span className="tabular-nums text-caption font-semibold" style={{ color: "var(--color-txt-secondary)" }}>
                            {col.count}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-5 border-t pt-4 text-caption" style={{ borderColor: "var(--color-border)", color: "var(--color-txt-secondary)" }}>
                      Total cards:{" "}
                      <span style={{ color: "var(--color-accent-purple)" }}>{totalTasks}</span>
                      {totalTasks === 0 && showProjectsLink ? " — create a card from Tasks." : null}
                    </p>
                  </div>
                ) : (
                  <Panel>
                    <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
                      Tasks
                    </h2>
                    <p className="mt-1 text-body" style={{ color: "var(--color-txt-secondary)" }}>
                      Task metrics aren&apos;t available without <code className="text-caption">task.read</code>.
                    </p>
                    {showTasksLink ? (
                      <Link className="mt-4 inline-block text-body-strong underline" style={{ color: "var(--color-accent-purple)" }} to="/tasks">
                        Open Tasks
                      </Link>
                    ) : null}
                  </Panel>
                )}

                <div className="card">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-title-md" style={{ color: "var(--color-txt-primary)" }}>
                      Projects
                    </h2>
                    {showProjectsLink ? (
                      <Link to="/projects" className="btn-secondary !px-3 !py-1.5 !text-caption">
                        View all
                      </Link>
                    ) : null}
                  </div>
                  {projectProgress.length === 0 ? (
                    <p className="py-6 text-center text-body" style={{ color: "var(--color-txt-secondary)" }}>
                      No projects yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {projectProgress.slice(0, 8).map(({ project: p, total, progressPct }) => (
                        <div
                          key={p.uuid}
                          className="flex items-center gap-4 rounded-2xl p-4"
                          style={{ backgroundColor: "var(--color-surface-muted)" }}
                        >
                          <MetricRing value={progressPct} size={52} strokeWidth={4} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-body-strong" style={{ color: "var(--color-txt-primary)" }}>
                              {p.name}
                            </p>
                            <p className="mt-0.5 text-caption" style={{ color: "var(--color-txt-secondary)" }}>
                              {total} cards ·{" "}
                              <span className="capitalize" style={{ color: "var(--color-txt-muted)" }}>
                                {p.status ?? "active"}
                              </span>
                            </p>
                          </div>
                          {showTasksLink ? (
                            <Link className="shrink-0 text-caption font-semibold underline" style={{ color: "var(--color-accent-purple)" }} to="/tasks">
                              Kanban
                            </Link>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-title-md" style={{ color: "var(--color-txt-primary)" }}>
                      Recent activity
                    </h2>
                    {showTasksLink ? (
                      <Link to="/tasks" className="btn-secondary !px-3 !py-1.5 !text-caption">
                        Open Tasks
                      </Link>
                    ) : null}
                  </div>
                  {!canReadTasks || recent.length === 0 ? (
                    <p className="py-8 text-center text-body" style={{ color: "var(--color-txt-secondary)" }}>
                      {canReadTasks ? "No cards yet across your projects." : "Enable task.read to see recent cards."}
                    </p>
                  ) : (
                    <div className="flex flex-col">
                      {recent.map(({ task: t, projectName, projectUuid }, i) => (
                        <div
                          key={`${projectUuid}-${t.uuid}`}
                          className="flex items-start gap-3 py-3"
                          style={{
                            borderTop: i > 0 ? `1px solid var(--color-border)` : undefined,
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-body-strong" style={{ color: "var(--color-txt-primary)" }}>
                              {t.title}
                            </p>
                            <p className="mt-0.5 text-caption" style={{ color: "var(--color-txt-muted)" }}>
                              {projectName}
                            </p>
                          </div>
                          <span className="shrink-0 text-caption capitalize" style={{ color: "var(--color-txt-secondary)" }}>
                            {(t.board_column ?? "").replace(/_/g, " ")}
                          </span>
                          <span className="hidden shrink-0 text-right text-caption sm:block" style={{ color: "var(--color-txt-muted)" }}>
                            {formatShortDate(t.updated_at || t.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
                <Panel>
                  <h2 className="text-title-md font-semibold" style={{ color: "var(--color-txt-primary)" }}>
                    Shortcuts
                  </h2>
                  <nav className="mt-4 flex flex-col gap-2">
                    {showProjectsLink ? (
                      <Link
                        className="rounded-control border px-4 py-2.5 text-body font-medium transition-colors hover:bg-[var(--color-surface-muted)]"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-txt-primary)" }}
                        to="/projects"
                      >
                        Projects
                      </Link>
                    ) : null}
                    {showTasksLink ? (
                      <Link
                        className="rounded-control border px-4 py-2.5 text-body font-medium transition-colors hover:bg-[var(--color-surface-muted)]"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-txt-primary)" }}
                        to="/tasks"
                      >
                        Tasks
                      </Link>
                    ) : null}
                    {showHoursLink ? (
                      <Link
                        className="rounded-control border px-4 py-2.5 text-body font-medium transition-colors hover:bg-[var(--color-surface-muted)]"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-txt-primary)" }}
                        to="/hours"
                      >
                        Hours
                      </Link>
                    ) : null}
                    {showRbacLink ? (
                      <Link
                        className="rounded-control border px-4 py-2.5 text-body font-medium transition-colors hover:bg-[var(--color-surface-muted)]"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-txt-primary)" }}
                        to="/rbac"
                      >
                        Roles & permissions
                      </Link>
                    ) : null}
                    {showBoardsLink ? (
                      <Link
                        className="rounded-control border px-4 py-2.5 text-body font-medium transition-colors hover:bg-[var(--color-surface-muted)]"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-txt-primary)" }}
                        to="/boards"
                      >
                        Boards
                      </Link>
                    ) : null}
                    {showInvoicesLink ? (
                      <Link
                        className="rounded-control border px-4 py-2.5 text-body font-medium transition-colors hover:bg-[var(--color-surface-muted)]"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-txt-primary)" }}
                        to="/invoices"
                      >
                        Invoices
                      </Link>
                    ) : null}
                    {!showProjectsLink && !showTasksLink && !showHoursLink && !showRbacLink && !showBoardsLink && !showInvoicesLink ? (
                      <p className="text-caption" style={{ color: "var(--color-txt-muted)" }}>
                        No workspace sections available for your account yet.
                      </p>
                    ) : null}
                  </nav>
                  <div
                    className="mt-5 rounded-xl border px-4 py-3 text-caption leading-relaxed"
                    style={{
                      borderColor: "var(--color-border)",
                      backgroundColor: "var(--color-surface-muted)",
                      color: "var(--color-txt-secondary)",
                    }}
                  >
                    <strong className="text-body-strong" style={{ color: "var(--color-txt-primary)" }}>
                      Workspace status
                    </strong>
                    <p className="mt-1">
                      {canReadInvoices
                        ? `${draftInvoices} draft invoices, ${sentInvoices} sent, ${paidInvoices} paid${overdueInvoices > 0 ? ` (${overdueInvoices} overdue)` : ""}.`
                        : "Enable invoice.read to unlock billing indicators."}
                    </p>
                    <p className="mt-1">
                      {canReadBoards
                        ? `${totalBoards} shared boards available for collaboration.`
                        : "Enable board.read to monitor collaborative boards."}
                    </p>
                    <p className="mt-1">
                      {showHoursLink && timeThisMonth.applicable && !timeThisMonth.error ? (
                        <>
                          <strong className="text-body-strong" style={{ color: "var(--color-txt-primary)" }}>
                            {formatDurationMinutes(timeThisMonth.minutes ?? 0)}
                          </strong>
                          {" "}
                          logged this month (month to date). Open Hours for filters and entries.
                        </>
                      ) : showHoursLink && timeThisMonth.error ? (
                        <>Time summary could not be loaded.</>
                      ) : showHoursLink ? (
                        <>Open Hours to track time on assigned tasks.</>
                      ) : (
                        <>Enable time permissions to see logged hours on the dashboard.</>
                      )}
                    </p>
                  </div>
                </Panel>
              </aside>
            </div>
          </div>
          </>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
