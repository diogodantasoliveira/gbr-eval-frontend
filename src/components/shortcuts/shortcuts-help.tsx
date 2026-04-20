"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Shortcut {
  keys: string[];
  description: string;
}

const SHORTCUTS: { section: string; items: Shortcut[] }[] = [
  {
    section: "Navigation",
    items: [
      { keys: ["g", "s"], description: "Go to Skills" },
      { keys: ["g", "g"], description: "Go to Golden Sets" },
      { keys: ["g", "t"], description: "Go to Tasks" },
      { keys: ["g", "r"], description: "Go to Rubrics" },
      { keys: ["g", "u"], description: "Go to Runs" },
      { keys: ["g", "c"], description: "Go to Contracts" },
      { keys: ["g", "v"], description: "Go to Conventions" },
    ],
  },
  {
    section: "Global",
    items: [
      { keys: ["⌘", "K"], description: "Focus search" },
      { keys: ["?"], description: "Show this help" },
      { keys: ["Esc"], description: "Close dialog / clear search" },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-xs text-foreground">
      {children}
    </kbd>
  );
}

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {SHORTCUTS.map(({ section, items }) => (
            <div key={section}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section}
              </p>
              <div className="space-y-1">
                {items.map(({ keys, description }) => (
                  <div
                    key={description}
                    className="flex items-center justify-between gap-4 rounded-md px-2 py-1.5 hover:bg-muted/50"
                  >
                    <span className="text-sm text-foreground">{description}</span>
                    <div className="flex items-center gap-1">
                      {keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <Kbd>{k}</Kbd>
                          {i < keys.length - 1 && (
                            <span className="text-xs text-muted-foreground">then</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
