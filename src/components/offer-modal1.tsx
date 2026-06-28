"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const OfferModal1 = () => {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        className="top-auto right-4 bottom-4 left-auto block h-fit max-h-dvh max-w-115 translate-x-0 translate-y-0 space-y-2.5 rounded-sm p-10 duration-400 data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full"
      >
        <div className="absolute end-1.5 top-1.5">
          <DialogClose asChild>
            <Button
              variant="ghost"
              className="text-xs text-muted-foreground uppercase"
              size="sm"
            >
              Close
            </Button>
          </DialogClose>
        </div>
        <DialogHeader>
          <DialogTitle className="text-start font-serif text-2xl leading-snug font-normal">
            Join our newsletter and enjoy 35% off your first order
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2.5">
          <Input type="email" placeholder="Email" />
          <Button className="w-full text-xs uppercase">subscribe</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { OfferModal1 };
