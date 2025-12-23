'use client';

/**
 * Start Node - Entry point of the workflow
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';
import { StartNodeData } from '../types';

function StartNode({ data }: NodeProps) {
  const nodeData = data as unknown as StartNodeData;
  
  return (
    <div className="px-4 py-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg border-2 border-green-400">
      <div className="flex items-center gap-2">
        <Play className="h-4 w-4" />
        <span className="font-semibold text-sm">{nodeData.label}</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-400 border-2 border-white"
      />
    </div>
  );
}

export default memo(StartNode);
