'use client'

import { Header } from '@/components/layout/Header'

export default function BucketListPage() {
  return (
    <>
      <Header title="🎯 Bucket List" />
      <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
        <div className="text-[64px] mb-4">🎯</div>
        <h2 className="text-[20px] font-extrabold text-gray-800 mb-2">Bucket List</h2>
        <p className="text-[14px] text-gray-400 leading-relaxed">Věci, které chceš v životě zažít</p>
        <div className="mt-8 px-5 py-3 rounded-[14px] text-[13px] font-semibold text-white" style={{ background: 'var(--color-primary)' }}>
          Brzy k dispozici 🚧
        </div>
      </div>
    </>
  )
}
