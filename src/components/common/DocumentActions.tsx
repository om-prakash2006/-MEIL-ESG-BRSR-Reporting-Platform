import React, { useState } from 'react';
import { Eye, Download, AlertTriangle, Upload } from 'lucide-react';
import { api } from '../../services/api.ts';
import { DocumentPreviewModal, PreviewDocInfo } from './DocumentPreviewModal.tsx';

interface DocumentActionsProps {
  document: PreviewDocInfo;
  compact?: boolean;
  onReuploadRequest?: (doc: PreviewDocInfo) => void;
  className?: string;
}

export const DocumentActions: React.FC<DocumentActionsProps> = ({
  document,
  compact = false,
  onReuploadRequest,
  className = '',
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isMissing = document.fileExists === false || document.storageStatus === 'FILE_MISSING';

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isMissing) {
      setIsPreviewOpen(true);
      return;
    }

    try {
      setDownloading(true);
      setErrorMsg(null);
      await api.downloadEvidenceFile(document.documentId, document.originalFileName);
    } catch (err: any) {
      setErrorMsg(err.message || 'Download failed');
      alert(`Download Error: ${err.message || 'The document could not be retrieved from storage.'}`);
    } finally {
      setDownloading(false);
    }
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsPreviewOpen(true);
  };

  return (
    <>
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        {isMissing ? (
          /* Missing File Warning Badge & Action */
          <button
            onClick={handlePreview}
            title="File missing in storage vault - Click to inspect or re-upload"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#c2410c] hover:text-[#9a3412] bg-[#fff7ed] hover:bg-[#ffedd5] border border-[#fed7aa] px-2 py-1 rounded shadow-2xs transition-colors"
          >
            <AlertTriangle className="w-3 h-3 text-[#ea580c]" />
            <span>Missing (Re-upload)</span>
          </button>
        ) : (
          /* Normal Functional Actions: Preview & Download */
          <>
            <button
              onClick={handlePreview}
              title={`Preview ${document.originalFileName}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#334155] hover:text-[#0f172a] bg-white hover:bg-[#f8fafc] border border-[#cbd5e1] px-2 py-1 rounded shadow-2xs transition-colors"
            >
              <Eye className="w-3 h-3 text-[#64748b]" />
              <span>Preview</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading}
              title={`Download ${document.originalFileName}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1d4ed8] hover:text-[#1e40af] bg-white hover:bg-[#eff6ff] border border-[#cbd5e1] px-2 py-1 rounded shadow-2xs transition-colors"
            >
              <Download className={`w-3 h-3 ${downloading ? 'animate-spin' : ''}`} />
              <span>{downloading ? '...' : compact ? 'Get' : 'Download'}</span>
            </button>
          </>
        )}
      </div>

      {/* Preview and Missing File Modal */}
      <DocumentPreviewModal
        doc={document}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onReuploadRequest={onReuploadRequest}
      />
    </>
  );
};
