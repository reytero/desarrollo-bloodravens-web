'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import { errorMessage } from '@/lib/br/client'
import { Btn, ErrorNote, Modal } from './ui'

export function FormModal({
  open,
  onClose,
  title,
  code,
  submitLabel = 'Guardar',
  onSubmit,
  onDelete,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  code?: string
  submitLabel?: string
  onSubmit: (form: FormData) => Promise<void>
  onDelete?: () => Promise<void>
  children: ReactNode
  wide?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function close() {
    setError(null)
    setConfirmDelete(false)
    onClose()
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      close()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    run(() => onSubmit(form))
  }

  return (
    <Modal open={open} onClose={close} title={title} code={code} wide={wide}>
      <form onSubmit={handle} className="flex flex-col gap-4">
        {children}
        <ErrorNote message={error} />
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          {onDelete ? (
            confirmDelete ? (
              <div className="mr-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">¿Seguro?</span>
                <Btn type="button" size="sm" variant="danger" disabled={busy} onClick={() => run(onDelete)}>
                  Sí, eliminar
                </Btn>
                <Btn type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  No
                </Btn>
              </div>
            ) : (
              <Btn type="button" variant="danger" className="mr-auto" onClick={() => setConfirmDelete(true)}>
                Eliminar
              </Btn>
            )
          ) : null}
          <Btn type="button" variant="ghost" onClick={close}>
            Cancelar
          </Btn>
          <Btn type="submit" variant="primary" loading={busy}>
            {submitLabel}
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

export function formObject(form: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, form.get(k)]))
}
