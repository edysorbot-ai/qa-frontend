import React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Container({ children, className, ...props }: ContainerProps) {
  return (
    <div className={cn("mx-auto px-6 max-w-7xl w-full", className)} {...props}>
      {children}
    </div>
  );
}
