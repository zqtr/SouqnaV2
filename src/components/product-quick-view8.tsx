"use client";
/* eslint-disable @next/next/no-img-element */

import { X } from "lucide-react";

import { Price, PriceValue } from "@/components/price";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

type Image = {
  alt: string;
  src: string;
};

interface ProductPrice {
  regular: number;
  sale?: number;
  currency: string;
}

type Product = {
  images: Image[];
  price: ProductPrice;
  name: string;
  description: string;
};

type ProductQuickView8Props = Product;

interface ProductImagesProps {
  images: Image[];
}

const PRODUCT_DETAILS: Product = {
  images: [
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/electronics/turntable/modern-audio-device.png",
      alt: "Modern audio device",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/electronics/turntable/modern-audio-panel.png",
      alt: "Modern audio panel",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/electronics/turntable/elegant-turntable-scene.png",
      alt: "Elegant turntable scene",
    },
  ],
  price: {
    regular: 1299.0,
    currency: "USD",
  },
  name: "Precision Turntable Pro",
  description:
    "Experience vinyl the way it was meant to be heard. Features a precision-engineered direct drive motor, adjustable tonearm, and vibration-dampening chassis for pristine audio reproduction.",
};

const ProductQuickView8 = ({
  images = PRODUCT_DETAILS.images,
  price = PRODUCT_DETAILS.price,
  name = PRODUCT_DETAILS.name,
  description = PRODUCT_DETAILS.description,
}: ProductQuickView8Props) => {
  const { regular, sale, currency } = price;

  return (
    <Dialog defaultOpen>
      <DialogContent showCloseButton={false} className="p-4 sm:max-w-168">
        <div className="absolute top-5 right-5 z-50">
          <DialogClose asChild>
            <Button className="rounded-full" size="icon-sm" variant="secondary">
              <X />
            </Button>
          </DialogClose>
        </div>
        <div className="hide-scrollbar max-h-[calc(100dvh-8rem)] overflow-auto">
          <ProductImages images={images} />
          <div className="pt-4 pb-20">
            <div className="space-y-6">
              <div className="space-y-1">
                <Price
                  onSale={sale != null}
                  className="items-end gap-x-1 text-base font-medium"
                >
                  <PriceValue price={sale} currency={currency} variant="sale" />
                  <PriceValue
                    price={regular}
                    currency={currency}
                    variant="regular"
                  />
                </Price>
                <DialogTitle className="text-2xl font-medium">
                  {name}
                </DialogTitle>
              </div>
              <DialogDescription className="text-base leading-relaxed">
                {description}
              </DialogDescription>
            </div>
            <DialogFooter className="fixed inset-x-0 bottom-0">
              <div className="w-full rounded-b-lg bg-background p-4">
                <Button className="w-full">Add to Cart</Button>
              </div>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ProductImages = ({ images }: ProductImagesProps) => {
  return (
    <Carousel>
      <CarouselContent>
        {images.map((img) => (
          <CarouselItem key={crypto.randomUUID()}>
            <AspectRatio ratio={1.4} className="overflow-hidden rounded-sm">
              <img
                src={img.src}
                alt={img.alt}
                className="block size-full object-cover object-center"
              />
            </AspectRatio>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-1" />
      <CarouselNext className="right-1" />
    </Carousel>
  );
};

export { ProductQuickView8 };
