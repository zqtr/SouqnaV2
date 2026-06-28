"use client";
/* eslint-disable @next/next/no-img-element */

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Plus, X } from "lucide-react";
import { Fragment, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { Controller } from "react-hook-form";
import z from "zod";

import { Price, PriceValue } from "@/components/price";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Field, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

const STOCK_STATUS = {
  IN_STOCK: "IN_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
} as const;

type StockStatusCode = keyof typeof STOCK_STATUS;

type FormType = z.infer<typeof formSchema>;
type FormFieldName = keyof FormType;

type Image = {
  src: string;
  alt: string;
};

interface ProductPrice {
  regular: number;
  sale?: number;
  currency: string;
}

interface Product {
  name: string;
  images: Image[];
  link: string;
  hinges: Record<FormFieldName, Hinge>;
  variantId: string;
  price: ProductPrice;
}

type Option = {
  id: string;
  value: string;
  colors?: string[];
  label?: string;
  images?: Image[];
  stockStatusCode?: StockStatusCode;
};

type Hinge = {
  label?: string;
  name: FormFieldName;
  id: string;
  options: Array<Option>;
};

interface RadioGroupProps {
  form: UseFormReturn<FormType>;
  hinges: Hinge;
}

const PRODUCT_CARD: Product = {
  name: "Slate Essential Hoodie",
  images: [
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Young-Man-in-Navy-and-Orange-Hoodie-2.png",
      alt: "",
    },
  ],
  link: "/template-showcase/products",
  price: {
    regular: 49.0,
    sale: 38.0,
    currency: "USD",
  },
  variantId: "product-1-3",
  hinges: {
    size: {
      id: "size",
      name: "size",
      label: "Quick Add",
      options: [
        {
          value: "xs",
          id: "xs",
          label: "XS",
          stockStatusCode: "IN_STOCK",
        },
        {
          value: "s",
          id: "s",
          label: "S",
          stockStatusCode: "IN_STOCK",
        },
        {
          value: "m",
          id: "m",
          label: "M",
          stockStatusCode: "IN_STOCK",
        },
        {
          value: "l",
          id: "l",
          label: "L",
          stockStatusCode: "IN_STOCK",
        },
        {
          value: "xl",
          id: "xl",
          label: "XL",
          stockStatusCode: "OUT_OF_STOCK",
        },
        {
          value: "2xl",
          id: "2xl",
          label: "2XL",
          stockStatusCode: "OUT_OF_STOCK",
        },
      ],
    },
    color: {
      id: "color",
      name: "color",
      options: [
        {
          images: [
            {
              src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Young-Man-in-Casual-Outfit-2.png",
              alt: "",
            },
            {
              src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Person-in-Green-Hoodie-2.png",
              alt: "",
            },
          ],
          id: "product-1-2",
          value: "product-1-2",
          label: "Olive",
          colors: ["#52462C"],
        },
        {
          images: [
            {
              src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Young-Man-in-Navy-and-Orange-Hoodie-2.png",
              alt: "",
            },
          ],
          id: "product-1-3",
          value: "product-1-3",
          label: "Navy & Orange",
          colors: ["#2B233A", "#F6862E"],
        },
        {
          images: [
            {
              src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Young-Man-in-Blue-Hoodie-2.png",
              alt: "",
            },
          ],
          id: "product-2-1",
          value: "product-2-1",
          label: "Blue",
          colors: ["#233A4E", "#879698"],
        },
        {
          images: [
            {
              src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Young-Man-in-Beige-Hoodie-2.png",
              alt: "",
            },
            {
              src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Close-up-of-Beige-Hoodie-2.png",
              alt: "",
            },
          ],
          id: "product-2-2",
          value: "product-2-2",
          label: "Beige",
          colors: ["#BDA994"],
        },
        {
          images: [
            {
              src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Young-Man-in-Maroon-Hoodie-2.png",
              alt: "",
            },
          ],
          id: "product-3-1",
          value: "product-3-1",
          label: "Maroon",
          colors: ["#54272E"],
        },
        {
          images: [
            {
              src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Young-Person-in-Bright-Fashion-2.png",
              alt: "",
            },
          ],
          id: "product-3-2",
          value: "product-3-2",
          label: "Burnt Orange",
          colors: ["#C75922"],
        },
        {
          images: [
            {
              src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Young-Man-in-Green-Hoodie-2.png",
              alt: "",
            },
          ],
          id: "product-3-3",
          value: "product-3-3",
          label: "Lime Green",
          colors: ["#91A12E"],
        },
      ],
    },
  },
};

const formSchema = z.object({
  size: z.string(),
  color: z.string(),
});

interface ProductCard24Props {
  className?: string;
}

