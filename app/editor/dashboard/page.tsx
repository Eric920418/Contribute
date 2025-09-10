'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Clock, CheckCircle, AlertCircle, Eye, Edit3, PenTool, ArrowUpDown, ArrowUp, ArrowDown, MoreVertical, Users, Calendar, User, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { apiClient } from '@/lib/api/client'
import YearDropdown from '@/components/ui/YearDropdown'
import { SessionData } from '@/lib/auth/session'
import { useAuth } from '@/hooks/useAuth'

// 統一稿件編號格式化函數：日期時間_亂數5碼
const formatSubmissionNumber = (assignment: EditorAssignment): string => {
  const date = new Date(assignment.submittedDate || assignment.assignDate || Date.now())
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  // 從assignment id生成5位亂數碼（確保一致性）
  const randomCode = assignment.id.slice(-8).toUpperCase().slice(0, 5)
  
  return `${year}${month}${day}${hours}${minutes}_${randomCode}`
}

interface EditorAssignment {
  id: string
  title: string
  authors: string[]
  status: 'submitted' | 'under_review' | 'revision_required' | 'accepted' | 'rejected'
  submittedDate: string
  assignedReviewer?: string[]
  priority: 'high' | 'medium' | 'low'
  paperType: string
  keywords: string[]
  dueDate?: string
  serialNumber?: string
  reviewStatus?: string
  assignDate?: string
  recommendation?: string
  finalDecision?: string
}

interface EditorStats {
  total: number
  submitted: number
  underReview: number
  revisionRequired: number
  accepted: number
  rejected: number
}

interface Member {
  id: string
  name: string
  email: string
  affiliation: string  // 服務單位
  position: string     // 職稱
  orcidId?: string     // ORCID ID
  expertise: string[]  // 專業知識領域
  status: 'enabled' | 'pending_activation' | 'not_sent'
  role: 'EDITOR' | 'REVIEWER' | 'CHIEF_EDITOR'
  joinDate?: string
  lastActive?: string
}

