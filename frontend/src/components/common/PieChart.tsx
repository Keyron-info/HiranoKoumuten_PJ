import React from 'react';

interface PieChartData {
  name: string;
  value: number;
  color: string;
  isAlert?: boolean;
}

interface PieChartProps {
  data: PieChartData[];
  title?: string;
  showLegend?: boolean;
  size?: number;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
];

const PieChart: React.FC<PieChartProps> = ({ 
  data, 
  title, 
  showLegend = true,
  size = 200 
}) => {
  // 合計を計算
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // conic-gradientを生成
  let currentAngle = 0;
  const gradientStops: string[] = [];
  
  data.forEach((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const color = item.color || COLORS[index % COLORS.length];
    
    if (percentage > 0) {
      gradientStops.push(`${color} ${currentAngle}deg ${currentAngle + (percentage * 3.6)}deg`);
      currentAngle += percentage * 3.6;
    }
  });

  const gradient = gradientStops.length > 0 
    ? `conic-gradient(${gradientStops.join(', ')})` 
    : 'conic-gradient(#e5e7eb 0deg 360deg)';

  // 通貨フォーマット
  const formatCurrency = (value: number): string => {
    if (value >= 100000000) {
      return `¥${(value / 100000000).toFixed(1)}億`;
    }
    if (value >= 10000) {
      return `¥${(value / 10000).toFixed(0)}万`;
    }
    return `¥${value.toLocaleString()}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      )}
      
      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* 円グラフ */}
        <div 
          className="relative rounded-full"
          style={{ 
            width: size, 
            height: size, 
            background: gradient 
          }}
        >
          {/* 中央の穴（ドーナツ型） */}
          <div 
            className="absolute bg-white rounded-full flex flex-col items-center justify-center"
            style={{
              width: size * 0.6,
              height: size * 0.6,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <span className="text-xs text-gray-500">合計</span>
            <span className="text-sm font-bold text-gray-800">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* 凡例 */}
        {showLegend && (
          <div className="flex-1 space-y-2 max-h-64 overflow-y-auto">
            {data.map((item, index) => {
              const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
              const color = item.color || COLORS[index % COLORS.length];
              
              return (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                    item.isAlert ? 'bg-red-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className={`text-sm truncate max-w-32 ${
                      item.isAlert ? 'text-red-700 font-medium' : 'text-gray-700'
                    }`}>
                      {item.name}
                      {item.isAlert && (
                        <span className="ml-1 text-xs bg-red-100 text-red-600 px-1 rounded">
                          警告
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(item.value)}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {data.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          データがありません
        </div>
      )}
    </div>
  );
};

export default PieChart;

