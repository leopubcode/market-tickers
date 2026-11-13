export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-down px-4 py-3 text-sm text-down"
    >
      {message}
    </div>
  )
}
