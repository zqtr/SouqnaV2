"use client";
/* eslint-disable @next/next/no-img-element */

import { Eye, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Price, PriceValue } from "@/components/price";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const STOCK_STATUS = {
  IN_STOCK: "IN_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
} as const;

type StockStatusCode = keyof typeof STOCK_STATUS;

interface ProductPrice {
  regular: number;
  sale?: number;
  currency: string;
}

type Image = {
  srcset: string;
  src: string;
  sizes: string;
  alt: string;
};

type Variant = {
  value: string;
  id: string;
  label: string;
  image: Image;
};
interface Product {
  name: string;
  price: ProductPrice;
  link: string;
  variantId: string;
  stockStatusCode: StockStatusCode;
  badges: Array<{
    text: string;
    color: string;
  }>;
  image: Image;
  variants: Array<Variant>;
}

const PRODUCT_CARD: Product = {
  name: "Ceramic Plate",
  price: {
    regular: 99.0,
    sale: 89.0,
    currency: "USD",
  },
  link: "/template-showcase/products",
  variantId: "green",
  stockStatusCode: "IN_STOCK",
  badges: [
    {
      text: "Sale",
      color: "oklch(57.7% 0.245 27.325)",
    },
  ],
  image: {
    src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-micheile-10410297-1.jpg",
    srcset:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-micheile-10410297-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-micheile-10410297-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-micheile-10410297-1.jpg 640w",
    alt: "",
    sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
  },
  variants: [
    {
      label: "Green",
      id: "green",
      value: "green",
      image: {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-micheile-10410297-1.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-micheile-10410297-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-micheile-10410297-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-micheile-10410297-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
    },
    {
      label: "Pink",
      id: "pink",
      value: "pink",
      image: {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-micheile-10410289-3.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-micheile-10410289-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-micheile-10410289-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-micheile-10410289-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
    },
  ],
};

interface ProductCard10Props {
  className?: string;
}

const ProductCard10 = ({ className }: ProductCard10Props) => {
  const [productImage, setProductImage] = useState(PRODUCT_CARD.image);

  const [selectedVariant, setSelectedVariant] = useState(
    PRODUCT_CARD.variantId,
  );
  const { regular, sale, currency } = PRODUCT_CARD.price;

  const onValueChange = (value: string) => {
    setSelectedVariant(value);
  };

  const selectedVariantImages = useMemo(() => {
    return (
      PRODUCT_CARD.variants.find((v) => v.value === selectedVariant)?.image ??
      PRODUCT_CARD.image
    );
  }, [selectedVariant]);

  useEffect(() => {
    setProductImage(selectedVariantImages);
  }, [selectedVariantImages]);

  return (
    <Card
      className={cn(
        "group relative block max-w-60 rounded-none border-none bg-background p-0 shadow-none",
        className,
      )}
    >
      <a
        href={PRODUCT_CARD.link}
        className="absolute inset-0 z-10 size-full"
      ></a>
      <CardContent className="p-0">
        <div className="relative overflow-hidden">
          <AspectRatio
            ratio={0.749767365}
            className="overflow-hidden rounded-xl"
          >
            {productImage && (
              <img
                srcSet={productImage.srcset}
                src={productImage.src}
                alt={productImage.alt}
                sizes={productImage.sizes}
                className="block size-full origin-center object-cover object-center transition-transform duration-700 group-hover:scale-110"
              />
            )}
          </AspectRatio>
          {PRODUCT_CARD.stockStatusCode === STOCK_STATUS.OUT_OF_STOCK && (
            <div className="absolute start-2.5 top-2.5 z-60">
              <Badge>Sold Out</Badge>
            </div>
          )}
          {PRODUCT_CARD.stockStatusCode === STOCK_STATUS.IN_STOCK &&
            PRODUCT_CARD.price.sale && (
              <div className="absolute start-2.5 top-2.5 z-60">
                <Badge variant="destructive">Sale</Badge>
              </div>
            )}
          <div className="absolute inset-x-5 top-1/2 z-60 hidden -translate-y-1/2 md:block">
            <div className="flex flex-col gap-2 opacity-0 duration-700 lg:translate-y-4 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
              <Button
                disabled={
                  PRODUCT_CARD.stockStatusCode === STOCK_STATUS.OUT_OF_STOCK
                }
                className="w-full"
              >
                <ShoppingCart />
                Add to cart
              </Button>
              <Button variant="secondary" className="w-full">
                <Eye />
                Quick View
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 pt-3">
          <CardTitle className="leading-normal font-normal underline-offset-3 group-hover:underline">
            {PRODUCT_CARD.name}
          </CardTitle>
          <Price
            onSale={sale != null}
            className="text-sm leading-normal font-bold"
          >
            <PriceValue
              price={sale}
              currency={currency}
              variant="sale"
              className="text-red-700"
            />
            <PriceValue price={regular} currency={currency} variant="regular" />
          </Price>
          <div className="relative z-10 mt-4">
            <ProductVariants
              value={selectedVariant}
              onValueChange={onValueChange}
              variants={PRODUCT_CARD.variants}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ProductVariantsProps {
  value: string;
  onValueChange: (value: string) => void;
  variants: Array<Variant>;
}

const ProductVariants = ({
  value,
  onValueChange,
  variants,
}: ProductVariantsProps) => {
  return (
    <TooltipProvider>
      <RadioGroup value={value} onValueChange={onValueChange} className="flex">
        {variants.map((item, index) => (
          <Tooltip key={`product-card-10-variant-option-${index}`}>
            <TooltipTrigger asChild>
              <Label
                className="h-11.5 w-8.5 cursor-pointer overflow-hidden rounded-sm has-data-[state=checked]:ring-2"
                htmlFor={item.id}
              >
                <img
                  src={item.image.src}
                  srcSet={item.image.srcset}
                  alt={item.image.alt}
                  sizes={item.image.sizes}
                  className="block size-full object-cover object-center"
                />
                <RadioGroupItem
                  value={item.value}
                  id={item.id}
                  className="sr-only"
                />
              </Label>
            </TooltipTrigger>
            <TooltipContent>
              <p>{item.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </RadioGroup>
    </TooltipProvider>
  );
};

export { ProductCard10 };
