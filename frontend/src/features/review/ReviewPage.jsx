import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Circle, Loader2, Building2, ShieldCheck, AlertTriangle, XCircle } from 'lucide-react'
import { getBatchStatus } from '../../api/documents.js'
import { getExtraction } from '../../api/extraction.js'
import { getValidation } from '../../api/validation.js'
import DocumentCard from './DocumentCard.jsx'
import ExtractedFields from './ExtractedFields.jsx'
import InconsistencyPanel from './InconsistencyPanel.jsx'
import SkeletonCard from '../../components/SkeletonCard.jsx'

const PIPELINE_STEPS = [
  { key: 'uploaded', label: 'Réception' },
  { key: 'ocr_processing', label: 'OCR' },
  { key: 'extracting', label: 'Extraction' },
  { key: 'validating', label: 'Validation' },
  { key: 'ready', label: 'Prêt' },
]

const STEP_LABELS = {
  uploaded: 'Documents reçus, démarrage du pipeline…',
  ocr_processing: 'Lecture OCR des documents en cours…',
  extracting: 'Extraction des entités par NLP…',
  validating: 'Vérification de cohérence inter-documents…',
}

function PipelineProgress({ currentStep }) {
  const current = PIPELINE_STEPS.findIndex(s => s.key === currentStep)
  const allDone = currentStep === 'ready'
  return (
    <div className="flex items-center">
      {PIPELINE_STEPS.map((step, i) => {
        const done = allDone ? true : i < current
        const active = !allDone && i === current
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                done ? 'bg-green-500' : active ? 'bg-blue-600' : 'bg-slate-200'
              }`}>
                {done && <CheckCircle2 size={14} className="text-white" />}
                {active && <Loader2 size={13} className="text-white animate-spin" />}
                {!done && !active && <Circle size={12} className="text-slate-400" />}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${
                done ? 'text-green-600' : active ? 'text-blue-600' : 'text-slate-400'
              }`}>
                {step.label}
              </span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className={`w-12 h-0.5 mb-4 mx-1 ${done ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ReviewPage() {
  const { batchId } = useParams()
  const navigate = useNavigate()
  const [selectedDocId, setSelectedDocId] = useState(null)
  const [typeOverrides, setTypeOverrides] = useState({})
  const [mobileTab, setMobileTab] = useState('documents') // 'documents' | 'extraction'
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 900)

  useEffect(() => {
    const handler = () => setIsNarrow(window.innerWidth < 900)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  function handleTypeChange(docId, newType) {
    setTypeOverrides(prev => ({ ...prev, [docId]: newType }))
  }

  const { data: statusData } = useQuery({
    queryKey: ['batch-status', batchId],
    queryFn: () => getBatchStatus(batchId),
    refetchInterval: query => (query.state.data?.isReady ? false : 2500),
    enabled: !!batchId,
  })

  const isReady = statusData?.isReady
  const pipelineStep = statusData?.pipelineStep || 'uploaded'
  const documents = statusData?.documents || []

  const { data: extraction } = useQuery({
    queryKey: ['extraction', batchId],
    queryFn: () => getExtraction(batchId),
    enabled: !!batchId && isReady,
  })

  const { data: validation } = useQuery({
    queryKey: ['validation', batchId],
    queryFn: () => getValidation(batchId),
    enabled: !!batchId && isReady,
  })

  const selectedId = selectedDocId || documents[0]?.id

  // Apply type overrides to extraction data
  const extractionWithOverrides = extraction?.map(e =>
    typeOverrides[e.documentId]
      ? { ...e, type: typeOverrides[e.documentId], typeLabel: typeOverrides[e.documentId] }
      : e
  )
  const selectedExtraction = extractionWithOverrides?.find(e => e.documentId === selectedId)
  const critiques = validation?.summary?.critiques || 0

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Révision & extraction</h1>
          {batchId && <p className="text-xs text-slate-400 font-mono mt-0.5">Lot : {batchId.slice(0, 8)}…</p>}
        </div>
        <PipelineProgress currentStep={pipelineStep} />
        {isReady && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/crm/${batchId}`)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Building2 size={14} />
              CRM
            </button>
            <button
              onClick={() => navigate(`/compliance/${batchId}`)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                critiques > 0 ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {critiques > 0 ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}
              Conformité {critiques > 0 ? `(${critiques} anomalie${critiques > 1 ? 's' : ''})` : ''}
            </button>
          </div>
        )}
      </div>

      {/* Mobile tab switcher */}
      {isNarrow && isReady && (
        <div className="flex border-b border-slate-200 bg-white flex-shrink-0">
          {['documents', 'extraction'].map(tab => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                mobileTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'documents' ? `Documents (${documents.length})` : 'Extraction'}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <div className={`${isNarrow ? (mobileTab === 'documents' ? 'flex w-full' : 'hidden') : 'flex w-72'} flex-shrink-0 border-r border-slate-200 bg-slate-50 overflow-y-auto p-3 space-y-2 flex-col`}>
          {!isNarrow && (
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-3">
              Documents ({documents.length})
            </p>
          )}
          {!isReady && documents.length === 0 && (
            <div className="space-y-2">
              <SkeletonCard lines={2} />
              <SkeletonCard lines={2} />
            </div>
          )}
          {documents.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              extraction={extractionWithOverrides}
              isSelected={selectedId === doc.id}
              onClick={() => { setSelectedDocId(doc.id); if (isNarrow) setMobileTab('extraction') }}
              onTypeChange={handleTypeChange}
            />
          ))}
        </div>

        <div className={`${isNarrow && mobileTab === 'documents' ? 'hidden' : 'flex'} flex-1 flex-col min-h-0 bg-white`}>
          {pipelineStep === 'error' ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-red-400">
              <XCircle size={32} />
              <div className="text-center">
                <p className="text-base font-medium text-red-600">Erreur durant le traitement</p>
                <p className="text-sm mt-1 text-slate-400">Vérifiez que les services OCR et NER sont bien démarrés.</p>
              </div>
              <button
                onClick={() => navigate('/upload')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Réanalyser de nouveaux documents
              </button>
            </div>
          ) : !isReady ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 size={32} className="animate-spin text-blue-400" />
              <div className="text-center">
                <p className="text-base font-medium text-slate-600">Traitement en cours…</p>
                <p className="text-sm mt-1">{STEP_LABELS[pipelineStep]}</p>
                {documents.length > 0 && (
                  <p className="text-xs mt-2 text-blue-500 font-medium">
                    {documents.length} document{documents.length > 1 ? 's' : ''} en cours d'analyse
                  </p>
                )}
              </div>
              {documents.length > 0 && (
                <div className="w-64 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all duration-700"
                    style={{
                      width: `${(['uploaded', 'ocr_processing', 'extracting', 'validating'].indexOf(pipelineStep) + 1) * 25}%`
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {!extraction ? (
                  <div className="p-5"><SkeletonCard lines={6} /></div>
                ) : (
                  <ExtractedFields extraction={selectedExtraction} />
                )}
              </div>
              <InconsistencyPanel validation={validation} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
