<?php

// Build complete, deterministic Excalidraw scenes using symbolic element IDs.
$scene = static function (string $key, array $cards): array {
    $elements = [];
    foreach ($cards as $index => $card) {
        $base = [
            'id' => $key.'.card.'.$index, 'x' => 80 + $index * 360, 'y' => 100, 'width' => 320, 'height' => 160,
            'angle' => 0, 'strokeColor' => '#1e293b', 'backgroundColor' => $card['color'], 'fillStyle' => 'solid',
            'strokeWidth' => 2, 'strokeStyle' => 'solid', 'roughness' => 1, 'opacity' => 100,
            'groupIds' => [], 'frameId' => null, 'roundness' => ['type' => 3], 'seed' => 100 + $index,
            'version' => 1, 'versionNonce' => 200 + $index, 'isDeleted' => false, 'boundElements' => [],
            'updated' => 0, 'link' => null, 'locked' => false,
        ];
        $elements[] = $base + ['type' => 'rectangle'];
        $text = str_replace('\\n', "\n", $card['text']);
        $elements[] = array_replace($base, [
            'id' => $key.'.text.'.$index, 'type' => 'text', 'x' => $base['x'] + 18, 'y' => 138,
            'width' => 285, 'height' => 75, 'backgroundColor' => 'transparent', 'roundness' => null,
            'text' => $text, 'originalText' => $text, 'fontSize' => 18, 'fontFamily' => 1,
            'textAlign' => 'left', 'verticalAlign' => 'top', 'containerId' => null, 'autoResize' => true, 'lineHeight' => 1.25,
        ]);
    }

    return ['type' => 'excalidraw', 'version' => 2, 'source' => 'agency-hub-demo', 'elements' => $elements, 'appState' => ['viewBackgroundColor' => '#ffffff', 'gridSize' => null], 'files' => []];
};

