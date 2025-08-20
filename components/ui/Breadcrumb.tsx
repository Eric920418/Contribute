'use client'

import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  onClick?: () => void
  active?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="麵包屑導覽" className="mb-[24px]">
      <ol className="flex items-center space-x-2 text-[24px]">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-5 h-5 text-gray-400 mx-2" />
            )}
            {item.onClick ? (
              <button
                onClick={item.onClick}
                className={`transition-colors ${
                  item.active
                    ? 'text-[#00182C] font-medium'
                    : 'text-gray-600 hover:text-[#00182C]'
                }`}
              >
                {item.label}
              </button>
            ) : (
              <span
                className={`${
                  item.active
                    ? 'text-[#00182C] font-medium'
                    : 'text-gray-600'
                }`}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}