import React from 'react';
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';

export type StoreCategoryKey = 'all' | 'truyen-thong' | 'cao-cap' | 'hien-dai' | 'healthy';

interface StoreFilterProps {
  activeCategory: StoreCategoryKey;
  onSelectCategory: (cat: StoreCategoryKey) => void;
  searchFilter: string;
  onSearchChange: (value: string) => void;
  totalStores: number;
}

const CATEGORY_TABS: { key: StoreCategoryKey; label: string; icon: string }[] = [
  { key: 'all', label: 'Tất Cả Gian Hàng', icon: '🏪' },
  { key: 'truyen-thong', label: 'Truyền Thống', icon: '🥮' },
  { key: 'cao-cap', label: 'Khách Sạn & Cao Cấp', icon: '👑' },
  { key: 'hien-dai', label: 'Phong Cách Pháp & Hiện Đại', icon: '✨' },
  { key: 'healthy', label: 'Healthy & Bánh Tươi', icon: '🌿' }
];

export const StoreFilter: React.FC<StoreFilterProps> = ({
  activeCategory,
  onSelectCategory,
  searchFilter,
  onSearchChange,
  totalStores
}) => {
  return (
    <div className="bg-white rounded-2xl border border-accent-200/70 p-4 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeCategory === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onSelectCategory(tab.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition ${
                  isActive
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'bg-accent-50/60 text-gray-700 hover:bg-accent-100 hover:text-primary-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Search inside Store Section */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Lọc tên gian hàng..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:bg-white transition"
          />
          {searchFilter && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-gray-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
        <span className="flex items-center gap-1 text-primary-800 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-accent-500" />
          <span>Quy tụ các xưởng bánh và nghệ nhân chính hãng danh tiếng</span>
        </span>
        <span>
          Đang hiển thị <strong>{totalStores}</strong> gian hàng đối tác
        </span>
      </div>
    </div>
  );
};
