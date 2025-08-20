import { NextRequest } from 'next/server'
import { getSession, SessionData } from './session'
import { hasPermission, hasAnyPermission } from './rbac'

/**
 * API路由權限檢查中間件
 */
export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest, session: SessionData) => Promise<Response>
): Promise<Response> {
  try {
    const session = await getSession()
    
    if (!session) {
      return new Response(
        JSON.stringify({ error: '未授權訪問' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return await handler(req, session)
  } catch (error) {
    console.error('API認證錯誤:', error)
    return new Response(
      JSON.stringify({ error: '內部服務器錯誤' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * API路由權限檢查 - 需要特定權限
 */
export async function withPermission(
  req: NextRequest,
  permission: string,
  handler: (req: NextRequest, session: SessionData) => Promise<Response>
): Promise<Response> {
  return withAuth(req, async (req, session) => {
    if (!hasPermission(session, permission)) {
      return new Response(
        JSON.stringify({ error: '權限不足' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return await handler(req, session)
  })
}

/**
 * API路由權限檢查 - 需要任一權限
 */
export async function withAnyPermission(
  req: NextRequest,
  permissions: string[],
  handler: (req: NextRequest, session: SessionData) => Promise<Response>
): Promise<Response> {
  return withAuth(req, async (req, session) => {
    if (!hasAnyPermission(session, permissions)) {
      return new Response(
        JSON.stringify({ error: '權限不足' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return await handler(req, session)
  })
}

/**
 * API路由角色檢查
 */
export async function withRole(
  req: NextRequest,
  role: string,
  handler: (req: NextRequest, session: SessionData) => Promise<Response>
): Promise<Response> {
  return withAuth(req, async (req, session) => {
    if (!session.roles.includes(role)) {
      return new Response(
        JSON.stringify({ error: '角色權限不足' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return await handler(req, session)
  })
}

/**
 * API路由多角色檢查
 */
export async function withAnyRole(
  req: NextRequest,
  roles: string[],
  handler: (req: NextRequest, session: SessionData) => Promise<Response>
): Promise<Response> {
  return withAuth(req, async (req, session) => {
    const hasRole = roles.some(role => session.roles.includes(role))
    
    if (!hasRole) {
      return new Response(
        JSON.stringify({ error: '角色權限不足' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return await handler(req, session)
  })
}