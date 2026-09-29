import React, { useState } from 'react';
import { LineageTreeNode } from '../types/lims';
import {
  FolderTree,
  FileText,
  FlaskConical,
  Box,
  Layers,
  ChevronRight,
  ChevronDown,
  Barcode,
  Copy,
  Check
} from 'lucide-react';

interface LineageTreeProps {
  tree: LineageTreeNode;
  onSelectNode?: (node: LineageTreeNode) => void;
  selectedId?: string;
}

export const LineageTree: React.FC<LineageTreeProps> = ({ tree, onSelectNode, selectedId }) => {
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopyBarcode = (barcode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(barcode);
    setCopiedBarcode(barcode);
    setTimeout(() => setCopiedBarcode(null), 1500);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'ACCESSION': return <FileText className="w-4 h-4 text-sky-400" />;
      case 'SPECIMEN': return <FlaskConical className="w-4 h-4 text-amber-400" />;
      case 'BLOCK': return <Box className="w-4 h-4 text-teal-400" />;
      case 'SLIDE': return <Layers className="w-4 h-4 text-purple-400" />;
      default: return <FolderTree className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string, type: string) => {
    let color = 'bg-slate-800 text-slate-300 border-slate-700';

    if (status === 'STAT') color = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
    else if (status === 'URGENT') color = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    else if (status === 'SCANNED' || status === 'SIGNED_OFF') color = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    else if (status === 'STAINED') color = 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40';
    else if (status === 'CUT') color = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    else if (status === 'EMBEDDED' || status === 'SECTIONED') color = 'bg-teal-500/20 text-teal-300 border-teal-500/40';
    else if (status === 'IN_PROCESSING') color = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';

    return (
      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${color}`}>
        {status}
      </span>
    );
  };

  const renderNode = (node: LineageTreeNode, depth: number = 0) => {
    const isCollapsed = !!collapsedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedId === node.id;

    return (
      <div key={node.id} className="relative">
        <div
          onClick={() => onSelectNode?.(node)}
          className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer group mb-1.5 ${
            isSelected
              ? 'bg-brand-950/70 border-brand-500 ring-1 ring-brand-500'
              : 'bg-slate-850/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
          }`}
          style={{ marginLeft: `${depth * 20}px` }}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {hasChildren ? (
              <button
                onClick={(e) => toggleCollapse(node.id, e)}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-100"
              >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-5" />
            )}

            <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
              {getNodeIcon(node.type)}
            </div>

            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 uppercase font-semibold">{node.type}</span>
                <span className="text-sm font-semibold text-slate-100 tracking-tight">{node.label}</span>
              </div>

              {node.barcode && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Barcode className="w-3 h-3 text-slate-500" />
                  <span className="text-[11px] font-mono text-brand-400">{node.barcode}</span>
                  <button
                    onClick={(e) => handleCopyBarcode(node.barcode!, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-slate-200 text-slate-400"
                    title="Copy Barcode"
                  >
                    {copiedBarcode === node.barcode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pl-2 flex-shrink-0">
            {getStatusBadge(node.status, node.type)}
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div className="relative border-l border-slate-800 ml-4 pl-1">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FolderTree className="w-5 h-5 text-brand-400" />
          <h3 className="font-semibold text-slate-100 text-sm tracking-wide">Specimen Lineage Hierarchy</h3>
        </div>
        <span className="text-xs font-mono text-slate-400">Accession ➔ Specimen ➔ Block ➔ Slide</span>
      </div>

      <div className="space-y-1 overflow-x-auto">
        {renderNode(tree)}
      </div>
    </div>
  );
};
