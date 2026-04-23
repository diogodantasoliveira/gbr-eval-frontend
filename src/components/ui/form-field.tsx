import { cn } from "@/lib/utils"

interface FormFieldProps {
  error?: string
  children: React.ReactNode
  className?: string
}

export function FormField({ error, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {children}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
