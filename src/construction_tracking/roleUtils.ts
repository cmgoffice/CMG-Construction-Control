export const MASTER_ADMIN_ROLE = 'MasterAdmin' as const;

export const ALL_APP_ROLES = [
    MASTER_ADMIN_ROLE,
    'Admin',
    'MD',
    'GM',
    'CD',
    'PCM',
    'HRM',
    'PM',
    'CM',
    'Supervisor',
    'Staff',
    'HR',
    'Procurement',
    'Site Admin'
] as const;

const SYSTEM_ADMIN_ROLES = [MASTER_ADMIN_ROLE, 'Admin', 'Administrator'] as const;
const APPROVAL_ROLES = [MASTER_ADMIN_ROLE, 'Admin', 'MD', 'PM', 'CM'] as const;
const EXECUTIVE_ROLES = [MASTER_ADMIN_ROLE, 'Admin', 'MD', 'GM', 'CD'] as const;
const ANALYTICS_ROLES = [MASTER_ADMIN_ROLE, 'Admin', 'MD', 'GM', 'CD', 'PM', 'CM'] as const;
const PROJECT_MANAGER_ROLES = [MASTER_ADMIN_ROLE, 'Admin', 'MD'] as const;
const PROJECT_RESOURCE_ROLES = [MASTER_ADMIN_ROLE, 'Admin', 'PM', 'CM'] as const;
const GLOBAL_PROJECT_ACCESS_ROLES = [MASTER_ADMIN_ROLE, 'Admin', 'MD', 'GM', 'CD'] as const;

const normalizeRole = (role: string | null | undefined) =>
    (role || '').replace(/\s+/g, '').toLowerCase();

const hasRole = (role: string | null | undefined, roles: readonly string[]) => {
    const normalized = normalizeRole(role);
    return !!normalized && roles.some(item => normalizeRole(item) === normalized);
};

export const isMasterAdmin = (role: string | null | undefined) => hasRole(role, [MASTER_ADMIN_ROLE, 'Master Admin']);
export const isSystemAdmin = (role: string | null | undefined) => hasRole(role, SYSTEM_ADMIN_ROLES);
export const hasUniversalRoleAccess = (role: string | null | undefined) => isSystemAdmin(role);
export const canSeeApprovals = (role: string | null | undefined) => hasRole(role, APPROVAL_ROLES);
export const isExecutiveRole = (role: string | null | undefined) => hasRole(role, EXECUTIVE_ROLES);
export const canAccessAnalytics = (role: string | null | undefined) => hasRole(role, ANALYTICS_ROLES);
export const canAccessAllProjects = (role: string | null | undefined) => hasRole(role, GLOBAL_PROJECT_ACCESS_ROLES);
export const canManageProjects = (role: string | null | undefined) => hasRole(role, PROJECT_MANAGER_ROLES);
export const canManageProjectResources = (role: string | null | undefined) => hasRole(role, PROJECT_RESOURCE_ROLES);
export const canUseSwoCreation = (role: string | null | undefined) => canSeeApprovals(role);
