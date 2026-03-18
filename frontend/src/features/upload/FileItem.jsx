import { FileText, CheckCircle2, XCircle, Loader2, Clock, AlertCircle } from 'lucide-react'

const STATUS_META = {
  idle: { icon: Clock, color: 'text-slate-400', label: 'En attente' },
  uploading: { icon: Loader2, color: 'text-blue-500', label: 'Envoi…', spin: true },
  done: { icon: CheckCircle2, color: 'text-green-500', label: 'Envoyé' },
  error: { icon: XCircle, color: 'text-red-500', label: 'Erreur' },
  invalid: { icon: AlertCircle, color: 'text-amber-500', label: 'Rejeté' },
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

export default function FileItem({ file, status, rejectionReason, onRemove }) {
  const meta = STATUS_META[status] || STATUS_META.idle
  const Icon = meta.icon

  return (
    <div className={`flex items-start gap-3 px-4 py-3 border rounded-lg transition-colors ${
      status === 'invalid'
        ? 'bg-amber-50 border-amber-200'
        : status === 'error'
        ? 'bg-red-50 border-red-200'
        : 'bg-white border-slate-200'
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        status === 'invalid' ? 'bg-amber-100' : status === 'error' ? 'bg-red-100' : 'bg-blue-50'
      }`}>
        <FileText size={16} className={
          status === 'invalid' ? 'text-amber-500' : status === 'error' ? 'text-red-500' : 'text-blue-600'
        } />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
        <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
        {status === 'invalid' && rejectionReason && (
          <p className="text-xs text-amber-600 font-medium mt-0.5">{rejectionReason}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
        <Icon
          size={16}
          className={`${meta.color} ${meta.spin ? 'animate-spin' : ''}`}
        />
      </div>

      {(status === 'idle' || status === 'invalid') && (
        <button
          onClick={() => onRemove(file)}
          className="ml-1 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
        >
          <XCircle size={16} />
        </button>
      )}
    </div>
  )
}
