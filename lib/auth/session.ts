import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface SessionData {
  userId: string
  email: string
  displayName: string
  roles: string[]
  iat?: number
  exp?: number
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret'
const SESSION_COOKIE = 'session'
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 天

export function createSession(userData: Omit<SessionData, 'iat' | 'exp'>): string {
  return jwt.sign(userData, JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'conference-platform',
    audience: 'conference-platform-users'
  })
}

export function verifySession(token: string): SessionData | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'conference-platform',
      audience: 'conference-platform-users'
    }) as SessionData
    
    return decoded
  } catch (error) {
    return null
  }
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE)
    
    if (!sessionToken) {
      return null
    }
    
    const sessionData = verifySession(sessionToken.value)
    if (!sessionData) {
      return null
    }

    // 暫時直接返回 JWT 中的資料，避免資料庫查詢問題
    return sessionData
  } catch (error) {
    return null
  }
}

export function setSessionCookie(response: NextResponse, token: string): void {
  
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/'
  })
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE)
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession()
  if (!session) {
    throw new Error('未授權訪問')
  }
  return session
}

export function hasRole(session: SessionData | null, role: string): boolean {
  return session?.roles.includes(role) ?? false
}

export function hasAnyRole(session: SessionData | null, roles: string[]): boolean {
  if (!session) return false
  return roles.some(role => session.roles.includes(role))
}

export function isAuthor(session: SessionData | null): boolean {
  return hasRole(session, 'AUTHOR')
}

export function isReviewer(session: SessionData | null): boolean {
  return hasRole(session, 'REVIEWER')
}

export function isEditor(session: SessionData | null): boolean {
  return hasRole(session, 'EDITOR')
}

export function isChiefEditor(session: SessionData | null): boolean {
  return hasRole(session, 'CHIEF_EDITOR')
}

export function isAdmin(session: SessionData | null): boolean {
  return hasRole(session, 'ADMIN')
}

export function canManageSubmissions(session: SessionData | null): boolean {
  return hasAnyRole(session, ['EDITOR', 'CHIEF_EDITOR', 'ADMIN'])
}

export function canAssignReviewers(session: SessionData | null): boolean {
  return hasAnyRole(session, ['EDITOR', 'CHIEF_EDITOR', 'ADMIN'])
}

export function canMakeDecisions(session: SessionData | null): boolean {
  return hasAnyRole(session, ['CHIEF_EDITOR', 'ADMIN'])
}