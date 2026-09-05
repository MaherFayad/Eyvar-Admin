/**
 * **The scan frame** — the applications viewer's picture of one uploaded
 * document, and the four states a read of it can be in.
 *
 * ```
 *  ┌────────────────────────────────────────────────────┐
 *  │ DRIVING LICENCE                    OPEN FULL SIZE  │
 *  ├────────────────────────────────────────────────────┤
 *  │                                                    │
 *  │              the scan, letterboxed                 │
 *  │                                                    │
 *  ├────────────────────────────────────────────────────┤
 *  │ JPG · 1.4 MB · uploaded 21 Jun 16:32               │
 *  └────────────────────────────────────────────────────┘
 * ```
 *
 * ## The four states, and why none of them collapses into another
 *
 * | state | what happened | what the operator does |
 * |---|---|---|
 * | `no-upload` | the record has no file | ask for one — it is not an error |
 * | `loading`   | the read is in flight | wait |
 * | `bytes`     | the scan is here | read it |
 * | `refused`   | `403` | ask for the permission |
 * | `failed`    | `5xx` / network | retry |
 *
 * `no-upload` is decided from **the record**, before any read is issued, and is
 * the common case on a half-finished application. `types/driver.ts` argues the
 * same split for the compliance viewer and the sentence is worth repeating: a
 * `404` there would say *the document id is wrong*, which is a different fact
 * to an operator and a different bug to whoever is called about it.
 *
 * ## Why this is not `DriverDocuments`' `useScanBytes`
 *
 * That hook is the same shape and is **hard-wired to
 * `getComplianceDocumentFile`** — a captain's document store. An application's
 * documents are a different collection behind a different endpoint and a
 * different permission, so reusing it would have meant threading a reader
 * through a 1,000-line file that is under active work.
 *
 * The consolidation is real and is **reported rather than done**: the two hooks
 * differ only in which client function they call, and the shared version takes
 * that function as an argument. It belongs beside them, in `src/hooks`, which
 * is a single-owner directory.
 *
 * Rules applied
 *   §11.3      no spinner. The frame holds its own shape and the caption says
 *              what is happening, in words.
 *   §7.5       every state is a SENTENCE. Nothing here is carried by a colour.
 *   a11y       the image's alt names the document and the applicant, because a
 *              scan with `alt="scan"` is a scan a screen reader cannot tell
 *              from any other.
 *   R18        nothing pulses or loops.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { getApplicationDocumentFile } from '@/data/clients'
import { COMPLIANCE_DOC_FILE_KIND, isApiError, type ApplicantDoc } from '@/data/types'
import { formatDate, formatFileSize, type Language, type Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ScanState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'bytes'; url: string; mimeType: string }
  | { kind: 'refused' }
  | { kind: 'failed' }

/**
 * Reads one document's bytes into an object URL, and revokes it on the way out.
 *
 * The read is keyed on the document id and re-issued when it changes, because
 * the viewer swaps documents in place — an operator clicking from the licence
 * to the national ID must not be shown the licence for a frame.
 */
function useDocumentScan(documentId: string, hasFile: boolean) {
  const [state, setState] = useState<ScanState>({ kind: 'idle' })
  const urlRef = useRef<string | null>(null)

  const release = useCallback(() => {
    if (urlRef.current === null) return
    URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
  }, [])

  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    /* Nothing to read. The frame says so from the RECORD and never issues a
       request that could only 204. */
    if (!hasFile) {
      release()
      setState({ kind: 'idle' })
      return
    }

    let alive = true
    const controller = new AbortController()
    setState({ kind: 'loading' })

    void getApplicationDocumentFile(documentId, controller.signal)
      .then((read) => {
        if (!alive) return
        if (read.outcome === 'no-file-on-record') {
          /* The record claims a file and the store has none — the two have
             diverged. That is a FAILED read, not the absence the record
             already reports, and the two never share a sentence. */
          setState({ kind: 'failed' })
          return
        }
        release()
        /* The copy is not incidental: `bytes` may be a VIEW onto a larger
           buffer with its own offset, and handing `.buffer` to `Blob` would
           attach the wrong range. */
        const url = URL.createObjectURL(
          new Blob([new Uint8Array(read.bytes)], { type: read.mimeType }),
        )
        urlRef.current = url
        setState({ kind: 'bytes', url, mimeType: read.mimeType })
      })
      .catch((cause: unknown) => {
        /* An abort is us cancelling. It is not a failure and must not repaint a
           frame that has already been replaced. */
        if (isApiError(cause) && cause.code === 'aborted') return
        if (!alive) return
        setState(isApiError(cause) && cause.kind === 'forbidden' ? { kind: 'refused' } : { kind: 'failed' })
      })

    return () => {
      alive = false
      controller.abort()
    }
  }, [documentId, hasFile, attempt, release])

  /* The URL outlives the effect that made it — a swap to another document
     re-runs the effect, and the old blob is revoked by `release` inside it —
     so the only leak left is unmount, which this closes. */
  useEffect(() => release, [release])

  return { state, retry }
}