// Fictional, deterministic source data. References are symbolic keys, never DB IDs.
return [
    'tenant' => ['name' => 'Northstar Creative', 'email' => 'hello@northstar.example', 'status' => 'active'],
    'users' => [
        'alex' => ['name' => 'Alex Morgan', 'email' => 'alex@northstar.example', 'role' => 'owner'],
        'maya' => ['name' => 'Maya Chen', 'email' => 'maya@northstar.example', 'role' => 'member'],
        'leo' => ['name' => 'Leo Martins', 'email' => 'leo@northstar.example', 'role' => 'member'],
    ],
    'permissions' => [
        'rbac.permission.read' => 'List permissions', 'rbac.role.read' => 'List roles',
        'rbac.user.read' => 'List users', 'rbac.user.create' => 'Create users',
        'rbac.user.update' => 'Update users', 'rbac.user.delete' => 'Delete users',
        'rbac.role.create' => 'Create roles', 'rbac.role.assign_permission' => 'Assign permissions',
        'rbac.user.assign_role' => 'Assign roles',
        'project.read' => 'Read projects', 'project.create' => 'Create projects',
        'project.update' => 'Update projects', 'project.delete' => 'Delete projects',
        'task.read' => 'Read tasks', 'task.create' => 'Create tasks',
        'task.update' => 'Update tasks', 'task.delete' => 'Delete tasks',
        'board.read' => 'Read boards', 'board.create' => 'Create boards', 'board.delete' => 'Delete boards',
        'invoice.read' => 'Read invoices', 'invoice.create' => 'Create invoices',
        'invoice.update' => 'Update invoices', 'invoice.send' => 'Send invoices',
        'time.read' => 'Read time entries', 'time.create' => 'Create time entries',
        'time.update_own' => 'Update own time entries', 'time.delete_own' => 'Delete own time entries',
        'notification.view' => 'View notifications', 'notification.mark_read' => 'Mark notifications read',
        'notification.manage_preferences' => 'Manage notification preferences',
        'workspace.settings.read' => 'Read company settings', 'workspace.settings.update' => 'Update company settings',
    ],
    'roles' => [
        'owner' => ['description' => 'Workspace owner with full access', 'permissions' => '*'],
        'member' => ['description' => 'Creative team member', 'permissions' => [
            'project.read', 'project.create', 'task.read', 'task.create', 'task.update',
            'board.read', 'board.create', 'invoice.read', 'invoice.create',
            'time.read', 'time.create', 'time.update_own', 'time.delete_own',
            'notification.view', 'notification.mark_read', 'notification.manage_preferences', 'workspace.settings.read',
        ]],
    ],
    'projects' => [
        'aurora' => ['name' => 'Aurora Rebrand', 'description' => 'A warm new identity and packaging system for fictional Aurora Goods.', 'status' => 'active'],
        'nimbus' => ['name' => 'Nimbus Launch', 'description' => 'Positioning, launch site, and campaign creative for fictional Nimbus Studio.', 'status' => 'active'],
        'internal' => ['name' => 'Internal Operations', 'description' => 'Improve how Northstar plans projects, shares knowledge, and welcomes teammates.', 'status' => 'active'],
    ],
    'tasks' => [
        'aurora_packaging' => ['project' => 'aurora', 'title' => 'Explore sustainable packaging layouts', 'description' => 'Sketch three paper sleeve formats using the new Aurora palette.', 'status' => 'todo', 'due_days' => 5, 'assignees' => ['maya']],
        'nimbus_campaign' => ['project' => 'nimbus', 'title' => 'Plan the Nimbus launch campaign', 'description' => 'Outline teaser, announcement, and follow-up creative for the studio launch.', 'status' => 'todo', 'due_days' => 7, 'assignees' => ['alex', 'leo']],
        'aurora_identity' => ['project' => 'aurora', 'title' => 'Refine Aurora identity concepts', 'description' => 'Develop the sunrise wordmark and prepare a concise concept presentation for Aurora Goods.', 'status' => 'development', 'due_days' => 2, 'assignees' => ['maya', 'alex']],
        'nimbus_site' => ['project' => 'nimbus', 'title' => 'Build Nimbus launch page', 'description' => 'Turn the approved wireframe into a responsive page with a clear studio introduction.', 'status' => 'development', 'due_days' => 3, 'assignees' => ['leo']],
        'aurora_feedback' => ['project' => 'aurora', 'title' => 'Collect feedback on the Aurora palette', 'description' => 'Await the fictional client team’s choice between sunrise coral and golden apricot.', 'status' => 'pending', 'due_days' => -1, 'assignees' => ['alex']],
        'nimbus_copy' => ['project' => 'nimbus', 'title' => 'Approve Nimbus homepage copy', 'description' => 'Await final review of the headline and three service descriptions.', 'status' => 'pending', 'due_days' => 1, 'assignees' => ['leo', 'alex']],
        'aurora_discovery' => ['project' => 'aurora', 'title' => 'Complete Aurora discovery workshop', 'description' => 'Documented the audience, tone of voice, and direction for the fictional brand.', 'status' => 'done', 'due_days' => -5, 'assignees' => ['alex', 'maya']],
        'internal_onboarding' => ['project' => 'internal', 'title' => 'Publish the creative onboarding guide', 'description' => 'Prepared a first-week guide covering project rituals and design handoffs.', 'status' => 'done', 'due_days' => -3, 'assignees' => ['leo']],
    ],
    'checklist' => [
        'task' => 'aurora_identity',
        'items' => [
            'wordmark' => ['title' => 'Refine wordmark spacing', 'is_done' => true, 'assignee' => 'maya'],
            'contrast' => ['title' => 'Check palette contrast', 'is_done' => false, 'assignee' => 'leo'],
            'presentation' => ['title' => 'Prepare concept presentation', 'is_done' => false, 'assignee' => 'alex'],
        ],
    ],
    'comments' => [
        'direction' => ['task' => 'aurora_identity', 'user' => 'alex', 'body' => 'The sunrise direction feels welcoming. Let’s show how it works on the paper sleeve as well.', 'days_ago' => 2],
        'update' => ['task' => 'aurora_identity', 'user' => 'maya', 'body' => 'I refined the letter spacing and added a one-color version. The concept deck is ready for an internal review.', 'days_ago' => 1],
    ],
    // Current week uses the latest elapsed weekday; prior week uses Friday.
    'time_entries' => [
        'discovery_alex' => ['task' => 'aurora_discovery', 'user' => 'alex', 'week' => -1, 'minutes' => 120],
        'discovery_maya' => ['task' => 'aurora_discovery', 'user' => 'maya', 'week' => -1, 'minutes' => 90],
        'onboarding_leo' => ['task' => 'internal_onboarding', 'user' => 'leo', 'week' => -1, 'minutes' => 150],
        'copy_alex' => ['task' => 'nimbus_copy', 'user' => 'alex', 'week' => -1, 'minutes' => 60],
        'identity_maya' => ['task' => 'aurora_identity', 'user' => 'maya', 'week' => 0, 'minutes' => 180],
        'identity_alex' => ['task' => 'aurora_identity', 'user' => 'alex', 'week' => 0, 'minutes' => 45],
        'site_leo' => ['task' => 'nimbus_site', 'user' => 'leo', 'week' => 0, 'minutes' => 120],
        'packaging_maya' => ['task' => 'aurora_packaging', 'user' => 'maya', 'week' => 0, 'minutes' => 60],
    ],
    'invoices' => [
        'aurora_draft' => ['invoice_number' => 'INV-2026-001', 'status' => 'draft', 'issue_days' => 0, 'due_days' => 14, 'buyer_name' => 'Aurora Goods', 'buyer_email' => 'accounts@aurora.example', 'notes' => 'Identity exploration and packaging concepts for Aurora Goods.', 'items' => [
            'identity' => ['description' => 'Brand identity exploration', 'quantity' => 20, 'unit_type' => 'hours', 'unit_price' => 100],
            'packaging' => ['description' => 'Packaging concept design', 'quantity' => 8, 'unit_type' => 'hours', 'unit_price' => 100],
        ]],
        'nimbus_sent' => ['invoice_number' => 'INV-2026-002', 'status' => 'sent', 'issue_days' => -7, 'due_days' => 7, 'buyer_name' => 'Nimbus Studio', 'buyer_email' => 'accounts@nimbus.example', 'notes' => 'Launch strategy and responsive landing page design.', 'items' => [
            'strategy' => ['description' => 'Launch positioning workshop', 'quantity' => 1, 'unit_type' => 'quantity', 'unit_price' => 900],
            'website' => ['description' => 'Launch page design', 'quantity' => 16, 'unit_type' => 'hours', 'unit_price' => 100],
        ]],
        'aurora_paid' => ['invoice_number' => 'INV-2026-003', 'status' => 'paid', 'issue_days' => -21, 'due_days' => -7, 'buyer_name' => 'Aurora Goods', 'buyer_email' => 'accounts@aurora.example', 'notes' => 'Discovery phase completed. Payment recorded for this fictional invoice.', 'items' => [
            'discovery' => ['description' => 'Brand discovery and research', 'quantity' => 12, 'unit_type' => 'hours', 'unit_price' => 100],
        ]],
    ],
    'boards' => [
        'aurora_direction' => ['name' => 'Aurora brand direction', 'author' => 'maya', 'excalidraw_data' => $scene('aurora', [
            ['text' => 'Aurora Goods\nWarm, thoughtful, everyday', 'color' => '#ffec99'],
            ['text' => 'Visual direction\nSunrise coral + natural paper', 'color' => '#ffd8a8'],
            ['text' => 'Next review\nWordmark, palette, packaging', 'color' => '#d0ebff'],
        ])],
        'nimbus_journey' => ['name' => 'Nimbus launch journey', 'author' => 'leo', 'excalidraw_data' => $scene('nimbus', [
            ['text' => 'Discover\nMeet Nimbus Studio', 'color' => '#d0ebff'],
            ['text' => 'Explore\nSee services and project stories', 'color' => '#e5dbff'],
            ['text' => 'Connect\nStart a creative conversation', 'color' => '#c3fae8'],
        ])],
    ],
    'notifications' => [
        'assigned' => ['user' => 'alex', 'actor' => 'maya', 'type' => 'task_assigned', 'title' => 'Aurora concept review is ready', 'body' => 'Maya added you to the identity concept review.', 'task' => 'aurora_identity', 'read' => false],
        'comment' => ['user' => 'alex', 'actor' => 'maya', 'type' => 'task_comment_added', 'title' => 'Maya shared an identity update', 'body' => 'The refined wordmark and one-color version are ready to review.', 'task' => 'aurora_identity', 'read' => false],
        'done' => ['user' => 'alex', 'actor' => 'leo', 'type' => 'task_completed', 'title' => 'The onboarding guide is published', 'body' => 'Leo completed the creative team onboarding guide.', 'task' => 'internal_onboarding', 'read' => true],
        'maya_review' => ['user' => 'maya', 'actor' => 'alex', 'type' => 'task_comment_added', 'title' => 'Alex shared concept feedback', 'body' => 'Show how the sunrise direction works on the paper sleeve.', 'task' => 'aurora_identity', 'read' => false],
        'leo_site' => ['user' => 'leo', 'actor' => 'alex', 'type' => 'task_assigned', 'title' => 'Nimbus launch page is assigned to you', 'body' => 'Build the approved responsive launch page for Nimbus Studio.', 'task' => 'nimbus_site', 'read' => false],
    ],
    'preferences' => ['database_enabled' => true, 'email_enabled' => true],
    'menu' => [
        'dashboard' => ['section' => 'main', 'label' => 'Dashboard', 'icon' => 'dashboard', 'route' => '/', 'permission' => null, 'order' => 0],
        'projects' => ['section' => 'main', 'label' => 'Projects', 'icon' => 'projects', 'route' => '/projects', 'permission' => 'project.read', 'order' => 1],
        'hours' => ['section' => 'main', 'label' => 'Hours', 'icon' => 'clock', 'route' => '/hours', 'permission' => 'time.read', 'order' => 2],
        'invoices' => ['section' => 'main', 'label' => 'Invoices', 'icon' => 'invoice', 'route' => '/invoices', 'permission' => 'invoice.read', 'order' => 3],
        'tasks' => ['section' => 'main', 'label' => 'Tasks', 'icon' => 'tasks', 'route' => '/tasks', 'permission' => 'task.read', 'order' => 4],
        'boards' => ['section' => 'main', 'label' => 'Boards', 'icon' => 'board', 'route' => '/boards', 'permission' => 'board.read', 'order' => 5],
        'notifications' => ['section' => 'main', 'label' => 'Notifications', 'icon' => 'bell', 'route' => '/notifications', 'permission' => 'notification.view', 'order' => 6],
        'users' => ['section' => 'settings', 'label' => 'Users', 'icon' => 'users', 'route' => '/settings/users', 'permission' => 'rbac.user.create', 'order' => 0],
        'roles' => ['section' => 'settings', 'label' => 'Roles & Permissions', 'icon' => 'shield', 'route' => '/rbac', 'permission' => 'rbac.role.read', 'order' => 1],
        'company' => ['section' => 'settings', 'label' => 'Company', 'icon' => 'building', 'route' => '/settings/company', 'permission' => 'workspace.settings.read', 'order' => 2],
        'menu' => ['section' => 'settings', 'label' => 'Menu', 'icon' => 'gear', 'route' => '/settings/menu', 'permission' => 'workspace.settings.read', 'order' => 3],
    ],
];
