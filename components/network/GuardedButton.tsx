"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTransactionGuard } from "@/context/NetworkMismatchContext";

/**
 * Transaction CTA that disables itself with an explanatory tooltip while the
 * wallet and app networks differ (#610). Outside a mismatch it renders a plain
 * Button, keeping the existing markup and disabled behaviour unchanged.
 */
type GuardedButtonProps = ComponentProps<typeof Button>;

export function GuardedButton(props: GuardedButtonProps) {
  const { disabled: mismatched, reason } = useTransactionGuard();

  if (!mismatched) {
    return <Button {...props} />;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button {...props} disabled>
            {props.children}
          </Button>
        </TooltipTrigger>
        <TooltipContent data-testid="guarded-button-tooltip">{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
