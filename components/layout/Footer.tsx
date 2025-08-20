export default function Footer() {
  return (
    <footer className="w-full bg-muted p-4 md:p-[56px]">
      {/* 聯絡資訊 */}
      <div className="flex flex-col md:flex-row md:justify-between gap-6 md:gap-0 mb-8 md:mb-[56px]">
        {/* 課程組 */}
        <div className="flex-1">
          <div className="text-[#00182CB2] text-sm md:text-lg leading-relaxed">
            <div className="font-semibold mb-2 md:mb-0">課程組</div>
            電話：(02)27321104 #62139、62143
            <br />
            傳真：(02)2378-0439
            <br />
            電子郵件：gici@tea.ntue.edu.tw
          </div>
        </div>

        {/* 教傳組 */}
        <div className="flex-1">
          <div className="text-[#00182CB2] text-sm md:text-lg leading-relaxed">
            <div className="font-semibold mb-2 md:mb-0">教傳組</div>
            電話：(02)27321104 #63452、63453
            <br />
            傳真：(02)2736-1037
            <br />
            電子郵件：ect@tea.ntue.edu.tw
          </div>
        </div>

        {/* 地址 */}
        <div className="flex-1">
          <div className="text-[#00182CB2] text-sm md:text-lg leading-relaxed">
            <div className="font-semibold mb-2 md:mb-0">地址</div>
            10671臺北市大安區和平東路2段134號
          </div>
        </div>
      </div>

      {/* 分隔線 */}
      <div className="w-full h-[1px] bg-[#00182C26] mb-6 md:mb-[56px]"></div>

      {/* 版權資訊 */}
      <div className="text-[#00182CB2] text-xs md:text-lg leading-relaxed text-start">
        本網站版權由 國立臺北教育大學 課程與教學傳播科技研究所 所有
      </div>
    </footer>
  )
}