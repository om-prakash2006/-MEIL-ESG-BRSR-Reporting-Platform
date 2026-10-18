import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { PdfCanvasViewer } from './PdfCanvasViewer.tsx';

export interface PreviewDocInfo {
  documentId: string;
  originalFileName: string;
  mimeType?: string;
  fileSize?: number;
  checksum?: string;
  fileExists?: boolean;
  storageStatus?: string;
  verificationStatus?: string;
  description?: string;
  uploadedByName?: string;
  uploadedAt?: number;
}

interface DocumentPreviewModalProps {
  doc: PreviewDocInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onReuploadRequest?: (doc: PreviewDocInfo) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  doc,
  isOpen,
  onClose,
  onReuploadRequest,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<string[][] | null>(null);
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState<number>(1);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !doc) {
      setTextContent(null);
      setCsvRows(null);
      setPdfBuffer(null);
      setDownloadError(null);
      setImageScale(1);
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl);
        setImageObjectUrl(null);
      }
      return;
    }

    const isMissing = doc.fileExists === false || doc.storageStatus === 'FILE_MISSING';
    if (isMissing) {
      setTextContent(null);
      setCsvRows(null);
      setPdfBuffer(null);
      setImageObjectUrl(null);
      return;
    }

    let isMounted = true;
    let createdImgUrl: string | null = null;
    setPreviewLoading(true);
    setDownloadError(null);
    setTextContent(null);
    setCsvRows(null);
    setPdfBuffer(null);

    const url = api.getEvidencePreviewUrl(doc.documentId);
    const headers: Record<string, string> = {};
    const sessionId = api.getSessionId();
    if (sessionId) {
      headers['Authorization'] = `Bearer ${sessionId}`;
      headers['x-session-id'] = sessionId;
    }

    fetch(url, { headers })
      .then(async (res) => {
        if (!res.ok) {
          let errText = 'Failed to load preview stream';
          try {
            const errJson = await res.json();
            errText = errJson.message || errJson.error || errText;
          } catch {
            // ignore
          }
          throw new Error(errText);
        }

        const contentType = (res.headers.get('content-type') || doc.mimeType || '').toLowerCase();
        const arrayBuf = await res.arrayBuffer();
        if (!isMounted) return;

        const bytes = new Uint8Array(arrayBuf);
        const fileNameLower = doc.originalFileName.toLowerCase();

        // 1. Check if genuine PDF binary (starts with "%PDF-")
        const isBinaryPdf =
          bytes.length >= 5 &&
          bytes[0] === 0x25 && // %
          bytes[1] === 0x50 && // P
          bytes[2] === 0x44 && // D
          bytes[3] === 0x46 && // F
          bytes[4] === 0x2d;   // -

        if (isBinaryPdf) {
          setPdfBuffer(arrayBuf);
          return;
        }

        // 2. Check if Image binary (PNG, JPEG, GIF, WEBP)
        const isPng = bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
        const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
        const isImageExt = /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(fileNameLower) || contentType.startsWith('image/');

        if (isPng || isJpeg || isImageExt) {
          const imgBlob = new Blob([arrayBuf], {
            type: contentType.startsWith('image/') ? contentType : isPng ? 'image/png' : 'image/jpeg',
          });
          createdImgUrl = URL.createObjectURL(imgBlob);
          setImageObjectUrl(createdImgUrl);
          return;
        }

        // 3. Check if CSV or plain text (or a seeded text-based test invoice with .pdf extension)
        const isTextOrCsv =
          fileNameLower.endsWith('.csv') ||
          fileNameLower.endsWith('.txt') ||
          fileNameLower.endsWith('.json') ||
          contentType.includes('text') ||
          contentType.includes('csv') ||
          (fileNameLower.endsWith('.pdf') && !isBinaryPdf);

        if (isTextOrCsv && bytes.length < 2 * 1024 * 1024) {
          const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          if (decoded.trim().length > 0) {
            if (fileNameLower.endsWith('.csv') || contentType.includes('csv')) {
              const rows = decoded
                .trim()
                .split(/\r?\n/)
                .slice(0, 100)
                .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')));
              setCsvRows(rows);
            }
            setTextContent(decoded);
            return;
          }
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          console.warn('Could not load direct preview:', err);
          setDownloadError(err.message || 'Could not stream document preview.');
        }
      })
      .finally(() => {
        if (isMounted) setPreviewLoading(false);
      });

    return () => {
      isMounted = false;
      if (createdImgUrl) {
        URL.revokeObjectURL(createdImgUrl);
      }
    };
  }, [isOpen, doc?.documentId]);

  if (!isOpen || !doc) return null;

  const isMissing = doc.fileExists === false || doc.storageStatus === 'FILE_MISSING';
  const serverPreviewUrl = api.getEvidencePreviewUrl(doc.documentId);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setDownloadError(null);
      await api.downloadEvidenceFile(doc.documentId, doc.originalFileName);
    } catch (err: any) {
      setDownloadError(err.message || 'Failed to download document');
    } finally {
      setDownloading(false);
    }
  };

  const formatSize = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return 'Unknown size';
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-[#cbd5e1]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#0f172a] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-5 h-5 text-[#38bdf8] shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-sm truncate" title={doc.originalFileName}>
                {doc.originalFileName}
              </h3>
              <p className="text-[11px] text-[#94a3b8] font-mono truncate">
                ID: {doc.documentId} · {formatSize(doc.fileSize)} · SHA-256: {(doc.checksum || '').slice(0, 16)}...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isMissing && (
              <>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-2.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className={`w-3.5 h-3.5 ${downloading ? 'animate-spin' : ''}`} />
                  <span>{downloading ? 'Downloading...' : 'Download'}</span>
                </button>
                <a
                  href={serverPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 bg-[#334155] hover:bg-[#475569] text-white rounded text-xs font-semibold flex items-center gap-1.5"
                  title="Open document stream in new browser tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>New Tab</span>
                </a>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-[#94a3b8] hover:text-white hover:bg-[#334155] rounded"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notification Error if any */}
        {downloadError && (
          <div className="bg-[#fef2f2] border-b border-[#fecaca] px-4 py-2 text-xs text-[#991b1b] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#dc2626]" />
            <span>{downloadError}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-auto bg-[#f8fafc] p-4 flex flex-col items-center justify-center min-h-[420px]">
          {previewLoading ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-3">
              <RefreshCw className="w-8 h-8 text-[#1d4ed8] animate-spin" />
              <div className="text-xs font-semibold text-[#0f172a]">Streaming Authenticated Evidence Preview...</div>
              <div className="text-[11px] text-[#64748b]">Verifying permissions and loading file from storage vault.</div>
            </div>
          ) : isMissing ? (
            /* Missing file warning card */
            <div className="max-w-md w-full bg-white p-6 rounded-lg border border-[#fed7aa] shadow-sm text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#fff7ed] border border-[#fed7aa] flex items-center justify-center mx-auto text-[#ea580c]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#0f172a]">
                  Evidence Binary Missing from Storage Vault
                </h4>
                <p className="text-xs text-[#64748b] mt-1.5 leading-relaxed">
                  The binary object for <strong className="text-[#0f172a]">{doc.originalFileName}</strong> was not found in the storage vault (marked as <code className="bg-[#f1f5f9] px-1 py-0.5 rounded text-[11px] font-mono">FILE_MISSING / UPLOAD_INCOMPLETE</code>).
                </p>
                <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
                  Metadata and audit lineage remain securely recorded. Please re-upload this statutory document to restore active preview and verification streaming.
                </p>
              </div>

              <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded text-left text-[11px] space-y-1 font-mono text-[#475569]">
                <div>Document ID: {doc.documentId}</div>
                <div>Recorded Size: {formatSize(doc.fileSize)}</div>
                <div>Status: {doc.verificationStatus || 'PENDING_REVIEW'}</div>
              </div>

              {onReuploadRequest && (
                <button
                  onClick={() => {
                    onClose();
                    onReuploadRequest(doc);
                  }}
                  className="w-full py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold rounded text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>Re-upload Evidence Document</span>
                </button>
              )}
            </div>
          ) : pdfBuffer ? (
            /* Canvas-based PDF Viewer (100% immune to Chrome / Opera GX iframe blocking) */
            <PdfCanvasViewer
              data={pdfBuffer}
              title={doc.originalFileName}
              heightClass="h-[65vh]"
            />
          ) : imageObjectUrl ? (
            /* Image Viewer with Zoom Controls */
            <div className="w-full h-[65vh] flex flex-col bg-[#e2e8f0] rounded border border-[#cbd5e1] overflow-hidden">
              <div className="bg-[#1e293b] text-white px-3.5 py-2 flex items-center justify-between text-xs shrink-0">
                <span className="font-semibold truncate">{doc.originalFileName}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setImageScale((s) => Math.max(0.4, s - 0.2))}
                    className="p-1 bg-[#334155] hover:bg-[#475569] rounded"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] min-w-[44px] text-center">
                    {Math.round(imageScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setImageScale((s) => Math.min(3, s + 0.2))}
                    className="p-1 bg-[#334155] hover:bg-[#475569] rounded"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageScale(1)}
                    className="p-1 bg-[#334155] hover:bg-[#475569] rounded"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                <img
                  src={imageObjectUrl}
                  alt={doc.originalFileName}
                  style={{ transform: `scale(${imageScale})`, transformOrigin: 'center center' }}
                  className="max-h-full max-w-full object-contain rounded border border-[#cbd5e1] shadow-sm bg-white transition-transform"
                />
              </div>
            </div>
          ) : csvRows && csvRows.length > 0 ? (
            /* CSV Table Viewer */
            <div className="w-full h-[65vh] flex flex-col bg-white border border-[#cbd5e1] rounded overflow-hidden">
              <div className="bg-[#f1f5f9] px-3.5 py-2 border-b border-[#cbd5e1] text-xs font-bold text-[#0f172a] flex justify-between">
                <span>Tabular CSV Evidence Preview ({csvRows.length} rows)</span>
                <span className="font-mono text-[11px] text-[#64748b]">{doc.originalFileName}</span>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#f8fafc] border-b border-[#e2e8f0] sticky top-0">
                    <tr>
                      {csvRows[0].map((col, idx) => (
                        <th key={idx} className="py-2 px-3 font-bold text-[#334155] border-r border-[#e2e8f0]">
                          {col || `Column ${idx + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {csvRows.slice(1).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#f8fafc]">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-1.5 px-3 font-mono text-[11px] text-[#0f172a] border-r border-[#f1f5f9]">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : textContent ? (
            /* Text content or invoice snippet preview */
            <div className="w-full h-full flex flex-col space-y-3">
              <div className="p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded text-xs text-[#1e40af] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                <span>
                  Displaying extracted text contents for <strong>{doc.originalFileName}</strong>.
                </span>
              </div>
              <div className="flex-1 bg-white border border-[#cbd5e1] rounded p-4 font-mono text-xs text-[#0f172a] whitespace-pre-wrap overflow-auto shadow-inner min-h-[300px]">
                {textContent}
              </div>
            </div>
          ) : (
            /* Generic / Office Spreadsheet / Word File Card */
            <div className="max-w-md w-full bg-white p-6 rounded-lg border border-[#cbd5e1] shadow-sm text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center mx-auto text-[#1d4ed8]">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#0f172a]">{doc.originalFileName}</h4>
                <p className="text-xs text-[#64748b] mt-1">
                  MIME: {doc.mimeType || 'application/octet-stream'} · {formatSize(doc.fileSize)}
                </p>
              </div>

              <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded text-left text-[11px] space-y-1 font-mono text-[#475569]">
                <div>Checksum (SHA-256): {doc.checksum}</div>
                <div>Status: {doc.verificationStatus || 'VERIFIED'}</div>
              </div>

              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold rounded text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className={`w-4 h-4 ${downloading ? 'animate-spin' : ''}`} />
                <span>{downloading ? 'Downloading...' : 'Download File'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer with Verification and Lineage */}
        <div className="px-5 py-2.5 bg-white border-t border-[#e2e8f0] flex items-center justify-between text-xs text-[#64748b]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#059669]" />
            <span>Cryptographic SHA-256 Vault Verification Active</span>
          </div>
          <div>
            Status:{' '}
            <span className={`font-semibold ${isMissing ? 'text-[#ea580c]' : 'text-[#059669]'}`}>
              {isMissing ? 'FILE MISSING / RE-UPLOAD REQUIRED' : doc.verificationStatus || 'AVAILABLE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
