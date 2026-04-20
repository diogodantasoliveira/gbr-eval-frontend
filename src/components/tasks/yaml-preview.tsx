"use client";

interface YamlPreviewProps {
  data: unknown;
}

export function YamlPreview({ data }: YamlPreviewProps) {
  const text = JSON.stringify(data, null, 2);

  return (
    <div className="rounded-md border border-border bg-muted/40 overflow-auto max-h-[480px]">
      <pre className="p-4 text-xs font-mono text-foreground whitespace-pre leading-relaxed">
        {text}
      </pre>
    </div>
  );
}
