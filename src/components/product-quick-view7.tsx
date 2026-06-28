"use client";
/* eslint-disable @next/next/no-img-element */

import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { ArrowRight, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useMemo } from "react";
import type { ControllerRenderProps } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

import { Price, PriceValue } from "@/components/price";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
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
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

const STOCK_STATUS = {
  IN_STOCK: "IN_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
} as const;

type StockStatusCode = keyof typeof STOCK_STATUS;

type Image = {
  src: string;
  alt: string;
};

interface ProductPrice {
  regular: number;
  sale?: number;
  currency: string;
}

type Option = {
  id: string;
  value: string;
  label: string;
  thumbnail?: string;
  stockStatusCode?: StockStatusCode;
};

interface Hinges {
  label: string;
  id: string;
  min?: number;
  max?: number;
  name: FieldName;
  options?: Option[];
}

type Product = {
  images: Image[];
  name: string;
  link: string;
  price: ProductPrice;
  badges: string[];
  hinges: Record<FieldName, Hinges>;
  variant: {
    color: string;
    size: string;
  };
};

type FormType = z.infer<typeof formSchema>;
type FieldName = keyof FormType;

interface ProductImagesProps {
  images: Image[];
}

interface ProductFormProps {
  hinges: Record<FieldName, Hinges>;
  selected: FormType;
}

interface RadioGroupProps {
  options?: Array<Option>;
  field: ControllerRenderProps<FormType>;
}

type SizeOptionProps = Option;

interface QuantityProps {
  field: ControllerRenderProps<FormType>;
  max?: number;
  min?: number;
}

const PRODUCT_DETAILS: Product = {
  name: "Stylish Light Brown Hat",
  link: "/template-showcase/products",
  images: [
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/accessories/Stylish-Hat-and-Sunglasses-2.png",
      alt: "",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/accessories/Stylish-Portrait-hat-2.png",
      alt: "",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/accessories/Stylish-Modern-Look-2.png",
      alt: "",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/accessories/Fashionable-Pose-2.png",
      alt: "",
    },
  ],
  price: {
    regular: 499.0,
    sale: 389.0,
    currency: "USD",
  },
  badges: ["Sale", "New"],
  variant: {
    color: "light-brown",
    size: "size-1",
  },
  hinges: {
    color: {
      label: "Color",
      id: "color",
      name: "color",
      options: [
        {
          id: "light-brown",
          value: "light-brown",
          label: "Light Brown",
          thumbnail:
            "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/accessories/Stylish-Beige-Fedora-1.png",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "dark-brown",
          value: "dark-brown",
          label: "Dark Brown",
          thumbnail:
            "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/accessories/Classic-Fedora-Hat-1.png",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "black",
          value: "black",
          label: "Black",
          thumbnail:
            "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/accessories/Classic-Black-Fedora-Hat-1.png",
          stockStatusCode: "OUT_OF_STOCK",
        },
      ],
    },
    size: {
      label: "Hat Size",
      id: "size",
      name: "size",
      options: [
        {
          id: "size-1",
          value: "size-1",
          label: "65/8",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "size-2",
          value: "size-2",
          label: "63/4",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "size-3",
          value: "size-3",
          label: "67/8",
          stockStatusCode: "OUT_OF_STOCK",
        },
        {
          id: "size-4",
          value: "size-4",
          label: "7",
          stockStatusCode: "OUT_OF_STOCK",
        },
        {
          id: "size-5",
          value: "size-5",
          label: "71/8",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "size-6",
          value: "size-6",
          label: "71/4",
          stockStatusCode: "OUT_OF_STOCK",
        },
        {
          id: "size-7",
          value: "size-7",
          label: "73/8",
          stockStatusCode: "IN_STOCK",
        },
      ],
    },
    quantity: {
      label: "Quantity",
      id: "quantity",
      name: "quantity",
      min: 1,
      max: 90,
    },
  },
};

