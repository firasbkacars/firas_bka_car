import { useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Eye, FileText, Image as ImageIcon,
  Loader2, UploadCloud, X, XCircle,
} from 'lucide-react';
import { DOCUMENT_PHOTO_ACCEPT, validateDocumentPhotoFile } from '../lib/documentPhoto';

const STATUTS = {
  valide: {
    label: 'Validé',
    className: 'bg-green-500/10 border-green-500/20 text-green-400',
    icon: CheckCircle2,
  },
  en_attente: {
    label: 'En attente de validation',
    className: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    icon: AlertTriangle,
  },
  rejete: {
    label: 'Rejeté',
    className: 'bg-red-500/10 border-red-500/20 text-red-400',
    icon: XCircle,
  },
  expire: {
    label: 'Expiré',
    className: 'bg-red-500/10 border-red-500/20 text-red-400',
    icon: XCircle,
  },
  non_fourni: {
    label: 'Non fourni',
    className: 'bg-neutral-500/10 border-neutral-500/20 text-neutral-400',
    icon: FileText,
  },
};

function documentUrl(path) {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('/')) return path;
  return `/storage/${path}`;
}

function extraireErreur(err, fieldName) {
  const data = err?.response?.data;
  const erreurs = data?.errors || {};
  const champ = fieldName ? erreurs[fieldName] : null;

  if (Array.isArray(champ) && champ.length > 0) return champ[0];

  const premiere = Object.values(erreurs).flat().find(Boolean);
  if (premiere) return premiere;

  return data?.message || "L'envoi du document a échoué. Réessayez.";
}

/**
 * Carte de téléversement réutilisable pour le permis, la CIN et le passeport.
 * Le composant gère l'aperçu et les erreurs ; le parent gère l'appel API.
 */
export default function DocumentUpload({
  titre,
  description,
  documentPath,
  statut,
  motif,
  fieldName,
  inputId,
  onUpload,
  maxSizeMb = 5,
  className = '',
}) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const statutKey = documentPath ? (statut || 'en_attente') : 'non_fourni';
  const statutConfig = STATUTS[statutKey] || STATUTS.en_attente;
  const StatutIcon = statutConfig.icon;
  const url = documentUrl(documentPath);

  const reinitialiser = () => {
    setFile(null);
    setPreview(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const selectionner = async (fichier) => {
    if (!fichier) return;
    const resultat = await validateDocumentPhotoFile(fichier, { maxSizeMb });

    if (!resultat.valid) {
      setFile(null);
      setPreview(null);
      setError(resultat.message);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setError('');
    setFile(fichier);

    if (fichier.type.startsWith('image/')) {
      const lecteur = new FileReader();
      lecteur.onload = (e) => setPreview(e.target?.result || null);
      lecteur.readAsDataURL(fichier);
    } else {
      setPreview(null);
    }
  };

  const envoyer = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError('');

    try {
      await onUpload(file);
      reinitialiser();
    } catch (err) {
      setError(extraireErreur(err, fieldName));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-white font-medium">{titre}</h3>
          {description ? <p className="text-muted text-sm mt-1">{description}</p> : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-full text-xs font-medium ${statutConfig.className}`}>
            <StatutIcon size={13} />
            {statutConfig.label}
          </span>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-muted hover:text-white border border-white/10 px-3 py-1.5 rounded-full text-xs transition-colors"
              aria-label={`Voir le document : ${titre}`}
            >
              <Eye size={13} />
              Voir
            </a>
          ) : null}
        </div>
      </div>

      {statutKey === 'rejete' && motif ? (
        <p className="text-red-400 text-sm mb-4 flex items-start gap-2">
          <XCircle size={15} className="shrink-0 mt-0.5" />
          Motif du rejet : {motif}
        </p>
      ) : null}

      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            selectionner(e.dataTransfer.files?.[0]);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
            dragOver
              ? 'border-[#dc2626] bg-[#dc2626]/5'
              : 'border-neutral-700 hover:border-[#dc2626]/50'
          }`}
          aria-label={`Téléverser ${titre}`}
        >
          <UploadCloud size={28} className={`mx-auto mb-2 ${dragOver ? 'text-primary-light' : 'text-muted'}`} />
          <p className="text-gray-400 text-sm">
            Glissez une photo ici ou{' '}
            <span className="text-primary-light font-medium">parcourez vos fichiers</span>
          </p>
          <p className="text-muted text-xs mt-1">
            JPG, PNG ou WebP — {maxSizeMb} Mo max. Photo nette, lisible et non rognée.
          </p>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={DOCUMENT_PHOTO_ACCEPT}
            className="hidden"
            onChange={(e) => selectionner(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-start gap-4">
            {preview ? (
              <img
                src={preview}
                alt={`Aperçu : ${titre}`}
                className="w-24 h-24 object-contain rounded-lg border border-white/10 shrink-0 bg-black/40"
              />
            ) : (
              <div className="w-24 h-24 bg-neutral-800 border border-neutral-700 rounded-lg flex items-center justify-center shrink-0">
                <ImageIcon size={24} className="text-muted" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{file.name}</p>
              <p className="text-muted text-xs mt-0.5">
                {(file.size / 1024 / 1024).toFixed(2)} Mo
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={envoyer}
                  disabled={uploading}
                  className="bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Vérification…
                    </>
                  ) : (
                    'Envoyer la photo'
                  )}
                </button>
                <button
                  type="button"
                  onClick={reinitialiser}
                  disabled={uploading}
                  className="text-muted hover:text-white px-3 py-2 rounded-lg text-sm transition hover:bg-white/5"
                >
                  Annuler
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={reinitialiser}
              disabled={uploading}
              className="text-muted hover:text-red-500 transition-colors shrink-0 p-1"
              aria-label="Retirer la photo sélectionnée"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-red-400">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
