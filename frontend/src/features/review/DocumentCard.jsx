import { FileText, ChevronDown } from 'lucide-react'
import StatusBadge from '../../components/StatusBadge.jsx'

const DOC_TYPES = [
  { value: 'facture', label: 'Facture' },
  { value: 'devis', label: 'Devis' },
  { value: 'kbis', label: 'Kbis' },
  { value: 'urssaf', label: 'URSSAF' },
  { value: 'attestation_siret', label: 'Attestation SIRET' },
  { value: 'rib', label: 'RIB' },
  { value: 'inconnu', label: 'Inconnu' },
]

export default function DocumentCard({ doc, extraction, isSelected, onClick, onTypeChange }) {
  const ext = extraction?.find(e => e.documentId === doc.id)

  function handleTypeChange(e) {
    e.stopPropagation()
    onTypeChange?.(doc.id, e.target.value)
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all ${
        isSelected
          ? 'border-blue-300 bg-blue-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <FileText size={16} className="text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <StatusBadge status={doc.status} size="xs" />
          {ext && <StatusBadge status={ext.type} size="xs" />}
        </div>
        {ext && (
          <p className="text-xs text-slate-400 mt-1">
            Confiance : {Math.round(ext.confidence * 100)}%
          </p>
        )}
        {ext && (
          <div className="mt-2" onClick={e => e.stopPropagation()}>
            <div className="relative inline-flex items-center">
              <select
                value={ext.type}
                onChange={handleTypeChange}
                className="text-xs pl-2 pr-6 py-1 rounded border border-slate-200 bg-white text-slate-600 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-400 hover:border-slate-300 cursor-pointer"
              >
                {DOC_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-1.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>
    </button>
  )
}
