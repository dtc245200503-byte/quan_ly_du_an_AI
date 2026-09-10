import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export const MarkdownRenderer = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!content) return null;

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Process markdown into structured elements
  const renderFormattedText = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeBlockContent = [];
    let codeBlockLang = '';
    let inTable = false;
    let tableRows = [];

    const flushTable = (key) => {
      if (tableRows.length === 0) return null;
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(1).filter(r => !r.every(cell => /^[-:\s]+$/.test(cell)));

      const rendered = (
        <div key={key} className="my-3 overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
          <table className="w-full text-xs text-left text-slate-800">
            <thead className="bg-slate-100 text-[11px] font-bold uppercase text-slate-700 border-b border-slate-200">
              <tr>
                {headerRow.map((cell, idx) => (
                  <th key={idx} className="px-3 py-2 border-r border-slate-200 last:border-r-0">
                    {parseInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-slate-100 hover:bg-slate-50 last:border-b-0">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 border-r border-slate-100 last:border-r-0 font-medium">
                      {parseInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
      return rendered;
    };

    lines.forEach((line, lIdx) => {
      // Code block start/end
      if (line.trim().startsWith('```')) {
        if (inTable) {
          elements.push(flushTable(`table-${lIdx}`));
        }
        if (inCodeBlock) {
          inCodeBlock = false;
          const codeText = codeBlockContent.join('\n');
          codeBlockContent = [];
          const currentCodeIdx = lIdx;
          elements.push(
            <div key={`code-${lIdx}`} className="my-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs text-slate-100 shadow-sm">
              <div className="bg-slate-800/80 px-3 py-1.5 border-b border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                <span className="uppercase font-bold tracking-wider">{codeBlockLang || 'code'}</span>
                <button 
                  onClick={() => copyToClipboard(codeText, currentCodeIdx)}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  {copiedIndex === currentCodeIdx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedIndex === currentCodeIdx ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-slate-200 text-[11px] leading-relaxed">
                <code>{codeText}</code>
              </pre>
            </div>
          );
        } else {
          inCodeBlock = true;
          codeBlockLang = line.trim().replace('```', '');
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Check Markdown Table lines: "| col1 | col2 |"
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const cells = line.trim().split('|').slice(1, -1).map(c => c.trim());
        inTable = true;
        tableRows.push(cells);
        return;
      } else if (inTable) {
        elements.push(flushTable(`table-${lIdx}`));
      }

      const trimmed = line.trim();

      // Section Headings (including Emojis like 📊, 🚨, 👥, 🎯)
      if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
        const titleText = trimmed.replace(/^#+\s*/, '');
        elements.push(
          <h3 key={lIdx} className="text-xs font-black text-slate-900 uppercase tracking-wide mt-3 mb-1.5 pb-1 border-b border-slate-200 flex items-center gap-1.5">
            {parseInline(titleText)}
          </h3>
        );
        return;
      }

      // Emoji top-level section titles without '#' (e.g. "📊 TÌNH TRẠNG SỨC KHỎE DỰ ÁN", "🚨 CÁC MỐI ĐỌA NGHỄN...")
      if (/^(📊|🚨|👥|🎯|⚡|💡|📌|⚖️|⏳|📈|📅)\s+[A-Z0-9\s_ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴÝỶỸ\(\)]+$/.test(trimmed)) {
        elements.push(
          <h3 key={lIdx} className="text-xs font-black text-slate-900 uppercase tracking-wide mt-3 mb-1.5 pb-1 border-b border-slate-200 flex items-center gap-1.5">
            {parseInline(trimmed)}
          </h3>
        );
        return;
      }

      // Bullet List Items ('•', '-', '*')
      if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const itemContent = trimmed.substring(2);
        elements.push(
          <div key={lIdx} className="flex items-start gap-2 ml-1 my-1 text-slate-800 text-xs">
            <span className="text-red-600 font-bold select-none">•</span>
            <div className="flex-1 leading-relaxed">{parseInline(itemContent)}</div>
          </div>
        );
        return;
      }

      // Numbered List Items ('1.', '2.', etc.)
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.push(
          <div key={lIdx} className="flex items-start gap-2 ml-1 my-1 text-slate-800 text-xs">
            <span className="font-extrabold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded text-[10px] select-none">
              {numMatch[1]}
            </span>
            <div className="flex-1 leading-relaxed font-medium">{parseInline(numMatch[2])}</div>
          </div>
        );
        return;
      }

      // Empty line / spacer
      if (!trimmed) {
        elements.push(<div key={lIdx} className="h-1.5" />);
        return;
      }

      // Regular Paragraph
      elements.push(
        <p key={lIdx} className="my-1 text-xs text-slate-800 leading-relaxed font-medium">
          {parseInline(line)}
        </p>
      );
    });

    if (inTable) {
      elements.push(flushTable(`table-end`));
    }

    return elements;
  };

  // Rich inline parser supporting bold, inline code, @mentions, badge tags, links
  const parseInline = (text) => {
    if (!text) return null;

    const parts = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      const codeMatch = remaining.match(/`(.*?)`/);
      const mentionMatch = remaining.match(/@([\wÀ-ỹ\s]+)/);
      const badgeMatch = remaining.match(/(🚨 BÁO ĐỘNG|⚠️ CẢNH BÁO|✅ TỐT|🔴 Quá tải|🟢 Vừa sức|🟢 Rảnh rỗi|🟡 Vừa phải)/);
      const linkMatch = remaining.match(/\[(.*?)\]\((.*?)\)/);

      let firstMatch = null;
      let matchType = null;
      let minPos = remaining.length;

      if (boldMatch && boldMatch.index < minPos) {
        minPos = boldMatch.index;
        firstMatch = boldMatch;
        matchType = 'bold';
      }
      if (codeMatch && codeMatch.index < minPos) {
        minPos = codeMatch.index;
        firstMatch = codeMatch;
        matchType = 'code';
      }
      if (badgeMatch && badgeMatch.index < minPos) {
        minPos = badgeMatch.index;
        firstMatch = badgeMatch;
        matchType = 'badge';
      }
      if (mentionMatch && mentionMatch.index < minPos) {
        minPos = mentionMatch.index;
        firstMatch = mentionMatch;
        matchType = 'mention';
      }
      if (linkMatch && linkMatch.index < minPos) {
        minPos = linkMatch.index;
        firstMatch = linkMatch;
        matchType = 'link';
      }

      if (!firstMatch) {
        parts.push(<span key={keyIdx++}>{remaining}</span>);
        break;
      }

      if (firstMatch.index > 0) {
        parts.push(<span key={keyIdx++}>{remaining.substring(0, firstMatch.index)}</span>);
      }

      if (matchType === 'bold') {
        parts.push(<strong key={keyIdx++} className="font-extrabold text-slate-900">{firstMatch[1]}</strong>);
      } else if (matchType === 'code') {
        parts.push(
          <code key={keyIdx++} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-red-600 font-semibold">
            {firstMatch[1]}
          </code>
        );
      } else if (matchType === 'badge') {
        const val = firstMatch[1];
        let style = "bg-slate-100 text-slate-800 border-slate-300";
        if (val.includes('BÁO ĐỘNG') || val.includes('Quá tải')) {
          style = "bg-rose-100 text-rose-800 border-rose-300 font-black";
        } else if (val.includes('CẢNH BÁO') || val.includes('Vừa phải')) {
          style = "bg-amber-100 text-amber-800 border-amber-300 font-extrabold";
        } else if (val.includes('TỐT') || val.includes('Vừa sức') || val.includes('Rảnh rỗi')) {
          style = "bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold";
        }
        parts.push(
          <span key={keyIdx++} className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] border shadow-2xs ${style}`}>
            {val}
          </span>
        );
      } else if (matchType === 'mention') {
        parts.push(
          <span key={keyIdx++} className="inline-flex items-center px-1.5 py-0.2 bg-blue-50 text-blue-700 font-bold border border-blue-200 rounded text-[11px]">
            @{firstMatch[1].trim()}
          </span>
        );
      } else if (matchType === 'link') {
        parts.push(
          <a 
            key={keyIdx++} 
            href={firstMatch[2]} 
            target="_blank" 
            rel="noreferrer" 
            className="text-red-600 font-bold underline hover:text-red-700"
          >
            {firstMatch[1]}
          </a>
        );
      }

      remaining = remaining.substring(firstMatch.index + firstMatch[0].length);
    }

    return parts;
  };

  return <div className="space-y-1 text-xs">{renderFormattedText(content)}</div>;
};
