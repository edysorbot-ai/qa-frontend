"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign,
  Zap,
  Activity
} from "lucide-react";

interface TurnTokenMetrics {
  turnNumber: number;
  promptTokens: number;
  completionTokens: number;
  totalContextTokens: number;
  contextGrowthRate: number;
  timestamp: string;
}

interface ContextGrowthMetrics {
  testResultId: string;
  turns: TurnTokenMetrics[];
  totalTokensUsed: number;
  averageContextGrowth: number;
  maxContextSize: number;
  contextEfficiencyScore: number;
  bloatDetected: boolean;
  bloatTurnNumber?: number;
  estimatedCostSavings?: number;
}

interface ContextGrowthChartProps {
  metrics: ContextGrowthMetrics;
}

export function ContextGrowthChart({ metrics }: ContextGrowthChartProps) {
  const [hoveredTurn, setHoveredTurn] = useState<number | null>(null);

  if (!metrics || metrics.turns.length === 0) {
    return (
      <div className="bg-[#1A1B1E] rounded-lg p-6 border border-[#2A2A2A]">
        <div className="text-center text-[#8A8F98]">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No context growth data available</p>
          <p className="text-sm mt-1">Run a test with multiple conversation turns to see token usage analysis</p>
        </div>
      </div>
    );
  }

  const { turns, totalTokensUsed, averageContextGrowth, maxContextSize, contextEfficiencyScore, bloatDetected, bloatTurnNumber, estimatedCostSavings } = metrics;

  // Chart dimensions
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // Calculate scales
  const maxTokens = Math.max(...turns.map(t => t.totalContextTokens));
  const xScale = (turn: number) => padding.left + ((turn - 1) / (turns.length - 1 || 1)) * graphWidth;
  const yScale = (tokens: number) => padding.top + graphHeight - (tokens / maxTokens) * graphHeight;

  // Generate path for the line chart
  const linePath = turns.map((turn, i) => 
    `${i === 0 ? 'M' : 'L'} ${xScale(turn.turnNumber)} ${yScale(turn.totalContextTokens)}`
  ).join(' ');

  // Generate area path for gradient fill
  const areaPath = `${linePath} L ${xScale(turns[turns.length - 1].turnNumber)} ${padding.top + graphHeight} L ${xScale(1)} ${padding.top + graphHeight} Z`;

  // Determine efficiency status
  const getEfficiencyStatus = () => {
    if (contextEfficiencyScore <= 120) return { color: 'text-green-400', bg: 'bg-green-500/20', label: 'Efficient' };
    if (contextEfficiencyScore <= 180) return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Moderate' };
    return { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Bloated' };
  };

  const efficiencyStatus = getEfficiencyStatus();

  // Y-axis labels
  const yAxisLabels = [0, maxTokens / 2, maxTokens].map(v => Math.round(v));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1A1B1E] rounded-lg p-4 border border-[#2A2A2A]"
        >
          <div className="flex items-center gap-2 text-[#8A8F98] text-sm mb-1">
            <Zap className="w-4 h-4" />
            Total Tokens
          </div>
          <div className="text-2xl font-bold text-[#EEEEEE]">
            {totalTokensUsed.toLocaleString()}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1A1B1E] rounded-lg p-4 border border-[#2A2A2A]"
        >
          <div className="flex items-center gap-2 text-[#8A8F98] text-sm mb-1">
            {averageContextGrowth > 20 ? (
              <TrendingUp className="w-4 h-4 text-red-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-400" />
            )}
            Avg Growth Rate
          </div>
          <div className={`text-2xl font-bold ${averageContextGrowth > 20 ? 'text-red-400' : 'text-green-400'}`}>
            +{averageContextGrowth.toFixed(1)}%
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-lg p-4 border ${efficiencyStatus.bg} border-[#2A2A2A]`}
        >
          <div className="flex items-center gap-2 text-[#8A8F98] text-sm mb-1">
            <Activity className="w-4 h-4" />
            Efficiency Score
          </div>
          <div className={`text-2xl font-bold ${efficiencyStatus.color}`}>
            {contextEfficiencyScore}%
          </div>
          <div className={`text-xs ${efficiencyStatus.color}`}>{efficiencyStatus.label}</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#1A1B1E] rounded-lg p-4 border border-[#2A2A2A]"
        >
          <div className="flex items-center gap-2 text-[#8A8F98] text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Potential Savings
          </div>
          <div className="text-2xl font-bold text-[#5E6AD2]">
            ${(estimatedCostSavings || 0).toFixed(3)}
          </div>
        </motion.div>
      </div>

      {/* Bloat Alert */}
      {bloatDetected && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-400">Context Bloat Detected</h4>
            <p className="text-sm text-[#8A8F98] mt-1">
              High context growth detected at turn {bloatTurnNumber}. Consider implementing:
            </p>
            <ul className="text-sm text-[#8A8F98] mt-2 space-y-1 list-disc list-inside">
              <li>Conversation summarization</li>
              <li>Sliding window context management</li>
              <li>Selective history retention</li>
            </ul>
          </div>
        </motion.div>
      )}

      {/* Chart */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-[#1A1B1E] rounded-lg p-6 border border-[#2A2A2A]"
      >
        <h3 className="text-lg font-semibold text-[#EEEEEE] mb-4">Context Token Growth</h3>
        
        <div className="relative overflow-x-auto">
          <svg 
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full max-w-[600px]"
            style={{ minWidth: '400px' }}
          >
            {/* Gradient definition */}
            <defs>
              <linearGradient id="contextGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={bloatDetected ? "#ef4444" : "#5E6AD2"} stopOpacity="0.3" />
                <stop offset="100%" stopColor={bloatDetected ? "#ef4444" : "#5E6AD2"} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {yAxisLabels.map((label, i) => (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={yScale(label)}
                  x2={chartWidth - padding.right}
                  y2={yScale(label)}
                  stroke="#2A2A2A"
                  strokeDasharray="4"
                />
                <text
                  x={padding.left - 10}
                  y={yScale(label) + 4}
                  textAnchor="end"
                  fill="#8A8F98"
                  fontSize="11"
                >
                  {label.toLocaleString()}
                </text>
              </g>
            ))}

            {/* X-axis labels */}
            {turns.map((turn) => (
              <text
                key={turn.turnNumber}
                x={xScale(turn.turnNumber)}
                y={chartHeight - 10}
                textAnchor="middle"
                fill="#8A8F98"
                fontSize="11"
              >
                {turn.turnNumber}
              </text>
            ))}

            {/* Axis labels */}
            <text
              x={chartWidth / 2}
              y={chartHeight - 2}
              textAnchor="middle"
              fill="#8A8F98"
              fontSize="12"
            >
              Turn Number
            </text>
            <text
              x={15}
              y={chartHeight / 2}
              textAnchor="middle"
              fill="#8A8F98"
              fontSize="12"
              transform={`rotate(-90, 15, ${chartHeight / 2})`}
            >
              Context Tokens
            </text>

            {/* Area fill */}
            <path
              d={areaPath}
              fill="url(#contextGradient)"
            />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke={bloatDetected ? "#ef4444" : "#5E6AD2"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {turns.map((turn) => (
              <g key={turn.turnNumber}>
                <circle
                  cx={xScale(turn.turnNumber)}
                  cy={yScale(turn.totalContextTokens)}
                  r={hoveredTurn === turn.turnNumber ? 6 : 4}
                  fill={turn.turnNumber === bloatTurnNumber ? "#ef4444" : "#5E6AD2"}
                  stroke="#0B0C10"
                  strokeWidth="2"
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredTurn(turn.turnNumber)}
                  onMouseLeave={() => setHoveredTurn(null)}
                />
                
                {/* Tooltip */}
                {hoveredTurn === turn.turnNumber && (
                  <g>
                    <rect
                      x={xScale(turn.turnNumber) - 60}
                      y={yScale(turn.totalContextTokens) - 55}
                      width="120"
                      height="45"
                      rx="4"
                      fill="#0B0C10"
                      stroke="#2A2A2A"
                    />
                    <text
                      x={xScale(turn.turnNumber)}
                      y={yScale(turn.totalContextTokens) - 38}
                      textAnchor="middle"
                      fill="#EEEEEE"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      Turn {turn.turnNumber}
                    </text>
                    <text
                      x={xScale(turn.turnNumber)}
                      y={yScale(turn.totalContextTokens) - 22}
                      textAnchor="middle"
                      fill="#8A8F98"
                      fontSize="10"
                    >
                      {turn.totalContextTokens.toLocaleString()} tokens
                    </text>
                    <text
                      x={xScale(turn.turnNumber)}
                      y={yScale(turn.totalContextTokens) - 8}
                      textAnchor="middle"
                      fill={turn.contextGrowthRate > 20 ? "#ef4444" : "#22c55e"}
                      fontSize="10"
                    >
                      +{turn.contextGrowthRate.toFixed(1)}% growth
                    </text>
                  </g>
                )}
              </g>
            ))}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 text-sm text-[#8A8F98]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>&lt;20% growth (healthy)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>&gt;20% growth (bloat risk)</span>
          </div>
        </div>
      </motion.div>

      {/* Per-Turn Breakdown */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-[#1A1B1E] rounded-lg p-6 border border-[#2A2A2A]"
      >
        <h3 className="text-lg font-semibold text-[#EEEEEE] mb-4">Per-Turn Token Breakdown</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#8A8F98] border-b border-[#2A2A2A]">
                <th className="py-2 px-3">Turn</th>
                <th className="py-2 px-3">Prompt Tokens</th>
                <th className="py-2 px-3">Completion Tokens</th>
                <th className="py-2 px-3">Cumulative Context</th>
                <th className="py-2 px-3">Growth Rate</th>
              </tr>
            </thead>
            <tbody>
              {turns.map((turn) => (
                <tr 
                  key={turn.turnNumber}
                  className={`border-b border-[#2A2A2A]/50 ${turn.turnNumber === bloatTurnNumber ? 'bg-red-500/10' : ''}`}
                >
                  <td className="py-2 px-3 text-[#EEEEEE]">{turn.turnNumber}</td>
                  <td className="py-2 px-3 text-[#8A8F98]">{turn.promptTokens.toLocaleString()}</td>
                  <td className="py-2 px-3 text-[#8A8F98]">{turn.completionTokens.toLocaleString()}</td>
                  <td className="py-2 px-3 text-[#EEEEEE] font-medium">{turn.totalContextTokens.toLocaleString()}</td>
                  <td className={`py-2 px-3 font-medium ${turn.contextGrowthRate > 20 ? 'text-red-400' : 'text-green-400'}`}>
                    {turn.turnNumber === 1 ? '-' : `+${turn.contextGrowthRate.toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
