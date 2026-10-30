import { Children, cloneElement, isValidElement } from "react";
import type { ReactNode } from "react";

export type AlertKind = "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";

export interface AlertMeta {
  title: string;
  /** The callout's `data-part` tokens: `callout` plus its tone (`info`, `ok` or `warn`). */
  part: string;
  icon: string;
}

export const ALERTS: Record<AlertKind, AlertMeta> = {
  NOTE: { title: "Note", part: "callout info", icon: "i" },
  TIP: { title: "Tip", part: "callout ok", icon: "✓" },
  IMPORTANT: { title: "Important", part: "callout info", icon: "!" },
  WARNING: { title: "Warning", part: "callout warn", icon: "!" },
  CAUTION: { title: "Caution", part: "callout warn", icon: "!" },
};

const ALERT_MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\r?\n?/i;

function isAlertKind(value: string): value is AlertKind {
  return value in ALERTS;
}

export interface ParsedAlert {
  kind: AlertKind;
  body: ReactNode[];
}

/**
 * GitHub alert syntax: a blockquote whose first paragraph starts with
 * `[!NOTE]` (or TIP / IMPORTANT / WARNING / CAUTION). Returns the alert kind
 * and the blockquote children with the marker removed, or `null` for a plain
 * blockquote.
 */
export function parseAlert(children: ReactNode): ParsedAlert | null {
  const nodes = Children.toArray(children);
  const at = nodes.findIndex((n) => isValidElement(n));
  if (at < 0) return null;
  const para = nodes[at];
  if (!isValidElement<{ children?: ReactNode }>(para) || para.type !== "p") {
    return null;
  }
  const [head, ...tail] = Children.toArray(para.props.children);
  if (typeof head !== "string") return null;
  const match = ALERT_MARKER.exec(head);
  if (!match) return null;
  const kind = match[1].toUpperCase();
  if (!isAlertKind(kind)) return null;

  const rest = head.slice(match[0].length);
  const paraChildren = rest ? [rest, ...tail] : tail;
  const body =
    paraChildren.length > 0
      ? nodes.map((n, i) =>
          i === at ? cloneElement(para, {}, paraChildren) : n,
        )
      : nodes.filter((_, i) => i !== at);
  return { kind, body };
}

/** A fenced code block tagged `mermaid` (shown as labelled source). */
export function isMermaidBlock(children: ReactNode): boolean {
  return Children.toArray(children).some(
    (child) =>
      isValidElement<{ className?: string }>(child) &&
      /(^|\s)language-mermaid(\s|$)/.test(child.props.className ?? ""),
  );
}
