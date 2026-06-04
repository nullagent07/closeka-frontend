"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Toaster() {
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      <ToastPrimitive.Viewport
        className={cn(
          "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-sm",
        )}
      />
    </ToastPrimitive.Provider>
  );
}

export function Toast({
  title,
  description,
  variant = "default",
}: {
  title: string;
  description?: ReactNode;
  variant?: "default" | "destructive";
}) {
  return (
    <ToastPrimitive.Root
      className={cn(
        "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-full rounded-md border p-4 shadow-lg",
        variant === "destructive" && "border-destructive text-destructive-foreground",
      )}
    >
      <ToastPrimitive.Title className="text-sm font-medium">{title}</ToastPrimitive.Title>
      {description ? (
        <ToastPrimitive.Description className="mt-1 text-sm text-muted-foreground">
          {description}
        </ToastPrimitive.Description>
      ) : null}
    </ToastPrimitive.Root>
  );
}