interface Reviewer {
  id: string
  displayName: string
  email: string
  orcid?: string
  currentAssignments: number
  completedReviews: number
  isAvailable: boolean
  expertise: string[]
  averageResponseTime?: number | null
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'submitted':
      return <FileText className="w-5 h-5 text-blue-500" />
    case 'under_review':
      return <Clock className="w-5 h-5 text-amber-500" />
    case 'revision_required':
      return <AlertCircle className="w-5 h-5 text-orange-500" />
    case 'accepted':
      return <CheckCircle className="w-5 h-5 text-green-500" />
    case 'rejected':
      return <AlertCircle className="w-5 h-5 text-red-500" />
    default:
      return <FileText className="w-5 h-5 text-gray-500" />
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'submitted':
      return '新投稿'
    case 'under_review':
      return '審稿中'
    case 'revision_required':
      return '需修改'
    case 'accepted':
      return '已接受'
    case 'rejected':
      return '已拒絕'
    default:
      return '未知'
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getMemberStatusColor = (status: string) => {
  switch (status) {
    case 'enabled':
      return 'text-green-800'
    case 'pending_activation':
      return ' text-yellow-800'
    case 'not_sent':
      return ' text-gray-800'
    default:
      return ' text-gray-800'
  }
}

const getMemberStatusText = (status: string) => {
  switch (status) {
    case 'enabled':
      return '已啟用'
    case 'pending_activation':
      return '待啟用'
    case 'not_sent':
      return '尚未寄送'
    default:
      return '未知'
  }
}

const getRoleText = (role: string) => {
  switch (role) {
    case 'CHIEF_EDITOR':
      return '主編'
    case 'EDITOR':
      return '編輯'
    case 'REVIEWER':
      return '審稿人'
    default:
      return '未知'
  }
}

export default function EditorDashboard() {
  // 使用現有的權限檢查 hook
  const { user: authUser, hasRole, hasAnyRole, loading: authLoading } = useAuth()
  
  const router = useRouter()
  const [assignments, setAssignments] = useState<EditorAssignment[]>([])
  const [stats, setStats] = useState<EditorStats>({
    total: 0,
    submitted: 0,
    underReview: 0,
    revisionRequired: 0,
    accepted: 0,
    rejected: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'submitted' | 'under_review' | 'revision_required' | 'accepted' | 'rejected'>('all')
  const [selectedConferenceId, setSelectedConferenceId] = useState<string>('')
  const [year, setYear] = useState(2025)
  const [availableYears, setAvailableYears] = useState<{ value: number; label: string; id?: string }[]>([])
  const [conference, setConference] = useState<{
    year: number
    title: string
    tracks?: Record<string, any>
    settings?: Record<string, any>
    isActive?: boolean
  } | null>(null)
  
  // 會議列表相關狀態
  const [conferenceList, setConferenceList] = useState<{
    id: string
    year: number
    title: string
    subtopics: string[]
    isActive: boolean
  }[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [conferenceCurrentPage, setConferenceCurrentPage] = useState(1)
  const [conferencesPerPage] = useState(10)
  
  // 會議編輯相關狀態
  const [showEditConferenceModal, setShowEditConferenceModal] = useState(false)
  const [showAddConferenceModal, setShowAddConferenceModal] = useState(false)
  const [editingConference, setEditingConference] = useState<{
    id: string
    year: number
    title: string
    subtopics: string[]
    isActive: boolean
  } | null>(null)
  const [newConferenceSubtopics, setNewConferenceSubtopics] = useState<string[]>([''])
  const [manuscriptPage, setManuscriptPage] = useState(1)
  const [manuscriptPagination, setManuscriptPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [user, setUser] = useState<SessionData | null>(null)
  const [sortField, setSortField] = useState<string>('submittedDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'manuscripts' | 'members' | 'settings'>('manuscripts')
  const [members, setMembers] = useState<Member[]>([])
  const [memberFilter, setMemberFilter] = useState<'all' | 'editor' | 'reviewer'>('all')
  const [memberSearch, setMemberSearch] = useState('')
  const [memberPage, setMemberPage] = useState(1)
  const [memberPagination, setMemberPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [currentAssignmentId, setCurrentAssignmentId] = useState<string | null>(null)
  const [availableReviewers, setAvailableReviewers] = useState<Reviewer[]>([])
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([])
  const [reviewDueDate, setReviewDueDate] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [invitationContent, setInvitationContent] = useState('')
  
  // 新增人員相關狀態
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [newMemberData, setNewMemberData] = useState({
    name: '',
    email: '',
    affiliation: '',
    position: '',
    orcidId: '',
    expertise: [] as string[],
    role: 'REVIEWER' as 'CHIEF_EDITOR' | 'EDITOR' | 'REVIEWER'
  })
  const [isAddingMember, setIsAddingMember] = useState(false)

  // 編輯人員相關狀態
  const [showEditMemberModal, setShowEditMemberModal] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [editMemberData, setEditMemberData] = useState({
    name: '',
    email: '',
    affiliation: '',
    position: '',
    orcidId: '',
    expertise: [] as string[],
    role: 'REVIEWER' as 'CHIEF_EDITOR' | 'EDITOR' | 'REVIEWER'
  })

  // 審稿紀錄相關狀態
  const [showReviewHistoryModal, setShowReviewHistoryModal] = useState(false)
  const [reviewHistoryMember, setReviewHistoryMember] = useState<Member | null>(null)
  const [reviewHistoryData, setReviewHistoryData] = useState<any[]>([])
  const [loadingReviewHistory, setLoadingReviewHistory] = useState(false)
  const [isEditingMember, setIsEditingMember] = useState(false)

  // 決議模態視窗相關狀態

  // 專業知識領域選項
  const expertiseOptions = [
    '21世紀技能/批判性思考能力',
    '創造力',
    '人工智慧教育',
    '遠距教學和線上學習',
    '人工智慧技術媒體遊戲',
    'K-12 教育',
    '擴增實境/虛擬實境/混合實境',
    '社交媒體應用與教育',
    '行為模式分析與模型建立',
    '建構主義/探究式學習',
    '協作/合作學習',
    '音樂教育',
    '運算思維',
    '教育資料探勘',
    '電腦輔助語言學習',
    '教師培訓',
    '英語教學',
    '互動裝置應用'
  ]

  // 處理導航按鈕點擊
  const handleTabClick = (tab: 'manuscripts' | 'members' | 'settings') => {
    setActiveTab(tab)
    // 這裡可以實現對應的功能
    switch (tab) {
      case 'manuscripts':
        // 稿件列表功能 - 已經是當前頁面的主要內容
        break
      case 'members':
        // 人員列表功能 - 載入人員數據
        loadMembersData()
        break
      case 'settings':
        // 會議設定功能 - 已實作在下方
        break
    }
  }

  // 載入人員數據
  const loadMembersData = async (page = memberPage, search = memberSearch, role = memberFilter) => {
    try {
      setError('')
      setIsLoading(true)

      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', '10')
      if (search) params.append('search', search)
      if (role !== 'all') params.append('role', role)

      const response = await fetch(`/api/editor/members?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '載入人員資料失敗')
      }
      
      const data = await response.json()
      setMembers(data.members || [])
      setMemberPagination(data.pagination || {
        total: 0,
        totalPages: 0,
        currentPage: 1,
        limit: 10,
        hasNextPage: false,
        hasPrevPage: false
      })

    } catch (error: any) {
      const errorMsg = error.message || '載入人員資料失敗'
      setError(errorMsg)
      console.error('Error loading members data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 人員搜尋處理
  const handleMemberSearch = (searchTerm: string) => {
    setMemberSearch(searchTerm)
    setMemberPage(1) // 重置到第一頁
    loadMembersData(1, searchTerm, memberFilter)
  }

  // 人員篩選處理
  const handleMemberFilterChange = (newFilter: 'all' | 'editor' | 'reviewer') => {
    setMemberFilter(newFilter)
    setMemberPage(1) // 重置到第一頁
    loadMembersData(1, memberSearch, newFilter)
  }

  // 分頁處理
  const handleMemberPageChange = (newPage: number) => {
    setMemberPage(newPage)
    loadMembersData(newPage, memberSearch, memberFilter)
  }

  // 人員管理操作函數
  const handleEditMember = async (memberId: string) => {
    try {
      console.log('handleEditMember called with memberId:', memberId)
      // 找到要編輯的成員
      const memberToEdit = members.find(member => member.id === memberId)
      console.log('memberToEdit found:', memberToEdit)
      if (!memberToEdit) {
        setError('找不到要編輯的成員')
        return
      }

      // 設置編輯狀態
      setEditingMember(memberToEdit)
      console.log('setEditingMember called')
      setEditMemberData({
        name: memberToEdit.name,
        email: memberToEdit.email,
        affiliation: memberToEdit.affiliation,
        position: memberToEdit.position,
        orcidId: memberToEdit.orcidId || '',
        expertise: memberToEdit.expertise,
        role: memberToEdit.role
      })
      console.log('setEditMemberData called')
      setShowEditMemberModal(true)
      console.log('setShowEditMemberModal(true) called')
    } catch (error: any) {
      console.error('Error in handleEditMember:', error)
      setError('編輯成員失敗: ' + (error.response?.data?.error || error.message))
    }
  }

  // 處理審稿紀錄
  const handleReviewHistory = async (memberId: string) => {
    try {
      console.log('handleReviewHistory called with memberId:', memberId)
      // 找到對應的成員
      const member = members.find(m => m.id === memberId)
      if (!member) {
        setError('找不到對應的成員')
        return
      }

      // 設置審稿紀錄狀態
      setReviewHistoryMember(member)
      setShowReviewHistoryModal(true)
      setLoadingReviewHistory(true)

      console.log('Opening review history for member:', member.name)
      
      // 載入審稿紀錄數據
      await loadReviewHistoryData(memberId)
      
    } catch (error: any) {
      console.error('Error in handleReviewHistory:', error)
      setError('查看審稿紀錄失敗: ' + (error.message || '未知錯誤'))
      setLoadingReviewHistory(false)
    }
  }

  // 載入審稿紀錄數據
  const loadReviewHistoryData = async (memberId: string) => {
    try {
      console.log('Loading review history for member:', memberId)
      
      // 調用真實的API
      const response = await apiClient.get(`/editor/members/${memberId}/review-history`)
      
      if (response.data.success) {
        // 格式化API回傳的數據，轉換為前端需要的格式
        const formattedData = response.data.data.map((record: any) => ({
          id: record.id,
          submissionTitle: record.submissionTitle,
          authors: record.authors,
          conferenceYear: record.conferenceYear,
          track: record.track,
          submittedDate: record.submittedDate,
          reviewedDate: record.reviewedDate,
          assignedDate: record.assignedDate,
          dueDate: record.dueDate,
          status: record.status,
          submissionStatus: record.submissionStatus,
          // 處理審稿評論
          review: record.review,
          // 為了相容現有UI，保留舊的欄位名稱
          decision: record.review?.recommendation === 'ACCEPT' ? 'accepted' :
                   record.review?.recommendation === 'MINOR_REVISION' || record.review?.recommendation === 'MAJOR_REVISION' ? 'revision_required' :
                   record.review?.recommendation === 'REJECT' ? 'rejected' : 
                   record.status === 'PENDING' ? 'pending' : 'in_progress',
          comments: record.review?.commentToEditor || record.review?.commentToAuthor || ''
        }))
        
        setReviewHistoryData(formattedData)
        console.log('Review history loaded successfully:', formattedData.length, 'records')
      } else {
        console.error('API returned error:', response.data.error)
        setError('載入審稿紀錄失敗: ' + response.data.error)
        setReviewHistoryData([])
      }
    } catch (error: any) {
      console.error('Error loading review history:', error)
      setError('載入審稿紀錄失敗: ' + (error.message || '未知錯誤'))
    } finally {
      setLoadingReviewHistory(false)
    }
  }

  // 關閉審稿紀錄模態視窗
  const handleCloseReviewHistoryModal = () => {
    setShowReviewHistoryModal(false)
    setReviewHistoryMember(null)
    setReviewHistoryData([])
  }

 

  const handleDeleteMember = async (memberId: string) => {
    try {
      if (confirm('確定要刪除這位成員嗎？此操作無法復原。')) {
        // 調用 API 刪除成員
        await apiClient.delete(`/editor/members?id=${memberId}`)
        
        // API 成功後，更新本地狀態
        setMembers(prevMembers => prevMembers.filter(member => member.id !== memberId))
        
        alert('成員已刪除')
      }
    } catch (error: any) {
      setError('刪除成員失敗: ' + (error.response?.data?.error || error.message))
    }
  }

  // 新增人員相關函數
  const handleAddMember = async () => {
    if (!newMemberData.name.trim() || !newMemberData.email.trim() || !newMemberData.affiliation.trim()) {
      setError('請填寫姓名、信箱和服務單位')
      return
    }

    try {
      setIsAddingMember(true)
      setError('')

      const response = await fetch('/api/editor/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newMemberData.name.trim(),
          email: newMemberData.email.trim(),
          affiliation: newMemberData.affiliation.trim(),
          position: newMemberData.position.trim(),
          orcidId: newMemberData.orcidId.trim(),
          expertise: newMemberData.expertise,
          role: newMemberData.role
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '新增人員失敗')
      }

      const result = await response.json()

      // 重新載入人員數據
      await loadMembersData()
      
      // 關閉模態視窗並重置狀態
      setShowAddMemberModal(false)
      setNewMemberData({
        name: '',
        email: '',
        affiliation: '',
        position: '',
        orcidId: '',
        expertise: [],
        role: 'REVIEWER'
      })
      
      alert(`成功新增人員並寄送邀請信至 ${newMemberData.email}`)
      
    } catch (error: any) {
      setError('新增人員失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleCloseAddMemberModal = () => {
    setShowAddMemberModal(false)
    setNewMemberData({
      name: '',
      email: '',
      affiliation: '',
      position: '',
      orcidId: '',
      expertise: [],
      role: 'REVIEWER'
    })
    setError('')
  }

  // 編輯人員相關函數
  const handleUpdateMember = async () => {
    if (!editMemberData.name.trim() || !editMemberData.email.trim() || !editMemberData.affiliation.trim()) {
      setError('請填寫姓名、信箱和服務單位')
      return
    }

    if (editMemberData.expertise.length === 0) {
      setError('請至少選擇一個專業知識領域')
      return
    }

    if (!editingMember) {
      setError('找不到要編輯的成員')
      return
    }

    setIsEditingMember(true)
    setError('')

    try {
      const response = await fetch(`/api/editor/members/${editingMember.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editMemberData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '更新人員失敗')
      }

      const result = await response.json()

      // 重新載入人員數據
      await loadMembersData(memberPage, memberSearch, memberFilter)
      
      // 關閉模態視窗
      handleCloseEditMemberModal()
      
      alert('成功更新人員資料')
      
    } catch (error: any) {
      setError('更新人員失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setIsEditingMember(false)
    }
  }

  const handleCloseEditMemberModal = () => {
    setShowEditMemberModal(false)
    setEditingMember(null)
    setEditMemberData({
      name: '',
      email: '',
      affiliation: '',
      position: '',
      orcidId: '',
      expertise: [],
      role: 'REVIEWER'
    })
    setError('')
  }

  // 處理專業領域選擇
  const handleExpertiseToggle = (field: string) => {
    setNewMemberData(prev => ({
      ...prev,
      expertise: prev.expertise.includes(field)
        ? prev.expertise.filter(item => item !== field)
        : [...prev.expertise, field]
    }))
  }

  // 處理編輯時的專業領域選擇
  const handleEditExpertiseToggle = (field: string) => {
    setEditMemberData(prev => ({
      ...prev,
      expertise: prev.expertise.includes(field)
        ? prev.expertise.filter(item => item !== field)
        : [...prev.expertise, field]
    }))
  }

  // 保存但稍後啟用
  const handleSaveForLater = async () => {
    if (!newMemberData.name.trim() || !newMemberData.email.trim() || !newMemberData.affiliation.trim()) {
      setError('請填寫姓名、信箱和服務單位')
      return
    }

    try {
      setIsAddingMember(true)
      setError('')

      const response = await fetch('/api/editor/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newMemberData.name.trim(),
          email: newMemberData.email.trim(),
          affiliation: newMemberData.affiliation.trim(),
          position: newMemberData.position.trim(),
          orcidId: newMemberData.orcidId.trim(),
          expertise: newMemberData.expertise,
          role: newMemberData.role,
          sendEmail: false // 不發送邀請郵件
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '保存人員失敗')
      }

      // 重新載入人員數據
      await loadMembersData()
      
      // 關閉模態視窗並重置狀態
      setShowAddMemberModal(false)
      setNewMemberData({
        name: '',
        email: '',
        affiliation: '',
        position: '',
        orcidId: '',
        expertise: [],
        role: 'REVIEWER'
      })
      
      alert('人員已保存，狀態為「尚未寄送」')
      
    } catch (error: any) {
      setError('保存人員失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setIsAddingMember(false)
    }
  }

  // 載入會議資料
  const loadConference = async (conferenceYear: number) => {
    console.log('正在載入年份會議資料:', conferenceYear)
    try {
      // 嘗試使用原生 fetch
      const fetchResponse = await fetch(`/api/conferences?year=${conferenceYear}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
      
      console.log('會議資料 Fetch 回應狀態:', fetchResponse.status)
      console.log('會議資料 Fetch 回應 URL:', fetchResponse.url)
      
      if (!fetchResponse.ok) {
        throw new Error(`HTTP error! status: ${fetchResponse.status}`)
      }
      
      const data = await fetchResponse.json()
      console.log('會議資料載入成功 (使用 fetch):', data)
      setConference(data)
    } catch (error: any) {
      console.error('取得會議資料失敗:', error)
      console.error('錯誤詳情:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        message: error.message
      })
      
      // 如果 API 失敗，使用預設值
      const defaultConference = {
        year: conferenceYear,
        title: `${conferenceYear} AI時代課程教學與傳播科技研討會`,
        tracks: {
          'ai_education': 'AI在教育中的應用',
          'digital_learning': '數位學習與教學科技',
          'curriculum_design': '課程設計與開發',
          'assessment': '學習評量與分析',
          'media_technology': '傳播科技與媒體素養',
          'teacher_training': '教師專業發展'
        },
        settings: {
          submissionDeadline: `${conferenceYear}-12-31`,
          reviewDeadline: `${conferenceYear + 1}-02-28`,
          notificationDate: `${conferenceYear + 1}-03-15`,
          conferenceDate: `${conferenceYear + 1}-05-15`
        },
        isActive: false
      }
      console.log('使用預設會議資料:', defaultConference)
      setConference(defaultConference)
    }
  }

  // 載入所有可用的會議年份
  const loadAvailableYears = async () => {
    console.log('正在載入可用年份列表...')
    console.log('API client 基礎 URL:', apiClient.defaults.baseURL)
    console.log('當前 window.location:', typeof window !== 'undefined' ? window.location.href : 'server-side')
    try {
      // 嘗試使用原生 fetch 而不是 axios
      console.log('嘗試使用 fetch API...')
      const fetchResponse = await fetch('/api/conferences', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 包含 cookies
      })
      
      console.log('Fetch 回應狀態:', fetchResponse.status)
      console.log('Fetch 回應 URL:', fetchResponse.url)
      
      if (!fetchResponse.ok) {
        throw new Error(`HTTP error! status: ${fetchResponse.status}`)
      }
      
      const data = await fetchResponse.json()
      console.log('年份列表載入成功 (使用 fetch):', data)
      const { conferences } = data
      
      if (conferences && conferences.length > 0) {
        // 每個會議都作為獨立選項，使用會議ID作為唯一標識
        const years = conferences.map((conf: any) => ({
          value: conf.year,
          label: conf.title || `${conf.year} 課程教學與傳播科技研討會`,
          id: conf.id // 添加唯一ID
        })).sort((a: any, b: any) => b.value - a.value) // 降序排列，最新年份在前
        
        setAvailableYears(years)
        
        // 設定初始選中的會議（如果沒有選中任何會議，選擇第一個）
        if (years.length > 0) {
          if (!selectedConferenceId || !years.some((y: any) => y.id === selectedConferenceId)) {
            setSelectedConferenceId(years[0].id || `year-${years[0].value}`)
            setYear(years[0].value)
          }
        }
      } else {
        // 沒有資料庫會議資料時的預設年份
        const currentYear = new Date().getFullYear()
        const defaultYears = [
          { value: currentYear, label: `${currentYear} 課程教學與傳播科技研討會`, id: `default-${currentYear}` },
          { value: currentYear - 1, label: `${currentYear - 1} 課程教學與傳播科技研討會`, id: `default-${currentYear - 1}` },
          { value: currentYear - 2, label: `${currentYear - 2} 課程教學與傳播科技研討會`, id: `default-${currentYear - 2}` }
        ]
        setAvailableYears(defaultYears)
        
        // 設定預設選中的會議
        if (!selectedConferenceId) {
          setSelectedConferenceId(defaultYears[0].id)
          setYear(defaultYears[0].value)
        }
      }
    } catch (error: any) {
      console.error('取得會議年份列表失敗:', error)
      console.error('錯誤詳情:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      })
      
      // API 失敗時的預設年份
      const currentYear = new Date().getFullYear()
      const defaultYears = [
        { value: currentYear, label: currentYear.toString() },
        { value: currentYear - 1, label: (currentYear - 1).toString() },
        { value: currentYear - 2, label: (currentYear - 2).toString() }
      ]
      setAvailableYears(defaultYears)
    }
  }

  // 載入會議列表
  const loadConferenceList = async () => {
    try {
      console.log('正在載入會議列表...')
      const response = await fetch('/api/conferences')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('API 回傳的會議資料:', data)
      
      if (data.conferences && data.conferences.length > 0) {
        // 轉換 API 資料格式成前端需要的格式
        const formattedConferences = data.conferences.map((conf: any, index: number) => ({
          id: conf.id || (index + 1).toString(),
          year: conf.year,
          title: conf.title,
          subtopics: conf.tracks 
            ? Object.values(conf.tracks).filter(track => typeof track === 'string') 
            : ['未設定子題'],
          isActive: conf.isActive || false
        }))
        
        console.log('格式化後的會議列表:', formattedConferences)
        setConferenceList(formattedConferences)
      } else {
        console.log('沒有會議資料，使用預設列表')
        // 如果沒有資料，使用一些預設會議
        const defaultConferences = [
          { id: '1', year: 2025, title: '2025 課程教學與傳播科技研討會', subtopics: ['人工智慧與教育融合', '教育中的生成式人工智慧應用'], isActive: true },
          { id: '2', year: 2024, title: '2024 課程教學與傳播科技研討會', subtopics: ['永續與互動科技', 'K-12 教育中的程式設計教學'], isActive: true },
          { id: '3', year: 2023, title: '2023 課程教學與傳播科技研討會', subtopics: ['虛擬與擴增實境在課室教學中的實踐', '教育資料分析與學習行為預測'], isActive: true }
        ]
        setConferenceList(defaultConferences)
      }
    } catch (error: any) {
      console.error('載入會議列表失敗:', error)
      // 發生錯誤時也提供預設會議列表
      const defaultConferences = [
        { id: '1', year: 2025, title: '2025 課程教學與傳播科技研討會', subtopics: ['人工智慧與教育融合', '教育中的生成式人工智慧應用'], isActive: true },
        { id: '2', year: 2024, title: '2024 課程教學與傳播科技研討會', subtopics: ['永續與互動科技', 'K-12 教育中的程式設計教學'], isActive: true },
        { id: '3', year: 2023, title: '2023 課程教學與傳播科技研討會', subtopics: ['虛擬與擴增實境在課室教學中的實踐', '教育資料分析與學習行為預測'], isActive: true }
      ]
      setConferenceList(defaultConferences)
    }
  }

  // 載入用戶資料和編輯數據
  const loadData = async (page = manuscriptPage) => {
    try {
      setIsLoading(true)
      setError('')
      
      // 獲取當前用戶資料
      const userResponse = await fetch('/api/auth/me')
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setUser(userData.user)
      }
      
      // 獲取編輯投稿列表
      const params = new URLSearchParams()
      // 如果有選中的會議ID，使用會議ID查詢，否則使用年份
      if (selectedConferenceId) {
        params.append('conferenceId', selectedConferenceId)
      } else {
        params.append('year', year.toString())
      }
      params.append('page', page.toString())
      params.append('limit', '10')
      if (filter !== 'all') {
        params.append('status', filter)
      }
      
      const response = await fetch(`/api/editor/submissions?${params}`)
      if (response.ok) {
        const data = await response.json()
        
        
        setAssignments(data.submissions || [])
        setStats(data.stats || {
          total: 0,
          submitted: 0,
          underReview: 0,
          revisionRequired: 0,
          accepted: 0,
          rejected: 0
        })
        setManuscriptPagination(data.pagination || {
          total: 0,
          totalPages: 0,
          currentPage: 1,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false
        })
      }
    } catch (err) {
      console.error('載入數據失敗:', err)
      setError('載入數據失敗，請稍後重試')
    } finally {
      setIsLoading(false)
    }
  }

  // 稿件篩選處理
  const handleManuscriptFilterChange = (newFilter: 'all' | 'submitted' | 'under_review' | 'revision_required' | 'accepted' | 'rejected') => {
    setFilter(newFilter)
    setManuscriptPage(1) // 重置到第一頁
    loadData(1)
  }

  // 稿件分頁處理
  const handleManuscriptPageChange = (newPage: number) => {
    setManuscriptPage(newPage)
    loadData(newPage)
  }

  useEffect(() => {
    setManuscriptPage(1) // 當會議或篩選改變時重置頁數
    loadData(1)
    loadConference(year) // 載入會議資料
  }, [year, filter, selectedConferenceId])

  // 初始載入可用年份和會議列表
  useEffect(() => {
    // 避免重複載入
    if (availableYears.length === 0) {
      loadAvailableYears()
    }
    // 載入會議列表
    if (conferenceList.length === 0) {
      loadConferenceList()
    }
  }, [])


  // 前端排序功能
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // 排序後的資料
  const sortedAssignments = [...assignments].sort((a, b) => {
    let aValue: any = a[sortField as keyof EditorAssignment]
    let bValue: any = b[sortField as keyof EditorAssignment]

    // 處理特殊欄位
    if (sortField === 'authors') {
      aValue = a.authors.join(', ')
      bValue = b.authors.join(', ')
    }
    if (sortField === 'serialNumber') {
      aValue = a.serialNumber || a.id
      bValue = b.serialNumber || b.id
    }

    // 轉換為可比較的值
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (aValue < bValue) {
      return sortOrder === 'asc' ? -1 : 1
    }
    if (aValue > bValue) {
      return sortOrder === 'asc' ? 1 : -1
    }
    return 0
  })

  // 渲染排序圖標
  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-gray-600" />
      : <ArrowDown className="w-4 h-4 text-gray-600" />
  }

  const handleAssignReviewer = async (assignmentId: string) => {
    try {
      setError('')
      setCurrentAssignmentId(assignmentId)
      
      // 載入可用審稿人列表
      const response = await fetch('/api/editor/reviewers')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '載入失敗')
      }
      
      const data = await response.json()
      setAvailableReviewers(data.reviewers)
      
      // 設定預設的回覆截止日期（30天後）
      const defaultDueDate = new Date()
      defaultDueDate.setDate(defaultDueDate.getDate() + 30)
      setReviewDueDate(defaultDueDate.toISOString().split('T')[0])
      
      // 設定默認的邀請內容
      const currentSubmission = assignments.find(a => a.id === assignmentId)
      const defaultInvitation = `敬啟者 您好：
 我們誠摯邀請您擔任本研討會論文的匿名審稿人。
 本篇稿件標題為：
   《運用擴增實境提升國中環境教育成效：結合科技與永續發展之教學實驗研究》
 本研究主題與您的專業領域高度相關，懇請您撥冗協助審查，以維護研討會的學術品質。
 若您願意協助，請於 ${reviewDueDate} 前點選下方連結，回覆是否接受此項審查任務：
 [接受／拒絕審查邀請按鈕]
 審查截止日為：${reviewDueDate}，我們將於審查意見彙整後通知作者進行修正。
 若您有任何疑問，歡迎與我們聯繫。
 課程教學與傳播科技學術研討會 敬上
`

      setInvitationContent(defaultInvitation)
      
      setShowAssignModal(true)
    } catch (error: any) {
      setError('載入審稿人列表失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
    }
  }

  const handleAssignSubmit = async () => {
    if (!currentAssignmentId || selectedReviewers.length === 0) {
      setError('請至少選擇一位審稿人')
      return
    }

    try {
      setIsAssigning(true)
      setError('')

      const response = await fetch(`/api/editor/submissions/${currentAssignmentId}/assign-reviewer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewerIds: selectedReviewers,
          dueDate: reviewDueDate,
          invitationContent
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '指派失敗')
      }
      
      const assignmentResult = await response.json()

      // 重新載入數據以確保同步
      await loadData()
      
      // 關閉模態視窗並重置狀態
      setShowAssignModal(false)
      setCurrentAssignmentId(null)
      setSelectedReviewers([])
      setReviewDueDate('')
      setInvitationContent('')
      setError('')
      
    } catch (error: any) {
      setError('指派審稿人失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setIsAssigning(false)
    }
  }

  const handleCloseAssignModal = () => {
    setShowAssignModal(false)
    setCurrentAssignmentId(null)
    setSelectedReviewers([])
    setReviewDueDate('')
    setInvitationContent('')
    setError('')
  }

  const handleReviewerToggle = (reviewerId: string) => {
    setSelectedReviewers(prev => 
      prev.includes(reviewerId)
        ? prev.filter(id => id !== reviewerId)
        : [...prev, reviewerId]
    )
  }




  const handleDownloadPaper = async (assignmentId: string) => {
    try {
      // 下載論文檔案
      const response = await apiClient.get(`/editor/submissions/${assignmentId}/download`, {
        responseType: 'blob'
      })
      
      // 創建下載連結
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `submission-${assignmentId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      setError('下載稿件失敗: ' + (error.response?.data?.error || error.message))
    }
  }


  const handleDeleteSubmission = async (assignmentId: string) => {
    console.log('handleDeleteSubmission called with:', assignmentId)
    try {
      if (confirm('確定要刪除這篇稿件嗎？此操作無法復原。')) {
        console.log('User confirmed deletion, calling API')
        await apiClient.delete(`/editor/submissions/${assignmentId}`)
        console.log('API call successful, reloading page')
        // 重新載入數據
        window.location.reload()
      } else {
        console.log('User cancelled deletion')
      }
    } catch (error: any) {
      console.error('Delete submission error:', error)
      setError('刪除稿件失敗: ' + (error.response?.data?.error || error.message))
    }
  }

  const toggleDropdown = (id: string) => {
    console.log('toggleDropdown called with id:', id, 'current openDropdown:', openDropdown)
    setOpenDropdown(openDropdown === id ? null : id)
  }

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // 檢查是否點擊了下拉選單按鈕或下拉選單內容
      if (target.closest('[data-dropdown]') || target.closest('[data-dropdown-content]')) {
        return
      }
      
      setOpenDropdown(null)
    }

    if (openDropdown) {
      // 延遲添加監聽器，避免立即觸發
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 150)
      
      return () => {
        clearTimeout(timer)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdown])

  // 稿件操作菜單組件
  const DropdownMenu = ({ assignment }: { assignment: EditorAssignment }) => {
    const dropdownRef = useRef<HTMLDivElement>(null)

    // 只處理 Escape 鍵，點擊外部由全域事件監聽器處理
    useEffect(() => {
      if (openDropdown !== assignment.id) return

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setOpenDropdown(null)
        }
      }

      document.addEventListener('keydown', handleEscape)

      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }, [openDropdown, assignment.id])

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={(e) => {
            e.stopPropagation() // 阻止事件冒泡，避免觸發行點擊
            toggleDropdown(assignment.id)
          }}
          className="text-gray-500 hover:text-gray-700 p-1"
          title="更多操作"
          data-dropdown
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {openDropdown === assignment.id && (
          <div 
            className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] shadow-2xl border-gray-300"
            data-dropdown-content
          >
            <div className="py-1">
              {assignment.status === 'submitted' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAssignReviewer(assignment.id)
                    setOpenDropdown(null)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  分配審稿人
                </button>
              )}
              <button
                onClick={(e) => {
                  console.log('Delete button clicked for assignment:', assignment.id)
                  e.stopPropagation()
                  handleDeleteSubmission(assignment.id)
                  setOpenDropdown(null)
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                刪除
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 人員操作菜單組件
  const MemberDropdownMenu = ({ member }: { member: Member }) => {
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      if (openDropdown !== member.id) return

      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          console.log('Clicking outside, closing dropdown')
          setOpenDropdown(null)
        }
      }

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setOpenDropdown(null)
        }
      }

      // 延遲添加事件監聽器，避免立即觸發
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscape)
      }, 100)

      return () => {
        clearTimeout(timer)
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
      }
    }, [openDropdown, member.id])

    return (
      <div className="relative " ref={dropdownRef}>
        <button
          onClick={() => toggleDropdown(member.id)}
          className="text-gray-500 hover:text-gray-700 p-1"
          title="更多操作"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        
        {openDropdown === member.id && (
          <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] shadow-2xl border-gray-300">
            <div className="py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  console.log('Edit button clicked for member:', member.id)
                  handleEditMember(member.id)
                  setOpenDropdown(null)
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                編輯資料
              </button>
              

              {member.role === 'REVIEWER' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // 查看審稿歷史
                    alert(`查看 ${member.name} 的審稿歷史...`)
                    setOpenDropdown(null)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  審稿歷史
                </button>
              )}


              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteMember(member.id)
                  setOpenDropdown(null)
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                刪除成員
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredRoles={['EDITOR', 'CHIEF_EDITOR']}>
        <div className="min-h-screen flex flex-col bg-white">
          <Header currentPage="editor" />
          <main className="flex-1 px-4 py-8 md:px-14 md:py-14 bg-gray-100">
            <div className="w-full md:max-w-7xl md:mx-auto">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-6 mb-8">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white rounded-lg p-6 h-32"></div>
                  ))}
                </div>
                <div className="bg-white rounded-lg p-8 h-96"></div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['EDITOR', 'CHIEF_EDITOR']}>
      <div className="min-h-screen flex flex-col bg-white">
        <Header currentPage="editor" />

        {/* 主內容區域 */}
        <main
          className="flex-1 px-4 py-8 md:px-14 md:py-14 bg-gray-100"
          style={{ overflow: 'visible' }}
        >
          <div
            className="w-full md:max-w-7xl md:mx-auto"
            style={{ overflow: 'visible' }}
          >
            {/* 身份識別區域 */}
            <div className="mb-8 md:mb-[56px]">
              <div className="flex flex-col md:flex-row rounded-lg shadow-sm min-h-[132px]">
                {/* 左側：投稿作者身份標識 */}
                <div
                  className={`${
                    user?.roles?.includes('CHIEF_EDITOR')
                      ? 'bg-chief-editor'
                      : 'bg-editor'
                  } text-white px-6 md:ps-[48px] py-6 md:py-[32px] md:pe-[211px] flex items-center gap-4 md:gap-6 min-w-0`}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-[64px] md:h-[64px] flex-shrink-0">
                    <PenTool className="w-full h-full text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm md:text-28M opacity-90 truncate">
                      {user?.displayName}
                    </div>
                    <div className="text-base sm:text-lg md:text-28M font-medium">
                      {user?.roles?.includes('CHIEF_EDITOR') ? '主編' : '編輯'}
                    </div>
                  </div>
                </div>

                {/* 右側：研討會標題和控制項 */}
                <div className="relative z-[60] bg-white flex-1 px-6 md:px-[48px] py-6 md:py-[45px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1 flex flex-col md:flex-row md:items-center gap-3 md:gap-5 min-w-0">
                    <h1
                      className={`text-base md:text-[28px] font-medium ${
                        user?.roles?.includes('CHIEF_EDITOR')
                          ? 'text-chief-editor'
                          : 'text-editor'
                      } leading-tight break-words`}
                    >
                      {(() => {
                        // 根據選中的會議ID找到對應的會議標題
                        const selectedConference = availableYears.find(conf => conf.id === selectedConferenceId)
                        return selectedConference?.label || conference?.title || `${year} AI時代課程教學與傳播科技研討會`
                      })()}
                    </h1>
                    <div className="hidden md:block w-[2px] h-[56px] bg-gray-200"></div>
                  </div>
                  <div className="relative z-[70] flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4 md:gap-[40px] w-full sm:w-auto">
                    <button
                      onClick={() => handleTabClick('manuscripts')}
                      className={`text-sm sm:text-base md:text-24M font-medium transition-colors duration-200 hover:text-blue-600 whitespace-nowrap ${
                        activeTab === 'manuscripts'
                          ? 'text-blue-600'
                          : 'text-gray-900'
                      }`}
                    >
                      稿件列表
                    </button>
                    <button
                      onClick={() => handleTabClick('members')}
                      className={`text-sm sm:text-base md:text-24M font-medium transition-colors duration-200 hover:text-blue-600 whitespace-nowrap ${
                        activeTab === 'members'
                          ? 'text-blue-600'
                          : 'text-gray-900'
                      }`}
                    >
                      人員列表
                    </button>
                    <button
                      onClick={() => handleTabClick('settings')}
                      className={`text-sm sm:text-base md:text-24M font-medium transition-colors duration-200 hover:text-blue-600 whitespace-nowrap ${
                        activeTab === 'settings'
                          ? 'text-blue-600'
                          : 'text-gray-900'
                      }`}
                    >
                      會議設定
                    </button>
                    <YearDropdown
                      value={year}
                      selectedId={selectedConferenceId}
                      onChange={(conferenceId, selectedYear) => {
                        setSelectedConferenceId(conferenceId)
                        setYear(selectedYear)
                      }}
                      options={availableYears}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 稿件狀態統計區域 - 只在稿件列表時顯示 */}
            {activeTab === 'manuscripts' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* 稿件狀態 */}
                <div className="bg-white rounded-lg p-6">
                  <h2 className="text-lg font-medium text-foreground mb-4">
                    稿件狀態
                  </h2>
                  <div className="text-4xl font-bold text-foreground mb-4">
                    {stats.total}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                    <div
                      className="bg-gradient-to-r from-green-400 to-purple-500 h-3 rounded-full"
                      style={{
                        width:
                          stats.total > 0
                            ? `${Math.round(
                                ((stats.underReview +
                                  stats.revisionRequired +
                                  stats.accepted +
                                  stats.rejected) /
                                  stats.total) *
                                  100
                              )}%`
                            : '0%',
                      }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>新投稿 {stats.submitted}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                      <span>審稿中 {stats.underReview}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span>需修改 {stats.revisionRequired}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>已接受 {stats.accepted}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>已拒絕 {stats.rejected}</span>
                    </div>
                    <div className="text-gray-500">總計 {stats.total} 篇</div>
                  </div>
                </div>

                {/* 統計數據 */}
                <div className="bg-white rounded-lg p-6">
                  <h2 className="text-lg font-medium text-foreground mb-4">
                    統計數據
                  </h2>
                  <div className="flex items-center justify-center mb-4">
                    <div className="relative w-32 h-32">
                      <svg
                        className="w-32 h-32 transform -rotate-90"
                        viewBox="0 0 36 36"
                      >
                        <path
                          className="text-gray-200"
                          fill="none"
                          strokeWidth="3"
                          stroke="currentColor"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-blue-500"
                          fill="none"
                          strokeWidth="3"
                          stroke="currentColor"
                          strokeDasharray={`${
                            stats.total > 0
                              ? Math.round(
                                  ((stats.underReview +
                                    stats.revisionRequired +
                                    stats.accepted +
                                    stats.rejected) /
                                    stats.total) *
                                    100
                                )
                              : 0
                          }, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold">
                          {stats.total}
                        </span>
                        <span className="text-[16px] text-gray-500">
                          總稿件數
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>
                        處理進度{' '}
                        {stats.total > 0
                          ? Math.round(
                              ((stats.underReview +
                                stats.revisionRequired +
                                stats.accepted +
                                stats.rejected) /
                                stats.total) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>
                        接受率{' '}
                        {stats.total > 0
                          ? Math.round((stats.accepted / stats.total) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span>
                        拒絕率{' '}
                        {stats.total > 0
                          ? Math.round((stats.rejected / stats.total) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 內容列表 */}
            <div
              className="bg-white rounded-lg"
              style={{ overflow: 'visible' }}
            >
              <div className="px-[48px] py-[40px] border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center justify-between gap-4 w-full">
                  <h2 className="text-40M font-medium text-foreground">
                    {activeTab === 'manuscripts'
                      ? '稿件列表'
                      : activeTab === 'members'
                      ? '人員列表'
                      : '會議設定'}
                  </h2>
                  
                  {/* 新增會議按鈕 - 只在會議設定頁面顯示 */}
                  {activeTab === 'settings' && hasRole('CHIEF_EDITOR') && (
                    <button
                      onClick={() => setShowAddConferenceModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      新增會議
                    </button>
                  )}
                </div>

                {/* 篩選器 */}
                {activeTab === 'manuscripts' && (
                  <div className="flex items-center justify-end gap-4 w-full">
                  {/* 標題和搜尋控制欄 */}
                  <div className="">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="搜尋關鍵字"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full sm:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                   
                    </div>
                  </div>
                  <div className="bg-white rounded-lg">
                    <select
                      value={filter}
                      onChange={(e) =>
                        handleManuscriptFilterChange(e.target.value as any)
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent hover:border-gray-300 transition-colors"
                    >
                      <option value="all">全部</option>
                      <option value="submitted">新投稿</option>
                      <option value="under_review">審稿中</option>
                      <option value="revision_required">需修改</option>
                      <option value="accepted">已接受</option>
                      <option value="rejected">已拒絕</option>
                    </select>
                  </div>
                  </div>
                )}

                {/* 人員篩選器和搜尋 */}
                {activeTab === 'members' && (
                  <div className="bg-white rounded-lg flex items-center gap-4 w-full">
                    {/* 搜尋框 */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="搜尋姓名、信箱、ORCID..."
                        value={memberSearch}
                        onChange={e => handleMemberSearch(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* 角色篩選 */}
                    <div className="flex gap-1">
                      {[
                        { key: 'all', label: '全部' },
                        { key: 'editor', label: '編輯' },
                        { key: 'reviewer', label: '審稿人' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => handleMemberFilterChange(key as any)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            memberFilter === key
                              ? 'bg-[#6366F1] text-white'
                              : 'bg-gray-100 text-foreground hover:bg-gray-200'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* 新增人員按鈕 */}
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      新增人員
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-6 border-b border-red-200 bg-red-50">
                  <p className="text-red-600 text-center">{error}</p>
                </div>
              )}

              <div className="relative" style={{ overflow: 'visible' }}>
                {/* 桌面版表格 */}
                <div
                  className="hidden md:block overflow-x-auto"
                  style={{ overflow: 'visible' }}
                >
                  {activeTab === 'manuscripts' ? (
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th
                            className="px-3 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors "
                            onClick={() => handleSort('serialNumber')}
                          >
                            <div className="flex items-center gap-2 ">
                              編號
                              {renderSortIcon('serialNumber')}
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors w-80"
                            onClick={() => handleSort('title')}
                          >
                            <div className="flex items-center gap-2">
                              標題
                              {renderSortIcon('title')}
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors w-30"
                            onClick={() => handleSort('status')}
                          >
                            <div className="flex items-center gap-2">
                              稿件狀態
                              {renderSortIcon('status')}
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-20">
                            審稿人
                          </th>
                          <th
                            className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors w-32"
                            onClick={() => handleSort('assignDate')}
                          >
                            <div className="flex items-center gap-2">
                              指派日期
                              {renderSortIcon('assignDate')}
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-32">
                            審稿狀態
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-24">
                            建議
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-24">
                            最終決議
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-24">
                            論文定稿
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-16">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sortedAssignments.map((assignment, index) => (
                          <tr
                            key={assignment.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() =>
                              router.push(
                                `/editor/submissions/${assignment.id}`
                              )
                            }
                          >
                            {/* 編號 */}
                            <td className="px-3 py-4 text-sm text-foreground ">
                              <div className="w-[100px] truncate">
                                {formatSubmissionNumber(assignment)}
                              </div>
                            </td>

                            {/* 標題 */}
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-foreground">
                                {assignment.title}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {assignment.authors.join('、')}
                              </div>
                            </td>

                            {/* 稿件狀態 */}
                            <td className="px-4 py-3 text-sm text-foreground">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                  assignment.status === 'accepted'
                                    ? 'bg-green-100 text-green-800'
                                    : assignment.status === 'under_review'
                                    ? 'bg-amber-100 text-amber-800'
                                    : assignment.status === 'submitted'
                                    ? 'bg-blue-100 text-blue-800'
                                    : assignment.status === 'revision_required'
                                    ? 'bg-orange-100 text-orange-800'
                                    : assignment.status === 'rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {getStatusText(assignment.status)}
                              </span>
                            </td>

                            {/* 審稿人 */}
                            <td className="px-4 py-3 text-sm text-foreground">
                              {assignment.assignedReviewer &&
                              assignment.assignedReviewer.length > 0 ? (
                                <div className="space-y-1">
                                  {assignment.assignedReviewer.map(
                                    (reviewer, idx) => (
                                      <div key={idx} className="text-xs">
                                        {reviewer}
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">未分配</span>
                              )}
                            </td>

                            {/* 指派日期 */}
                            <td className="px-4 py-3 text-sm text-foreground">
                              {assignment.assignDate || '-'}
                            </td>

                            {/* 審稿狀態 */}
                            <td className="px-4 py-3 text-sm text-foreground">
                              <span
                                className={`${
                                  assignment.reviewStatus === '已完成'
                                    ? 'text-green-600'
                                    : assignment.reviewStatus === '待分配'
                                    ? 'text-gray-500'
                                    : 'text-amber-600'
                                }`}
                              >
                                {assignment.reviewStatus || '-'}
                              </span>
                            </td>

                            {/* 建議 */}
                            <td className="px-4 py-3 text-sm text-foreground">
                              {assignment.recommendation ? (
                                <div className="max-w-xs">
                                  <span
                                    className={`${
                                      assignment.recommendation.includes('接受')
                                        ? 'text-green-600'
                                        : assignment.recommendation.includes(
                                            '拒絕'
                                          )
                                        ? 'text-red-600'
                                        : assignment.recommendation.includes(
                                            '修改'
                                          )
                                        ? 'text-orange-600'
                                        : 'text-amber-600'
                                    } block truncate`}
                                    title={assignment.recommendation}
                                  >
                                    {assignment.recommendation.length > 50
                                      ? `${assignment.recommendation.substring(
                                          0,
                                          50
                                        )}...`
                                      : assignment.recommendation}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>

                            {/* 最終決議 */}
                            <td className="px-4 py-3 text-sm text-foreground">
                              {assignment.finalDecision ? (
                                <span
                                  className={`inline-flex items-center gap-1 ${
                                    assignment.finalDecision === 'ACCEPT'
                                      ? 'text-green-600'
                                      : assignment.finalDecision === 'REJECT'
                                      ? 'text-red-600'
                                      : 'text-orange-600'
                                  }`}
                                >
                                  {assignment.finalDecision === 'ACCEPT' && (
                                    <CheckCircle className="w-3 h-3" />
                                  )}
                                  {assignment.finalDecision === 'REJECT' && (
                                    <AlertCircle className="w-3 h-3" />
                                  )}
                                  {assignment.finalDecision === 'REVISE' && (
                                    <AlertCircle className="w-3 h-3" />
                                  )}
                                  {assignment.finalDecision === 'ACCEPT'
                                    ? '接受'
                                    : assignment.finalDecision === 'REJECT'
                                    ? '拒絕'
                                    : '需修改'}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>

                            {/* 論文定稿 */}
                            <td className="px-4 py-3 text-sm text-foreground">
                              {assignment.status === 'accepted' ? (
                                <span className="text-green-600">確認</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>

                            {/* 操作 */}
                            <td
                              className="px-4 py-3 relative"
                              style={{ overflow: 'visible' }}
                            >
                              <DropdownMenu assignment={assignment} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : activeTab === 'members' ? (
                    <div
                      className="hidden md:block overflow-x-auto"
                      style={{ overflow: 'visible' }}
                    >
                      <table className="w-full min-w-[1200px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-4 text-left text-24M font-medium text-gray-500 min-w-[120px] w-[120px]">
                              姓名
                            </th>
                            <th className="px-4 py-4 text-left text-24M font-medium text-gray-500 min-w-[200px] w-[200px]">
                              電子郵件
                            </th>
                            <th className="px-4 py-4 text-left text-24M font-medium text-gray-500 min-w-[180px] w-[180px]">
                              服務單位
                            </th>
                            <th className="px-4 py-4 text-left text-24M font-medium text-gray-500 min-w-[120px] w-[120px]">
                              職稱
                            </th>
                            <th className="px-4 py-4 text-left text-24M font-medium text-gray-500 min-w-[120px] w-[120px]">
                              ORCID ID
                            </th>
                            <th className="px-4 py-4 text-left text-24M font-medium text-gray-500 min-w-[200px] w-[200px]">
                              專業知識領域
                            </th>
                            <th className="px-4 py-4 text-left text-24M font-medium text-gray-500 min-w-[80px] w-[80px]">
                              狀態
                            </th>
                            <th className="px-4 py-4 text-left text-24M font-medium text-gray-500 min-w-[80px] w-[80px]">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {members
                            .filter(member => {
                              // 排除投稿人角色
                              if (member.role === 'AUTHOR') return false

                              if (memberFilter === 'all') return true
                              if (memberFilter === 'editor')
                                return (
                                  member.role === 'EDITOR' ||
                                  member.role === 'CHIEF_EDITOR'
                                )
                              if (memberFilter === 'reviewer')
                                return member.role === 'REVIEWER'
                              return true
                            })
                            .map(member => (
                              <tr key={member.id} className="hover:bg-gray-50">
                                {/* 姓名 */}
                                <td className="px-4 py-4">
                                  <div className="text-24M font-medium text-foreground break-words">
                                    {member.name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {getRoleText(member.role)}
                                  </div>
                                </td>

                                {/* 電子郵件 */}
                                <td className="px-4 py-4 text-24M text-foreground">
                                  <div className="break-all text-sm">
                                    {member.email}
                                  </div>
                                </td>

                                {/* 服務單位 */}
                                <td className="px-4 py-4">
                                  <div className="text-24M text-foreground break-words">
                                    {member.affiliation}
                                  </div>
                                </td>
                                {/* 職稱 */}
                                <td className="px-4 py-4">
                                  <div className="text-24M text-foreground break-words">
                                    {member.position}
                                  </div>
                                </td>

                                {/* ORCID ID */}
                                <td className="px-4 py-4 text-24M text-foreground">
                                  {member.orcidId ? (
                                    <a
                                      href={`https://orcid.org/${member.orcidId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 hover:underline break-all text-sm"
                                    >
                                      {member.orcidId}
                                    </a>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>

                                {/* 專業知識領域 */}
                                <td className="px-4 py-4">
                                  <div className="flex flex-wrap gap-1">
                                    {member.expertise
                                      .slice(0, 1)
                                      .map((field, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 break-words"
                                        >
                                          {field.length > 10
                                            ? field.slice(0, 10) + '...'
                                            : field}
                                        </span>
                                      ))}
                                    {member.expertise.length > 1 && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                        +{member.expertise.length - 1}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* 狀態 */}
                                <td className="px-4 py-4 text-sm text-foreground">
                                  <span
                                    className={`inline-flex items-center   text-xs ${getMemberStatusColor(
                                      member.status
                                    )}`}
                                  >
                                    {getMemberStatusText(member.status)}
                                  </span>
                                </td>

                                {/* 操作 */}
                                <td className="px-4 py-4 relative">
                                  <button
                                    data-dropdown
                                    onClick={e => {
                                      e.stopPropagation()
                                      console.log(
                                        'Three dots clicked, current openDropdown:',
                                        openDropdown,
                                        'member.id:',
                                        member.id
                                      )
                                      const newValue =
                                        openDropdown === member.id
                                          ? null
                                          : member.id
                                      console.log(
                                        'Setting openDropdown to:',
                                        newValue
                                      )
                                      setOpenDropdown(newValue)
                                    }}
                                    className="text-gray-500 hover:text-gray-700 p-1"
                                    title="更多操作"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  {openDropdown === member.id && (
                                    <div
                                      data-dropdown-content
                                      className="absolute right-15 top-12  w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]"
                                    >
                                      <div className="py-1">
                                        <button
                                          onClick={e => {
                                            e.stopPropagation()
                                            console.log(
                                              'Edit from dropdown clicked for:',
                                              member.id
                                            )
                                            handleEditMember(member.id)
                                            setOpenDropdown(null)
                                          }}
                                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                          編輯資料
                                        </button>

                                        {(member.role === 'REVIEWER' ||
                                          member.role === 'CHIEF_EDITOR') && (
                                          <button
                                            onClick={e => {
                                              e.stopPropagation()
                                              console.log(
                                                'Review history from dropdown clicked for:',
                                                member.id
                                              )
                                              handleReviewHistory(member.id)
                                              setOpenDropdown(null)
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                          >
                                            審稿紀錄
                                          </button>
                                        )}

                                        <button
                                          onClick={e => {
                                            e.stopPropagation()
                                            handleDeleteMember(member.id)
                                            setOpenDropdown(null)
                                          }}
                                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                          刪除人員
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    // 會議列表介面
                    <div className="space-y-6">
                      {/* 會議列表表格 */}
                      <div className="bg-white rounded-lg border overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                                  年份
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                                  會議標題
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                                  會議子題
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                                  開放狀態
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                                  編輯
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {(() => {
                                // 過濾會議列表（根據搜尋詞）
                                const filteredConferences =
                                  conferenceList.filter(
                                    conference =>
                                      conference.title
                                        .toLowerCase()
                                        .includes(searchTerm.toLowerCase()) ||
                                      conference.subtopics.some(topic =>
                                        topic
                                          .toLowerCase()
                                          .includes(searchTerm.toLowerCase())
                                      )
                                  )

                                // 分頁邏輯
                                const startIndex =
                                  (conferenceCurrentPage - 1) *
                                  conferencesPerPage
                                const endIndex = startIndex + conferencesPerPage
                                const paginatedConferences =
                                  filteredConferences.slice(
                                    startIndex,
                                    endIndex
                                  )

                                return paginatedConferences.map(conference => (
                                  <tr
                                    key={conference.id}
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      {conference.year}
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="text-sm font-medium text-gray-900">
                                        {conference.title}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="text-sm text-gray-600 max-w-md">
                                        {conference.subtopics.map(
                                          (topic, index) => (
                                            <span
                                              key={index}
                                              className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-lg text-xs"
                                            >
                                              {topic}
                                            </span>
                                          )
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <button
                                        onClick={async () => {
                                          // 前端權限檢查
                                          if (!hasRole('CHIEF_EDITOR')) {
                                            setError('只有主編可以切換會議狀態')
                                            return
                                          }
                                          
                                          console.log('=== 切換會議狀態 - 前端權限檢查通過 ===')
                                          
                                          try {
                                            // 準備要傳送到 API 的資料
                                            const conferenceData = {
                                              year: conference.year,
                                              title: conference.title,
                                              tracks: conference.subtopics.reduce((acc, topic, index) => ({
                                                ...acc,
                                                [`topic_${index + 1}`]: topic
                                              }), {}),
                                              isActive: !conference.isActive, // 切換狀態
                                            }

                                            console.log('正在切換會議狀態:', conferenceData)
                                            
                                            // 呼叫 API 更新到資料庫
                                            const response = await fetch('/api/conferences', {
                                              method: 'PUT',
                                              headers: {
                                                'Content-Type': 'application/json',
                                              },
                                              body: JSON.stringify(conferenceData),
                                            })

                                            if (!response.ok) {
                                              const errorData = await response.json()
                                              throw new Error(errorData.error || '切換會議狀態失敗')
                                            }

                                            const result = await response.json()
                                            console.log('會議狀態切換成功:', result)

                                            // 重新載入會議列表
                                            await loadConferenceList()
                                            
                                          } catch (error: any) {
                                            console.error('切換會議狀態失敗:', error)
                                            setError('切換會議狀態失敗: ' + error.message)
                                          }
                                        }}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                          conference.isActive
                                            ? 'bg-purple-600'
                                            : 'bg-gray-300'
                                        }`}
                                      >
                                        <span
                                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            conference.isActive
                                              ? 'translate-x-6'
                                              : 'translate-x-1'
                                          }`}
                                        />
                                      </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <button
                                        onClick={() => {
                                          setEditingConference(conference)
                                          setShowEditConferenceModal(true)
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                      >
                                        <Edit3 className="h-5 w-5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              })()}
                            </tbody>
                          </table>
                        </div>

                        {/* 分頁控制 */}
                        {(() => {
                          const filteredConferences = conferenceList.filter(
                            conference =>
                              conference.title
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase()) ||
                              conference.subtopics.some(topic =>
                                topic
                                  .toLowerCase()
                                  .includes(searchTerm.toLowerCase())
                              )
                          )
                          const totalPages = Math.ceil(
                            filteredConferences.length / conferencesPerPage
                          )

                          if (totalPages <= 1) return null

                          return (
                            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                              <button
                                onClick={() =>
                                  setConferenceCurrentPage(
                                    Math.max(1, conferenceCurrentPage - 1)
                                  )
                                }
                                disabled={conferenceCurrentPage === 1}
                                className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                ‹
                              </button>

                              <div className="flex items-center gap-2">
                                {Array.from(
                                  { length: totalPages },
                                  (_, i) => i + 1
                                ).map(page => (
                                  <button
                                    key={page}
                                    onClick={() =>
                                      setConferenceCurrentPage(page)
                                    }
                                    className={`px-3 py-1 text-sm rounded ${
                                      page === conferenceCurrentPage
                                        ? 'bg-purple-600 text-white'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                  >
                                    {page}
                                  </button>
                                ))}
                              </div>

                              <button
                                onClick={() =>
                                  setConferenceCurrentPage(
                                    Math.min(
                                      totalPages,
                                      conferenceCurrentPage + 1
                                    )
                                  )
                                }
                                disabled={conferenceCurrentPage === totalPages}
                                className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                ›
                              </button>

                              <div className="text-sm text-gray-500 ml-4">
                                共 {filteredConferences.length} 筆資料
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 分頁 / 統計 */}
              {activeTab === 'manuscripts' ? (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    {/* 分頁控制 */}
                    <div className="flex items-center gap-2">
                      {/* 上一頁 */}
                      <button
                        onClick={() =>
                          handleManuscriptPageChange(
                            manuscriptPagination.currentPage - 1
                          )
                        }
                        disabled={!manuscriptPagination.hasPrevPage}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        ‹
                      </button>

                      {/* 頁碼按鈕 */}
                      {Array.from(
                        {
                          length: Math.min(5, manuscriptPagination.totalPages),
                        },
                        (_, index) => {
                          const pageNum =
                            Math.max(1, manuscriptPagination.currentPage - 2) +
                            index
                          if (pageNum > manuscriptPagination.totalPages)
                            return null

                          return (
                            <button
                              key={pageNum}
                              onClick={() =>
                                handleManuscriptPageChange(pageNum)
                              }
                              className={`px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 ${
                                pageNum === manuscriptPagination.currentPage
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : ''
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        }
                      )}

                      {/* 省略號 */}
                      {manuscriptPagination.totalPages > 5 &&
                        manuscriptPagination.currentPage <
                          manuscriptPagination.totalPages - 2 && (
                          <span className="px-3 py-1 text-sm">...</span>
                        )}

                      {/* 最後一頁 */}
                      {manuscriptPagination.totalPages > 5 &&
                        manuscriptPagination.currentPage <
                          manuscriptPagination.totalPages - 2 && (
                          <button
                            onClick={() =>
                              handleManuscriptPageChange(
                                manuscriptPagination.totalPages
                              )
                            }
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                          >
                            {manuscriptPagination.totalPages}
                          </button>
                        )}

                      {/* 下一頁 */}
                      <button
                        onClick={() =>
                          handleManuscriptPageChange(
                            manuscriptPagination.currentPage + 1
                          )
                        }
                        disabled={!manuscriptPagination.hasNextPage}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        ›
                      </button>
                    </div>

                    {/* 統計資訊 */}
                    <div className="text-sm text-gray-500">
                      共 {manuscriptPagination.total} 篇稿件
                      {manuscriptPagination.totalPages > 1 && (
                        <span>
                          {' '}
                          · 第 {manuscriptPagination.currentPage}/
                          {manuscriptPagination.totalPages} 頁
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* 手機版佈局 - 稿件卡片式顯示 */}
            <div className="md:hidden">
              {activeTab === 'manuscripts' && (
                <div className="space-y-4">
                  {sortedAssignments.map((assignment, index) => (
                    <div
                      key={assignment.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm cursor-pointer"
                      onClick={() =>
                        router.push(`/editor/submissions/${assignment.id}`)
                      }
                    >
                      {/* 上方區域：編號和狀態 */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-blue-600 font-medium text-sm">
                          #{formatSubmissionNumber(assignment)}
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            assignment.status === 'accepted'
                              ? 'bg-green-100 text-green-800'
                              : assignment.status === 'under_review'
                              ? 'bg-amber-100 text-amber-800'
                              : assignment.status === 'submitted'
                              ? 'bg-blue-100 text-blue-800'
                              : assignment.status === 'revision_required'
                              ? 'bg-orange-100 text-orange-800'
                              : assignment.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {getStatusText(assignment.status)}
                        </span>
                      </div>

                      {/* 標題和作者 */}
                      <div className="mb-3">
                        <h3 className="font-medium text-foreground mb-2 leading-tight">
                          {assignment.title}
                        </h3>
                        <div className="text-sm text-gray-600">
                          作者：{assignment.authors.join('、')}
                        </div>
                      </div>

                      {/* 審稿人資訊 */}
                      {assignment.assignedReviewer &&
                        assignment.assignedReviewer.length > 0 && (
                          <div className="mb-3 p-2 bg-gray-50 rounded">
                            <div className="text-xs text-gray-500 mb-1">
                              審稿人
                            </div>
                            <div className="text-sm text-foreground">
                              {assignment.assignedReviewer.join('、')}
                            </div>
                            {assignment.assignDate && (
                              <div className="text-xs text-gray-500 mt-1">
                                指派：{assignment.assignDate}
                              </div>
                            )}
                          </div>
                        )}

                      {/* 狀態資訊 */}
                      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                        {assignment.reviewStatus && (
                          <div>
                            <div className="text-xs text-gray-500">
                              審稿狀態
                            </div>
                            <div
                              className={`${
                                assignment.reviewStatus === '已完成'
                                  ? 'text-green-600'
                                  : assignment.reviewStatus === '待分配'
                                  ? 'text-gray-500'
                                  : 'text-amber-600'
                              }`}
                            >
                              {assignment.reviewStatus}
                            </div>
                          </div>
                        )}

                        {assignment.finalDecision && (
                          <div>
                            <div className="text-xs text-gray-500">
                              最終決議
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 ${
                                assignment.finalDecision === 'ACCEPT'
                                  ? 'text-green-600'
                                  : assignment.finalDecision === 'REJECT'
                                  ? 'text-red-600'
                                  : 'text-orange-600'
                              }`}
                            >
                              {assignment.finalDecision === 'ACCEPT' && (
                                <CheckCircle className="w-3 h-3" />
                              )}
                              {assignment.finalDecision === 'REJECT' && (
                                <AlertCircle className="w-3 h-3" />
                              )}
                              {assignment.finalDecision === 'REVISE' && (
                                <AlertCircle className="w-3 h-3" />
                              )}
                              {assignment.finalDecision === 'ACCEPT'
                                ? '接受'
                                : assignment.finalDecision === 'REJECT'
                                ? '拒絕'
                                : '需修改'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 操作按鈕 */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          點擊卡片查看詳情
                        </div>
                        <div
                          className="relative"
                          onClick={e => e.stopPropagation()}
                        >
                          <DropdownMenu assignment={assignment} />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 手機版分頁控制 */}
                  {manuscriptPagination.totalPages > 1 && (
                    <div className="flex flex-col items-center gap-3 mt-6 p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleManuscriptPageChange(
                              manuscriptPagination.currentPage - 1
                            )
                          }
                          disabled={!manuscriptPagination.hasPrevPage}
                          className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          上一頁
                        </button>

                        <span className="px-3 py-2 text-sm text-gray-600">
                          {manuscriptPagination.currentPage} /{' '}
                          {manuscriptPagination.totalPages}
                        </span>

                        <button
                          onClick={() =>
                            handleManuscriptPageChange(
                              manuscriptPagination.currentPage + 1
                            )
                          }
                          disabled={!manuscriptPagination.hasNextPage}
                          className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          下一頁
                        </button>
                      </div>

                      <div className="text-xs text-gray-500">
                        共 {manuscriptPagination.total} 篇稿件
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 手機版人員列表 - 卡片式顯示 */}
              {activeTab === 'members' && (
                <div className="space-y-4">
                  {members
                    .filter(member => {
                      // 排除投稿人角色
                      if (member.role === 'AUTHOR') return false

                      if (memberFilter === 'all') return true
                      if (memberFilter === 'editor')
                        return (
                          member.role === 'EDITOR' ||
                          member.role === 'CHIEF_EDITOR'
                        )
                      if (memberFilter === 'reviewer')
                        return member.role === 'REVIEWER'
                      return true
                    })
                    .map(member => (
                      <div
                        key={member.id}
                        className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
                      >
                        {/* 上方區域：姓名、角色和狀態 */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground text-lg">
                              {member.name}
                            </h3>
                            <div className="text-sm text-blue-600 mt-1">
                              {getRoleText(member.role)}
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getMemberStatusColor(
                              member.status
                            )}`}
                          >
                            {getMemberStatusText(member.status)}
                          </span>
                        </div>

                        {/* 聯絡資訊 */}
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">
                            電子郵件
                          </div>
                          <div className="text-sm text-foreground break-all">
                            {member.email}
                          </div>
                        </div>

                        {/* 服務單位 */}
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">
                            服務單位
                          </div>
                          <div className="text-sm text-foreground">
                            {member.affiliation}
                          </div>
                        </div>
                        
                        {/* 職稱 */}
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">
                            職稱
                          </div>
                          <div className="text-sm text-foreground">
                            {member.position}
                          </div>
                        </div>

                        {/* ORCID ID */}
                        {member.orcidId && (
                          <div className="mb-3">
                            <div className="text-xs text-gray-500 mb-1">
                              ORCID ID
                            </div>
                            <a
                              href={`https://orcid.org/${member.orcidId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                            >
                              {member.orcidId}
                            </a>
                          </div>
                        )}

                        {/* 專業知識領域 */}
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-2">
                            專業知識領域
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {member.expertise.slice(0, 3).map((field, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                              >
                                {field.length > 15
                                  ? field.slice(0, 15) + '...'
                                  : field}
                              </span>
                            ))}
                            {member.expertise.length > 3 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                +{member.expertise.length - 3}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 操作按鈕 */}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <div className="text-xs text-gray-500">
                            人員管理操作
                          </div>
                          <div className="relative">
                            <button
                              data-dropdown
                              onClick={e => {
                                e.stopPropagation()
                                console.log(
                                  'Three dots clicked (card view), toggling dropdown for:',
                                  member.id
                                )
                                setOpenDropdown(
                                  openDropdown === member.id ? null : member.id
                                )
                              }}
                              className="text-gray-500 hover:text-gray-700 p-1"
                              title="更多操作"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openDropdown === member.id && (
                              <div
                                data-dropdown-content
                                className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]"
                              >
                                <div className="py-1">
                                  <button
                                    onClick={e => {
                                      e.stopPropagation()
                                      console.log(
                                        'Edit from dropdown clicked (card view) for:',
                                        member.id
                                      )
                                      handleEditMember(member.id)
                                      setOpenDropdown(null)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    編輯資料
                                  </button>

                                  {(member.role === 'REVIEWER' ||
                                    member.role === 'CHIEF_EDITOR') && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation()
                                        console.log(
                                          'Review history from dropdown clicked (card view) for:',
                                          member.id
                                        )
                                        handleReviewHistory(member.id)
                                        setOpenDropdown(null)
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                      審稿紀錄
                                    </button>
                                  )}

                                  <button
                                    onClick={e => {
                                      e.stopPropagation()
                                      handleDeleteMember(member.id)
                                      setOpenDropdown(null)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    刪除人員
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* 手機版人員分頁控制 */}
                  {memberPagination.totalPages > 1 && (
                    <div className="flex flex-col items-center gap-3 mt-6 p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleMemberPageChange(
                              memberPagination.currentPage - 1
                            )
                          }
                          disabled={!memberPagination.hasPrevPage}
                          className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          上一頁
                        </button>

                        <span className="px-3 py-2 text-sm text-gray-600">
                          {memberPagination.currentPage} /{' '}
                          {memberPagination.totalPages}
                        </span>

                        <button
                          onClick={() =>
                            handleMemberPageChange(
                              memberPagination.currentPage + 1
                            )
                          }
                          disabled={!memberPagination.hasNextPage}
                          className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          下一頁
                        </button>
                      </div>

                      <div className="text-xs text-gray-500">
                        共 {memberPagination.total} 位成員
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* 編輯會議模態視窗 */}
        {showEditConferenceModal && editingConference && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              {/* 標題列 */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">編輯會議</h3>
                <button
                  onClick={() => {
                    setShowEditConferenceModal(false)
                    setEditingConference(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 表單內容 */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    會議年份
                  </label>
                  <input
                    type="number"
                    value={editingConference.year}
                    onChange={e =>
                      setEditingConference({
                        ...editingConference,
                        year: parseInt(e.target.value) || 2025,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="例如: 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    會議標題
                  </label>
                  <input
                    type="text"
                    value={editingConference.title}
                    onChange={e =>
                      setEditingConference({
                        ...editingConference,
                        title: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="請輸入會議標題"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    會議子題
                  </label>
                  <div className="space-y-2">
                    {editingConference.subtopics.map((topic, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={topic}
                          onChange={e => {
                            const newSubtopics = [
                              ...editingConference.subtopics,
                            ]
                            newSubtopics[index] = e.target.value
                            setEditingConference({
                              ...editingConference,
                              subtopics: newSubtopics,
                            })
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="請輸入子題"
                        />
                        <button
                          onClick={() => {
                            const newSubtopics =
                              editingConference.subtopics.filter(
                                (_, i) => i !== index
                              )
                            setEditingConference({
                              ...editingConference,
                              subtopics: newSubtopics,
                            })
                          }}
                          className="px-3 py-2 text-red-600 hover:text-red-800"
                          disabled={editingConference.subtopics.length <= 1}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setEditingConference({
                          ...editingConference,
                          subtopics: [...editingConference.subtopics, ''],
                        })
                      }}
                      className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600"
                    >
                      + 新增子題
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <label className="block text-sm font-medium text-gray-700">
                    開放狀態
                  </label>
                  <button
                    onClick={() =>
                      setEditingConference({
                        ...editingConference,
                        isActive: !editingConference.isActive,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editingConference.isActive
                        ? 'bg-purple-600'
                        : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editingConference.isActive
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-500">
                    {editingConference.isActive ? '開放' : '關閉'}
                  </span>
                </div>
              </div>

              {/* 按鈕區 */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditConferenceModal(false)
                    setEditingConference(null)
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    // 前端權限檢查
                    if (!hasRole('CHIEF_EDITOR')) {
                      setError('只有主編可以編輯會議')
                      return
                    }
                    
                    console.log('=== 編輯會議 - 前端權限檢查通過 ===')
                    
                    try {
                      // 準備要傳送到 API 的資料
                      const conferenceData = {
                        year: editingConference.year,
                        title: editingConference.title,
                        tracks: editingConference.subtopics.reduce((acc, topic, index) => ({
                          ...acc,
                          [`topic_${index + 1}`]: topic
                        }), {}),
                        isActive: editingConference.isActive,
                      }

                      console.log('正在更新會議:', conferenceData)
                      
                      // 呼叫 API 更新到資料庫
                      const response = await fetch('/api/conferences', {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(conferenceData),
                      })

                      if (!response.ok) {
                        const errorData = await response.json()
                        throw new Error(errorData.error || '更新會議失敗')
                      }

                      const result = await response.json()
                      console.log('會議更新成功:', result)

                      // 重新載入會議列表和年份選單
                      await loadConferenceList()
                      await loadAvailableYears()

                      // 關閉模態視窗並重置狀態
                      setShowEditConferenceModal(false)
                      setEditingConference(null)
                      
                      alert('會議更新成功！')
                    } catch (error: any) {
                      console.error('更新會議失敗:', error)
                      setError('更新會議失敗: ' + error.message)
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  儲存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 新增會議模態視窗 */}
        {showAddConferenceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              {/* 標題列 */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">新增會議</h3>
                <button
                  onClick={() => {
                    setShowAddConferenceModal(false)
                    setNewConferenceSubtopics([''])
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 表單內容 */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    會議年份
                  </label>
                  <input
                    type="number"
                    defaultValue={new Date().getFullYear()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="例如: 2025"
                    id="add-year"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    會議標題
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="請輸入會議標題"
                    id="add-title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    會議子題
                  </label>
                  <div className="space-y-2">
                    {newConferenceSubtopics.map((topic, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={topic}
                          onChange={e => {
                            const newSubtopics = [...newConferenceSubtopics]
                            newSubtopics[index] = e.target.value
                            setNewConferenceSubtopics(newSubtopics)
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="請輸入子題"
                        />
                        <button
                          onClick={() => {
                            const newSubtopics = newConferenceSubtopics.filter(
                              (_, i) => i !== index
                            )
                            setNewConferenceSubtopics(newSubtopics)
                          }}
                          className="px-3 py-2 text-red-600 hover:text-red-800"
                          disabled={newConferenceSubtopics.length <= 1}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setNewConferenceSubtopics([
                          ...newConferenceSubtopics,
                          '',
                        ])
                      }}
                      className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600"
                    >
                      + 新增子題
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <label className="block text-sm font-medium text-gray-700">
                    開放狀態
                  </label>
                  <button
                    onClick={e => {
                      const button = e.currentTarget
                      const isActive = button.dataset.active === 'true'
                      button.dataset.active = (!isActive).toString()
                      button.className = `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        !isActive ? 'bg-purple-600' : 'bg-gray-300'
                      }`
                      const span = button.querySelector('span')
                      if (span) {
                        span.className = `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          !isActive ? 'translate-x-6' : 'translate-x-1'
                        }`
                      }
                      const statusText =
                        button.parentElement?.querySelector('.status-text')
                      if (statusText) {
                        statusText.textContent = !isActive ? '開放' : '關閉'
                      }
                    }}
                    data-active="true"
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-purple-600"
                    id="add-active"
                  >
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                  </button>
                  <span className="text-sm text-gray-500 status-text">
                    開放
                  </span>
                </div>
              </div>

              {/* 按鈕區 */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddConferenceModal(false)
                    setNewConferenceSubtopics([''])
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    // 前端權限檢查
                    if (!hasRole('CHIEF_EDITOR')) {
                      setError('只有主編可以新增會議')
                      return
                    }
                    
                    console.log('=== 新增會議 - 前端權限檢查通過 ===')
                    
                    const yearInput = document.getElementById(
                      'add-year'
                    ) as HTMLInputElement
                    const titleInput = document.getElementById(
                      'add-title'
                    ) as HTMLInputElement
                    const activeButton = document.getElementById(
                      'add-active'
                    ) as HTMLButtonElement

                    const filteredSubtopics = newConferenceSubtopics.filter(
                      topic => topic.trim() !== ''
                    )

                    // 準備要傳送到 API 的資料
                    const year = parseInt(yearInput.value) || new Date().getFullYear()
                    const conferenceData = {
                      year,
                      title: titleInput.value || '未命名會議',
                      tracks: filteredSubtopics.length > 0 
                        ? filteredSubtopics.reduce((acc, topic, index) => ({
                            ...acc,
                            [`topic_${index + 1}`]: topic
                          }), {})
                        : { 'default_topic': '未設定子題' },
                      settings: {
                        submissionDeadline: `${year}-12-31`,
                        reviewDeadline: `${year + 1}-02-28`,
                        notificationDate: `${year + 1}-03-15`,
                        conferenceDate: `${year + 1}-05-15`
                      },
                      isActive: activeButton.dataset.active === 'true',
                    }

                    try {
                      console.log('正在新增會議:', conferenceData)
                      
                      // 呼叫 API 保存到資料庫
                      const response = await fetch('/api/conferences', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(conferenceData),
                      })

                      if (!response.ok) {
                        const errorData = await response.json()
                        throw new Error(errorData.error || '新增會議失敗')
                      }

                      const result = await response.json()
                      console.log('會議新增成功:', result)

                      // 重新載入會議列表和年份選單
                      await loadConferenceList()
                      await loadAvailableYears()

                      // 自動選中新創建的會議
                      if (result.id) {
                        setSelectedConferenceId(result.id)
                        setYear(result.year)
                      }

                      // 關閉模態視窗並重置狀態
                      setShowAddConferenceModal(false)
                      setNewConferenceSubtopics([''])
                      
                      alert('會議新增成功！')
                    } catch (error: any) {
                      console.error('新增會議失敗:', error)
                      setError('新增會議失敗: ' + error.message)
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  新增
                </button>
              </div>
            </div>
          </div>
        )}

        <Footer />

        {/* 分配審稿人模態視窗 */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg w-full max-w-[1600px] h-[90vh] overflow-hidden shadow-2xl flex flex-col">
              {/* 標題列 */}
              <div className="px-6 py-4 flex items-center justify-center relative border-b border-gray-200">
                <h3 className="text-40M font-medium text-gray-900">
                  指派審稿人
                </h3>
                <button
                  onClick={handleCloseAssignModal}
                  className="absolute right-6 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-[56px] h-[56px]" />
                </button>
              </div>

              {/* 內容區域 */}
              <div className="p-[64px] flex-1 overflow-hidden flex flex-col">
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {/* 審稿人列表表格 */}
                <div className="mb-6 flex-1 min-h-0">
                  {availableReviewers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      載入審稿人列表中...
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden h-full flex flex-col">
                      <div className="bg-gray-50 px-4 py-3 flex border-b">
                        <div className="w-24 text-24M font-medium text-gray-500">
                          選擇
                        </div>
                        <div className="w-40 text-24M font-medium text-gray-500">
                          審稿人
                        </div>
                        <div className="w-[280px] text-24M font-medium text-gray-500">
                          服務單位
                        </div>
                        <div className="w-[160px] text-24M font-medium text-gray-500">
                          職稱
                        </div>
                        <div className="w-48 text-24M font-medium text-gray-500">
                          專業領域
                        </div>
                        <div className="w-48 text-24M font-medium text-gray-500">
                          歷史審稿次數
                        </div>
                        <div className="w-48 text-24M font-medium text-gray-500">
                          最近審稿日期
                        </div>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="divide-y divide-gray-200">
                          {availableReviewers.map(reviewer => (
                            <div
                              key={reviewer.id}
                              className={`px-4 py-4 flex hover:bg-gray-50 ${
                                !reviewer.isAvailable ? 'opacity-60' : ''
                              }`}
                            >
                              <div className="w-24 flex items-center">
                                <input
                                  type="checkbox"
                                  checked={selectedReviewers.includes(
                                    reviewer.id
                                  )}
                                  onChange={() =>
                                    reviewer.isAvailable &&
                                    handleReviewerToggle(reviewer.id)
                                  }
                                  disabled={!reviewer.isAvailable}
                                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                              </div>
                              <div className="w-40 text-24M font-medium text-gray-900">
                                {reviewer.displayName}
                              </div>
                              <div className="w-[280px] text-24M text-gray-600">
                                暫無服務單位資料
                              </div>
                              <div className="w-[160px] text-24M text-gray-600">
                                暫無職稱資料
                              </div>
                              <div className="w-48 text-24M text-gray-600">
                                {reviewer.expertise.length > 0
                                  ? reviewer.expertise.slice(0, 2).join('、')
                                  : '暫無專業領域資料'}
                              </div>
                              <div className="w-48 text-24M text-gray-600">
                                {reviewer.completedReviews}
                              </div>
                              <div className="w-48 text-24M text-gray-600">
                                {reviewer.completedReviews > 0
                                  ? '暫無日期資料'
                                  : '無'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 下半部：左右兩欄佈局 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-shrink-0">
                  {/* 左側：審查邀請內容設定 */}
                  <div>
                    <h4 className="text-36M font-bold text-gray-900 mb-4">
                      審查邀請內容設定
                    </h4>
                    <div className="space-y-4">
                      <textarea
                        className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        value={invitationContent}
                        onChange={e => setInvitationContent(e.target.value)}
                        placeholder="請輸入邀請內容..."
                      />
                    </div>
                  </div>

                  {/* 右側：日期設定和按鈕 */}
                  <div>
                    <div className="space-y-6">
                      {/* 回覆截止日 */}
                      <div>
                        <label className="block text-24M font-medium text-gray-900 mb-2">
                          回覆截止日
                        </label>
                        <input
                          type="date"
                          value={reviewDueDate}
                          onChange={e => setReviewDueDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      {/* 審查截止日 */}
                      <div>
                        <label className="block text-24M font-medium text-gray-900 mb-2">
                          審查截止日
                        </label>
                        <input
                          type="date"
                          value={(() => {
                            if (!reviewDueDate) return ''
                            const date = new Date(reviewDueDate)
                            date.setDate(date.getDate() + 15)
                            return date.toISOString().split('T')[0]
                          })()}
                          onChange={() => {}} // 自動計算，不需要手動修改
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                          readOnly
                        />
                      </div>

                      {/* 發送按鈕 */}
                      <div className="pt-4">
                        <button
                          onClick={handleAssignSubmit}
                          disabled={
                            selectedReviewers.length === 0 ||
                            isAssigning ||
                            !reviewDueDate
                          }
                          className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isAssigning ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              發送中...
                            </>
                          ) : (
                            `發送指派信 (${selectedReviewers.length}位)`
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 新增人員模態視窗 */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              {/* 標題列 */}
              <div className="px-6 py-4 flex items-center justify-center relative border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">新增人員</h3>
                <button
                  onClick={handleCloseAddMemberModal}
                  className="absolute right-6 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 內容區域 */}
              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {/* 第一行：姓名和電子信箱 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        <span className="text-red-500">*</span>姓名
                      </label>
                      <input
                        type="text"
                        value={newMemberData.name}
                        onChange={e =>
                          setNewMemberData({
                            ...newMemberData,
                            name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="姓名"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        <span className="text-red-500">*</span>電子郵件
                      </label>
                      <input
                        type="email"
                        value={newMemberData.email}
                        onChange={e =>
                          setNewMemberData({
                            ...newMemberData,
                            email: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e-mail"
                      />
                    </div>
                  </div>

                  {/* 第二行：服務單位、職稱和ORCID ID */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        <span className="text-red-500">*</span>服務單位
                      </label>
                      <input
                        type="text"
                        value={newMemberData.affiliation}
                        onChange={e =>
                          setNewMemberData({
                            ...newMemberData,
                            affiliation: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="請輸入服務單位"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        職稱
                      </label>
                      <input
                        type="text"
                        value={newMemberData.position}
                        onChange={e =>
                          setNewMemberData({
                            ...newMemberData,
                            position: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="請輸入職稱"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        ORCID ID
                      </label>
                      <input
                        type="text"
                        value={newMemberData.orcidId}
                        onChange={e =>
                          setNewMemberData({
                            ...newMemberData,
                            orcidId: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="ORCID ID"
                      />
                    </div>
                  </div>

                  {/* 專業知識領域 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      <span className="text-red-500">*</span>
                      專業知識領域(至多勾選五個)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {expertiseOptions.map(option => (
                        <label key={option} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newMemberData.expertise.includes(option)}
                            onChange={() => handleExpertiseToggle(option)}
                            disabled={
                              newMemberData.expertise.length >= 5 &&
                              !newMemberData.expertise.includes(option)
                            }
                            className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {option}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 人員類別 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      <span className="text-red-500">*</span>人員類別
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="role"
                          value="CHIEF_EDITOR"
                          checked={newMemberData.role === 'CHIEF_EDITOR'}
                          onChange={e =>
                            setNewMemberData({
                              ...newMemberData,
                              role: e.target.value as any,
                            })
                          }
                          className="mr-2 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">主編</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="role"
                          value="EDITOR"
                          checked={newMemberData.role === 'EDITOR'}
                          onChange={e =>
                            setNewMemberData({
                              ...newMemberData,
                              role: e.target.value as any,
                            })
                          }
                          className="mr-2 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">編輯</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="role"
                          value="REVIEWER"
                          checked={newMemberData.role === 'REVIEWER'}
                          onChange={e =>
                            setNewMemberData({
                              ...newMemberData,
                              role: e.target.value as any,
                            })
                          }
                          className="mr-2 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">審稿人</span>
                      </label>
                    </div>
                  </div>

                  {/* 按鈕 */}
                  <div className="flex gap-3 pt-6">
                    <button
                      onClick={handleSaveForLater}
                      disabled={
                        isAddingMember ||
                        !newMemberData.name.trim() ||
                        !newMemberData.email.trim() ||
                        !newMemberData.affiliation.trim() ||
                        newMemberData.expertise.length === 0
                      }
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      保存但稍後啟用
                    </button>
                    <button
                      onClick={handleAddMember}
                      disabled={
                        isAddingMember ||
                        !newMemberData.name.trim() ||
                        !newMemberData.email.trim() ||
                        !newMemberData.affiliation.trim() ||
                        newMemberData.expertise.length === 0
                      }
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                    >
                      {isAddingMember ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          寄送中...
                        </>
                      ) : (
                        '寄送啟用信'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 編輯人員模態視窗 */}
        {showEditMemberModal && editingMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              {/* 標題列 */}
              <div className="px-6 py-4 flex items-center justify-center relative border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  編輯人員資料
                </h3>
                <button
                  onClick={handleCloseEditMemberModal}
                  className="absolute right-6 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 表單內容 */}
              <div className="px-6 py-6">
                {/* 錯誤訊息 */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-6">
                  {/* 基本資料 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        姓名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editMemberData.name}
                        onChange={e =>
                          setEditMemberData(prev => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="請輸入姓名"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        信箱 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={editMemberData.email}
                        onChange={e =>
                          setEditMemberData(prev => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="請輸入信箱"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        服務單位 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editMemberData.affiliation}
                        onChange={e =>
                          setEditMemberData(prev => ({
                            ...prev,
                            affiliation: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="請輸入服務單位"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        職稱
                      </label>
                      <input
                        type="text"
                        value={editMemberData.position}
                        onChange={e =>
                          setEditMemberData(prev => ({
                            ...prev,
                            position: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="請輸入職稱"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ORCID ID
                    </label>
                    <input
                      type="text"
                      value={editMemberData.orcidId}
                      onChange={e =>
                        setEditMemberData(prev => ({
                          ...prev,
                          orcidId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="請輸入 ORCID ID (選填)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      角色
                    </label>
                    <select
                      value={editMemberData.role}
                      onChange={e =>
                        setEditMemberData(prev => ({
                          ...prev,
                          role: e.target.value as
                            | 'CHIEF_EDITOR'
                            | 'EDITOR'
                            | 'REVIEWER',
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="REVIEWER">審查者</option>
                      <option value="EDITOR">編輯者</option>
                      <option value="CHIEF_EDITOR">主編輯者</option>
                    </select>
                  </div>

                  {/* 專業知識領域 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <span className="text-red-500">*</span>
                      專業知識領域(至多勾選五個)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4">
                      {expertiseOptions.map(option => (
                        <label
                          key={option}
                          className="flex items-center cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={editMemberData.expertise.includes(option)}
                            onChange={() => handleEditExpertiseToggle(option)}
                            disabled={
                              editMemberData.expertise.length >= 5 &&
                              !editMemberData.expertise.includes(option)
                            }
                            className="sr-only"
                          />
                          <div
                            className={`w-4 h-4 border-2 rounded mr-3 flex items-center justify-center transition-colors ${
                              editMemberData.expertise.includes(option)
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-gray-300 group-hover:border-blue-400'
                            }`}
                          >
                            {editMemberData.expertise.includes(option) && (
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                            {option}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      已選擇: {editMemberData.expertise.length} 項
                    </p>
                  </div>

                  {/* 按鈕 */}
                  <div className="flex gap-3 pt-6">
                    <button
                      onClick={handleCloseEditMemberModal}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleUpdateMember}
                      disabled={
                        isEditingMember ||
                        !editMemberData.name.trim() ||
                        !editMemberData.email.trim() ||
                        !editMemberData.affiliation.trim() ||
                        editMemberData.expertise.length === 0
                      }
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                    >
                      {isEditingMember ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          更新中...
                        </>
                      ) : (
                        '更新資料'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 審稿紀錄模態視窗 */}
        {showReviewHistoryModal && reviewHistoryMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
              {/* 標題列 */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {reviewHistoryMember.name} 的審稿紀錄
                </h3>
                <button
                  onClick={handleCloseReviewHistoryModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 內容區域 */}
              <div className="px-6 py-6">
                {loadingReviewHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-600">
                      載入審稿紀錄中...
                    </span>
                  </div>
                ) : reviewHistoryData.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暫無審稿紀錄</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviewHistoryData.map(record => (
                      <div
                        key={record.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-lg font-medium text-gray-900 mb-2">
                              {record.submissionTitle}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">
                              作者：{record.authors.join('、')}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                              {record.conferenceYear && (
                                <div>會議年份：{record.conferenceYear}</div>
                              )}
                              {record.track && (
                                <div>主題軌道：{record.track}</div>
                              )}
                              <div>指派日期：{record.assignedDate}</div>
                              <div>投稿日期：{record.submittedDate}</div>
                              <div>
                                審稿日期：{record.reviewedDate || '尚未完成'}
                              </div>
                              {record.dueDate && (
                                <div>截止日期：{record.dueDate}</div>
                              )}
                            </div>

                            {/* 審稿評分 */}
                            {record.review?.score && (
                              <div className="mb-2 text-sm text-gray-600">
                                評分：{record.review.score}/10 分
                              </div>
                            )}
                          </div>
                          <div className="ml-4 flex flex-col gap-2">
                            {/* 審稿狀態 */}
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                record.status === 'SUBMITTED'
                                  ? 'bg-green-100 text-green-800'
                                  : record.status === 'ACCEPTED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : record.status === 'DECLINED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {record.status === 'SUBMITTED'
                                ? '已提交'
                                : record.status === 'ACCEPTED'
                                ? '已接受'
                                : record.status === 'DECLINED'
                                ? '已拒絕'
                                : record.status === 'PENDING'
                                ? '待處理'
                                : record.status}
                            </span>

                            {/* 審稿建議 */}
                            {record.decision &&
                              record.decision !== 'pending' &&
                              record.decision !== 'in_progress' && (
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    record.decision === 'accepted'
                                      ? 'bg-green-100 text-green-800'
                                      : record.decision === 'revision_required'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {record.decision === 'accepted'
                                    ? '建議接受'
                                    : record.decision === 'revision_required'
                                    ? '建議修改'
                                    : '建議拒絕'}
                                </span>
                              )}
                          </div>
                        </div>

                        {/* 審稿意見 */}
                        {(record.review?.commentToEditor ||
                          record.review?.commentToAuthor ||
                          record.comments) && (
                          <div className="mt-3 space-y-2">
                            {record.review?.commentToEditor && (
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <h5 className="text-sm font-medium text-blue-700 mb-1">
                                  給編輯的意見：
                                </h5>
                                <p className="text-sm text-blue-600">
                                  {record.review.commentToEditor}
                                </p>
                              </div>
                            )}
                            {record.review?.commentToAuthor && (
                              <div className="p-3 bg-gray-100 rounded-lg">
                                <h5 className="text-sm font-medium text-gray-700 mb-1">
                                  給作者的意見：
                                </h5>
                                <p className="text-sm text-gray-600">
                                  {record.review.commentToAuthor}
                                </p>
                              </div>
                            )}
                            {record.comments &&
                              !record.review?.commentToEditor &&
                              !record.review?.commentToAuthor && (
                                <div className="p-3 bg-gray-100 rounded-lg">
                                  <h5 className="text-sm font-medium text-gray-700 mb-1">
                                    審稿意見：
                                  </h5>
                                  <p className="text-sm text-gray-600">
                                    {record.comments}
                                  </p>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 底部按鈕 */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleCloseReviewHistoryModal}
                  className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  )
}