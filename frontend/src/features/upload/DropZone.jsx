import { useDropzone } from 'react-dropzone'
import { UploadCloud } from 'lucide-react'

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/tiff': ['.tif', '.tiff'],
}

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

function getRejectionReason(errors) {
  for (const err of errors) {
    if (err.code === 'file-too-large') return 'Fichier trop volumineux (max 20 Mo)'
    if (err.code === 'file-invalid-type') return 'Format non supporté (PDF, JPG, PNG, TIFF uniquement)'
    if (err.code === 'too-many-files') return 'Trop de fichiers déposés à la fois'
  }
  return 'Fichier rejeté'
}

export default function DropZone({ onFilesAdded, onFilesRejected, disabled }) {
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    disabled,
    onDrop: (accepted, rejected) => {
      if (accepted.length > 0) onFilesAdded(accepted)
      if (rejected.length > 0 && onFilesRejected) {
        onFilesRejected(
          rejected.map(r => ({ file: r.file, reason: getRejectionReason(r.errors) }))
        )
      }
    },
  })

  const borderColor = isDragReject
    ? 'border-red-400 bg-red-50'
    : isDragActive
    ? 'border-blue-500 bg-blue-50'
    : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30'

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${borderColor} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isDragActive ? 'bg-blue-100' : 'bg-slate-100'}`}>
          <UploadCloud size={28} className={isDragActive ? 'text-blue-600' : 'text-slate-400'} />
        </div>

        {isDragActive && !isDragReject && (
          <p className="text-blue-600 font-semibold text-lg">Déposez vos fichiers ici</p>
        )}
        {isDragReject && (
          <p className="text-red-600 font-semibold text-lg">Format non supporté</p>
        )}
        {!isDragActive && (
          <>
            <div>
              <p className="text-slate-700 font-semibold text-base">
                Glissez vos documents ici
              </p>
              <p className="text-slate-400 text-sm mt-1">ou cliquez pour sélectionner</p>
            </div>
            <p className="text-slate-400 text-xs">
              PDF, JPG, PNG, TIFF — max 20 Mo par fichier
            </p>
            <p className="text-slate-400 text-xs -mt-2">
              Factures, devis, Kbis, attestations URSSAF, RIB
            </p>
          </>
        )}
      </div>
    </div>
  )
}