const ProductCard24 = ({ className }: ProductCard24Props) => {
  const [open, setOpen] = useState(false);
  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      size: "",
      color: PRODUCT_CARD.variantId ?? "",
    },
  });

  const selectedColor = form.watch("color");
  const images =
    PRODUCT_CARD.hinges.color.options.find(
      (variant) => variant.value === selectedColor,
    )?.images ?? PRODUCT_CARD.images;
  const { regular, sale, currency } = PRODUCT_CARD.price;

  return (
    <Card
      className={cn(
        "group max-w-120 overflow-hidden rounded-none border-0 p-0 shadow-none ring ring-muted",
        className,
      )}
    >
      <CardContent className="p-0">
        <form>
          <div className="relative w-full">
            <a href={PRODUCT_CARD.link}>
              <Carousel
                opts={{
                  loop: true,
                }}
              >
                <CarouselContent className="ml-0">
                  {images.map((image, index) => (
                    <CarouselItem className="pl-0" key={`${index}`}>
                      <AspectRatio
                        ratio={0.666666667}
                        className="overflow-hidden"
                      >
                        <img
                          src={image.src}
                          alt={image.alt}
                          className="size-full object-cover object-center"
                        />
                      </AspectRatio>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {images.length > 1 && (
                  <Fragment>
                    <CarouselPrevious type="button" className="left-4" />
                    <CarouselNext type="button" className="right-4" />
                  </Fragment>
                )}
              </Carousel>
            </a>
            <div className="absolute inset-x-0 bottom-0">
              <div
                className={cn(
                  "bg-card py-2 ring ring-muted transition-opacity duration-350 md:opacity-0 md:group-hover:opacity-100",
                  open && "opacity-100",
                  !open && "opacity-0",
                )}
              >
                <div className="flex w-full items-center justify-between gap-4 overflow-x-auto pr-1.5 pl-4 [-ms-overflow-style:none] [scrollbar-width:none] [::-webkit-scrollbar]:hidden">
                  <SizeRadioGroup
                    hinges={PRODUCT_CARD.hinges.size}
                    form={form}
                  />
                  <div className="shrink-0">
                    <Button size="sm" variant="ghost">
                      View
                      <ArrowRight />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <CardHeader className="relative gap-2 p-4">
            <CardTitle className="text-sm font-normal">
              {PRODUCT_CARD.name}
            </CardTitle>
            <div className="flex h-6 w-[calc(100%-1.5rem)] items-center gap-4">
              <div className="shrink-0">
                <Price className="text-sm" onSale={sale != null}>
                  <PriceValue price={sale} currency={currency} variant="sale" />
                  <PriceValue
                    price={regular}
                    currency={currency}
                    variant="regular"
                  />
                </Price>
              </div>
              <div className="relative">
                <div
                  className={cn(
                    "bg-card transition-opacity duration-350 md:opacity-0 md:group-hover:opacity-100",
                    open && "opacity-100",
                    !open && "opacity-0",
                  )}
                >
                  <ColorRadioGroup
                    hinges={PRODUCT_CARD.hinges.color}
                    form={form}
                  />
                </div>
              </div>
            </div>
            <div className="absolute right-0 bottom-0 md:hidden">
              <Button
                variant="ghost"
                className="rounded-none bg-background hover:bg-background"
                size="icon"
                type="button"
                onClick={() => setOpen(!open)}
              >
                {open ? <X /> : <Plus />}
              </Button>
            </div>
          </CardHeader>
        </form>
      </CardContent>
    </Card>
  );
};

const SizeRadioGroup = ({ form, hinges }: RadioGroupProps) => {
  return (
    <Controller
      control={form.control}
      name={hinges.name}
      render={({ field }) => (
        <Field className="flex min-h-8 shrink-0 items-center">
          <FieldLabel className="shrink-0">{hinges.label}:</FieldLabel>
          <RadioGroup
            onValueChange={field.onChange}
            value={field.value}
            className="w-auto grid-flow-col items-center gap-2"
          >
            {hinges.options.map((option) => (
              <Field key={option.id}>
                <RadioGroupItem
                  id={option.id}
                  className="peer sr-only"
                  value={option.value}
                  disabled={
                    option.stockStatusCode === STOCK_STATUS.OUT_OF_STOCK
                  }
                />
                <FieldLabel
                  htmlFor={option.id}
                  className="cursor-pointer font-normal underline-offset-3 peer-has-data-[state=checked]:underline"
                >
                  {option.label}
                </FieldLabel>
              </Field>
            ))}
          </RadioGroup>
        </Field>
      )}
    />
  );
};

const ColorRadioGroup = ({ form, hinges }: RadioGroupProps) => {
  return (
    <Controller
      control={form.control}
      name={hinges.name}
      render={({ field }) => (
        <Field>
          <RadioGroup
            onValueChange={field.onChange}
            value={field.value}
            className="flex shrink grow justify-end gap-2 overflow-x-auto px-1 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [::-webkit-scrollbar]:hidden"
          >
            {hinges.options.map((option) => (
              <Field key={option.id} className="last:pr-12">
                <RadioGroupItem
                  id={option.id}
                  className="peer sr-only"
                  value={option.value}
                />
                <FieldLabel
                  htmlFor={option.id}
                  style={
                    option.colors?.length === 1
                      ? {
                          backgroundColor: option.colors[0],
                        }
                      : {
                          backgroundImage: `linear-gradient(45deg, ${option.colors?.[0]} 0%, ${option.colors?.[0]} 50%, ${option.colors?.[1]} 50%, ${option.colors?.[1]} 100%)`,
                        }
                  }
                  className="size-6 shrink-0 cursor-pointer rounded-full border-3 border-card font-normal peer-has-data-[state=checked]:ring-2"
                ></FieldLabel>
              </Field>
            ))}
          </RadioGroup>
        </Field>
      )}
    />
  );
};

export { ProductCard24 };
