// =====================================================
// 숫자 패드 컴포넌트
// =====================================================

import { Delete } from 'lucide-react';

interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export function NumPad({ value, onChange, maxLength = 6 }: NumPadProps) {
  const handlePress = (num: string) => {
    if (value.length < maxLength) {
      onChange(value + num);
    }
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="space-y-4">
      {/* 입력 표시 */}
      <div className="flex justify-center gap-3 mb-8">
        {Array.from({ length: maxLength }).map((_, idx) => (
          <div
            key={idx}
            className={`w-5 h-5 rounded-full transition-all ${
              idx < value.length ? 'bg-white scale-110' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* 숫자 패드 */}
      <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handlePress(String(num))}
            className="numpad-btn"
          >
            {num}
          </button>
        ))}
        <button onClick={handleClear} className="numpad-btn text-lg">
          C
        </button>
        <button onClick={() => handlePress('0')} className="numpad-btn">
          0
        </button>
        <button onClick={handleDelete} className="numpad-btn">
          <Delete size={24} className="mx-auto" />
        </button>
      </div>
    </div>
  );
}
