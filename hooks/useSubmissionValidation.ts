import { useState } from 'react'

interface SubmissionData {
  paperType: string
  conferenceSubject: string
  title: string
  abstract: string
  keywords: string
  file: File | null
  authors: Array<{
    name: string
    institution: string
    email: string
    isCorresponding: boolean
  }>
  agreements: {
    originalWork: boolean
    noConflictOfInterest: boolean
    consentToPublish: boolean
  }
}

export function useSubmissionValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const checkStepValid = (step: number, submissionData: SubmissionData): boolean => {
    const checkErrors: Record<string, string> = {}

    switch (step) {
      case 1:
        if (!submissionData.paperType) checkErrors.paperType = '請選擇論文類型'
        if (!submissionData.conferenceSubject) checkErrors.conferenceSubject = '請選擇會議子題'
        break
      case 2:
        if (!submissionData.title.trim()) checkErrors.title = '請輸入標題'
        if (!submissionData.abstract.trim()) checkErrors.abstract = '請輸入摘要'
        if (!submissionData.keywords.trim()) checkErrors.keywords = '請輸入關鍵詞'
        break
      case 3:
        if (!submissionData.file) checkErrors.file = '請上傳稿件'
        break
      case 4:
        submissionData.authors.forEach((author, index) => {
          if (!author.name.trim()) checkErrors[`author_${index}_name`] = '請輸入作者姓名'
          if (!author.institution.trim()) checkErrors[`author_${index}_institution`] = '請輸入服務機構'
          if (!author.email.trim()) checkErrors[`author_${index}_email`] = '請輸入電子郵件'
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author.email)) {
            checkErrors[`author_${index}_email`] = '請輸入有效的電子郵件'
          }
        })
        break
      case 5:
        if (!submissionData.agreements.originalWork) checkErrors.originalWork = '必須確認此為原創作品'
        if (!submissionData.agreements.noConflictOfInterest) checkErrors.noConflictOfInterest = '必須聲明無利益衝突'
        if (!submissionData.agreements.consentToPublish) checkErrors.consentToPublish = '必須同意發表條款'
        break
    }

    return Object.keys(checkErrors).length === 0
  }

  const validateStep = (step: number, submissionData: SubmissionData): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 1:
        if (!submissionData.paperType) newErrors.paperType = '請選擇論文類型'
        if (!submissionData.conferenceSubject) newErrors.conferenceSubject = '請選擇會議子題'
        break
      case 2:
        if (!submissionData.title.trim()) newErrors.title = '請輸入標題'
        if (!submissionData.abstract.trim()) newErrors.abstract = '請輸入摘要'
        if (!submissionData.keywords.trim()) newErrors.keywords = '請輸入關鍵詞'
        break
      case 3:
        if (!submissionData.file) newErrors.file = '請上傳稿件'
        break
      case 4:
        submissionData.authors.forEach((author, index) => {
          if (!author.name.trim()) newErrors[`author_${index}_name`] = '請輸入作者姓名'
          if (!author.institution.trim()) newErrors[`author_${index}_institution`] = '請輸入服務機構'
          if (!author.email.trim()) newErrors[`author_${index}_email`] = '請輸入電子郵件'
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author.email)) {
            newErrors[`author_${index}_email`] = '請輸入有效的電子郵件'
          }
        })
        break
      case 5:
        if (!submissionData.agreements.originalWork) newErrors.originalWork = '必須確認此為原創作品'
        if (!submissionData.agreements.noConflictOfInterest) newErrors.noConflictOfInterest = '必須聲明無利益衝突'
        if (!submissionData.agreements.consentToPublish) newErrors.consentToPublish = '必須同意發表條款'
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const canGoToStep = (targetStep: number, currentStep: number, submissionData: SubmissionData): boolean => {
    if (targetStep <= currentStep) return true
    
    for (let step = 1; step < targetStep; step++) {
      if (!checkStepValid(step, submissionData)) {
        return false
      }
    }
    return true
  }

  return {
    errors,
    setErrors,
    checkStepValid,
    validateStep,
    canGoToStep
  }
}