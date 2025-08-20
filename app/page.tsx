import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header currentPage="submit" />

      {/* 子頁標題1 - 研討會名稱 */}
      <div className="w-full px-4 md:px-[56px] py-4 md:py-[32px] bg-white border-t border-[#00182C26] flex items-center">
        <h2 className="text-foreground text-lg md:text-[28px] font-medium leading-tight md:leading-[42px]">
          課程教學與傳播科技學術研討會
        </h2>
      </div>
      {/* 子頁標題2 - 會議論文投稿 */}
      <div className="w-full py-6 md:py-[32px] bg-secondary flex items-center">
        <div className="w-full max-w-[1000px] mx-auto px-4 md:px-0">
          <h1 className="text-white text-2xl md:text-4xl font-medium leading-tight">
            會議論文投稿
          </h1>
        </div>
      </div>

      {/* 主要內容區域 */}
      <main className="flex-1 max-w-[1000px] mx-auto py-8 md:py-[112px] px-4 md:px-0">
        <div className="max-w-[1000px] mx-auto">
          {/* 主要說明文字 */}
          <div className="mb-16 md:mb-[112px]">
            <p className="text-foreground text-lg md:text-2xl mb-8 md:mb-[64px] leading-relaxed">
              請在投稿前
              <Link href="/guidelines" className="text-primary font-bold">
                詳閱作者投稿須知
              </Link>
              ，並依說明使用投稿範本（DOC 或 DOCX）與準備您的
              <span className="font-bold">匿名稿件</span>。
            </p>

            {/* 投稿事項說明 */}
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

          {/* 確認按鈕 */}
          <div className="flex justify-center">
            <Link href="/login">
              <button className="bg-primary hover:bg-primary/90 text-white px-8 md:px-[48px] py-4 md:py-[24px] text-lg md:text-2xl font-medium rounded-[8px] transition-all duration-200 hover:scale-95 active:scale-95">
                我已閱讀並同意
              </button>
            </Link>
          </div>
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