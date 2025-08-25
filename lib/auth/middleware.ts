import { NextRequest, NextResponse } from 'next/server'
import { getSession, SessionData } from './session'

export type AuthenticatedHandler = (
  session: SessionData
) => Promise<NextResponse> | NextResponse

export type AuthenticatedRequestHandler = (
  request: NextRequest,
  session: SessionData
) => Promise<NextResponse> | NextResponse

// 用於包裹需要認證的 API 路由
export function withAuth(
  request: NextRequest,
  handler: AuthenticatedRequestHandler
): Promise<NextResponse> {
  return withAuthBase(async () => {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: '未授權訪問，請先登入' },
        { status: 401 }
      )
    }
    
    return handler(request, session)
  })
}

// 基礎認證包裹器
async function withAuthBase(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await handler()
  } catch (error) {
    console.error('認證中間件錯誤:', error)
    return NextResponse.json(
      { error: '伺服器內部錯誤' },
      { status: 500 }
    )
  }
}

// 檢查特定角色權限的中間件
export function withRole(
  request: NextRequest,
  roles: string | string[],
  handler: AuthenticatedRequestHandler
): Promise<NextResponse> {
  return withAuth(request, async (session) => {
    const requiredRoles = Array.isArray(roles) ? roles : [roles]
    const hasRequiredRole = requiredRoles.some(role => 
      session.roles.includes(role)
    )
    
    if (!hasRequiredRole) {
      return NextResponse.json(
        { error: '權限不足' },
        { status: 403 }
      )
    }
    
    return handler(request, session)
  })
}

// 編輯者權限中間件
export function withEditorAuth(
  request: NextRequest,
  handler: AuthenticatedRequestHandler
): Promise<NextResponse> {
  return withRole(request, ['EDITOR', 'CHIEF_EDITOR', 'ADMIN'], handler)
}

// 主編權限中間件
export function withChiefEditorAuth(
  request: NextRequest,
  handler: AuthenticatedRequestHandler
): Promise<NextResponse> {
  return withRole(request, ['CHIEF_EDITOR', 'ADMIN'], handler)
}

// 管理員權限中間件
export function withAdminAuth(
  request: NextRequest,
  handler: AuthenticatedRequestHandler
): Promise<NextResponse> {
  return withRole(request, ['ADMIN'], handler)
}