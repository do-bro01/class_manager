'use client'

export default function CopyButton({ code }: { code: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(code)}
      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
    >
      복사
    </button>
  )
}