export interface DocumentScanProps {
  doc: ApplicantDoc
  /** The document's own name, already translated. Used in the frame's caption and the alt text. */
  label: string
  applicantName: string
  t: Translate
  language: Language
  className?: string
}

export function DocumentScan({
  doc,
  label,
  applicantName,
  t,
  language,
  className,
}: DocumentScanProps) {
  const { state, retry } = useDocumentScan(doc.id, doc.file !== null)
  const file = doc.file

  return (
    <figure className={cn('flex min-w-0 flex-col gap-2', className)}>
      <div
        className={cn(
          'relative flex min-h-72 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted',
        )}
      >
        {file === null ? (
          /* Not an error, and not styled as one: the ordinary state of a
             half-finished application. */
          <p className="max-w-80 px-6 text-center text-xs text-muted-foreground">
            {t('applicant.review.noUpload')}
          </p>
        ) : state.kind === 'loading' || state.kind === 'idle' ? (
          <p className="text-xs text-muted-foreground">{t('applicant.review.scanLoading')}</p>
        ) : state.kind === 'refused' ? (
          <p className="max-w-80 px-6 text-center text-xs text-muted-foreground">
            {t('applicant.review.scanRefused')}
          </p>
        ) : state.kind === 'failed' ? (
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <p className="text-xs text-muted-foreground">{t('applicant.review.scanError')}</p>
            <Button variant="secondary" size="xs" onClick={retry}>
              {t('applicant.review.scanRetry')}
            </Button>
          </div>
        ) : state.mimeType === 'application/pdf' ? (
          /* A PDF is not an `<img>`. An `<object>` gives the browser's own
             viewer where it has one and falls through to the link where it does
             not — which is every mobile browser, and is why the link is inside
             rather than beside it. */
          <object
            data={state.url}
            type="application/pdf"
            aria-label={t('applicant.review.scanName', { label, name: applicantName })}
            className="size-full min-h-72"
          >
            <a
              href={state.url}
              target="_blank"
              rel="noreferrer"
              className="px-6 text-xs text-foreground underline"
            >
              {t('applicant.review.openFull')}
            </a>
          </object>
        ) : (
          <img
            src={state.url}
            /* AC-75 — named through a key, because a scan with `alt="scan"`
               is one a screen reader cannot tell from any other. */
            alt={t('applicant.review.scanName', { label, name: applicantName })}
            className="max-h-112 w-full object-contain"
          />
        )}

        {state.kind === 'bytes' && (
          <a
            href={state.url}
            target="_blank"
            rel="noreferrer"
            className="absolute end-2 top-2 rounded-md border border-border bg-card/95 px-2 py-1 text-xs font-medium text-foreground"
          >
            {t('applicant.review.openFull')}
          </a>
        )}
      </div>

      {file !== null && (
        <figcaption className="text-xs text-muted-foreground">
          <bdi>
            {t('applicant.review.fileMeta', {
              kind: COMPLIANCE_DOC_FILE_KIND[file.mimeType],
              size: formatFileSize(file.sizeBytes, t, language),
              date: formatDate(file.uploadedAt, { style: 'day-month-time', language }),
            })}
          </bdi>
        </figcaption>
      )}
    </figure>
  )
}
