import { SessionData } from './session'

// 權限常數定義
export const PERMISSIONS = {
  // 投稿相關權限
  CREATE_SUBMISSION: 'create_submission',
  VIEW_OWN_SUBMISSIONS: 'view_own_submissions',
  VIEW_ALL_SUBMISSIONS: 'view_all_submissions',
  EDIT_SUBMISSION: 'edit_submission',
  DELETE_SUBMISSION: 'delete_submission',
  
  // 審稿相關權限
  VIEW_ASSIGNED_REVIEWS: 'view_assigned_reviews',
  SUBMIT_REVIEW: 'submit_review',
  ASSIGN_REVIEWERS: 'assign_reviewers',
  VIEW_ALL_REVIEWS: 'view_all_reviews',
  
  // 決議相關權限
  MAKE_DECISION: 'make_decision',
  VIEW_DECISIONS: 'view_decisions',
  
  // 用戶管理權限
  MANAGE_USERS: 'manage_users',
  ASSIGN_ROLES: 'assign_roles',
  
  // 系統管理權限
  SYSTEM_ADMIN: 'system_admin',
} as const

// 角色權限映射
export const ROLE_PERMISSIONS = {
  AUTHOR: [
    PERMISSIONS.CREATE_SUBMISSION,
    PERMISSIONS.VIEW_OWN_SUBMISSIONS,
    PERMISSIONS.EDIT_SUBMISSION,
  ],
  
  REVIEWER: [
    PERMISSIONS.VIEW_ASSIGNED_REVIEWS,
    PERMISSIONS.SUBMIT_REVIEW,
  ],
  
  EDITOR: [
    PERMISSIONS.VIEW_ALL_SUBMISSIONS,
    PERMISSIONS.VIEW_ALL_REVIEWS,
    PERMISSIONS.ASSIGN_REVIEWERS,
    PERMISSIONS.VIEW_DECISIONS,
  ],
  
  CHIEF_EDITOR: [
    PERMISSIONS.VIEW_ALL_SUBMISSIONS,
    PERMISSIONS.VIEW_ALL_REVIEWS,
    PERMISSIONS.ASSIGN_REVIEWERS,
    PERMISSIONS.MAKE_DECISION,
    PERMISSIONS.VIEW_DECISIONS,
  ],
  
  ADMIN: [
    PERMISSIONS.VIEW_ALL_SUBMISSIONS,
    PERMISSIONS.VIEW_ALL_REVIEWS,
    PERMISSIONS.ASSIGN_REVIEWERS,
    PERMISSIONS.MAKE_DECISION,
    PERMISSIONS.VIEW_DECISIONS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.ASSIGN_ROLES,
    PERMISSIONS.SYSTEM_ADMIN,
  ],
} as const

/**
 * 檢查用戶是否有特定權限
 */
export function hasPermission(
  session: SessionData | null,
  permission: string
): boolean {
  if (!session || !session.roles) {
    return false
  }

  return session.roles.some(role => {
    const rolePermissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]
    return rolePermissions?.some(p => p === permission)
  })
}

/**
 * 檢查用戶是否有任一權限
 */
export function hasAnyPermission(
  session: SessionData | null,
  permissions: string[]
): boolean {
  return permissions.some(permission => hasPermission(session, permission))
}

/**
 * 檢查用戶是否有所有權限
 */
export function hasAllPermissions(
  session: SessionData | null,
  permissions: string[]
): boolean {
  return permissions.every(permission => hasPermission(session, permission))
}

/**
 * 檢查用戶是否可以訪問投稿
 */
export function canAccessSubmission(
  session: SessionData | null,
  submissionCreatorId?: string
): boolean {
  if (!session) return false

  // 管理員和編輯可以訪問所有投稿
  if (hasPermission(session, PERMISSIONS.VIEW_ALL_SUBMISSIONS)) {
    return true
  }

  // 作者只能訪問自己的投稿
  if (hasPermission(session, PERMISSIONS.VIEW_OWN_SUBMISSIONS)) {
    return submissionCreatorId === session.userId
  }

  return false
}

/**
 * 檢查用戶是否可以編輯投稿
 */
export function canEditSubmission(
  session: SessionData | null,
  submissionCreatorId?: string
): boolean {
  if (!session) return false

  // 只有作者可以編輯自己的投稿
  if (hasPermission(session, PERMISSIONS.EDIT_SUBMISSION)) {
    return submissionCreatorId === session.userId
  }

  return false
}

/**
 * 檢查用戶是否可以指派審稿人
 */
export function canAssignReviewers(session: SessionData | null): boolean {
  return hasPermission(session, PERMISSIONS.ASSIGN_REVIEWERS)
}

/**
 * 檢查用戶是否可以做出決議
 */
export function canMakeDecision(session: SessionData | null): boolean {
  return hasPermission(session, PERMISSIONS.MAKE_DECISION)
}

/**
 * 檢查用戶是否可以管理用戶
 */
export function canManageUsers(session: SessionData | null): boolean {
  return hasPermission(session, PERMISSIONS.MANAGE_USERS)
}

/**
 * 獲取用戶所有權限
 */
export function getUserPermissions(session: SessionData | null): string[] {
  if (!session || !session.roles) {
    return []
  }

  const permissions = new Set<string>()
  
  session.roles.forEach(role => {
    const rolePermissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]
    if (rolePermissions) {
      rolePermissions.forEach(permission => permissions.add(permission))
    }
  })

  return Array.from(permissions)
}

/**
 * 權限裝飾器工廠函數
 */
export function requirePermission(permission: string) {
  return function(session: SessionData | null) {
    if (!hasPermission(session, permission)) {
      throw new Error(`需要權限: ${permission}`)
    }
  }
}

/**
 * 角色檢查裝飾器工廠函數
 */
export function requireRole(role: string) {
  return function(session: SessionData | null) {
    if (!session || !session.roles.includes(role)) {
      throw new Error(`需要角色: ${role}`)
    }
  }
}