const ProductQuickView7 = ({
  images = PRODUCT_DETAILS.images,
  name = PRODUCT_DETAILS.name,
  link = PRODUCT_DETAILS.link,
  price = PRODUCT_DETAILS.price,
  badges = PRODUCT_DETAILS.badges,
  hinges = PRODUCT_DETAILS.hinges,
  variant = PRODUCT_DETAILS.variant,
}) => {
  const { regular, sale, currency } = price;

  return (
    <Dialog defaultOpen>
      <DialogContent
        showCloseButton={false}
        className="h-[calc(100dvh-5rem)] max-h-195 max-w-[calc(100dvw-2rem)] rounded-xl p-0 sm:max-w-137.5"
      >
        <div className="absolute top-5 right-5 z-10">
          <DialogClose asChild>
            <Button size="icon-lg" className="rounded-full" variant="secondary">
              <X />
            </Button>
          </DialogClose>
        </div>
        <div className="hide-scrollbar overflow-auto p-4">
          <div className="space-y-3">
            <div className="space-y-9">
              <ProductImages images={images} />
              <div className="space-y-2.5">
                <DialogTitle className="text-xl font-medium">
                  <a href={link}>{name}</a>
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Price
                    onSale={sale != null}
                    className="items-end gap-x-1 text-xl font-medium"
                  >
                    <PriceValue
                      price={sale}
                      currency={currency}
                      variant="sale"
                    />
                    <PriceValue
                      price={regular}
                      currency={currency}
                      variant="regular"
                      className={clsx(sale ? "text-base" : "text-xl")}
                    />
                  </Price>
                  {badges?.map((text) => (
                    <Badge key={crypto.randomUUID()}>{text}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <ProductForm
              hinges={hinges}
              selected={{
                quantity: 1,
                color: variant.color,
                size: variant.size,
              }}
            />
            <Button variant="ghost" asChild>
              <a href={link}>
                View full details
                <ArrowRight />
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ProductImages = ({ images }: ProductImagesProps) => {
  if (!images) return;

  return (
    <Carousel
      opts={{
        align: "start",
        slidesToScroll: 2,
      }}
    >
      <CarouselContent className="-ml-5">
        {images.map((img) => (
          <CarouselItem className="basis-1/2 pl-5" key={crypto.randomUUID()}>
            <AspectRatio ratio={0.83} className="overflow-hidden rounded-xl">
              <img
                src={img.src}
                alt={img.alt}
                className="block size-full object-cover object-center"
              />
            </AspectRatio>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-1.5" />
      <CarouselNext className="right-1.5" />
    </Carousel>
  );
};

const formSchema = z.object({
  color: z.string(),
  size: z.string(),
  quantity: z.number(),
});

const ProductForm = ({ hinges, selected }: ProductFormProps) => {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      color: selected.color,
      size: selected.size,
      quantity: selected.quantity,
    },
  });

  function onSubmit() {
    form.reset();
  }

  const colorHinges = hinges?.color;
  const sizeHinges = hinges?.size;
  const quantityHinges = hinges?.quantity;

  const selectedColorValue = form.watch("color");
  const selectedSizeValue = form.watch("size");

  const currentColor = useMemo(
    () =>
      colorHinges?.options?.find((item) => item.value === selectedColorValue)
        ?.label ?? "",
    [selectedColorValue, colorHinges],
  );

  const currentSize = useMemo(
    () =>
      sizeHinges?.options?.find((item) => item.value === selectedSizeValue)
        ?.label ?? "",
    [selectedSizeValue, sizeHinges],
  );

  return (
    <div className="space-y-3">
      <Separator />
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          {colorHinges && (
            <Controller
              control={form.control}
              name={colorHinges.name}
              render={({ field }) => (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm leading-normal font-medium">
                    {colorHinges.label}:{" "}
                    <span className="font-normal text-muted-foreground">
                      {currentColor}
                    </span>
                  </legend>
                  <ColorRadioGroup
                    field={field}
                    options={colorHinges.options}
                  />
                </fieldset>
              )}
            />
          )}
          {sizeHinges && (
            <Controller
              control={form.control}
              name={sizeHinges.name}
              render={({ field }) => (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm leading-normal font-medium">
                    {sizeHinges.label}:{" "}
                    <span className="font-normal text-muted-foreground">
                      {currentSize}
                    </span>
                  </legend>
                  <SizeRadioGroup field={field} options={sizeHinges.options} />
                </fieldset>
              )}
            />
          )}
        </div>
        <Separator className="my-4" />
        <div className="space-y-2.5">
          <div className="flex flex-col gap-2 md:flex-row">
            <Controller
              control={form.control}
              name={quantityHinges.name}
              render={({ field }) => (
                <Quantity
                  field={field}
                  min={quantityHinges?.min}
                  max={quantityHinges?.max}
                />
              )}
            />
            <Button className="w-full rounded-full md:flex-1">
              Add To Cart
              <ShoppingBag />
            </Button>
          </div>
          <Button className="w-full rounded-full" variant="outline">
            Buy It Now
          </Button>
        </div>
      </form>
    </div>
  );
};

const ColorRadioGroup = ({ options, field }: RadioGroupProps) => {
  if (!options) return;

  return (
    <RadioGroup
      {...field}
      value={`${field.value}`}
      onValueChange={(value) => {
        if (value != field.value && value) {
          field.onChange(value);
        }
      }}
      className="flex flex-wrap items-center gap-3"
    >
      {options.map((item) => (
        <label
          key={item.id}
          htmlFor={item.id}
          className="relative flex size-10 cursor-pointer overflow-hidden rounded-md border p-0.5 duration-400 has-checked:ring has-disabled:opacity-60"
        >
          <RadioGroupItem
            id={item.id}
            className="absolute size-px overflow-hidden opacity-0"
            value={item.value}
            aria-label={`Select ${item.label}`}
            disabled={item.stockStatusCode === STOCK_STATUS.OUT_OF_STOCK}
          />
          <div
            style={{
              backgroundImage: `url(${item.thumbnail})`,
            }}
            className="size-full overflow-hidden rounded-sm bg-cover bg-center bg-no-repeat"
          ></div>
        </label>
      ))}
    </RadioGroup>
  );
};

const SizeRadioGroup = ({ options, field }: RadioGroupProps) => {
  if (!options) return;

  return (
    <RadioGroup
      {...field}
      value={`${field.value}`}
      onValueChange={(value) => {
        if (value != field.value && value) {
          field.onChange(value);
        }
      }}
      className="flex w-full flex-wrap justify-start gap-2"
    >
      {options &&
        options.map((item) => (
          <SizeOption
            key={item.id}
            stockStatusCode={item.stockStatusCode}
            id={item.id}
            label={item.label}
            value={item.value}
          />
        ))}
    </RadioGroup>
  );
};

const SizeOption = ({ id, label, stockStatusCode, value }: SizeOptionProps) => {
  return (
    <label
      htmlFor={id}
      className="relative flex h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border px-5 py-2.5 text-center text-sm leading-none uppercase not-has-disabled:hover:ring has-checked:bg-primary has-checked:text-primary-foreground has-disabled:cursor-not-allowed has-disabled:bg-muted has-disabled:text-muted-foreground has-disabled:line-through"
    >
      <RadioGroupItem
        id={id}
        className="absolute size-px overflow-hidden opacity-0"
        value={value}
        aria-label={`Select ${label}`}
        disabled={stockStatusCode === STOCK_STATUS.OUT_OF_STOCK}
      />
      {label}
    </label>
  );
};

const Quantity = ({ field, max, min }: QuantityProps) => {
  return (
    <div
      className="flex h-9 w-full max-w-40 min-w-28 items-center overflow-hidden rounded-full border shadow-xs"
      aria-label="quantity"
    >
      <Button
        onClick={() =>
          field.onChange(Math.max(min || 1, Number(field.value || 1) - 1))
        }
        variant="ghost"
        type="button"
        size="icon"
        className="shrink-0 rounded-none"
      >
        <Minus />
      </Button>
      <Input
        {...field}
        value={field.value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          const parsed = parseInt(raw, 10);

          // Accept empty string for typing, but validate if not a number
          if (raw === "") {
            field.onChange("");
          } else if (!isNaN(parsed)) {
            field.onChange(parsed);
          }
        }}
        type="number"
        min={min ? min : 1}
        max={max ? max : 99}
        className="w-full min-w-10 flex-1 [appearance:textfield] rounded-none border-0 !bg-background px-1 text-center shadow-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <Button
        onClick={() =>
          field.onChange(Math.min(max || 99, Number(field.value || 1) + 1))
        }
        variant="ghost"
        type="button"
        size="icon"
        className="shrink-0 rounded-none"
      >
        <Plus />
      </Button>
    </div>
  );
};

export { ProductQuickView7 };
