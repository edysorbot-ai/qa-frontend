"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  /** What the metric measures (the "captures" text from the catalog) */
  text: string;
  /** Optional second line: source / benchmark / notes */
  meta?: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * Small inline info icon with hover/focus tooltip.
 * Use next to any metric label so users can see what it measures
 * and where the value comes from.
 */
export function InfoTooltip({ text, meta, className, side = "top" }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="More info"
            className={cn(
              "inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors align-middle",
              className,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed">
          <div>{text}</div>
          {meta && <div className="mt-1 text-[10px] text-muted-foreground">{meta}</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
