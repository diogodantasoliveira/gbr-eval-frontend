import { Breadcrumbs, type BreadcrumbItem } from "@/components/layout/breadcrumbs"

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  children?: React.ReactNode
}

export function PageHeader({ title, description, breadcrumbs, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 pb-6">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-1" />}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  )
}
