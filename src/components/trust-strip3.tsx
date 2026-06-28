import { Award, Lock, Medal, ShieldCheck } from "lucide-react";
import React from "react";

import { cn } from "@/lib/utils";

interface Certification {
  icon: React.ReactNode;
  name: string;
}

interface TrustStrip3Props {
  certifications?: Certification[];
  guarantees?: string[];
  className?: string;
}

const DEFAULT_CERTIFICATIONS: Certification[] = [
  { icon: <ShieldCheck className="size-5" />, name: "SSL Secured" },
  { icon: <Lock className="size-5" />, name: "PCI Compliant" },
  { icon: <Award className="size-5" />, name: "BBB Accredited" },
  { icon: <Medal className="size-5" />, name: "Top Rated 2024" },
];

const DEFAULT_GUARANTEES = [
  "Money-back guarantee",
  "Authentic products",
  "Secure checkout",
];

const TrustStrip3 = ({
  certifications = DEFAULT_CERTIFICATIONS,
  guarantees = DEFAULT_GUARANTEES,
  className,
}: TrustStrip3Props) => {
  return (
    <section className={cn("border-y py-6", className)}>
      <div className="container">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          {/* Certifications */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:justify-start">
            {certifications.map((cert, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5"
              >
                <span className="text-muted-foreground">{cert.icon}</span>
                <span className="text-sm font-medium">{cert.name}</span>
              </div>
            ))}
          </div>

          {/* Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground md:justify-end">
            {guarantees.map((guarantee, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <div className="size-1.5 rounded-full bg-emerald-500" />
                <span>{guarantee}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export { TrustStrip3 };
