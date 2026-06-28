import { RotateCcw, Shield, Star, Truck } from "lucide-react";
import React from "react";

import { cn } from "@/lib/utils";

interface TrustItem {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

interface TrustStrip1Props {
  items?: TrustItem[];
  className?: string;
}

const DEFAULT_ITEMS: TrustItem[] = [
  {
    icon: <Truck className="size-5" />,
    title: "Free Shipping",
    description: "On orders over $50",
  },
  {
    icon: <RotateCcw className="size-5" />,
    title: "Easy Returns",
    description: "30-day return policy",
  },
  {
    icon: <Shield className="size-5" />,
    title: "Secure Payment",
    description: "100% protected",
  },
  {
    icon: <Star className="size-5" />,
    title: "4.9/5 Rating",
    description: "From 10,000+ reviews",
  },
];

const TrustStrip1 = ({
  items = DEFAULT_ITEMS,
  className,
}: TrustStrip1Props) => {
  return (
    <section className={cn("border-y bg-muted/30 py-6", className)}>
      <div className="container">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {item.icon}
              </div>
              <div>
                <p className="leading-tight font-medium">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { TrustStrip1 };
