import React, { useState, useEffect } from 'react';
import {
  Plus,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UploadCloud,
  X,
  FileText,
  RefreshCw,
  Eye,
  History,
  Link,
  ShieldAlert,
  Paperclip,
  Calculator,
  FileCheck,
} from 'lucide-react';
import { AuthUser } from '../../types.ts';
import { api } from '../../services/api.ts';
import { DocumentActions } from '../common/DocumentActions.tsx';
import { calculateEmissions } from '../../utils/emissions.ts';
import {
  findActivityOption,
  getActivitiesForScope,
  SCOPE_3_CATEGORIES,
  ActivityOption,
} from '../../utils/activityCatalogue.ts';

interface ESGDataPageProps {
  user: AuthUser;
}

export const ESGDataPage: React.FC<ESGDataPageProps> = ({ user }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState('All Environmental');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [masterData, setMasterData] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Form state for creating record with dynamic scope fields
  const [formData, setFormData] = useState({
    scopeNo: 1 as 1 | 2 | 3,
    scope3CategoryNo: 1,
    activityTypeId: 'ACT-DIESEL-GEN',
    description: '',
    quantity: 10000,
    unitId: 'LITER',
    spendAmount: 890000,
    currencyCode: 'INR',
    dataMethod: 'FUEL_DISPENSING_LOG',
    sourceReference: 'INV-MH-2025-0872',
    invoiceOrMeterRef: '',
    estimatedFlag: false,
    estimationReason: '',
    periodStart: '2025-10-01',
    periodEnd: '2025-10-31',
    reportingPeriodId: 'Q3_FY2526',
    companyId: user.organizationId || 'COMP001',
    businessUnitId: user.businessUnitId || 'BU001',
    projectId: user.projectId || 'PROJ001',
    facilityId: 'FAC001',

    // Scope 1 Contextual Fields
    fuelType: 'DIESEL',
    combustionType: 'INTERNAL_COMBUSTION',
    equipmentRef: 'DG Set #4 Cummins 1500kVA',
    refrigerantSubstance: 'R-410A',
    processType: 'Calcination',
    material: 'Limestone (CaCO3)',
    capturedGas: 'CO2',
    captureMethod: 'Permanent Geological Sequestration (ISO 27914)',
    leakageReason: 'Annual Scheduled Maintenance Top-up',

    // Scope 2 Contextual Fields
    energyType: 'Grid Electricity',
    accountingMethod: 'LOCATION_BASED' as 'LOCATION_BASED' | 'MARKET_BASED',
    supplier: 'State Electricity Distribution Board',
    meterIdentifier: 'METER-EB-HT-9921',
    gridRegion: 'India National Grid Average',
    renewablePercentage: 0,
    certificateDetails: '',

    // Scope 3 Contextual Fields
    materialGrade: 'Primary TMT Rebar (Fe 500D)',
    supplierName: 'Tata Steel Limited',
    purchaseOrderRef: 'PO-2025-STEEL-091',
    capitalAssetTag: 'EX-08 CAT 320D Hydraulic Excavator',
    capitalVendor: 'Caterpillar India',
    transportMode: 'HEAVY_DIESEL_TRUCK',
    distanceKm: 450,
    cargoWeightMt: 35,
    tonneKm: 15750,
    travelMode: 'DOMESTIC_FLIGHT',
    passengerKm: 1200,
    travelClass: 'ECONOMY',
    hotelNights: 3,
    commuteMode: 'METRO',
    wasteDisposalMethod: 'LANDFILL',
    wasteType: 'Municipal Solid Waste',
    leasedAssetType: 'OFFICE_SPACE',
    leasedFloorAreaSqm: 1200,
    operatingHours: 180,
  });

  // Current selected activity definition
  const currentActivity = findActivityOption(formData.activityTypeId);

  // Evidence file upload states inside the Modal
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedEvidenceDoc, setUploadedEvidenceDoc] = useState<any | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState<boolean>(false);
  const [draftActivityId, setDraftActivityId] = useState<string | null>(null);

  // Evidence upload state inside the Dossier Drawer for existing records
  const [dossierFile, setDossierFile] = useState<File | null>(null);
  const [uploadingDossierEvidence, setUploadingDossierEvidence] = useState<boolean>(false);

  // Live emission calculation preview in the modal
  const modalEmission = calculateEmissions({
    scopeNo: formData.scopeNo,
    scope3CategoryNo: formData.scopeNo === 3 ? formData.scope3CategoryNo : undefined,
    activityTypeId: formData.activityTypeId,
    unitId: formData.unitId,
    quantity: formData.quantity,
    spendAmount: formData.spendAmount,
    fuelOrSubstance: formData.fuelType || formData.refrigerantSubstance || currentActivity?.defaultFuelOrSubstance,
    renewableFlag: formData.renewablePercentage === 100 || formData.energyType.includes('Renewable') || formData.activityTypeId.includes('RENEW'),
    renewablePercentage: formData.renewablePercentage,
    accountingMethod: formData.accountingMethod,
  });

  const loadRecords = async () => {
    try {
      setLoading(true);
      setErrorBanner(null);
      const query: Record<string, string> = {};
      if (searchQuery.trim()) query.search = searchQuery.trim();

      if (activeCategory === 'Scope 1 (Direct)') {
        query.scopeNo = '1';
      } else if (activeCategory === 'Scope 2 (Electricity)') {
        query.scopeNo = '2';
      } else if (activeCategory === 'Scope 3 (Supply Chain)') {
        query.scopeNo = '3';
      }

      const res = await api.getESGRecords(query);
      if (res && res.records) {
        setRecords(res.records);
      }
    } catch (err: any) {
      console.error('Failed to load records:', err);
      setErrorBanner(err.message || 'Failed to fetch records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
    api.getESGMasterData().then((m) => {
      setMasterData(m);
      if (m.organizations?.length > 0 && !formData.companyId) {
        setFormData((prev) => ({ ...prev, companyId: m.organizations[0].organizationId }));
      }
    }).catch(console.error);
  }, [activeCategory]);

  const resetModalState = () => {
    setSelectedFile(null);
    setUploadedEvidenceDoc(null);
    setUploadingEvidence(false);
    setDraftActivityId(null);
  };

  /**
   * Manual "Upload Evidence" button inside the Modal
   * Flow:
   * 1. If activity record draft does not exist yet, creates draft activity record in Firestore
   * 2. Uploads the selected evidence file to Firebase Cloud Storage via Phase 2 API
   * 3. Stores evidence metadata in Firestore
   * 4. Links evidence document to the activity record
   */
  const handleManualUploadEvidence = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload first.');
      return;
    }

    try {
      setUploadingEvidence(true);
      setErrorBanner(null);

      // 1. Create or ensure draft activity record
      let activityId = draftActivityId;
      if (!activityId) {
        const payload: any = {
          ...formData,
          workflowStatus: 'DRAFT',
        };

        if (formData.scopeNo === 1) {
          payload.scope3CategoryNo = null;
          payload.scope1Details = {
            category: 'Stationary Combustion',
            combustionType: 'INTERNAL_COMBUSTION',
            notes: formData.sourceReference || 'Standard site entry',
          };
        } else if (formData.scopeNo === 2) {
          payload.scope3CategoryNo = null;
          payload.scope2Details = {
            energyType: 'Electricity',
            accountingMethod: 'LOCATION_BASED',
            renewableFlag: false,
            renewablePercentage: 0,
          };
        } else if (formData.scopeNo === 3) {
          payload.scope3Details = {
            scope3CategoryNo: formData.scope3CategoryNo,
            categoryName: 'Supply Chain Activity',
            calculationMethod: 'AVERAGE_DATA',
          };
        }

        const createdRes = await api.createESGRecord(payload);
        activityId = createdRes.record.activityId;
        setDraftActivityId(activityId);
      }

      // 2. Upload Evidence via Phase 2 Multipart Endpoint
      const evidenceFormData = new FormData();
      evidenceFormData.append('file', selectedFile);
      evidenceFormData.append(
        'evidenceType',
        formData.scopeNo === 1 ? 'Fuel Invoice' : formData.scopeNo === 2 ? 'Electricity Bill' : 'Purchase Invoice'
      );
      evidenceFormData.append('description', formData.description || `Supporting documentation for ${activityId}`);
      evidenceFormData.append('reportingPeriodId', formData.reportingPeriodId);
      evidenceFormData.append('companyId', formData.companyId);
      evidenceFormData.append('businessUnitId', formData.businessUnitId);
      evidenceFormData.append('projectId', formData.projectId);
      evidenceFormData.append('facilityId', formData.facilityId);
      evidenceFormData.append('linkedRecordId', activityId!);

      const uploadRes = await api.uploadEvidence(evidenceFormData);
      const doc = uploadRes.document;

      // 3. Link Evidence Document to Activity Record
      await api.linkESGEvidence(activityId!, doc.documentId);

      setUploadedEvidenceDoc(doc);
      setSuccessBanner(`Evidence document "${doc.originalFileName}" uploaded to Firebase vault and linked to ${activityId}!`);
      await loadRecords();
    } catch (err: any) {
      console.error('Evidence upload failed:', err);
      setErrorBanner(err.message || 'Failed to upload evidence document to Firebase.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  /**
   * Save Draft or Submit Record
   * Also uploads & links selected file if not yet uploaded.
   */
  const handleCreateRecord = async (submitImmediate: boolean) => {
    try {
      setActionLoading(true);
      setErrorBanner(null);

      let activityId = draftActivityId;
      const targetStatus = submitImmediate ? 'SUBMITTED' : 'DRAFT';

      if (activityId) {
        // Record was already created as draft during manual evidence upload
        if (submitImmediate) {
          await api.submitESGRecord(activityId);
        } else {
          await api.updateESGRecord(activityId, {
            ...formData,
            workflowStatus: 'DRAFT',
          });
        }
      } else {
        // Create new record
        const payload: any = {
          ...formData,
          workflowStatus: targetStatus,
        };

        if (formData.scopeNo === 1) {
          payload.scope3CategoryNo = null;
          payload.scope1Details = {
            category: currentActivity?.scopeGroup || 'Stationary Combustion',
            combustionType: formData.combustionType,
            fuelSubstanceId: formData.fuelType || formData.refrigerantSubstance || currentActivity?.defaultFuelOrSubstance,
            equipmentReference: formData.equipmentRef,
            processType: formData.processType,
            material: formData.material,
            capturedGas: formData.capturedGas,
            captureMethod: formData.captureMethod,
            leakageReason: formData.leakageReason,
            notes: formData.sourceReference || 'Standard site entry',
          };
        } else if (formData.scopeNo === 2) {
          payload.scope3CategoryNo = null;
          payload.scope2Details = {
            energyType: formData.energyType,
            accountingMethod: formData.accountingMethod,
            supplier: formData.supplier,
            meterIdentifier: formData.meterIdentifier,
            gridRegion: formData.gridRegion,
            renewableFlag: formData.renewablePercentage === 100 || formData.energyType.includes('Renewable') || formData.activityTypeId.includes('RENEW'),
            renewablePercentage: formData.renewablePercentage,
            certificateDetails: formData.certificateDetails,
          };
        } else if (formData.scopeNo === 3) {
          const catDef = SCOPE_3_CATEGORIES.find((c) => c.categoryNo === formData.scope3CategoryNo);
          payload.scope3CategoryNo = formData.scope3CategoryNo;
          payload.scope3Details = {
            scope3CategoryNo: formData.scope3CategoryNo,
            categoryName: catDef?.name || `Category ${formData.scope3CategoryNo}`,
            calculationMethod: formData.dataMethod,
            dataSourceType: 'PRIMARY_ACTIVITY',
            materialGrade: formData.materialGrade,
            supplierName: formData.supplierName,
            purchaseOrderRef: formData.purchaseOrderRef,
            capitalAssetTag: formData.capitalAssetTag,
            capitalVendor: formData.capitalVendor,
            transportMode: formData.transportMode,
            distanceKm: formData.distanceKm,
            cargoWeightMt: formData.cargoWeightMt,
            tonneKm: formData.tonneKm,
            travelMode: formData.travelMode,
            passengerKm: formData.passengerKm,
            travelClass: formData.travelClass,
            hotelNights: formData.hotelNights,
            commuteMode: formData.commuteMode,
            wasteDisposalMethod: formData.wasteDisposalMethod,
            wasteType: formData.wasteType,
            leasedAssetType: formData.leasedAssetType,
            leasedFloorAreaSqm: formData.leasedFloorAreaSqm,
            operatingHours: formData.operatingHours,
          };
        }

        // Deep clean any undefined fields before sending to API
        const cleanPayload = JSON.parse(JSON.stringify(payload));
        const created = await api.createESGRecord(cleanPayload);
        activityId = created.record.activityId;

        // If file was selected but not uploaded yet, upload and link it now
        if (selectedFile && !uploadedEvidenceDoc) {
          try {
            const evidenceFormData = new FormData();
            evidenceFormData.append('file', selectedFile);
            evidenceFormData.append(
              'evidenceType',
              formData.scopeNo === 1 ? 'Fuel Invoice' : formData.scopeNo === 2 ? 'Electricity Bill' : 'Purchase Invoice'
            );
            evidenceFormData.append('description', formData.description || `Supporting documentation for ${activityId}`);
            evidenceFormData.append('reportingPeriodId', formData.reportingPeriodId);
            evidenceFormData.append('companyId', formData.companyId);
            evidenceFormData.append('businessUnitId', formData.businessUnitId);
            evidenceFormData.append('projectId', formData.projectId);
            evidenceFormData.append('facilityId', formData.facilityId);
            evidenceFormData.append('linkedRecordId', activityId!);

            const uploadRes = await api.uploadEvidence(evidenceFormData);
            await api.linkESGEvidence(activityId!, uploadRes.document.documentId);
          } catch (uploadErr: any) {
            console.error('Post-creation evidence upload error:', uploadErr);
          }
        }
      }

      setSuccessBanner(
        submitImmediate
          ? `Record ${activityId} submitted successfully for review!`
          : `Draft ${activityId} saved successfully!`
      );
      setShowAddModal(false);
      resetModalState();
      await loadRecords();
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to create record');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Uploads and links additional evidence directly to an existing record inside the Dossier Drawer
   */
  const handleUploadDossierEvidence = async () => {
    if (!selectedRecord || !dossierFile) return;

    try {
      setUploadingDossierEvidence(true);
      setErrorBanner(null);

      const record = selectedRecord.record;
      const evidenceFormData = new FormData();
      evidenceFormData.append('file', dossierFile);
      evidenceFormData.append(
        'evidenceType',
        record.scopeNo === 1 ? 'Fuel Invoice' : record.scopeNo === 2 ? 'Electricity Bill' : 'Purchase Invoice'
      );
      evidenceFormData.append('description', `Supporting documentation for ${record.activityId}`);
      evidenceFormData.append('reportingPeriodId', record.reportingPeriodId);
      evidenceFormData.append('companyId', record.companyId || record.organizationId);
      evidenceFormData.append('businessUnitId', record.businessUnitId || '');
      evidenceFormData.append('projectId', record.projectId || '');
      evidenceFormData.append('facilityId', record.facilityId || '');
      evidenceFormData.append('linkedRecordId', record.activityId);

      const uploadRes = await api.uploadEvidence(evidenceFormData);
      await api.linkESGEvidence(record.activityId, uploadRes.document.documentId);

      setSuccessBanner(`Evidence "${uploadRes.document.originalFileName}" uploaded and linked to ${record.activityId}!`);
      setDossierFile(null);

      // Refresh dossier
      const updated = await api.getESGRecordById(record.activityId);
      setSelectedRecord(updated);
      await loadRecords();
    } catch (err: any) {
      console.error('Dossier evidence upload failed:', err);
      alert(`Evidence upload failed: ${err.message}`);
    } finally {
      setUploadingDossierEvidence(false);
    }
  };

  const handleRowClick = async (r: any) => {
    try {
      const details = await api.getESGRecordById(r.activityId);
      setSelectedRecord(details);
    } catch {
      setSelectedRecord({ record: r, linkedEvidence: [], versionHistory: [], auditTrail: [] });
    }
  };

  const handleWorkflowTransition = async (targetStatus: string) => {
    if (!selectedRecord) return;
    try {
      setActionLoading(true);
      const remarks = prompt(`Enter review comment for ${targetStatus}:`, `Verified under standard protocol by ${user.name}`);
      if (remarks === null) {
        setActionLoading(false);
        return;
      }
      await api.transitionESGRecord(selectedRecord.record.activityId, targetStatus, remarks);
      setSuccessBanner(`Record ${selectedRecord.record.activityId} transitioned to ${targetStatus}!`);
      const updated = await api.getESGRecordById(selectedRecord.record.activityId);
      setSelectedRecord(updated);
      await loadRecords();
    } catch (err: any) {
      alert(`Transition failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnCorrection = async () => {
    if (!selectedRecord) return;
    const reason = prompt('Please specify why this record requires correction:', 'Quantity variance detected during meter log check');
    if (!reason) return;
    try {
      setActionLoading(true);
      await api.returnESGRecordForCorrection(selectedRecord.record.activityId, reason);
      setSuccessBanner(`Record returned for correction. Revision V${selectedRecord.record.currentVersion + 1} generated.`);
      const updated = await api.getESGRecordById(selectedRecord.record.activityId);
      setSelectedRecord(updated);
      await loadRecords();
    } catch (err: any) {
      alert(`Return failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // KPI Calculations
  const verifiedCount = records.filter((r) => r.workflowStatus === 'APPROVED' || r.workflowStatus === 'ASSURANCE_REVIEWED').length;
  const pendingCount = records.filter((r) => r.workflowStatus === 'SUBMITTED' || r.workflowStatus === 'SITE_REVIEWED' || r.workflowStatus === 'ESG_REVIEWED').length;
  const rejectedCount = records.filter((r) => r.workflowStatus === 'REJECTED' || r.workflowStatus === 'DRAFT').length;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              ESG Data Disclosures &amp; Parameter Registry
            </h1>
            <span className="text-[10px] font-bold bg-[#eff4ff] text-[#1d4ed8] px-2 py-0.5 rounded border border-[#bfdbfe]">
              v2.4 Compliance
            </span>
          </div>
          <p className="text-xs text-[#64748b] mt-0.5">
            SEBI BRSR Principle 1 to 9 &amp; GHG Accounting Protocol · Facility Auditing Console
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadRecords()}
            className="px-3 py-1.5 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] rounded shadow-2xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              resetModalState();
              setShowAddModal(true);
            }}
            className="px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded shadow-2xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Data</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorBanner && (
        <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs rounded flex items-center justify-between">
          <span>{errorBanner}</span>
          <button onClick={() => setErrorBanner(null)} className="font-bold hover:underline">Dismiss</button>
        </div>
      )}
      {successBanner && (
        <div className="p-3 bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-xs rounded flex items-center justify-between">
          <span>{successBanner}</span>
          <button onClick={() => setSuccessBanner(null)} className="font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Selectors Bar */}
      <div className="bg-white border border-[#e2e8f0] rounded-md p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="text-[10px] font-bold text-[#64748b] uppercase block mb-1">LEGAL REPORTING ENTITY</label>
          <select className="w-full h-8 px-2 bg-[#f8fafc] border border-[#cbd5e1] rounded font-medium text-[#0f172a] text-xs outline-none">
            <option>Megha Hydro Infra Ltd (MHIL)</option>
            <option>Megha Engineering &amp; Infrastructures Ltd</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#64748b] uppercase block mb-1">FINANCIAL ACCOUNTING YEAR</label>
          <select className="w-full h-8 px-2 bg-[#f8fafc] border border-[#cbd5e1] rounded font-medium text-[#0f172a] text-xs outline-none">
            <option>FY 2025–26 (Current Cycle)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#64748b] uppercase block mb-1">OPERATING DIVISION / BU</label>
          <select className="w-full h-8 px-2 bg-[#f8fafc] border border-[#cbd5e1] rounded font-medium text-[#0f172a] text-xs outline-none">
            <option>Northern Power &amp; Hydro Division</option>
            <option>Southern Hydro &amp; Irrigation</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#64748b] uppercase block mb-1">REPORTING CADENCE</label>
          <select className="w-full h-8 px-2 bg-[#f8fafc] border border-[#cbd5e1] rounded font-medium text-[#0f172a] text-xs outline-none">
            <option>Q3 (October - December)</option>
          </select>
        </div>
      </div>

      {/* Verification Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#e2e8f0] rounded p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-[#64748b] uppercase">Verified Parameters</div>
            <div className="text-xl font-bold text-[#0f172a] tabular-nums">{verifiedCount} / {records.length}</div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-[#059669]" />
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-[#64748b] uppercase">Pending Compliance Audit</div>
            <div className="text-xl font-bold text-[#d97706] tabular-nums">{pendingCount}</div>
          </div>
          <Clock className="w-5 h-5 text-[#d97706]" />
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-[#64748b] uppercase">Drafts &amp; Action Required</div>
            <div className="text-xl font-bold text-[#e11d48] tabular-nums">{rejectedCount}</div>
          </div>
          <AlertTriangle className="w-5 h-5 text-[#e11d48]" />
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-[#64748b] uppercase">Active User Scope</div>
            <div className="text-xs font-bold text-[#1d4ed8] uppercase truncate">{user.role.replace(/_/g, ' ')}</div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-[#1d4ed8]" />
        </div>
      </div>

      {/* Principle Tabs & Search */}
      <div className="bg-white border border-[#e2e8f0] rounded-md p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f1f5f9] pb-3">
          <div className="flex items-center gap-4 text-xs font-semibold">
            <button className="text-[#1d4ed8] border-b-2 border-[#1d4ed8] pb-1">
              Environmental (Principle 6) <span className="text-[10px] bg-[#eff4ff] px-1.5 py-0.5 rounded ml-1">{records.length}</span>
            </button>
            <button className="text-[#64748b] hover:text-[#0f172a] pb-1">
              Social (Principles 3, 4, 5) <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded ml-1">14</span>
            </button>
            <button className="text-[#64748b] hover:text-[#0f172a] pb-1">
              Governance (Principles 1, 2, 7, 8, 9) <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded ml-1">6</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search activity ID, facility, metric..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadRecords()}
                className="pl-8 pr-3 py-1.5 bg-[#f8fafc] border border-[#cbd5e1] rounded text-xs outline-none w-56"
              />
            </div>
          </div>
        </div>

        {/* Sub-pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {['All Environmental', 'Scope 1 (Direct)', 'Scope 2 (Electricity)', 'Scope 3 (Supply Chain)'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveCategory(tab)}
              className={`px-3 py-1 rounded font-semibold text-xs transition-colors ${
                activeCategory === tab
                  ? 'bg-[#1d4ed8] text-white'
                  : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f1f5f9] text-[#475569] text-[10px] uppercase font-bold border-b border-[#cbd5e1]">
                <th className="py-2.5 px-3">ACTIVITY ID</th>
                <th className="py-2.5 px-3">SCOPE / TYPE</th>
                <th className="py-2.5 px-3">DESCRIPTION</th>
                <th className="py-2.5 px-3 text-right">QUANTITY</th>
                <th className="py-2.5 px-3">UNIT</th>
                <th className="py-2.5 px-3 text-right">CALCULATED GHG</th>
                <th className="py-2.5 px-3 text-center">EVIDENCE</th>
                <th className="py-2.5 px-3">PERIOD</th>
                <th className="py-2.5 px-3">FACILITY</th>
                <th className="py-2.5 px-3 text-center">STATUS</th>
                <th className="py-2.5 px-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {records.map((r) => {
                const calc = calculateEmissions({
                  scopeNo: r.scopeNo,
                  activityTypeId: r.activityTypeId,
                  unitId: r.unitId,
                  quantity: r.quantity,
                });
                const evidenceCount = (r.linkedEvidenceIds || []).length;

                return (
                  <tr
                    key={r.activityId}
                    onClick={() => handleRowClick(r)}
                    className="hover:bg-[#f8fafc] cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-[#1d4ed8]">
                      {r.activityId}
                      <span className="text-[9px] text-[#64748b] block">v{r.currentVersion}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-[#0f172a] block">
                        Scope {r.scopeNo} {r.scope3CategoryNo ? `(Cat ${r.scope3CategoryNo})` : ''}
                      </span>
                      <span className="text-[10px] text-[#64748b] font-mono">{r.activityTypeId}</span>
                    </td>
                    <td className="py-2.5 px-3 text-[#334155] max-w-xs truncate">
                      {r.description || r.activityTypeId}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0f172a] tabular-nums">
                      {typeof r.quantity === 'number' ? r.quantity.toLocaleString() : r.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-[#475569]">{r.unitId}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0f172a] tabular-nums">
                      {calc.tCO2e.toFixed(2)} <span className="text-[10px] text-[#64748b] font-normal">tCO2e</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {evidenceCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#1d4ed8] bg-[#eff4ff] px-2 py-0.5 rounded border border-[#bfdbfe]">
                          <Paperclip className="w-3 h-3" />
                          <span>{evidenceCount} doc{evidenceCount > 1 ? 's' : ''}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#94a3b8]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[#64748b] font-mono text-[11px]">
                      {r.reportingPeriodId}
                    </td>
                    <td className="py-2.5 px-3 text-[#334155]">{r.facilityId || r.projectId}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                          r.workflowStatus === 'APPROVED' || r.workflowStatus === 'ASSURANCE_REVIEWED'
                            ? 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'
                            : r.workflowStatus === 'SUBMITTED' || r.workflowStatus === 'SITE_REVIEWED' || r.workflowStatus === 'ESG_REVIEWED'
                            ? 'bg-[#fffbeb] text-[#d97706] border border-[#fde68a]'
                            : 'bg-[#fff1f2] text-[#e11d48] border border-[#fecdd3]'
                        }`}
                      >
                        {r.workflowStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRowClick(r)}
                        className="px-2 py-1 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-[#1d4ed8] font-semibold rounded text-[11px]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Inspection Drawer / Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-[#cbd5e1] shadow-2xl max-w-3xl w-full p-6 text-xs space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#0f172a]">
                    Activity Ledger Dossier: {selectedRecord.record.activityId}
                  </h3>
                  <span className="text-[10px] font-bold bg-[#eff4ff] text-[#1d4ed8] px-2 py-0.5 rounded border border-[#bfdbfe]">
                    Version V{selectedRecord.record.currentVersion}
                  </span>
                  <span className="text-[10px] font-bold bg-[#f1f5f9] text-[#334155] px-2 py-0.5 rounded">
                    {selectedRecord.record.workflowStatus}
                  </span>
                </div>
                <p className="text-[11px] text-[#64748b]">
                  Facility: {selectedRecord.record.facilityId || selectedRecord.record.projectId} · Entered by {selectedRecord.record.enteredByName || selectedRecord.record.enteredBy}
                </p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-[#64748b] hover:text-[#0f172a]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#f8fafc] p-3 rounded border border-[#e2e8f0]">
              <div>
                <span className="text-[10px] font-bold text-[#64748b] block">SCOPE</span>
                <span className="font-bold text-[#0f172a]">Scope {selectedRecord.record.scopeNo}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#64748b] block">MEASURED VALUE</span>
                <span className="font-bold text-[#0f172a] font-mono tabular-nums">
                  {selectedRecord.record.quantity?.toLocaleString()} {selectedRecord.record.unitId}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#64748b] block">DATA METHOD</span>
                <span className="font-bold text-[#0f172a]">{selectedRecord.record.dataMethod}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#64748b] block">PERIOD</span>
                <span className="font-bold text-[#0f172a] font-mono">{selectedRecord.record.periodStart} to {selectedRecord.record.periodEnd}</span>
              </div>
            </div>

            {/* Scope Specific Details View */}
            {selectedRecord.record.scope1Details && (
              <div className="p-3 bg-white border border-[#cbd5e1] rounded space-y-1">
                <span className="text-[10px] font-bold text-[#1d4ed8] uppercase block">SCOPE 1 COMBUSTION &amp; PROCESS PARAMETERS</span>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-[#475569]">
                  <div><strong>Category:</strong> {selectedRecord.record.scope1Details.category}</div>
                  <div><strong>Combustion Type:</strong> {selectedRecord.record.scope1Details.combustionType || 'N/A'}</div>
                  <div><strong>Fuel Substance:</strong> {selectedRecord.record.scope1Details.fuelSubstanceId || 'N/A'}</div>
                  <div><strong>Source / Invoice:</strong> {selectedRecord.record.sourceReference || 'N/A'}</div>
                  <div><strong>Financial Spend:</strong> ₹{(selectedRecord.record.spendAmount || 0).toLocaleString()}</div>
                  <div><strong>Notes:</strong> {selectedRecord.record.scope1Details.notes || 'None'}</div>
                </div>
              </div>
            )}

            {selectedRecord.record.scope2Details && (
              <div className="p-3 bg-white border border-[#cbd5e1] rounded space-y-1">
                <span className="text-[10px] font-bold text-[#1d4ed8] uppercase block">SCOPE 2 ENERGY &amp; UTILITY PARAMETERS</span>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-[#475569]">
                  <div><strong>Energy Type:</strong> {selectedRecord.record.scope2Details.energyType}</div>
                  <div><strong>Meter ID:</strong> {selectedRecord.record.scope2Details.meterIdentifier || 'N/A'}</div>
                  <div><strong>Accounting Method:</strong> {selectedRecord.record.scope2Details.accountingMethod}</div>
                  <div><strong>Renewable %:</strong> {selectedRecord.record.scope2Details.renewablePercentage}%</div>
                  <div><strong>Source / Invoice:</strong> {selectedRecord.record.sourceReference || 'N/A'}</div>
                  <div><strong>Financial Spend:</strong> ₹{(selectedRecord.record.spendAmount || 0).toLocaleString()}</div>
                </div>
              </div>
            )}

            {selectedRecord.record.scope3Details && (
              <div className="p-3 bg-white border border-[#cbd5e1] rounded space-y-1">
                <span className="text-[10px] font-bold text-[#1d4ed8] uppercase block">SCOPE 3 SUPPLY CHAIN &amp; LIFECYCLE PARAMETERS</span>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-[#475569]">
                  <div><strong>Category:</strong> #{selectedRecord.record.scope3Details.scope3CategoryNo} - {selectedRecord.record.scope3Details.categoryName}</div>
                  <div><strong>Calc Method:</strong> {selectedRecord.record.scope3Details.calculationMethod || 'N/A'}</div>
                  <div><strong>Data Source:</strong> {selectedRecord.record.scope3Details.dataSourceType || 'N/A'}</div>
                  <div><strong>Source / Invoice:</strong> {selectedRecord.record.sourceReference || 'N/A'}</div>
                  <div><strong>Financial Spend:</strong> ₹{(selectedRecord.record.spendAmount || 0).toLocaleString()}</div>
                  <div><strong>Primary Data %:</strong> {selectedRecord.record.scope3Details.primaryDataPercentage || 'N/A'}%</div>
                </div>
              </div>
            )}

            {/* Calculations Breakdown Block */}
            {(() => {
              const recordCalc = calculateEmissions({
                scopeNo: selectedRecord.record.scopeNo,
                activityTypeId: selectedRecord.record.activityTypeId,
                unitId: selectedRecord.record.unitId,
                quantity: selectedRecord.record.quantity,
              });

              return (
                <div className="p-3 bg-[#f8fafc] border border-[#cbd5e1] rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#1d4ed8] uppercase flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5" />
                      <span>GHG CALCULATION PIPELINE &amp; EMISSIONS EQUIVALENT (ISO 14064-1)</span>
                    </span>
                    <span className="text-[10px] font-bold text-[#059669] bg-[#ecfdf5] px-2 py-0.5 rounded border border-[#a7f3d0]">
                      Deterministic Factor Applied
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center font-mono text-[11px]">
                    <div className="p-1.5 bg-white border rounded">
                      <span className="text-[#64748b] block text-[9px] font-sans uppercase">INPUT QUANTITY</span>
                      <span className="font-bold text-[#0f172a]">{selectedRecord.record.quantity?.toLocaleString()} {selectedRecord.record.unitId}</span>
                    </div>
                    <div className="p-1.5 bg-white border rounded">
                      <span className="text-[#64748b] block text-[9px] font-sans uppercase">EMISSION FACTOR</span>
                      <span className="font-bold text-[#1d4ed8]">{recordCalc.factor.toFixed(4)}</span>
                    </div>
                    <div className="p-1.5 bg-white border rounded">
                      <span className="text-[#64748b] block text-[9px] font-sans uppercase">GROSS KG CO2e</span>
                      <span className="font-bold text-[#0f172a]">{recordCalc.grossKgCO2e.toLocaleString()}</span>
                    </div>
                    <div className="p-1.5 bg-[#1d4ed8] text-white rounded">
                      <span className="text-white/80 block text-[9px] font-sans uppercase">FINAL OUTPUT</span>
                      <span className="font-bold text-xs">{recordCalc.tCO2e.toFixed(2)} tCO2e</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-[#64748b] pt-1 border-t border-[#e2e8f0]">
                    <span>Registry: <strong>{recordCalc.factorSource}</strong></span>
                    <span>Constituents: <strong>CO2 (99%) · CH4 (0.1%) · N2O (0.9%)</strong></span>
                  </div>
                </div>
              );
            })()}

            {/* Linked Evidence Documents & Inline Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#64748b] uppercase flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-[#1d4ed8]" />
                  <span>ATTACHED EVIDENCE VAULT DOCUMENTS</span>
                </span>
                <span className="text-[10px] text-[#64748b]">
                  {(selectedRecord.linkedEvidence || []).length} Document(s) Secured
                </span>
              </div>

              {selectedRecord.linkedEvidence && selectedRecord.linkedEvidence.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedRecord.linkedEvidence.map((ev: any) => (
                    <div key={ev.documentId} className="p-2.5 border border-[#cbd5e1] rounded bg-[#f8fafc] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                        <div>
                          <div className="font-semibold text-[#0f172a] flex items-center gap-2">
                            <span>{ev.originalFileName}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white text-[#1d4ed8] border border-[#bfdbfe]">
                              {ev.evidenceType}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-[#64748b]">
                            Doc ID: {ev.documentId} · SHA-256: {(ev.checksum || '').slice(0, 24)}...
                          </div>
                        </div>
                      </div>
                      <DocumentActions document={ev} compact />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 border border-dashed border-[#cbd5e1] rounded text-[#64748b] text-[11px] text-center">
                  No Phase 2 evidence documents linked yet. Attach supporting document below.
                </div>
              )}

              {/* Inline Upload in Dossier */}
              <div className="p-2.5 bg-gray-50 border border-[#e2e8f0] rounded space-y-1.5">
                <span className="text-[10px] font-bold text-[#475569] uppercase block">
                  Attach Additional Supporting Evidence Document
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/jpeg,image/png"
                    onChange={(e) => setDossierFile(e.target.files?.[0] || null)}
                    className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-[#cbd5e1] file:text-xs file:font-semibold file:bg-white file:text-[#334155] cursor-pointer"
                  />
                  {dossierFile && (
                    <button
                      type="button"
                      disabled={uploadingDossierEvidence}
                      onClick={handleUploadDossierEvidence}
                      className="px-3 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold rounded text-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{uploadingDossierEvidence ? 'Uploading...' : 'Upload & Link Document'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Business Unit Verification & Discrepancy Tracker */}
            {(selectedRecord.record.hasBlockingDiscrepancy || selectedRecord.record.buReviewedBy || (user.role === 'BUSINESS_UNIT_USER' && selectedRecord.record.workflowStatus === 'SUBMITTED')) && (
              <div className="p-3 bg-white border border-[#cbd5e1] rounded space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#1d4ed8] uppercase flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Stage 2: Business Unit Verification Checklist &amp; Control</span>
                  </span>
                  {selectedRecord.record.buReviewedBy && (
                    <span className="text-[10px] text-[#64748b]">
                      Reviewed by {selectedRecord.record.buReviewedByName || selectedRecord.record.buReviewedBy}
                    </span>
                  )}
                </div>

                {selectedRecord.record.hasBlockingDiscrepancy && (
                  <div className="p-2 bg-[#fff1f2] border border-[#fecdd3] rounded text-[11px] text-[#9f1239] space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#e11d48]" />
                      <span>Blocking Discrepancy Active</span>
                    </div>
                    <p className="text-[10px] text-[#e11d48]">
                      {selectedRecord.record.blockingDiscrepancyReason || 'Discrepancy flagged by Business Unit reviewer. Requires site lead correction.'}
                    </p>
                  </div>
                )}

                {/* 4-point Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#334155] pt-1">
                  <div className="flex items-center gap-2 p-1.5 bg-[#f8fafc] rounded border border-[#e2e8f0]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                    <span>Activity quantity verified against primary invoices</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 bg-[#f8fafc] rounded border border-[#e2e8f0]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                    <span>Phase 2 Evidence documents securely attached</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 bg-[#f8fafc] rounded border border-[#e2e8f0]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                    <span>GHG emission factor registry &amp; baseline confirmed</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 bg-[#f8fafc] rounded border border-[#e2e8f0]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                    <span>Facility operational boundaries and scope validated</span>
                  </div>
                </div>

                {selectedRecord.record.buReviewNotes && (
                  <div className="text-[10px] text-[#475569] bg-[#f8fafc] p-2 rounded border border-[#e2e8f0]">
                    <strong>BU Review Notes:</strong> {selectedRecord.record.buReviewNotes}
                  </div>
                )}
              </div>
            )}

            {/* Workflow Stage Progression Banner */}
            <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
                  Mandatory Governance Workflow Progression (Stage 1 to 5)
                </span>
                <span className="text-[10px] font-bold bg-[#eff4ff] text-[#1d4ed8] px-2 py-0.5 rounded border border-[#bfdbfe]">
                  Active Stage: {
                    selectedRecord.record.workflowStatus === 'DRAFT' || selectedRecord.record.workflowStatus === 'SUBMITTED'
                      ? 'Stage 1: Facility Submission'
                      : selectedRecord.record.workflowStatus === 'SITE_REVIEWED'
                      ? 'Stage 2: BU Verified → Pending Legal Entity Review'
                      : selectedRecord.record.workflowStatus === 'ESG_REVIEWED' || selectedRecord.record.workflowStatus === 'FINANCE_RECONCILED'
                      ? 'Stage 3: Legal Entity Verified → Pending Approval'
                      : selectedRecord.record.workflowStatus === 'APPROVED'
                      ? 'Stage 3: Legal Entity Approved → Pending Auditor Assurance'
                      : selectedRecord.record.workflowStatus === 'ASSURANCE_REVIEWED'
                      ? 'Stage 4: Auditor Verified → Ready for Group Admin'
                      : selectedRecord.record.workflowStatus === 'LOCKED'
                      ? 'Stage 5: Finalized Group Package'
                      : 'Workflow Flagged'
                  }
                </span>
              </div>

              {/* Visual Workflow Steps Bar */}
              <div className="grid grid-cols-5 gap-1 text-[9px] font-bold text-center">
                <div className={`p-1.5 rounded ${
                  selectedRecord.record.workflowStatus === 'DRAFT' || selectedRecord.record.workflowStatus === 'SUBMITTED'
                    ? 'bg-[#1d4ed8] text-white'
                    : 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'
                }`}>
                  1. Facility Entry
                </div>
                <div className={`p-1.5 rounded ${
                  selectedRecord.record.workflowStatus === 'SITE_REVIEWED'
                    ? 'bg-[#1d4ed8] text-white'
                    : ['ESG_REVIEWED', 'FINANCE_RECONCILED', 'APPROVED', 'ASSURANCE_REVIEWED', 'LOCKED'].includes(selectedRecord.record.workflowStatus)
                    ? 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'
                    : 'bg-gray-100 text-[#64748b]'
                }`}>
                  2. BU Verification
                </div>
                <div className={`p-1.5 rounded ${
                  ['ESG_REVIEWED', 'FINANCE_RECONCILED', 'APPROVED'].includes(selectedRecord.record.workflowStatus)
                    ? 'bg-[#1d4ed8] text-white'
                    : ['ASSURANCE_REVIEWED', 'LOCKED'].includes(selectedRecord.record.workflowStatus)
                    ? 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'
                    : 'bg-gray-100 text-[#64748b]'
                }`}>
                  3. Legal Entity
                </div>
                <div className={`p-1.5 rounded ${
                  selectedRecord.record.workflowStatus === 'ASSURANCE_REVIEWED'
                    ? 'bg-[#1d4ed8] text-white'
                    : selectedRecord.record.workflowStatus === 'LOCKED'
                    ? 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'
                    : 'bg-gray-100 text-[#64748b]'
                }`}>
                  4. CO₂e Auditor
                </div>
                <div className={`p-1.5 rounded ${
                  selectedRecord.record.workflowStatus === 'LOCKED'
                    ? 'bg-[#059669] text-white'
                    : 'bg-gray-100 text-[#64748b]'
                }`}>
                  5. Group Admin
                </div>
              </div>
            </div>

            {/* Workflow Transition & Verification Actions */}
            <div className="pt-3 border-t border-[#e2e8f0] flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {selectedRecord.record.workflowStatus === 'DRAFT' && (
                  <button
                    onClick={async () => {
                      await api.submitESGRecord(selectedRecord.record.activityId);
                      setSuccessBanner('Record successfully submitted to Business Unit Verification Queue!');
                      setSelectedRecord(null);
                      await loadRecords();
                    }}
                    className="px-3.5 py-1.5 bg-[#1d4ed8] text-white font-semibold rounded text-xs hover:bg-[#1e40af] flex items-center gap-1"
                  >
                    <span>Submit Record to BU</span>
                  </button>
                )}

                {/* Business Unit Verification Action */}
                {selectedRecord.record.workflowStatus === 'SUBMITTED' && (user.role === 'BUSINESS_UNIT_USER' || user.role === 'COMPANY_USER' || user.role === 'GROUP_ADMIN') && (
                  <button
                    onClick={() => handleWorkflowTransition('SITE_REVIEWED')}
                    className="px-3.5 py-1.5 bg-[#059669] text-white font-bold rounded text-xs hover:bg-[#047857] shadow-2xs flex items-center gap-1"
                  >
                    <span>✓ Verify &amp; Forward to Legal Entity (Stage 2 Sign-Off)</span>
                  </button>
                )}

                {selectedRecord.record.workflowStatus === 'SITE_REVIEWED' && (user.role === 'COMPANY_USER' || user.role === 'GROUP_ADMIN') && (
                  <button
                    onClick={() => handleWorkflowTransition('ESG_REVIEWED')}
                    className="px-3.5 py-1.5 bg-[#059669] text-white font-bold rounded text-xs hover:bg-[#047857] shadow-2xs"
                  >
                    ✓ Mark Legal Entity ESG Reviewed
                  </button>
                )}

                {selectedRecord.record.workflowStatus === 'ESG_REVIEWED' && (user.role === 'COMPANY_USER' || user.role === 'GROUP_ADMIN') && (
                  <button
                    onClick={() => handleWorkflowTransition('APPROVED')}
                    className="px-3.5 py-1.5 bg-[#1d4ed8] text-white font-bold rounded text-xs hover:bg-[#1e40af] shadow-2xs"
                  >
                    ✓ Approve Record (Forward to Auditor)
                  </button>
                )}

                {/* Discrepancy & Return Action for BU / Company */}
                {user.role !== 'PROJECT_USER' && selectedRecord.record.workflowStatus !== 'LOCKED' && selectedRecord.record.workflowStatus !== 'DRAFT' && (
                  <button
                    onClick={handleReturnCorrection}
                    className="px-3 py-1.5 bg-[#d97706] text-white font-semibold rounded text-xs hover:bg-[#b45309] flex items-center gap-1"
                  >
                    <span>⚠️ Flag Discrepancy &amp; Return to Facility</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="px-3.5 py-1.5 border border-[#cbd5e1] rounded font-semibold text-[#475569] hover:bg-[#f8fafc]"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Data Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-[#cbd5e1] shadow-2xl max-w-2xl w-full p-6 text-xs space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">ESG Metric Data Entry</h3>
                <p className="text-[11px] text-[#64748b]">
                  Enter audited utility bills, fuel manifests, or operational consumption logs for statutory compliance.
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-[#64748b] hover:text-[#0f172a]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope & Period Assignment */}
            <div className="space-y-2">
              <h4 className="font-bold text-[#0f172a] text-xs">1. Scope &amp; Period Assignment</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#475569] block mb-1">GHG Scope *</label>
                  <select
                    value={formData.scopeNo}
                    onChange={(e) => {
                      const s = Number(e.target.value) as 1 | 2 | 3;
                      if (s === 1) {
                        const first = findActivityOption('ACT-DIESEL-GEN')!;
                        setFormData((p) => ({
                          ...p,
                          scopeNo: 1,
                          scope3CategoryNo: 1,
                          activityTypeId: 'ACT-DIESEL-GEN',
                          unitId: first.defaultUnit,
                          quantity: 10000,
                          fuelType: 'DIESEL',
                          combustionType: 'INTERNAL_COMBUSTION',
                          equipmentRef: 'DG Set #4 Cummins 1500kVA',
                          description: 'Stationary diesel generator fuel combustion',
                        }));
                      } else if (s === 2) {
                        const first = findActivityOption('ACT-GRID-ELEC')!;
                        setFormData((p) => ({
                          ...p,
                          scopeNo: 2,
                          scope3CategoryNo: 1,
                          activityTypeId: 'ACT-GRID-ELEC',
                          unitId: first.defaultUnit,
                          quantity: 150000,
                          energyType: 'Grid Electricity',
                          accountingMethod: 'LOCATION_BASED',
                          gridRegion: 'India National Grid Average',
                          supplier: 'State Electricity Distribution Board',
                          meterIdentifier: 'METER-EB-HT-9921',
                          description: 'Purchased grid electricity (India national grid)',
                        }));
                      } else {
                        const first = getActivitiesForScope(3, 1)[0] || findActivityOption('ACT-STEEL-PURCH')!;
                        setFormData((p) => ({
                          ...p,
                          scopeNo: 3,
                          scope3CategoryNo: 1,
                          activityTypeId: first.activityTypeId,
                          unitId: first.defaultUnit,
                          quantity: 150,
                          description: 'Procurement of primary structural steel',
                        }));
                      }
                    }}
                    className="w-full h-8 px-2 bg-white border border-[#cbd5e1] rounded text-xs font-semibold text-[#0f172a]"
                  >
                    <option value={1}>Scope 1: Direct Emissions</option>
                    <option value={2}>Scope 2: Energy Indirect Emissions</option>
                    <option value={3}>Scope 3: Value Chain (Other Indirect) Emissions</option>
                  </select>
                </div>

                {formData.scopeNo === 3 && (
                  <div>
                    <label className="text-[11px] font-semibold text-[#475569] block mb-1">Scope 3 Category (1–15) *</label>
                    <select
                      value={formData.scope3CategoryNo}
                      onChange={(e) => {
                        const catNo = Number(e.target.value);
                        const available = getActivitiesForScope(3, catNo);
                        const first = available[0];
                        setFormData((p) => ({
                          ...p,
                          scope3CategoryNo: catNo,
                          activityTypeId: first ? first.activityTypeId : p.activityTypeId,
                          unitId: first ? first.defaultUnit : p.unitId,
                          description: first ? first.label : p.description,
                        }));
                      }}
                      className="w-full h-8 px-2 bg-white border border-[#cbd5e1] rounded text-xs font-medium text-[#0f172a]"
                    >
                      {SCOPE_3_CATEGORIES.map((cat) => (
                        <option key={cat.categoryNo} value={cat.categoryNo}>
                          Cat {cat.categoryNo}: {cat.name} ({cat.boundary})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-semibold text-[#475569] block mb-1">Reporting Period *</label>
                  <input
                    value={formData.reportingPeriodId}
                    onChange={(e) => setFormData((p) => ({ ...p, reportingPeriodId: e.target.value }))}
                    className="w-full h-8 px-2 bg-gray-50 border border-[#cbd5e1] rounded text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#475569] block mb-1">Project / Facility Code *</label>
                  <input
                    value={formData.projectId}
                    onChange={(e) => setFormData((p) => ({ ...p, projectId: e.target.value }))}
                    className="w-full h-8 px-2 bg-gray-50 border border-[#cbd5e1] rounded text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Activity Selection & Primary Metrics */}
            <div className="space-y-3 pt-2 border-t border-[#f1f5f9]">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#0f172a] text-xs">2. Dynamic Activity Catalogue &amp; Consumption</h4>
                {currentActivity && (
                  <span className="text-[10px] font-semibold text-[#1d4ed8] bg-[#eff4ff] px-2 py-0.5 rounded border border-[#bfdbfe]">
                    {currentActivity.scopeGroup}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-[#475569] block mb-1">
                    Activity Type (Catalogue) *
                  </label>
                  <select
                    value={formData.activityTypeId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const opt = findActivityOption(selectedId);
                      if (opt) {
                        setFormData((p) => ({
                          ...p,
                          activityTypeId: selectedId,
                          unitId: opt.supportedUnits.includes(p.unitId) ? p.unitId : opt.defaultUnit,
                          description: opt.label,
                          fuelType: opt.defaultFuelOrSubstance || p.fuelType,
                          combustionType: opt.defaultCombustionType || p.combustionType,
                          dataMethod: opt.defaultDataMethod || p.dataMethod,
                        }));
                      }
                    }}
                    className="w-full h-9 px-2 bg-white border border-[#1d4ed8] rounded text-xs font-medium text-[#0f172a] shadow-2xs focus:ring-1 focus:ring-[#1d4ed8]"
                  >
                    {formData.scopeNo === 1 && (
                      <>
                        <optgroup label="STATIONARY COMBUSTION">
                          {getActivitiesForScope(1)
                            .filter((a) => a.scopeGroup === 'Stationary Combustion')
                            .map((a) => (
                              <option key={a.activityTypeId} value={a.activityTypeId}>
                                {a.label}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="MOBILE COMBUSTION">
                          {getActivitiesForScope(1)
                            .filter((a) => a.scopeGroup === 'Mobile Combustion')
                            .map((a) => (
                              <option key={a.activityTypeId} value={a.activityTypeId}>
                                {a.label}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="PROCESS EMISSIONS">
                          {getActivitiesForScope(1)
                            .filter((a) => a.scopeGroup === 'Process Emissions')
                            .map((a) => (
                              <option key={a.activityTypeId} value={a.activityTypeId}>
                                {a.label}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="FUGITIVE EMISSIONS">
                          {getActivitiesForScope(1)
                            .filter((a) => a.scopeGroup === 'Fugitive Emissions')
                            .map((a) => (
                              <option key={a.activityTypeId} value={a.activityTypeId}>
                                {a.label}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="CARBON CAPTURE &amp; STORAGE">
                          {getActivitiesForScope(1)
                            .filter((a) => a.scopeGroup === 'Carbon Capture')
                            .map((a) => (
                              <option key={a.activityTypeId} value={a.activityTypeId}>
                                {a.label}
                              </option>
                            ))}
                        </optgroup>
                      </>
                    )}

                    {formData.scopeNo === 2 && (
                      <>
                        <optgroup label="PURCHASED GRID ELECTRICITY">
                          {getActivitiesForScope(2)
                            .filter((a) => a.scopeGroup === 'Purchased Electricity')
                            .map((a) => (
                              <option key={a.activityTypeId} value={a.activityTypeId}>
                                {a.label}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="PURCHASED RENEWABLE ELECTRICITY">
                          {getActivitiesForScope(2)
                            .filter((a) => a.scopeGroup === 'Renewable Electricity')
                            .map((a) => (
                              <option key={a.activityTypeId} value={a.activityTypeId}>
                                {a.label}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="PURCHASED STEAM &amp; THERMAL ENERGY">
                          {getActivitiesForScope(2)
                            .filter((a) => a.scopeGroup === 'Purchased Thermal Energy')
                            .map((a) => (
                              <option key={a.activityTypeId} value={a.activityTypeId}>
                                {a.label}
                              </option>
                            ))}
                        </optgroup>
                      </>
                    )}

                    {formData.scopeNo === 3 &&
                      getActivitiesForScope(3, formData.scope3CategoryNo).map((a) => (
                        <option key={a.activityTypeId} value={a.activityTypeId}>
                          {a.label}
                        </option>
                      ))}
                  </select>
                  {currentActivity && (
                    <p className="text-[10px] text-[#64748b] mt-1 italic">
                      {currentActivity.description}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#475569] block mb-1">
                    Activity Description / Asset *
                  </label>
                  <input
                    value={formData.description}
                    placeholder="e.g. DG Set auxiliary backup or Chiller top-up"
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    className="w-full h-8 px-2 border border-[#cbd5e1] rounded text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[#475569] block mb-1">
                      Reported Quantity *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData((p) => ({ ...p, quantity: Number(e.target.value) }))}
                      className="w-full h-8 px-2 border border-[#cbd5e1] rounded text-xs font-mono font-bold text-[#0f172a]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#475569] block mb-1">
                      Unit of Measurement *
                    </label>
                    <select
                      value={formData.unitId}
                      onChange={(e) => setFormData((p) => ({ ...p, unitId: e.target.value }))}
                      className="w-full h-8 px-2 bg-white border border-[#cbd5e1] rounded text-xs font-semibold"
                    >
                      {(currentActivity?.supportedUnits || ['LITER', 'KWH', 'MT', 'SCM', 'KG', 't-km', 'p-km', 'UNIT']).map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic Contextual Fields based on selected Activity Type */}
              <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-2.5">
                <div className="text-[10px] font-bold text-[#1d4ed8] uppercase flex items-center justify-between">
                  <span>Contextual Activity Parameters</span>
                  <span className="text-[#64748b] font-normal lowercase">populated for statutory traceability</span>
                </div>

                {/* 1. Stationary Combustion Fields */}
                {currentActivity?.fieldSet === 'stationaryCombustion' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Fuel Type</label>
                      <select
                        value={formData.fuelType}
                        onChange={(e) => setFormData((p) => ({ ...p, fuelType: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      >
                        <option value="DIESEL">High-Speed Diesel (HSD)</option>
                        <option value="NATURAL_GAS">Piped Natural Gas (PNG)</option>
                        <option value="LPG">Commercial LPG</option>
                        <option value="COAL">Non-Coking Coal (G-11)</option>
                        <option value="FURNACE_OIL">Furnace Oil / HFO</option>
                        <option value="LDO">Light Diesel Oil (LDO)</option>
                        <option value="BIOMASS">Agro Biomass Pellets</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Combustion Type</label>
                      <select
                        value={formData.combustionType}
                        onChange={(e) => setFormData((p) => ({ ...p, combustionType: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      >
                        <option value="INTERNAL_COMBUSTION">Internal Combustion Engine / DG</option>
                        <option value="BOILER_FURNACE">Industrial Steam Boiler / Furnace</option>
                        <option value="DIRECT_HEATER">Direct Process Heater / Torch</option>
                        <option value="TURBINE">Gas Turbine</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Equipment / Machine Ref</label>
                      <input
                        value={formData.equipmentRef}
                        placeholder="e.g. DG Set #4 Cummins 1500kVA"
                        onChange={(e) => setFormData((p) => ({ ...p, equipmentRef: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      />
                    </div>
                  </div>
                )}

                {/* 2. Mobile Combustion Fields */}
                {currentActivity?.fieldSet === 'mobileCombustion' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Vehicle Fleet Category</label>
                      <select
                        value={formData.combustionType}
                        onChange={(e) => setFormData((p) => ({ ...p, combustionType: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      >
                        <option value="HEAVY_TRUCK">Heavy Multi-Axle Diesel Truck</option>
                        <option value="LIGHT_FLEET">Light Fleet / Site Pickup</option>
                        <option value="OFFROAD_EQUIPMENT">Off-Road Excavator / Bulldozer</option>
                        <option value="PASSENGER_CAR">Executive Passenger Car</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Fleet Fuel Type</label>
                      <select
                        value={formData.fuelType}
                        onChange={(e) => setFormData((p) => ({ ...p, fuelType: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      >
                        <option value="DIESEL">High-Speed Diesel</option>
                        <option value="PETROL">Motor Gasoline / Petrol</option>
                        <option value="CNG">Compressed Natural Gas (CNG)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Vehicle Registration / ID</label>
                      <input
                        value={formData.equipmentRef}
                        placeholder="e.g. MH-12-DE-9941 / EX-08 CAT 320D"
                        onChange={(e) => setFormData((p) => ({ ...p, equipmentRef: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 3. Industrial Process Emissions */}
                {currentActivity?.fieldSet === 'processEmissions' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Process Reaction Type</label>
                      <select
                        value={formData.processType}
                        onChange={(e) => setFormData((p) => ({ ...p, processType: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      >
                        <option value="Clinker Calcination">Cement Clinker Calcination (CaCO3)</option>
                        <option value="Steelmaking BOF">Primary Steel BF-BOF Carbon Reduction</option>
                        <option value="Quicklime Calcination">Quicklime Kiln Decarbonation</option>
                        <option value="Asphalt Processing">Hot Mix Asphalt Plant Mixing</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Feedstock Material</label>
                      <input
                        value={formData.material}
                        placeholder="e.g. Limestone (92% CaCO3 content)"
                        onChange={(e) => setFormData((p) => ({ ...p, material: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Production Batch Ref</label>
                      <input
                        value={formData.equipmentRef}
                        placeholder="e.g. KILN-1-BATCH-2025-Q3"
                        onChange={(e) => setFormData((p) => ({ ...p, equipmentRef: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 4. Fugitive Emissions Fields */}
                {currentActivity?.fieldSet === 'fugitiveEmissions' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Fugitive Substance / Gas</label>
                      <select
                        value={formData.refrigerantSubstance}
                        onChange={(e) => setFormData((p) => ({ ...p, refrigerantSubstance: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      >
                        <option value="R-410A">R-410A (HVAC - GWP 2,088)</option>
                        <option value="HFC-134a">HFC-134a (Chillers - GWP 1,430)</option>
                        <option value="R-404A">R-404A (Cold Storage - GWP 3,922)</option>
                        <option value="R-22">R-22 HCFC (Legacy - GWP 1,810)</option>
                        <option value="SF6">SF6 (Switchgear - GWP 23,500)</option>
                        <option value="METHANE">Methane CH4 (Pipeline Loss - GWP 28)</option>
                        <option value="FM-200">FM-200 HFC-227ea (Fire System - GWP 3,220)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Equipment / System Ref</label>
                      <input
                        value={formData.equipmentRef}
                        placeholder="e.g. Chiller Loop #2 Carrier 500TR"
                        onChange={(e) => setFormData((p) => ({ ...p, equipmentRef: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Top-up / Leakage Reason</label>
                      <select
                        value={formData.leakageReason}
                        onChange={(e) => setFormData((p) => ({ ...p, leakageReason: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      >
                        <option value="Annual Scheduled Maintenance Top-up">Annual Scheduled Maintenance Top-up</option>
                        <option value="Pressure Differential Leak Detected">Pressure Differential Leak Detected</option>
                        <option value="Valve / Flange Seal Replacement">Valve / Flange Seal Replacement</option>
                        <option value="Emergency Incident Discharge">Emergency Incident Discharge</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 5. Carbon Capture Fields */}
                {currentActivity?.fieldSet === 'carbonCapture' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Captured Gas</label>
                        <input
                          readOnly
                          value="Carbon Dioxide (CO2)"
                          className="w-full h-7 px-2 bg-gray-100 border border-[#cbd5e1] rounded text-[11px] font-semibold text-[#0f172a]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Capture Technology</label>
                        <select
                          value={formData.captureMethod}
                          onChange={(e) => setFormData((p) => ({ ...p, captureMethod: e.target.value }))}
                          className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                        >
                          <option value="Post-Combustion Chemical Amine Absorption">Post-Combustion Chemical Amine Absorption</option>
                          <option value="Oxy-Fuel Combustion Capture">Oxy-Fuel Combustion Capture</option>
                          <option value="Direct Air Capture (DAC)">Direct Air Capture (DAC)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Storage / Geological Formation</label>
                        <input
                          value={formData.equipmentRef}
                          placeholder="e.g. ISO 27914 Geological Reservoir #04"
                          onChange={(e) => setFormData((p) => ({ ...p, equipmentRef: e.target.value }))}
                          className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-[#059669] bg-[#ecfdf5] p-2 rounded border border-[#a7f3d0] flex items-center justify-between">
                      <span>✓ Permanent sequestration verified under ISO 27914. Generates deductible negative CO2e credit.</span>
                      <span className="font-bold uppercase tracking-wider text-[9px]">Verified Negative Balance</span>
                    </div>
                  </div>
                )}

                {/* 6. Purchased Electricity Fields */}
                {currentActivity?.fieldSet === 'purchasedElectricity' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Accounting Approach</label>
                        <select
                          value={formData.accountingMethod}
                          onChange={(e) => setFormData((p) => ({ ...p, accountingMethod: e.target.value as any }))}
                          className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-semibold"
                        >
                          <option value="LOCATION_BASED">Location-Based (CEA National Grid Baseline)</option>
                          <option value="MARKET_BASED">Market-Based (Contractual Instruments / Residual)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Electricity Utility / Supplier</label>
                        <input
                          value={formData.supplier}
                          placeholder="e.g. State DISCOM / Tata Power Solar PPA"
                          onChange={(e) => setFormData((p) => ({ ...p, supplier: e.target.value }))}
                          className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Meter / Consumer Account No.</label>
                        <input
                          value={formData.meterIdentifier}
                          placeholder="e.g. HT Consumer #EB-9948210"
                          onChange={(e) => setFormData((p) => ({ ...p, meterIdentifier: e.target.value }))}
                          className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Grid Region</label>
                        <select
                          value={formData.gridRegion}
                          onChange={(e) => setFormData((p) => ({ ...p, gridRegion: e.target.value }))}
                          className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                        >
                          <option value="India National Grid Average">India National Grid Average</option>
                          <option value="Northern Regional Grid">Northern Regional Grid</option>
                          <option value="Western Regional Grid">Western Regional Grid</option>
                          <option value="Southern Regional Grid">Southern Regional Grid</option>
                          <option value="Eastern Regional Grid">Eastern Regional Grid</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Renewable Percentage (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.renewablePercentage}
                          onChange={(e) => setFormData((p) => ({ ...p, renewablePercentage: Number(e.target.value) }))}
                          className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Renewable Instrument / I-REC ID</label>
                        <input
                          value={formData.certificateDetails}
                          placeholder="e.g. I-REC #IN-2025-0988 / Green PPA"
                          onChange={(e) => setFormData((p) => ({ ...p, certificateDetails: e.target.value }))}
                          className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. Purchased Thermal Energy */}
                {currentActivity?.fieldSet === 'purchasedThermal' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Thermal Medium</label>
                      <select
                        value={formData.energyType}
                        onChange={(e) => setFormData((p) => ({ ...p, energyType: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      >
                        <option value="Steam">High-Pressure Industrial Steam</option>
                        <option value="Hot Water">District Hot Water Heating</option>
                        <option value="Chilled Water">District Chilled Water Cooling</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Thermal Utility Provider</label>
                      <input
                        value={formData.supplier}
                        placeholder="e.g. Industrial Cogen Plant"
                        onChange={(e) => setFormData((p) => ({ ...p, supplier: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">BTU / Flow Meter Ref</label>
                      <input
                        value={formData.meterIdentifier}
                        placeholder="e.g. MTR-STM-04-HIGH"
                        onChange={(e) => setFormData((p) => ({ ...p, meterIdentifier: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 8. Scope 3 Material & Goods Procurement (Cat 1) */}
                {currentActivity?.fieldSet === 'scope3Materials' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Material Grade / Spec</label>
                      <input
                        value={formData.materialGrade}
                        placeholder="e.g. TMT Fe 500D / OPC 53 Grade"
                        onChange={(e) => setFormData((p) => ({ ...p, materialGrade: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Supplier / Manufacturer</label>
                      <input
                        value={formData.supplierName}
                        placeholder="e.g. Tata Steel / UltraTech Cement"
                        onChange={(e) => setFormData((p) => ({ ...p, supplierName: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Purchase Order Ref</label>
                      <input
                        value={formData.purchaseOrderRef}
                        placeholder="e.g. PO-2025-MAT-9921"
                        onChange={(e) => setFormData((p) => ({ ...p, purchaseOrderRef: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 9. Scope 3 Capital Goods (Cat 2) */}
                {currentActivity?.fieldSet === 'scope3Capital' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Capital Asset Tag</label>
                      <input
                        value={formData.capitalAssetTag}
                        placeholder="e.g. EX-08 CAT 320D Excavator"
                        onChange={(e) => setFormData((p) => ({ ...p, capitalAssetTag: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Equipment Vendor</label>
                      <input
                        value={formData.capitalVendor}
                        placeholder="e.g. Caterpillar India / ABB Switchgear"
                        onChange={(e) => setFormData((p) => ({ ...p, capitalVendor: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Fixed Asset Register No.</label>
                      <input
                        value={formData.equipmentRef}
                        placeholder="e.g. FAR-2025-CAP-0441"
                        onChange={(e) => setFormData((p) => ({ ...p, equipmentRef: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 10. Scope 3 Freight & Logistics (Cat 4 & 9) */}
                {(currentActivity?.fieldSet === 'scope3Freight' || currentActivity?.fieldSet === 'scope3Downstream') && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Transport Mode</label>
                      <select
                        value={formData.transportMode}
                        onChange={(e) => setFormData((p) => ({ ...p, transportMode: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      >
                        <option value="HEAVY_DIESEL_TRUCK">Heavy Multi-Axle Diesel Truck</option>
                        <option value="RAIL_FREIGHT">Freight Corridor Electric Rail</option>
                        <option value="OCEAN_CARGO">Container Cargo Ship</option>
                        <option value="AIR_FREIGHT">Commercial Air Cargo</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Haul Distance (km)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.distanceKm}
                        onChange={(e) => setFormData((p) => ({ ...p, distanceKm: Number(e.target.value) }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Cargo Mass (MT)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.cargoWeightMt}
                        onChange={(e) => setFormData((p) => ({ ...p, cargoWeightMt: Number(e.target.value) }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Consignment / B/L Note</label>
                      <input
                        value={formData.equipmentRef}
                        placeholder="e.g. LR-MH-99410"
                        onChange={(e) => setFormData((p) => ({ ...p, equipmentRef: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 11. Scope 3 Business Travel (Cat 6) */}
                {currentActivity?.fieldSet === 'scope3Travel' && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Travel Mode</label>
                      <select
                        value={formData.travelMode}
                        onChange={(e) => setFormData((p) => ({ ...p, travelMode: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      >
                        <option value="DOMESTIC_FLIGHT">Domestic Flight Economy</option>
                        <option value="INTL_FLIGHT">International Flight Business</option>
                        <option value="RAILWAY">Intercity Express Train</option>
                        <option value="HOTEL">Hotel Night Stay</option>
                        <option value="TAXI">Urban Taxi / Cab</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Passenger-km / Nights</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.passengerKm}
                        onChange={(e) => setFormData((p) => ({ ...p, passengerKm: Number(e.target.value) }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Travel Class</label>
                      <select
                        value={formData.travelClass}
                        onChange={(e) => setFormData((p) => ({ ...p, travelClass: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      >
                        <option value="ECONOMY">Economy Class</option>
                        <option value="PREMIUM_ECONOMY">Premium Economy</option>
                        <option value="BUSINESS">Business Class</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Ticket PNR / Voucher</label>
                      <input
                        value={formData.equipmentRef}
                        placeholder="e.g. 6E-PNR-88329"
                        onChange={(e) => setFormData((p) => ({ ...p, equipmentRef: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 12. Scope 3 Employee Commuting (Cat 7) */}
                {currentActivity?.fieldSet === 'scope3Commute' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Commuter Transit Mode</label>
                      <select
                        value={formData.commuteMode}
                        onChange={(e) => setFormData((p) => ({ ...p, commuteMode: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      >
                        <option value="METRO">Urban Rapid Rail / Metro</option>
                        <option value="STAFF_BUS">Corporate Shift Bus Shuttle</option>
                        <option value="TWO_WHEELER">Personal Two-Wheeler / Motorbike</option>
                        <option value="CAR">Personal Petrol Car</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Round-Trip Distance (km)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.distanceKm}
                        onChange={(e) => setFormData((p) => ({ ...p, distanceKm: Number(e.target.value) }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Survey Cohort / Hub Name</label>
                      <input
                        value={formData.equipmentRef}
                        placeholder="e.g. Plant Gate #2 Staff Cohort"
                        onChange={(e) => setFormData((p) => ({ ...p, equipmentRef: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      />
                    </div>
                  </div>
                )}

                {/* 13. Scope 3 Waste Generated (Cat 5) */}
                {currentActivity?.fieldSet === 'scope3Waste' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Disposal Pathway</label>
                      <select
                        value={formData.wasteDisposalMethod}
                        onChange={(e) => setFormData((p) => ({ ...p, wasteDisposalMethod: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      >
                        <option value="LANDFILL">Municipal Landfill with LFG Flaring</option>
                        <option value="TSDF_HAZARDOUS">Authorized Secure TSDF Landfill</option>
                        <option value="EFFLUENT_TREATMENT">Industrial Wastewater ETP</option>
                        <option value="RECYCLING">Diverted Metal / Material Recycling</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Waste Stream Name</label>
                      <input
                        value={formData.wasteType}
                        placeholder="e.g. Hazardous Sludge / Scrap Rebar"
                        onChange={(e) => setFormData((p) => ({ ...p, wasteType: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Manifest / Form 10 No.</label>
                      <input
                        value={formData.equipmentRef}
                        placeholder="e.g. FORM-10-TSDF-2025-09"
                        onChange={(e) => setFormData((p) => ({ ...p, equipmentRef: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 14. Scope 3 Leased Assets (Cat 8 & 13) */}
                {currentActivity?.fieldSet === 'scope3Leased' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Leased Asset Type</label>
                      <select
                        value={formData.leasedAssetType}
                        onChange={(e) => setFormData((p) => ({ ...p, leasedAssetType: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      >
                        <option value="OFFICE_SPACE">Commercial Office Floor Space</option>
                        <option value="SILENT_GENSET">Leased Silent Generator</option>
                        <option value="CRAWLER_CRANE">Leased Heavy Mobile Crane</option>
                        <option value="LOGISTICS_WAREHOUSE">Leased Logistics Warehouse</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Floor Area (m²) / Hours</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.leasedFloorAreaSqm}
                        onChange={(e) => setFormData((p) => ({ ...p, leasedFloorAreaSqm: Number(e.target.value) }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Lease Agreement No.</label>
                      <input
                        value={formData.equipmentRef}
                        placeholder="e.g. LEASE-AGR-2025-BLR-02"
                        onChange={(e) => setFormData((p) => ({ ...p, equipmentRef: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 15. Other Scope 3 Categories (10, 11, 12, 14, 15) */}
                {(currentActivity?.fieldSet === 'scope3SoldUse' ||
                  currentActivity?.fieldSet === 'scope3EndOfLife' ||
                  currentActivity?.fieldSet === 'scope3Franchise' ||
                  currentActivity?.fieldSet === 'scope3Investments' ||
                  currentActivity?.fieldSet === 'scope3Energy') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Application / Sub-stream</label>
                      <input
                        value={formData.materialGrade}
                        placeholder="e.g. Structural Fabrication / Lifetime Fuel / Investee Project"
                        onChange={(e) => setFormData((p) => ({ ...p, materialGrade: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block mb-0.5">Reference Contract / Tag</label>
                      <input
                        value={formData.equipmentRef}
                        placeholder="e.g. DESIGN-SPECS-2025 / LOAN-AGR-401"
                        onChange={(e) => setFormData((p) => ({ ...p, equipmentRef: e.target.value }))}
                        className="w-full h-7 px-2 bg-white border border-[#cbd5e1] rounded text-[11px] font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Accounting Reference & Spend + Evidence Upload */}
            <div className="space-y-3 pt-2 border-t border-[#f1f5f9]">
              <h4 className="font-bold text-[#0f172a] text-xs">3. Reference &amp; Accounting</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#475569] block mb-1">Source / Invoice Ref</label>
                  <input
                    value={formData.sourceReference}
                    placeholder="e.g. INV-MH-2025-0872, METER-FAJ-APR-2026, UTILITY-BILL-APR-2026"
                    onChange={(e) => setFormData((p) => ({ ...p, sourceReference: e.target.value }))}
                    className="w-full h-8 px-2 border border-[#cbd5e1] rounded text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#475569] block mb-1">Financial Spend (INR)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.spendAmount}
                    onChange={(e) => setFormData((p) => ({ ...p, spendAmount: Number(e.target.value) }))}
                    className="w-full h-8 px-2 border border-[#cbd5e1] rounded text-xs font-mono"
                  />
                </div>
              </div>

              {/* Attach Evidence Section */}
              <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#0f172a] flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#1d4ed8]" />
                    <span>Attach Evidence (Phase 2 Secure Vault)</span>
                  </label>
                  <span className="text-[10px] text-[#64748b]">
                    Supported: PDF, DOC, DOCX, XLS, XLSX, CSV, JPG, JPEG, PNG
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="file"
                    id="modal-evidence-file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/jpeg,image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedFile(file);
                      setUploadedEvidenceDoc(null);
                    }}
                    className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-[#cbd5e1] file:text-xs file:font-semibold file:bg-white file:text-[#334155] hover:file:bg-[#f1f5f9] cursor-pointer"
                  />

                  {selectedFile && !uploadedEvidenceDoc && (
                    <button
                      type="button"
                      disabled={uploadingEvidence}
                      onClick={handleManualUploadEvidence}
                      className="px-3 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold rounded text-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{uploadingEvidence ? 'Uploading...' : 'Upload Evidence'}</span>
                    </button>
                  )}
                </div>

                {selectedFile && (
                  <div className="text-[11px] text-[#475569] flex items-center gap-1.5 pt-1">
                    <span className="font-semibold text-[#0f172a]">Selected:</span>
                    <span className="font-mono text-[#1d4ed8]">{selectedFile.name}</span>
                    <span className="text-[#64748b]">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}

                {uploadedEvidenceDoc && (
                  <div className="p-2 bg-[#ecfdf5] border border-[#a7f3d0] rounded text-[11px] text-[#065f46] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                      <div>
                        <div className="font-semibold">Evidence Uploaded &amp; Linked to Vault</div>
                        <div className="text-[10px] font-mono text-[#047857]">
                          ID: {uploadedEvidenceDoc.documentId} · SHA-256: {(uploadedEvidenceDoc.checksum || '').slice(0, 24)}...
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-white text-[#059669] px-2 py-0.5 rounded border border-[#a7f3d0]">
                      Firebase Vault Synced
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Calculation Visibility & Preview */}
            <div className="space-y-2 pt-2 border-t border-[#f1f5f9]">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#0f172a] text-xs flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-[#1d4ed8]" />
                  <span>4. Emission Calculation Preview &amp; Traceability</span>
                </h4>
                <span className="text-[10px] font-bold bg-[#eff4ff] text-[#1d4ed8] px-2 py-0.5 rounded border border-[#bfdbfe]">
                  ISO 14064-1 / GHG Protocol
                </span>
              </div>

              <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#64748b] block text-[10px] font-semibold uppercase">ACTIVITY METRIC</span>
                    <span className="font-bold text-[#0f172a]">{formData.quantity.toLocaleString()} {formData.unitId}</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] block text-[10px] font-semibold uppercase">EMISSION FACTOR</span>
                    <span className="font-bold text-[#1d4ed8] font-mono">{modalEmission.factor.toFixed(4)} kgCO2e/{formData.unitId}</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] block text-[10px] font-semibold uppercase">FACTOR REGISTRY</span>
                    <span className="font-semibold text-[#334155]">{modalEmission.factorSource}</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] block text-[10px] font-semibold uppercase">ESTIMATED OUTPUT</span>
                    <span className="font-bold text-[#0f172a] font-mono text-xs">{modalEmission.tCO2e.toFixed(2)} tCO2e</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#e2e8f0] text-[10px] text-[#64748b]">
                  <span>Formula: <strong>{formData.quantity.toLocaleString()} {formData.unitId} × {modalEmission.factor} kgCO2e / 1000 = {modalEmission.tCO2e.toFixed(2)} tCO2e</strong></span>
                  <span className="font-semibold text-[#059669]">✓ Deterministic Rule Verified</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetModalState();
                }}
                className="px-3.5 py-1.5 border border-[#cbd5e1] rounded font-semibold text-[#475569]"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleCreateRecord(false)}
                  className="px-3.5 py-1.5 border border-[#cbd5e1] rounded font-semibold text-[#0f172a] hover:bg-[#f8fafc] disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleCreateRecord(true)}
                  className="px-4 py-1.5 bg-[#1d4ed8] text-white rounded font-semibold hover:bg-[#1e40af] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading ? 'Saving...' : 'Submit for Verification'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
