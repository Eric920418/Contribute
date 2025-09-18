'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

type ContentType = 'journal' | 'guidelines' | 'proceedings' | 'submit'

interface PageContentData {
  title: string
  content: string
  updatedAt: string
}

export default function HomePage() {
  const [activeContent, setActiveContent] = useState<ContentType>('submit')
  const [contentData, setContentData] = useState<Record<string, PageContentData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const searchParams = useSearchParams()

  // 載入所有頁面內容
  useEffect(() => {
    const loadContents = async () => {
      try {
        const response = await fetch('/api/content')
        if (response.ok) {
          const data = await response.json()
          setContentData(data)
        }
      } catch (error) {
        console.error('載入內容失敗:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadContents()
  }, [])

  // 處理 URL 參數中的 section
  useEffect(() => {
    const section = searchParams.get('section')
    if (section && ['journal', 'guidelines', 'proceedings', 'submit'].includes(section)) {
      setActiveContent(section as ContentType)
    }
  }, [searchParams])

  // 通用內容渲染組件
  const DynamicContent = ({ 
    contentType, 
    onNavigate, 
    defaultContent 
  }: { 
    contentType: ContentType
    onNavigate: (page: ContentType) => void
    defaultContent: React.ReactNode 
  }) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )
    }

    const content = contentData[contentType]
    if (content?.content) {
      return (
        <div className="space-y-8">
          <div 
            className="mb-16 md:mb-[112px] prose prose-lg max-w-none [&>*]:text-foreground [&>h1]:text-xl [&>h1]:md:text-2xl [&>h1]:font-bold [&>h2]:text-lg [&>h2]:md:text-xl [&>h2]:font-bold [&>h3]:text-base [&>h3]:md:text-lg [&>h3]:font-bold [&>p]:text-base [&>p]:md:text-lg [&>p]:leading-relaxed [&>ul]:text-base [&>ul]:md:text-lg [&>li]:text-base [&>li]:md:text-lg"
            dangerouslySetInnerHTML={{ __html: content.content }}
          />
        </div>
      )
    }

    return <div className="space-y-8">{defaultContent}</div>
  }

  const renderContent = () => {
    switch (activeContent) {
      case 'journal':
        return (
          <DynamicContent 
            contentType="journal" 
            onNavigate={setActiveContent} 
            defaultContent={<JournalContent onNavigate={setActiveContent} />}
          />
        )
      case 'guidelines':
        return (
          <DynamicContent 
            contentType="guidelines" 
            onNavigate={setActiveContent} 
            defaultContent={<GuidelinesContent onNavigate={setActiveContent} />}
          />
        )
      case 'proceedings':
        return (
          <>
            <DynamicContent 
            contentType="proceedings" 
            onNavigate={setActiveContent} 
            defaultContent={<ProceedingsContent onNavigate={setActiveContent} />}
          />

          </>
        )
      case 'submit':
        return (
          <>
            <DynamicContent
              contentType="submit"
              onNavigate={setActiveContent}
              defaultContent={<SubmitContent onNavigate={setActiveContent} />}
            />
            <div className="flex justify-center">
              <Link href="/login">
                <button className="bg-primary hover:bg-primary/90 text-white px-8 md:px-[48px] py-4 md:py-[24px] text-lg md:text-2xl font-medium rounded-[8px] transition-all duration-200 hover:scale-95 active:scale-95">
                  我已閱讀並同意
                </button>
              </Link>
            </div>
          </>
        )
      default:
        return (
          <>
            <DynamicContent
              contentType="submit"
              onNavigate={setActiveContent}
              defaultContent={<SubmitContent onNavigate={setActiveContent} />}
            />
         
          </>
        )
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header currentPage={activeContent} onPageChange={setActiveContent} />

      {/* 子頁標題1 - 研討會名稱 */}
      <div className="w-full px-4 md:px-[56px] py-4 md:py-[32px] bg-white border-t border-[#00182C26] flex items-center">
        <h2 className="text-foreground text-lg md:text-[28px] font-medium leading-tight md:leading-[42px]">
          課程教學與傳播科技學術研討會
        </h2>
      </div>
      {/* 子頁標題2 - 動態標題 */}
      <div className="w-full py-6 md:py-[32px] bg-secondary flex items-center">
        <div className="w-full max-w-[1000px] mx-auto px-4 md:px-0">
          <h1 className="text-white text-2xl md:text-4xl font-medium leading-tight">
            {isLoading 
              ? '載入中...'
              : contentData[activeContent]?.title || (
                  activeContent === 'journal' ? '期刊資訊' :
                  activeContent === 'guidelines' ? '作者須知' :
                  activeContent === 'proceedings' ? '會議論文集' :
                  '會議論文投稿'
                )
            }
          </h1>
        </div>
      </div>

      {/* 主要內容區域 */}
      <main className="flex-1 max-w-[1000px] mx-auto py-8 md:py-[112px] px-4 md:px-0">
        <div className="max-w-[1000px] mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* 聯絡資訊區域 */}
      <div className="w-full py-8 md:py-[112px] border-t border-[#00182C26]">
        <div className="max-w-[1000px] mx-auto text-start px-4 md:px-0">
          <p className="text-foreground text-sm md:text-lg leading-relaxed">
            如果您在提交系統時遇到任何問題，請發送電子郵件至
            <a
              href="mailto:abc12345678@gmail.com"
              className="text-primary underline"
            >
              abc12345678@gmail.com
            </a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  )
}

// 期刊資訊內容組件
function JournalContent({ onNavigate }: { onNavigate: (page: ContentType) => void }) {
  return (
    <div className="mb-16 md:mb-[112px]">
      <h2 className="text-foreground text-xl md:text-2xl underline w-fit font-bold mb-6">
        期刊簡介
      </h2>
      <div className="space-y-6 text-foreground text-base md:text-lg leading-relaxed">
        <p>
          《課程教學與傳播科技學術研討會》是由國立臺北教育大學課程與教學傳播科技研究所主辦的年度學術盛會，致力於推動教育科技領域的研究與實務發展。
        </p>
        <p>
          本期刊旨在促進課程設計、教學方法與傳播科技的整合應用，提供學者、教育工作者及相關專業人士一個學術交流的平台。
        </p>
        
        <h3 className="text-foreground text-lg md:text-xl font-bold mt-8 mb-4">
          期刊特色
        </h3>
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li>聚焦教育科技與課程教學整合研究</li>
          <li>涵蓋理論研究與實務應用</li>
          <li>促進跨領域學術交流與合作</li>
          <li>推動教育創新與科技發展</li>
        </ul>

        <h3 className="text-foreground text-lg md:text-xl font-bold mt-8 mb-4">
          收錄範圍
        </h3>
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li>數位學習與線上教育</li>
          <li>教學媒體設計與開發</li>
          <li>學習科技與創新應用</li>
          <li>課程設計與教學評量</li>
          <li>教育傳播理論與實務</li>
        </ul>
      </div>
    </div>
  )
}

// 作者須知內容組件  
function GuidelinesContent({ onNavigate }: { onNavigate: (page: ContentType) => void }) {
  return (
    <div className="space-y-8">
      <div className="mb-16 md:mb-[112px]">
        <h2 className="text-foreground text-xl md:text-2xl underline w-fit font-bold mb-6">
          投稿須知
        </h2>
        
        <div className="space-y-6 text-foreground text-base md:text-lg leading-relaxed">
          <h3 className="text-foreground text-lg md:text-xl font-bold">
            投稿資格與範圍
          </h3>
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li>研究內容需具備實證基礎，並具有教育實踐意義</li>
            <li>須屬於教學傳播科技相關範疇</li>
            <li>歡迎原創性研究、創新教學實務及文獻回顧等類型文章</li>
          </ul>

          <h3 className="text-foreground text-lg md:text-xl font-bold mt-8">
            格式要求
          </h3>
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li>全文長度不超過 8,000 字（不含參考文獻與附錄）</li>
            <li>摘要不超過 250 字</li>
            <li>請使用 APA 第七版格式撰寫，包括文內引用與參考文獻格式</li>
            <li>所有表格須為可編輯格式（非圖片），圖表請嵌入稿件中</li>
          </ul>

          <h3 className="text-foreground text-lg md:text-xl font-bold mt-8">
            投稿文件準備
          </h3>
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li>匿名稿件：包含摘要、關鍵字、正文、表格、圖表、參考文獻與附錄</li>
            <li>不得出現作者姓名、單位或致謝內容</li>
            <li>請使用投稿範本（DOC 或 DOCX 格式）</li>
          </ul>

          <h3 className="text-foreground text-lg md:text-xl font-bold mt-8">
            審查流程
          </h3>
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li>採雙向匿名審查制度</li>
            <li>審查時間約 4-6 週</li>
            <li>審查結果將透過電子郵件通知</li>
            <li>若需修改，請於指定期限內完成並重新提交</li>
          </ul>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mt-8">
            <p className="text-amber-800 font-medium">
              <strong>重要提醒：</strong>若匿名稿件未符合作者投稿須知要求，投稿將不予受理，並由編輯部透過電子郵件通知您。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// 會議論文集內容組件
function ProceedingsContent({ onNavigate }: { onNavigate: (page: ContentType) => void }) {
  return (
    <div className="space-y-8">
      <div className="mb-16 md:mb-[112px]">
        <h2 className="text-foreground text-xl md:text-2xl underline w-fit font-bold mb-6">
          會議論文集
        </h2>
        
        <div className="space-y-6 text-foreground text-base md:text-lg leading-relaxed">
          <p>
            歷年來本研討會已累積豐富的學術成果，以下為近年來會議論文集資訊：
          </p>

          <h3 className="text-foreground text-lg md:text-xl font-bold">
            2024年度論文集
          </h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <ul className="space-y-3">
              <li><strong>主題：</strong>數位轉型時代的教學創新與科技應用</li>
              <li><strong>收錄論文：</strong>45 篇</li>
              <li><strong>參與學者：</strong>126 位</li>
              <li><strong>發表機構：</strong>32 所大學及研究機構</li>
            </ul>
          </div>

          <h3 className="text-foreground text-lg md:text-xl font-bold mt-8">
            2023年度論文集
          </h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <ul className="space-y-3">
              <li><strong>主題：</strong>後疫情時代的混成學習與教育科技</li>
              <li><strong>收錄論文：</strong>38 篇</li>
              <li><strong>參與學者：</strong>102 位</li>
              <li><strong>發表機構：</strong>28 所大學及研究機構</li>
            </ul>
          </div>

          <h3 className="text-foreground text-lg md:text-xl font-bold mt-8">
            主要研究主題分布
          </h3>
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li>數位學習平台設計與應用（32%）</li>
            <li>虛擬實境與擴增實境在教育之應用（24%）</li>
            <li>人工智慧與個人化學習（18%）</li>
            <li>線上教學策略與成效評估（15%）</li>
            <li>教育科技政策與趨勢分析（11%）</li>
          </ul>

          <h3 className="text-foreground text-lg md:text-xl font-bold mt-8">
            論文集下載
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
              <span>2024年度論文集 (PDF)</span>
              <button className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
                下載
              </button>
            </div>
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
              <span>2023年度論文集 (PDF)</span>
              <button className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
                下載
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 會議論文投稿內容組件（原有內容）
function SubmitContent({ onNavigate }: { onNavigate: (page: ContentType) => void }) {
  return (
    <div className="space-y-8">
      <div className="mb-16 md:mb-[112px]">
        <p className="text-foreground text-lg md:text-2xl mb-8 md:mb-[64px] leading-relaxed">
          請在投稿前
          <button 
            onClick={() => onNavigate('guidelines')} 
            className="text-primary font-bold hover:underline"
          >
            詳閱作者投稿須知
          </button>
          ，並依說明使用投稿範本（DOC 或 DOCX）與準備您的
          <span className="font-bold">匿名稿件</span>。
        </p>

        <div className="space-y-6 md:space-y-[24px]">
          <h2 className="text-foreground text-xl md:text-2xl underline w-fit font-bold">
            投稿前請確認以下 5 項事項：
          </h2>

          <div className="space-y-4 text-foreground text-base md:text-xl leading-relaxed mb-8 md:mb-[64px]">
            <p className="mb-0 font-bold">請依下列5項完成您的稿件準備：</p>
            <ol className="list-decimal list-inside space-y-3 md:space-y-2 pl-4">
              <li>
                研究內容<span className="font-bold">需具備實證基礎</span>
                ，並具有<span className="font-bold">教育實踐意義</span>
                ，屬於
                <span className="font-bold">教學傳播科技相關範疇</span>。
              </li>
              <li>
                <span className="font-bold">全文長度不超過 8,000 字</span>
                （不含參考文獻與附錄），
                <span className="font-bold">摘要不超過250 字</span>。
              </li>
              <li>
                請使用
                <span className="font-bold underline">APA 第七版格式</span>
                <span className="font-bold">撰寫</span>
                ，包括文內引用與參考文獻格式。
              </li>
              <li>所有表格須為可編輯格式（非圖片），圖表請嵌入稿件中。</li>
              <li>
                已備妥以下文件：
                <ul className="list-disc list-inside ml-4 mt-2">
                  <li>
                    <span className="font-bold">匿名稿件：</span>
                    包含摘要、關鍵字、正文、表格、圖表、參考文獻與附錄，不得出現作者姓名、單位或致謝內容。
                  </li>
                </ul>
              </li>
            </ol>
          </div>

          <p className="text-foreground text-sm md:text-lg leading-relaxed">
            提醒您：若匿名稿件未符合作者投稿須知要求，投稿將不予受理，並由編輯部透過電子郵件通知您。
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <Link href="/login">
          <button className="bg-primary hover:bg-primary/90 text-white px-8 md:px-[48px] py-4 md:py-[24px] text-lg md:text-2xl font-medium rounded-[8px] transition-all duration-200 hover:scale-95 active:scale-95">
            我已閱讀並同意
          </button>
        </Link>
      </div>
    </div>
  )
}