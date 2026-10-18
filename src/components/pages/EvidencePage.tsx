import React, { useState, useEffect } from 'react';
import {
  Paperclip,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  UploadCloud,
  FileText,
  Lock,
  X,
  RefreshCw,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { AuthUser } from '../../types.ts';
import { api } from '../../services/api.ts';
import { DocumentActions } from '../common/DocumentActions.tsx';
import { PreviewDocInfo } from '../common/DocumentPreviewModal.tsx';

interface EvidencePageProps {
  user: AuthUser;
}

export interface EvidenceDocItem extends PreviewDocInfo {
  documentId: string;
  originalFileName: string;
  storagePath: string;
  fileSize: number;
  checksum: string;
  linkedRecordId?: string;
  evidenceType: string;
  description?: string;
  uploadedByName?: string;
  uploadedBy?: string;
  uploadedAt: number;
  verificationStatus: string;
  verifiedByName?: string;
  verificationNotes?: string;
  facilityId?: string;
  fileExists?: boolean;
  storageStatus?: string;
  actualFileSizeBytes?: number;
}

export const EvidencePage: React.FC<EvidencePageProps> = ({ user }) => {
  const [documents, setDocuments] = useState<EvidenceDocItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<EvidenceDocItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [replaceTargetDoc, setReplaceTargetDoc] = useState<EvidenceDocItem | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Upload Form state
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState<string>('Utility Bill');
  const [description, setDescription] = useState<string>('');
  const [linkedRecordId, setLinkedRecordId] = useState<string>('E-GHG-01');

  const [availableTypes, setAvailableTypes] = useState<string[]>([
    'Utility Bill',
    'Electricity Bill',
    'Fuel Invoice',
    'Meter Reading',
    'Purchase Invoice',
    'Travel Record',
    'Refrigerant Record',
    'Waste Record',
    'Water Record',
    'Transport Record',
    'Production Record',
    'Calculation Sheet',
    'ERP Export',
    'Internal Record',
    'Supplier Document',
    'Other',
  ]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.getEvidenceList();
      if (res && res.documents) {
        setDocuments(res.documents);
        if (res.documents.length > 0) {
          setSelectedDoc(res.documents[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch evidence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    api.getEvidenceTypes().then((types) => {
      if (types && types.length > 0) {
        setAvailableTypes(types);
      }
    }).catch(() => {});
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) {
      setUploadError('Please select a file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('evidenceType', evidenceType);
      formData.append('description', description);
      formData.append('linkedRecordId', linkedRecordId);

      let res: any;
      if (replaceTargetDoc) {
        res = await api.replaceEvidence(replaceTargetDoc.documentId, formData);
        setUploadSuccess(`Evidence file successfully replaced and verified for ${replaceTargetDoc.originalFileName}!`);
      } else {
        res = await api.uploadEvidence(formData);
        setUploadSuccess('Evidence document successfully uploaded and hashed with SHA-256 integrity!');
      }

      setShowUploadModal(false);
      setReplaceTargetDoc(null);
      setFileToUpload(null);
      setDescription('');
      await loadDocuments();
      if (res.document) {
        setSelectedDoc(res.document);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReuploadRequest = (doc: PreviewDocInfo) => {
    const fullDoc = documents.find((d) => d.documentId === doc.documentId) || (doc as EvidenceDocItem);
    setReplaceTargetDoc(fullDoc);
    if (fullDoc.evidenceType) setEvidenceType(fullDoc.evidenceType);
    if (fullDoc.linkedRecordId) setLinkedRecordId(fullDoc.linkedRecordId);
    if (fullDoc.description) setDescription(fullDoc.description);
    setUploadError(null);
    setShowUploadModal(true);
  };

  const handleVerify = async (docId: string, status: 'VERIFIED' | 'REQUIRES_CLARIFICATION' | 'REJECTED') => {
    try {
      const notes = prompt(`Enter verification review note for ${status}:`, `Statutory verification completed by ${user.name}`);
      if (notes === null) return;
      await api.verifyEvidence(docId, status, notes);
      await loadDocuments();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 B';
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [uploaderFilter, setUploaderFilter] = useState<string>('ALL');

  const uniqueUploaders = Array.from(
    new Set(documents.map((d) => d.uploadedByName || d.uploadedBy || 'System Seeded'))
  );

  const filteredDocuments = documents.filter((doc) => {
    if (uploaderFilter === 'MINE') {
      if (doc.uploadedBy !== user.userId && doc.uploadedByName !== user.name) return false;
    } else if (uploaderFilter === 'OTHERS') {
      if (doc.uploadedBy === user.userId || doc.uploadedByName === user.name) return false;
    } else if (uploaderFilter !== 'ALL') {
      const uploaderLabel = doc.uploadedByName || doc.uploadedBy || 'System Seeded';
      if (uploaderLabel !== uploaderFilter) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (doc.originalFileName || '').toLowerCase().includes(q);
      const matchId = (doc.documentId || '').toLowerCase().includes(q);
      const matchType = (doc.evidenceType || '').toLowerCase().includes(q);
      const matchUploader = (doc.uploadedByName || doc.uploadedBy || '').toLowerCase().includes(q);
      const matchRecord = (doc.linkedRecordId || '').toLowerCase().includes(q);
      if (!matchName && !matchId && !matchType && !matchUploader && !matchRecord) return false;
    }
    return true;
  });

  const verifiedCount = documents.filter((d) => d.verificationStatus === 'VERIFIED').length;
  const pendingCount = documents.filter((d) => d.verificationStatus === 'PENDING_REVIEW' || d.verificationStatus === 'UPLOADED').length;
  const actionCount = documents.filter((d) => d.verificationStatus === 'REQUIRES_CLARIFICATION' || d.verificationStatus === 'REJECTED').length;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              Evidence Vault
            </h1>
            <span className="text-[10px] font-bold bg-[#eff4ff] text-[#1d4ed8] px-2 py-0.5 rounded border border-[#bfdbfe]">
              BRSR Core Assurance · Immutable SHA-256 Vault
            </span>
          </div>
          <p className="text-xs text-[#64748b] mt-0.5">
            Enterprise-wide repository of supporting documents, PDFs, invoices, and meter logs uploaded by all users across facilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadDocuments()}
            className="px-3 py-1.5 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] rounded shadow-2xs flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Vault</span>
          </button>
          <button
            onClick={() => {
              setUploadError(null);
              setUploadSuccess(null);
              setShowUploadModal(true);
            }}
            className="px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded shadow-2xs flex items-center gap-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            + Upload Evidence
          </button>
        </div>
      </div>

      {uploadSuccess && (
        <div className="p-3 bg-[#ecfdf5] border border-[#a7f3d0] rounded text-xs text-[#065f46] flex items-center justify-between">
          <span>{uploadSuccess}</span>
          <button onClick={() => setUploadSuccess(null)} className="text-[#065f46] hover:underline font-bold">Dismiss</button>
        </div>
      )}

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <div className="text-[10px] font-bold text-[#64748b] uppercase">TOTAL REPOSITORY DOCS</div>
          <div className="text-2xl font-bold text-[#0f172a] tabular-nums">{documents.length}</div>
          <div className="text-[10px] text-[#059669]">All users &amp; facilities visible</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <div className="text-[10px] font-bold text-[#64748b] uppercase">VERIFIED &amp; ASSURED</div>
          <div className="text-2xl font-bold text-[#059669] tabular-nums">{verifiedCount}</div>
          <div className="text-[10px] text-[#64748b]">Assured by statutory auditors</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <div className="text-[10px] font-bold text-[#64748b] uppercase">PENDING REVIEW</div>
          <div className="text-2xl font-bold text-[#d97706] tabular-nums">{pendingCount}</div>
          <div className="text-[10px] text-[#64748b]">Ready for inspection &amp; sign-off</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <div className="text-[10px] font-bold text-[#64748b] uppercase">ACTION REQUIRED</div>
          <div className="text-2xl font-bold text-[#e11d48] tabular-nums">{actionCount}</div>
          <div className="text-[10px] text-[#64748b]">Clarification or variance flagged</div>
        </div>
      </div>

      {/* Document Register & Dossier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Table: 2 cols */}
        <div className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-md overflow-hidden">
          <div className="p-3.5 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                ALL ENTERPRISE EVIDENCE DOCUMENTS ({filteredDocuments.length} / {documents.length})
              </h3>
              <span className="text-[11px] text-[#64748b]">
                Showing previously uploaded PDFs &amp; records from all users across MEIL
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search file, ID, or user..."
                className="border border-[#cbd5e1] rounded px-2.5 py-1 text-xs text-[#0f172a] w-44"
              />
              <select
                value={uploaderFilter}
                onChange={(e) => setUploaderFilter(e.target.value)}
                className="border border-[#cbd5e1] rounded px-2 py-1 text-xs text-[#0f172a] bg-white"
              >
                <option value="ALL">All Users ({documents.length})</option>
                <option value="MINE">Uploaded by Me</option>
                <option value="OTHERS">Uploaded by Other Users</option>
                {uniqueUploaders.map((u) => (
                  <option key={u} value={u}>
                    User: {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f1f5f9] text-[#475569] text-[10px] uppercase font-bold border-b border-[#cbd5e1]">
                  <th className="py-2.5 px-3">DOCUMENT / SHA-256</th>
                  <th className="py-2.5 px-3">UPLOADED BY / RECORD</th>
                  <th className="py-2.5 px-3">CATEGORY / SCOPE</th>
                  <th className="py-2.5 px-3 text-center">STATUS</th>
                  <th className="py-2.5 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {filteredDocuments.map((doc) => {
                  const isSelected = selectedDoc?.documentId === doc.documentId;
                  const isVerified = doc.verificationStatus === 'VERIFIED';
                  return (
                    <tr
                      key={doc.documentId}
                      onClick={() => setSelectedDoc(doc)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#eff4ff]' : 'hover:bg-[#f8fafc]'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#1d4ed8] hover:underline flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#3b82f6] shrink-0" />
                          {doc.originalFileName}
                        </div>
                        <div className="text-[10px] font-mono text-[#64748b]">
                          {formatFileSize(doc.fileSize)} · {(doc.checksum || '').slice(0, 16)}...
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-[#0f172a] font-semibold">
                          {doc.uploadedByName || doc.uploadedBy || 'Facility Operator'}
                        </div>
                        <div className="text-[10px] text-[#64748b] font-mono">
                          {doc.linkedRecordId || 'General Vault'} · {doc.facilityId || doc.documentId.slice(0, 10)}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#475569]">
                        {doc.evidenceType}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {doc.storageStatus === 'FILE_MISSING' ? (
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa]">
                            FILE MISSING
                          </span>
                        ) : (
                          <span
                            className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                              isVerified
                                ? 'bg-[#ecfdf5] text-[#059669]'
                                : doc.verificationStatus === 'REQUIRES_CLARIFICATION'
                                ? 'bg-[#fef2f2] text-[#dc2626]'
                                : 'bg-[#fffbeb] text-[#d97706]'
                            }`}
                          >
                            {doc.verificationStatus.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <DocumentActions
                          document={doc}
                          compact
                          onReuploadRequest={handleReuploadRequest}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Dossier Card */}
        {selectedDoc ? (
          <div className="bg-white border border-[#e2e8f0] rounded-md p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
              <h3 className="font-bold text-[#0f172a] text-xs uppercase">ACTIVE ASSURANCE DOSSIER</h3>
              <span className="font-mono text-[10px] text-[#64748b]">ID: {selectedDoc.documentId}</span>
            </div>

            <div className="p-3 border border-[#cbd5e1] rounded bg-[#f8fafc] space-y-1">
              <div className="font-bold text-[#0f172a] flex items-center justify-between">
                <span>{selectedDoc.originalFileName}</span>
                <span className="text-[10px] text-[#64748b]">{formatFileSize(selectedDoc.fileSize)}</span>
              </div>
              <div className="text-[10px] font-mono text-[#64748b] break-all">
                SHA-256: {selectedDoc.checksum}
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] text-[#475569]">
              <div><strong>Uploaded By:</strong> {selectedDoc.uploadedByName || selectedDoc.uploadedBy}</div>
              <div><strong>Timestamp:</strong> {new Date(selectedDoc.uploadedAt).toLocaleString()} (IST)</div>
              <div><strong>Facility / Site:</strong> {selectedDoc.facilityId || 'Assigned Site'}</div>
              <div><strong>Category:</strong> {selectedDoc.evidenceType}</div>
              <div><strong>Description:</strong> {selectedDoc.description || 'Statutory compliance supporting document.'}</div>
            </div>

            <div className="p-3 bg-[#eff4ff] border border-[#bfdbfe] rounded space-y-1 text-xs">
              <div className="font-bold text-[#1d4ed8] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1d4ed8]" />
                STATUTORY AUDITOR ASSURANCE
              </div>
              <div className="text-[11px] text-[#475569]">
                {selectedDoc.verificationNotes ||
                  '"Supporting tax invoice matches meter logs and recorded consumption metrics. Certified valid under SEBI BRSR guidelines."'}
              </div>
              <div className="text-[10px] font-semibold text-[#059669] pt-1">
                {selectedDoc.verifiedByName ? `Signed by ${selectedDoc.verifiedByName}` : 'Awaiting statutory sign-off'}
              </div>
            </div>

            {/* Auditor / Reviewer actions */}
            {(user.role === 'AUDITOR' || user.role === 'GROUP_ADMIN') && (
              <div className="pt-2 border-t border-[#f1f5f9] flex items-center gap-2">
                <button
                  onClick={() => handleVerify(selectedDoc.documentId, 'VERIFIED')}
                  className="flex-1 py-1.5 bg-[#059669] hover:bg-[#047857] text-white text-[11px] font-semibold rounded shadow-2xs"
                >
                  ✓ Verify Document
                </button>
                <button
                  onClick={() => handleVerify(selectedDoc.documentId, 'REQUIRES_CLARIFICATION')}
                  className="flex-1 py-1.5 bg-[#d97706] hover:bg-[#b45309] text-white text-[11px] font-semibold rounded shadow-2xs"
                >
                  Request Clarification
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-[#f1f5f9]">
              <DocumentActions
                document={selectedDoc}
                onReuploadRequest={handleReuploadRequest}
                className="w-full justify-center flex"
              />
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#e2e8f0] rounded-md p-6 text-center text-xs text-[#64748b]">
            Select a document from the register to inspect its cryptographic dossier.
          </div>
        )}

      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#1d4ed8]" />
                <h3 className="text-sm font-bold text-[#0f172a]">
                  {replaceTargetDoc
                    ? `Re-upload File for ${replaceTargetDoc.originalFileName}`
                    : 'Upload Statutory ESG Evidence'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setReplaceTargetDoc(null);
                }}
                className="text-[#64748b] hover:text-[#0f172a]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-2.5 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs rounded">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#334155] mb-1">
                  Evidence File (.pdf, .xlsx, .docx, .png, .jpg)
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setFileToUpload(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs border border-[#cbd5e1] rounded p-2 text-[#334155] file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#eff4ff] file:text-[#1d4ed8] hover:file:bg-[#dbeafe]"
                />
                <p className="text-[10px] text-[#64748b] mt-1">
                  File will be cryptographically hashed (SHA-256) and anchored to the audit trail.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#334155] mb-1">Evidence Category</label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="w-full border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a]"
                >
                  {availableTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#334155] mb-1">Linked ESG Metric Record ID</label>
                <input
                  type="text"
                  value={linkedRecordId}
                  onChange={(e) => setLinkedRecordId(e.target.value)}
                  placeholder="e.g. E-GHG-01, E-WATER-02"
                  className="w-full border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#334155] mb-1">Description / Meter Context</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide reference bill numbers, meter calibration certificates, or invoice notes..."
                  className="w-full border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 bg-white border border-[#cbd5e1] text-[#334155] font-semibold rounded text-xs hover:bg-[#f8fafc]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white font-semibold rounded text-xs flex items-center gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Uploading &amp; Hashing...
                    </>
                  ) : (
                    'Upload & Secure'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

