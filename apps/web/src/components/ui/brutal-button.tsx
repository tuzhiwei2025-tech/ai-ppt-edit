"use client";

import * as React from "react";
import { cn } from "../../lib/utils.js";

export type BrutalButtonVariant =
  | "secondary"
  | "primary"
  | "accent"
  | "contrast"
  | "destructive";

interface BrutalButtonBaseProps {
  variant?: BrutalButtonVariant;
  color?: string;
  textColor?: string;
  hasBorder?: boolean;
  borderColor?: string;
  hasShadow?: boolean;
  shadowColor?: string;
  radius?: number;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export type BrutalButtonProps =
  | (BrutalButtonBaseProps &
      Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BrutalButtonBaseProps> & {
        as?: "button";
      })
  | (BrutalButtonBaseProps &
      Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof BrutalButtonBaseProps> & {
        as: "a";
      });

export const BrutalButton = React.forwardRef<HTMLElement, BrutalButtonProps>(
  (
    {
      as = "button",
      className,
      variant = "secondary",
      color,
      textColor,
      hasBorder = true,
      borderColor,
      hasShadow = true,
      shadowColor,
      radius = 8,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const variantPrefix = `--button-${variant}`;
    const customStyles = {
      "--btn-bg": color || `var(${variantPrefix})`,
      "--btn-text": textColor || `var(${variantPrefix}-foreground)`,
      "--btn-border": hasBorder ? borderColor || "var(--button-border)" : "transparent",
      "--btn-shadow": shadowColor || "var(--button-shadow)",
      "--btn-radius": `${radius}px`,
      ...style,
    } as React.CSSProperties;
    const sharedClassName = cn(
      "inline-flex items-center justify-center px-6 py-3 font-bold transition-all duration-200 ease-in-out",
      hasBorder ? "border-2" : "border-0",
      hasShadow
        ? "shadow-[4px_4px_0px_var(--btn-shadow)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_var(--btn-shadow)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
        : "active:scale-95",
      "disabled:pointer-events-none disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-45 disabled:shadow-none",
      className
    );
    const sharedStyle = {
      backgroundColor: "var(--btn-bg)",
      color: "var(--btn-text)",
      borderColor: "var(--btn-border)",
      borderRadius: "var(--btn-radius)",
      ...customStyles,
    };

    if (as === "a") {
      return (
        <a
          ref={ref as React.ForwardedRef<HTMLAnchorElement>}
          className={sharedClassName}
          style={sharedStyle}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
        </a>
      );
    }

    return (
      <button
        ref={ref as React.ForwardedRef<HTMLButtonElement>}
        className={sharedClassName}
        style={sharedStyle}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </button>
    );
  }
);

BrutalButton.displayName = "BrutalButton";

export default BrutalButton;
