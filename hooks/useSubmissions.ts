import { useState, useEffect, useCallback } from 'react'
import { submissionApi, type SubmissionsResponse, type Submission, type SubmissionData } from '@/lib/api/submissions'
import { SubmissionStatus } from '@prisma/client'

export const useSubmissions = (year?: number, status?: string) => {
  const [data, setData] = useState<SubmissionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await submissionApi.getSubmissions(year, status)
      setData(result)
    } catch (err: any) {
      console.error('取得投稿列表失敗:', err)
      setError(err.response?.data?.error || err.message || '取得投稿列表失敗')
    } finally {
      setLoading(false)
    }
  }, [year, status])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const refetch = useCallback(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  return {
    submissions: data?.submissions || [],
    stats: data?.stats || {
      draft: 0,
      submitted: 0,
      underReview: 0,
      revisionRequired: 0,
      accepted: 0,
      rejected: 0,
      withdrawn: 0
    },
    conference: data?.conference,
    loading,
    error,
    refetch
  }
}

export const useSubmission = (id: string | null) => {
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSubmission = useCallback(async () => {
    if (!id) return
    
    try {
      setLoading(true)
      setError(null)
      const result = await submissionApi.getSubmission(id)
      setSubmission(result.submission)
    } catch (err: any) {
      console.error('取得投稿詳情失敗:', err)
      setError(err.response?.data?.error || err.message || '取得投稿詳情失敗')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchSubmission()
  }, [fetchSubmission])

  const refetch = useCallback(() => {
    fetchSubmission()
  }, [fetchSubmission])

  return {
    submission,
    loading,
    error,
    refetch
  }
}

export const useSubmissionMutations = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createSubmission = useCallback(async (data: SubmissionData) => {
    try {
      setLoading(true)
      setError(null)
      const result = await submissionApi.createSubmission(data)
      return result
    } catch (err: any) {
      console.error('建立投稿失敗:', err)
      const errorMessage = err.response?.data?.error || err.message || '建立投稿失敗'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSubmission = useCallback(async (id: string, data: Partial<SubmissionData>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await submissionApi.updateSubmission(id, data)
      return result
    } catch (err: any) {
      console.error('更新投稿失敗:', err)
      const errorMessage = err.response?.data?.error || err.message || '更新投稿失敗'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteSubmission = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      const result = await submissionApi.deleteSubmission(id)
      return result
    } catch (err: any) {
      console.error('刪除投稿失敗:', err)
      const errorMessage = err.response?.data?.error || err.message || '刪除投稿失敗'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const saveDraft = useCallback(async (data: SubmissionData) => {
    try {
      setLoading(true)
      setError(null)
      const result = await submissionApi.saveDraft(data)
      return result
    } catch (err: any) {
      console.error('保存草稿失敗:', err)
      const errorMessage = err.response?.data?.error || err.message || '保存草稿失敗'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const submitSubmission = useCallback(async (data: SubmissionData) => {
    try {
      setLoading(true)
      setError(null)
      const result = await submissionApi.submitSubmission(data)
      return result
    } catch (err: any) {
      console.error('提交投稿失敗:', err)
      const errorMessage = err.response?.data?.error || err.message || '提交投稿失敗'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createSubmission,
    updateSubmission,
    deleteSubmission,
    saveDraft,
    submitSubmission,
    loading,
    error
  }
}