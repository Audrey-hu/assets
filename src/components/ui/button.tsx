import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 active:scale-[0.985] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(29,28,26,0.08)] hover:bg-primary/92",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        outline: "border border-border bg-card/60 text-foreground hover:bg-secondary/60",
        ghost: "text-foreground/80 hover:bg-secondary/70 hover:text-foreground",
        subtle: "bg-accent/70 text-accent-foreground hover:bg-accent",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/16",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px] [&_svg]:size-3.5",
        md: "h-10 px-4 [&_svg]:size-4",
        lg: "h-12 px-5 text-[15px] [&_svg]:size-[18px]",
        icon: "h-9 w-9 [&_svg]:size-[18px]",
        iconSm: "h-8 w-8 [&_svg]:size-4",
        pill: "h-9 rounded-full px-3.5 text-[13px] [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
