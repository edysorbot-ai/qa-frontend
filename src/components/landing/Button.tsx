"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition-all active:scale-[0.96] shadow-[0px_1px_0px_0px_rgba(255,255,255,0.1)_inset,0px_-1px_0px_0px_rgba(0,0,0,0.2)_inset]",
  {
    variants: {
      variant: {
        primary:
          "bg-[#5E6AD2] text-white hover:bg-[#5E6AD2]/90 shadow-[0px_1px_0px_0px_rgba(255,255,255,0.2)_inset,0px_-1px_0px_0px_rgba(0,0,0,0.2)_inset]",
        secondary:
          "bg-[#16171C] text-[#EEEEEE] border border-[#2A2A2A] hover:bg-[#1F2026] hover:border-[#3A3A3A] shadow-[0px_1px_0px_0px_rgba(255,255,255,0.05)_inset]",
        ghost: "hover:bg-white/5 text-[#8A8F98] hover:text-[#EEEEEE]",
        outline:
          "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
