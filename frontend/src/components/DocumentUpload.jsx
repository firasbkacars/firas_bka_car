import { useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Eye, FileText, Image as ImageIcon,
  Loader2, UploadCloud, X, XCircle,
} from 'lucide-react';
import { DOCUMENT_PHOTO_ACCEPT, validateDocumentPhotoFile } from '../lib/documentPhoto';

const STATUTS = {
  valide: {
    label: 'Validé',
    className: 'border-success/20 bg-success/10 text-success',
    icon: CheckCircle2,
  },
  en_attente: {
    label: 'En attente de validation',
    className: 'border-warning/20 bg-warning/10 text-warning',
    icon: AlertTriangle,
  },
  rejete: {
    label: 'Rejeté',
    className: 'border-danger/20 bg-danger/10 text-danger',
    icon: XCircle,
  },
  expire: {
    label: 'Expiré',
    className: 'border-danger/20 bg-danger/10 text-danger',
    icon: XCircle,
  },
  non_fourni: {
    label: 'Non fourni',
    className: 'border-line bg-white/5 text-muted',
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
          <h3 className="font-medium text-white">{titre}</h3>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${statutConfig.className}`}>
            <StatutIcon size={13} aria-hidden="true" />
            {statutConfig.label}
          </span>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-muted transition-colors hover:text-white"
              aria-label={`Voir le document : ${titre}`}
            >
              <Eye size={13} aria-hidden="true" />
              Voir
            </a>
          ) : null}
        </div>
      </div>

      {statutKey === 'rejete' && motif ? (
        <p className="mb-4 flex items-start gap-2 text-sm text-danger">
          <XCircle size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
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
          className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-line-strong hover:border-primary/50'
          }`}
          aria-label={`Téléverser ${titre}`}
        >
          <UploadCloud size={28} aria-hidden="true" className={`mx-auto mb-2 ${dragOver ? 'text-primary-light' : 'text-muted'}`} />
          <p className="text-sm text-muted">
            Glissez une photo ici ou{' '}
            <span className="font-medium text-primary-light">parcourez vos fichiers</span>
          </p>
          <p className="mt-1 text-xs text-muted">
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
        <div className="rounded-xl border border-line p-4">
          <div className="flex items-start gap-4">
            {preview ? (
              <img
                src={preview}
                alt={`Aperçu : ${titre}`}
                className="h-24 w-24 shrink-0 rounded-lg border border-line bg-black/40 object-contain"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-line bg-neutral-800">
                <ImageIcon size={24} aria-hidden="true" className="text-muted" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{file.name}</p>
              <p className="mt-0.5 text-xs text-muted">
                {(file.size / 1024 / 1024).toFixed(2)} Mo
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={envoyer}
                  disabled={uploading}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={14} aria-hidden="true" className="animate-spin" />
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
                  className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm text-muted transition-colors hover:bg-white/5 hover:text-white"
                >
                  Annuler
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={reinitialiser}
              disabled={uploading}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-danger/10 hover:text-danger"
              aria-label="Retirer la photo sélectionnée"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-danger">
          <AlertTriangle size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
