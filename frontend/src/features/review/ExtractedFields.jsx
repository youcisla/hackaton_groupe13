import { useState } from 'react'
import { Cpu, PenLine, X, Check } from 'lucide-react'

const MANUAL_FIELDS = [
  { key: 'siret', label: 'SIRET' },
  { key: 'tva', label: 'N° TVA' },
  { key: 'invoice_number', label: 'N° Facture / Devis' },
  { key: 'issue_date', label: "Date d'émission" },
  { key: 'amount_ht', label: 'Montant HT (€)' },
  { key: 'amount_ttc', label: 'Montant TTC (€)' },
  { key: 'company_name', label: 'Fournisseur' },
]

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-50 shadow-lg">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </span>
      )}
    </span>
  )
}

function ConfidenceDot({ value }) {
  const pct = Math.round(value * 100)
  const color = pct >= 90 ? 'bg-green-500' : pct >= 75 ? 'bg-amber-400' : 'bg-red-400'
  const explanation =
    pct >= 90
      ? 'Confiance élevée — donnée bien lisible'
      : pct >= 75
      ? 'Confiance moyenne — à vérifier'
      : 'Confiance faible — vérification recommandée'
  return (
    <Tooltip text={`${pct}% — ${explanation}`}>
      <span className="flex items-center gap-1 text-xs text-slate-400 cursor-help">
        <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
        {pct}%
      </span>
    </Tooltip>
  )
}

function ManualEntryForm({ documentName, onSave }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(MANUAL_FIELDS.map(f => [f.key, '']))
  )

  function handleSave() {
    const filled = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v.trim() !== '')
    )
    onSave(filled)
  }

  return (
    <div className="px-5 py-6">
      <div className="flex items-center gap-2 mb-4">
        <PenLine size={16} className="text-blue-600" />
        <p className="text-sm font-semibold text-slate-700">Saisie manuelle des champs</p>
        <span className="text-xs text-slate-400">— OCR insuffisant sur ce document</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {MANUAL_FIELDS.map(f => (
          <div key={f.key}>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">
              {f.label}
            </label>
            <input
              type="text"
              value={values[f.key]}
              onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="—"
            />
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Check size={14} />
        Enregistrer la saisie
      </button>
    </div>
  )
}

export default function ExtractedFields({ extraction }) {
  const [manualMode, setManualMode] = useState(false)
  const [manualFields, setManualFields] = useState(null)

  if (!extraction) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Sélectionnez un document
      </div>
    )
  }

  const fields = manualFields
    ? Object.entries(manualFields).map(([key, value]) => {
        const meta = MANUAL_FIELDS.find(f => f.key === key)
        return { label: meta?.label || key, value, confidence: 1 }
      })
    : Object.values(extraction.fields)

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">{extraction.documentName}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{extraction.typeLabel}</p>
          </div>
          <Tooltip text="Proportion de champs extraits avec succès par rapport au total attendu pour ce type de document">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium cursor-help">
              <Cpu size={11} />
              Confiance globale : {Math.round(extraction.confidence * 100)}%
            </span>
          </Tooltip>
        </div>
      </div>

      {fields.length === 0 && !manualMode ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
          <p className="text-sm">Aucun champ extrait pour ce document.</p>
          <p className="text-xs text-slate-300">Le service OCR a retourné du texte insuffisant.</p>
          <button
            onClick={() => setManualMode(true)}
            className="mt-2 flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors"
          >
            <PenLine size={14} />
            Saisir manuellement
          </button>
        </div>
      ) : manualMode && !manualFields ? (
        <div>
          <ManualEntryForm
            documentName={extraction.documentName}
            onSave={filled => { setManualFields(filled); setManualMode(false) }}
          />
          <div className="px-5">
            <button onClick={() => setManualMode(false)} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <X size={11} /> Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {manualFields && (
            <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
              <span className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
                <PenLine size={11} /> Données saisies manuellement
              </span>
              <button onClick={() => { setManualFields(null); setManualMode(false) }} className="text-xs text-amber-600 hover:underline">
                Réinitialiser
              </button>
            </div>
          )}
          {fields.map(field => (
            <div key={field.label} className="flex items-center px-5 py-3.5 hover:bg-slate-50/60">
              <div className="w-48 flex-shrink-0">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{field.label}</p>
              </div>
              <div className="flex-1 flex items-center gap-3">
                <p className="text-sm font-semibold text-slate-900">{field.value}</p>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                  <Cpu size={9} />
                  {manualFields ? 'Manuel' : 'IA'}
                </span>
              </div>
              {!manualFields && <ConfidenceDot value={field.confidence} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
