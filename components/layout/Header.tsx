'use client'

import Link from 'next/link'
import { Search, Menu, X } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  currentPage?: string
}

export default function Header({ currentPage }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const navigationItems = [
    { label: '期刊資訊', href: '/journal' },
    { label: '作者須知', href: '/guidelines' },
    { label: '會議論文集', href: '/proceedings' },
    { label: '會議論文投稿', href: '/submit', active: currentPage === 'submit' }
  ]

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
              <Link
                key={index}
                href={item.href}
                className={`py-[32px] px-[48px] text-24M font-medium transition-colors hover:bg-author ${
                  item.active
                    ? 'bg-primary text-white rounded-[8px]'
                    : 'text-foreground rounded-[8px]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button className="w-10 h-10 flex items-center justify-center hover:bg-accent rounded-md transition-colors">
            <Search className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* 手機版選單按鈕 */}
        <div className="lg:hidden flex items-center gap-2">
          <button className="w-10 h-10 flex items-center justify-center hover:bg-accent rounded-md transition-colors">
            <Search className="w-5 h-5 text-foreground" />
          </button>
          <button
            className="w-10 h-10 flex items-center justify-center hover:bg-accent rounded-md transition-colors"
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
              <Link
                key={index}
                href={item.href}
                className={`py-4 px-6 text-base font-medium border-b border-[#00182C26] last:border-b-0 transition-colors hover:bg-accent ${
                  item.active ? 'bg-primary text-white' : 'text-foreground'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

    </header>
  )
}