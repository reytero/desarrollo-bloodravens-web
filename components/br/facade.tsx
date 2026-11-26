'use client'

export function Facade({ onExit }: { onExit: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white px-6 text-center font-sans text-neutral-800">
      <div className="flex max-w-md flex-col items-center gap-4">
        <h1 className="cursor-default select-none text-7xl font-light text-neutral-300" onClick={onExit}>
          404
        </h1>
        <p className="text-lg font-medium">Página no encontrada</p>
        <p className="text-sm leading-relaxed text-neutral-500">
          El sitio está en mantenimiento programado. Vuelve a intentarlo más tarde.
        </p>
        <p className="mt-6 text-xs text-neutral-400">nginx/1.24.0</p>
      </div>
    </div>
  )
}
