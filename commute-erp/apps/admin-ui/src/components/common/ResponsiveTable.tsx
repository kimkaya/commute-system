// =====================================================
// 반응형 테이블/카드 컴포넌트
// 데스크톱: 테이블 뷰, 모바일: 카드 뷰
// =====================================================

import type { ReactNode } from 'react';

// 컬럼 정의
export interface Column<T> {
  key: string;
  header: string;
  // 테이블 셀 렌더링
  render: (item: T, index: number) => ReactNode;
  // 모바일 카드에서 표시 여부 (기본: true)
  showInMobile?: boolean;
  // 모바일에서 라벨 표시 (기본: header 사용)
  mobileLabel?: string;
  // 모바일 카드에서 강조 표시 (제목, 상태 등)
  mobileHighlight?: 'title' | 'subtitle' | 'badge' | 'action' | 'meta';
  // 테이블 셀 클래스
  className?: string;
  // 헤더 셀 클래스
  headerClassName?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  // 로딩 상태
  isLoading?: boolean;
  // 빈 데이터 메시지
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  // 행 클릭 핸들러
  onRowClick?: (item: T) => void;
  // 테이블 클래스
  tableClassName?: string;
  // 카드 클래스
  cardClassName?: string;
  // 모바일 카드 커스텀 렌더러
  renderMobileCard?: (item: T, columns: Column<T>[]) => ReactNode;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  emptyMessage = '데이터가 없습니다',
  emptyIcon,
  onRowClick,
  tableClassName = '',
  cardClassName = '',
  renderMobileCard,
}: ResponsiveTableProps<T>) {
  // 로딩 상태
  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  // 빈 데이터
  if (data.length === 0) {
    return (
      <div className="py-12 text-center">
        {emptyIcon && <div className="mb-3 text-gray-300 flex justify-center">{emptyIcon}</div>}
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  // 모바일용 컬럼 필터
  const mobileColumns = columns.filter(col => col.showInMobile !== false);
  const titleCol = mobileColumns.find(col => col.mobileHighlight === 'title');
  const subtitleCol = mobileColumns.find(col => col.mobileHighlight === 'subtitle');
  const badgeCol = mobileColumns.find(col => col.mobileHighlight === 'badge');
  const actionCol = mobileColumns.find(col => col.mobileHighlight === 'action');
  const metaCols = mobileColumns.filter(col => col.mobileHighlight === 'meta');
  const regularCols = mobileColumns.filter(col => !col.mobileHighlight);

  // 기본 모바일 카드 렌더러
  const defaultMobileCard = (item: T, index: number) => (
    <div
      key={keyExtractor(item)}
      onClick={() => onRowClick?.(item)}
      className={`bg-white rounded-xl border border-gray-200 p-4 ${
        onRowClick ? 'cursor-pointer hover:shadow-md active:bg-gray-50' : ''
      } ${cardClassName}`}
    >
      {/* 상단: 제목 + 배지 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {titleCol && (
            <div className="font-semibold text-gray-900 truncate">
              {titleCol.render(item, index)}
            </div>
          )}
          {subtitleCol && (
            <div className="text-sm text-gray-500 mt-0.5 truncate">
              {subtitleCol.render(item, index)}
            </div>
          )}
        </div>
        {badgeCol && (
          <div className="flex-shrink-0">
            {badgeCol.render(item, index)}
          </div>
        )}
      </div>

      {/* 중간: 일반 필드 */}
      {regularCols.length > 0 && (
        <div className="space-y-2 mb-3">
          {regularCols.map(col => (
            <div key={col.key} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{col.mobileLabel || col.header}</span>
              <span className="text-gray-900 font-medium">{col.render(item, index)}</span>
            </div>
          ))}
        </div>
      )}

      {/* 메타 정보 */}
      {metaCols.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
          {metaCols.map(col => (
            <span key={col.key}>{col.render(item, index)}</span>
          ))}
        </div>
      )}

      {/* 하단: 액션 버튼 */}
      {actionCol && (
        <div className="pt-3 border-t border-gray-100">
          {actionCol.render(item, index)}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* 데스크톱: 테이블 뷰 */}
      <div className={`hidden md:block overflow-x-auto ${tableClassName}`}>
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
              {columns.map(col => (
                <th 
                  key={col.key} 
                  className={`pb-3 font-medium ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item, index) => (
              <tr 
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
              >
                {columns.map(col => (
                  <td key={col.key} className={`py-3 ${col.className || ''}`}>
                    {col.render(item, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일: 카드 뷰 */}
      <div className="md:hidden space-y-3">
        {data.map((item, index) => 
          renderMobileCard 
            ? renderMobileCard(item, columns)
            : defaultMobileCard(item, index)
        )}
      </div>
    </>
  );
}

// 모바일 전용 카드 컴포넌트
interface MobileCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  fields?: Array<{ label: string; value: ReactNode }>;
  meta?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MobileCard({
  title,
  subtitle,
  badge,
  fields,
  meta,
  actions,
  onClick,
  className = '',
}: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 p-4 ${
        onClick ? 'cursor-pointer hover:shadow-md active:bg-gray-50' : ''
      } ${className}`}
    >
      {/* 상단: 제목 + 배지 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">{title}</div>
          {subtitle && (
            <div className="text-sm text-gray-500 mt-0.5 truncate">{subtitle}</div>
          )}
        </div>
        {badge && <div className="flex-shrink-0">{badge}</div>}
      </div>

      {/* 중간: 필드 */}
      {fields && fields.length > 0 && (
        <div className="space-y-2 mb-3">
          {fields.map((field, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{field.label}</span>
              <span className="text-gray-900 font-medium">{field.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* 메타 정보 */}
      {meta && (
        <div className="text-xs text-gray-500 mb-3">{meta}</div>
      )}

      {/* 하단: 액션 버튼 */}
      {actions && (
        <div className="pt-3 border-t border-gray-100">{actions}</div>
      )}
    </div>
  );
}

// 반응형 그리드 컴포넌트
interface ResponsiveGridProps {
  children: ReactNode;
  cols?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export function ResponsiveGrid({
  children,
  cols = { default: 1, sm: 2, lg: 4 },
  gap = 4,
  className = '',
}: ResponsiveGridProps) {
  const colsClass = [
    `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={`grid gap-${gap} ${colsClass} ${className}`}>
      {children}
    </div>
  );
}

// 모바일 전체화면 모달
interface MobileFullModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function MobileFullModal({
  isOpen,
  onClose,
  title,
  children,
  actions,
}: MobileFullModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* 데스크톱: 일반 모달 */}
      <div className="hidden md:block fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
          {actions && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">{actions}</div>
          )}
        </div>
      </div>

      {/* 모바일: 전체 화면 */}
      <div className="md:hidden fixed inset-0 bg-white z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {actions && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 safe-area-bottom">{actions}</div>
        )}
      </div>
    </>
  );
}
