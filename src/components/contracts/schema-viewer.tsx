"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SchemaViewerProps {
  schema: Record<string, unknown>;
  title?: string;
}

interface SchemaNodeProps {
  name: string;
  schema: Record<string, unknown>;
  required?: boolean;
  depth?: number;
}

function SchemaNode({ name, schema, required = false, depth = 0 }: SchemaNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);

  const type = schema.type as string | undefined;
  const properties = schema.properties as Record<string, unknown> | undefined;
  const items = schema.items as Record<string, unknown> | undefined;
  const requiredFields = schema.required as string[] | undefined;
  const description = schema.description as string | undefined;
  const enumValues = schema.enum as unknown[] | undefined;
  const ref = schema.$ref as string | undefined;

  const hasChildren = !!(properties || (type === "array" && items));
  const indent = depth * 16;

  return (
    <div className="font-mono text-xs">
      <div
        className={cn(
          "flex items-start gap-1 py-0.5 rounded px-1 hover:bg-muted/50",
          hasChildren && "cursor-pointer"
        )}
        style={{ paddingLeft: `${indent + 4}px` }}
        onClick={() => hasChildren && setExpanded((v) => !v)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="size-3 mt-0.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3 mt-0.5 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="size-3 shrink-0" />
        )}

        <span className="text-foreground font-semibold">{name}</span>
        {required && <span className="text-destructive ml-0.5">*</span>}

        {ref ? (
          <span className="text-purple-600 dark:text-purple-400 ml-1">{ref}</span>
        ) : (
          <>
            {type && (
              <span
                className={cn(
                  "ml-1",
                  type === "string" && "text-green-600 dark:text-green-400",
                  type === "number" || type === "integer"
                    ? "text-blue-600 dark:text-blue-400"
                    : "",
                  type === "boolean" && "text-amber-600 dark:text-amber-400",
                  type === "object" && "text-orange-600 dark:text-orange-400",
                  type === "array" && "text-cyan-600 dark:text-cyan-400"
                )}
              >
                {type === "array" && items
                  ? `array[${(items as Record<string, unknown>).type ?? "any"}]`
                  : type}
              </span>
            )}
            {enumValues && (
              <span className="text-muted-foreground ml-1">
                enum({enumValues.map((v) => JSON.stringify(v)).join(", ")})
              </span>
            )}
          </>
        )}

        {description && (
          <span className="text-muted-foreground ml-2 font-sans not-italic">
            — {description}
          </span>
        )}
      </div>

      {hasChildren && expanded && properties && (
        <div>
          {Object.entries(properties).map(([propName, propSchema]) => (
            <SchemaNode
              key={propName}
              name={propName}
              schema={propSchema as Record<string, unknown>}
              required={requiredFields?.includes(propName) ?? false}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {hasChildren && expanded && type === "array" && items && !properties && (
        <SchemaNode
          name="[item]"
          schema={items as Record<string, unknown>}
          depth={depth + 1}
        />
      )}
    </div>
  );
}

export function SchemaViewer({ schema, title }: SchemaViewerProps) {
  if (!schema || Object.keys(schema).length === 0) {
    return (
      <div className="rounded-md border border-border bg-muted/30 p-4 text-xs text-muted-foreground font-mono">
        (empty schema)
      </div>
    );
  }

  const type = schema.type as string | undefined;
  const properties = schema.properties as Record<string, unknown> | undefined;
  const requiredFields = schema.required as string[] | undefined;

  return (
    <div className="rounded-md border border-border bg-muted/20 overflow-hidden">
      {title && (
        <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
          {title}
        </div>
      )}
      <div className="p-2">
        {/* Root type hint */}
        {type && (
          <div className="px-1 pb-1 text-xs text-muted-foreground font-mono">
            type: <span className="text-orange-600 dark:text-orange-400">{type}</span>
          </div>
        )}

        {/* Properties */}
        {properties ? (
          <div>
            {Object.entries(properties).map(([name, propSchema]) => (
              <SchemaNode
                key={name}
                name={name}
                schema={propSchema as Record<string, unknown>}
                required={requiredFields?.includes(name) ?? false}
                depth={0}
              />
            ))}
          </div>
        ) : (
          /* Render root as a node if no properties (e.g. primitive or $ref) */
          <SchemaNode name="(root)" schema={schema} depth={0} />
        )}
      </div>
    </div>
  );
}
