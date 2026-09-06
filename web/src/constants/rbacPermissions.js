/** Mirrors workflow-api permission codes for RBAC UI and API calls. */

export const RBAC_NAV_PERMISSIONS = [
  "rbac.permission.read",
  "rbac.role.read",
  "rbac.user.read",
  "rbac.user.create",
  "rbac.user.update",
  "rbac.user.delete",
  "rbac.role.create",
  "rbac.role.assign_permission",
  "rbac.user.assign_role",
];

/** Any of these grants access to the Projects area in the sidebar. */
export const PROJECT_NAV_PERMISSIONS = [
  "project.read",
  "project.create",
  "project.update",
  "project.delete",
];

/** Kanban Tasks — precisa de pelo menos uma permissão de tarefa. */
export const TASK_NAV_PERMISSIONS = ["task.read", "task.create", "task.update", "task.delete"];

/** Boards (Excalidraw) — acesso ao módulo por permissões de board. */
export const BOARD_NAV_PERMISSIONS = ["board.read", "board.create", "board.delete"];

/** Invoices — acesso ao módulo por permissões de invoice. */
export const INVOICE_NAV_PERMISSIONS = ["invoice.read", "invoice.create", "invoice.update", "invoice.send"];

/** Time tracking — ver ou registar horas (equipa vê relatórios com time.read). */
export const TIME_NAV_PERMISSIONS = ["time.read", "time.create", "time.update_own", "time.delete_own"];

/** Notifications — acesso ao módulo de notificações. */
export const NOTIFICATION_NAV_PERMISSIONS = [
  "notification.view",
  "notification.mark_read",
  "notification.manage_preferences",
];

/** Company settings — configurações da empresa. */
export const SETTINGS_NAV_PERMISSIONS = [
  "workspace.settings.read",
  "workspace.settings.update",
];
