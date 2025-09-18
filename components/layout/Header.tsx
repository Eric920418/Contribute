'use client'

import Link from 'next/link'
import { Search, Menu, X, Edit3 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  currentPage?: string
  onPageChange?: (page: string) => void
  isEditMode?: boolean  // 是否為編輯模式
  onEditContent?: (contentType: string) => void  // 編輯內容回調
}

export default function Header({ currentPage, onPageChange, isEditMode, onEditContent }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  
  const navigationItems = [
    { label: '期刊資訊', key: 'journal', href: '/journal' },
    { label: '作者須知', key: 'guidelines', href: '/guidelines' },
    { label: '會議論文集', key: 'proceedings', href: '/proceedings' },
    { label: '會議論文投稿', key: 'submit', href: '/submit' }
  ]

  const handleNavClick = (item: any) => {
    if (isEditMode) {
      // 編輯模式：跳轉到編輯頁面
      router.push(`/editor/content/edit/${item.key}`)
    } else {
      // 前台模式：跳轉到主頁並帶上選項參數
      if (onPageChange) {
        // 如果有回調函數，優先使用回調（適用於在主頁內的導航）
        onPageChange(item.key)
      } else {
        // 如果沒有回調函數，跳轉到主頁並帶上選項參數
        router.push(`/?section=${item.key}`)
      }
    }
  }

  return (
    <header className="w-full bg-white border-b border-[#00182C26]">
      {/* 主要 Header */}
      <div className="w-full px-4 md:px-[56px] py-4 md:py-[32px] flex items-center justify-between">
        {/* 左側標題 */}
        <div className="flex-shrink-0 max-w-[60%] md:max-w-none">
          <h1 className="text-[#2581B4] text-sm md:text-[28px] font-medium leading-tight md:leading-[42px]">
            <span className="block">國立臺北教育大學</span>
            <span className="block">課程與教學傳播科技研究所</span>
          </h1>
        </div>

        {/* 桌面版導航 */}
        <div className="hidden lg:flex items-center gap-[32px]">
          <nav className="flex items-center">
            {navigationItems.map((item, index) => (
              <button
                key={index}
                onClick={() => handleNavClick(item)}
                className={`py-[32px] px-[48px] text-24M font-medium transition-colors hover:bg-primary hover:text-white ${
                  currentPage === item.key
                    ? 'bg-primary text-white rounded-[8px]'
                    : 'text-foreground rounded-[8px]'
                } relative`}
              >
                {item.label}
                {isEditMode && (
                  <Edit3 className="w-4 h-4 ml-2 inline-block opacity-60" />
                )}
              </button>
            ))}
          </nav>
          <button className="w-10 h-10 flex items-center justify-center hover:bg-primary rounded-md transition-colors">
            <Search className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* 手機版選單按鈕 */}
        <div className="lg:hidden flex items-center gap-2">
          <button className="w-10 h-10 flex items-center justify-center hover:bg-primary rounded-md transition-colors">
            <Search className="w-5 h-5 text-foreground" />
          </button>
          <button
            className="w-10 h-10 flex items-center justify-center hover:bg-primary rounded-md transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-5 h-5 text-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* 手機版導航選單 */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-[#00182C26]">
          <nav className="flex flex-col">
            {navigationItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  handleNavClick(item)
                  setIsMenuOpen(false)
                }}
                className={`py-4 px-6 text-base font-medium border-b border-[#00182C26] last:border-b-0 transition-colors hover:bg-primary text-left ${
                  currentPage === item.key ? 'bg-primary text-white' : 'text-foreground'
                }`}
              >
                <div className="flex items-center">
                  {item.label}
                  {isEditMode && (
                    <Edit3 className="w-4 h-4 ml-2 opacity-60" />
                  )}
                </div>
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}