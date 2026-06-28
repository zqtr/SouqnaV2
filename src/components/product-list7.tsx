"use client";
/* eslint-disable @next/next/no-img-element */
import { zodResolver } from "@hookform/resolvers/zod";
import { ClockFading, Heart, ShoppingBag } from "lucide-react";
import { Fragment } from "react";
import type { ControllerRenderProps, UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { Controller } from "react-hook-form";
import z from "zod";

import { Price, PriceValue } from "@/components/price";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Field, FieldLabel } from "@/components/ui/field";
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
  LOW_STOCK: "LOW_STOCK",
} as const;

type StockStatusCode = keyof typeof STOCK_STATUS;

type Option = {
  id: string;
  label: string;
  value: string;
  stockStatusCode: StockStatusCode;
};

type FormType = z.infer<typeof formSchema>;

type FieldName = keyof FormType;

interface HingeOptionGroup {
  name: FieldName;
  label: string;
  options: Option[];
}

interface Product {
  name: string;
  link: string;
  image: {
    src: string;
    alt: string;
  };
  price: ProductPrice;
  sizeHinges?: HingeOptionGroup;
}

type ProductCardProps = Product;

interface ProductPrice {
  regular: number;
  sale?: number;
  discountPercent?: `-${number}%`;
  currency: string;
}

interface ProductFormProps {
  sizeHinges?: HingeOptionGroup;
}

interface SizeRadioGroupProps {
  options: Array<Option>;
  field: ControllerRenderProps<FormType>;
  form: UseFormReturn<FormType>;
  onSubmit: (values: FormType) => void;
}

type SizeOptionProps = Option;

type ProductList = Array<Product>;

const PRODUCTS_LIST: ProductList = [
  {
    name: "Illustrated Sweatshirt",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/dynamic-sketches-sports-illustrated-sweatshirt.png",
      alt: "",
    },
    price: {
      regular: 59.0,
      sale: 49.0,
      discountPercent: "-30%",
      currency: "USD",
    },
    sizeHinges: {
      name: "size",
      label: "Select size",
      options: [
        {
          id: "xs-1",
          label: "xs",
          value: "xs",
          stockStatusCode: "OUT_OF_STOCK",
        },
        {
          id: "s-1",
          label: "s",
          value: "s",
          stockStatusCode: "OUT_OF_STOCK",
        },
        {
          id: "m-1",
          label: "m",
          value: "m",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "l-1",
          label: "l",
          value: "l",
          stockStatusCode: "LOW_STOCK",
        },
        {
          id: "xl-1",
          label: "xl",
          value: "xl",
          stockStatusCode: "LOW_STOCK",
        },
      ],
    },
  },
  {
    name: "Crewneck Sweatshirt with Embroidered Logo",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/bicolor-crewneck-sweatshirt-with-embroidered-logo.png",
      alt: "",
    },
    price: {
      regular: 80.0,
      currency: "USD",
    },
    sizeHinges: {
      name: "size",
      label: "Select size",
      options: [
        {
          id: "m-2",
          label: "m",
          value: "m",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "l-2",
          label: "l",
          value: "l",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "xl-2",
          label: "xl",
          value: "xl",
          stockStatusCode: "LOW_STOCK",
        },
      ],
    },
  },
  {
    name: "Black Hoodie",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/black-hoodie-against-light-background.png",
      alt: "",
    },
    price: {
      regular: 75.0,
      currency: "USD",
    },
    sizeHinges: {
      name: "size",
      label: "Select size",
      options: [
        {
          id: "s-3",
          label: "s",
          value: "s",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "m-3",
          label: "m",
          value: "m",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "l-3",
          label: "l",
          value: "l",
          stockStatusCode: "LOW_STOCK",
        },
        {
          id: "xl-3",
          label: "xl",
          value: "xl",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "2xl-3",
          label: "2xl",
          value: "2xl",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "3xl-3",
          label: "3xl",
          value: "3xl",
          stockStatusCode: "LOW_STOCK",
        },
      ],
    },
  },
  {
    name: "Elegant Patent Stilettos with Signature Red Soles",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/elegant-patent-stilettos-with-signature-red-soles.png",
      alt: "",
    },
    price: {
      regular: 75.0,
      currency: "USD",
    },
    sizeHinges: {
      name: "size",
      label: "Select size",
      options: [
        {
          id: "34-4",
          label: "34",
          value: "34",
          stockStatusCode: "OUT_OF_STOCK",
        },
        {
          id: "35-4",
          label: "35",
          value: "35",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "36-4",
          label: "36",
          value: "36",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "39-4",
          label: "39",
          value: "39",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "40-4",
          label: "40",
          value: "40",
          stockStatusCode: "LOW_STOCK",
        },
        {
          id: "41-4",
          label: "41",
          value: "41",
          stockStatusCode: "IN_STOCK",
        },
      ],
    },
  },
  {
    name: "Elegant Peach Scarf",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/elegant-peach-scarf.png",
      alt: "",
    },
    price: {
      regular: 35.0,
      currency: "USD",
    },
  },
  {
    name: "Maroon Leather Handbag",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/maroon-leather-handbag.png",
      alt: "",
    },
    price: {
      regular: 850.0,
      currency: "USD",
    },
  },
  {
    name: "Minimalist Tank Top",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/minimalist-tank-top-flatlay.png",
      alt: "",
    },
    price: {
      regular: 75.0,
      currency: "USD",
    },
    sizeHinges: {
      name: "size",
      label: "Select size",
      options: [
        {
          id: "s-5",
          label: "s",
          value: "s",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "m-5",
          label: "m",
          value: "m",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "l-5",
          label: "l",
          value: "l",
          stockStatusCode: "LOW_STOCK",
        },
        {
          id: "xl-5",
          label: "xl",
          value: "xl",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "2xl-5",
          label: "2xl",
          value: "2xl",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "3xl-5",
          label: "3xl",
          value: "3xl",
          stockStatusCode: "LOW_STOCK",
        },
      ],
    },
  },
  {
    name: "Modern Handbag",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/modern-handbag-display.png",
      alt: "",
    },
    price: {
      regular: 850.0,
      currency: "USD",
    },
  },
  {
    name: "Red Leather Mules",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/red-leather-mules.png",
      alt: "",
    },
    price: {
      regular: 155.0,
      sale: 99.0,
      discountPercent: "-20%",
      currency: "USD",
    },
    sizeHinges: {
      name: "size",
      label: "Select size",
      options: [
        {
          id: "34-6",
          label: "34",
          value: "34",
          stockStatusCode: "OUT_OF_STOCK",
        },
        {
          id: "35-6",
          label: "35",
          value: "35",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "36-6",
          label: "36",
          value: "36",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "39-6",
          label: "39",
          value: "39",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "40-6",
          label: "40",
          value: "40",
          stockStatusCode: "LOW_STOCK",
        },
        {
          id: "41-6",
          label: "41",
          value: "41",
          stockStatusCode: "IN_STOCK",
        },
      ],
    },
  },
  {
    name: "Stylish Maroon Sneaker",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/stylish-maroon-sneaker.png",
      alt: "",
    },
    price: {
      regular: 285.0,
      currency: "USD",
    },
    sizeHinges: {
      name: "size",
      label: "Select size",
      options: [
        {
          id: "34-7",
          label: "34",
          value: "34",
          stockStatusCode: "OUT_OF_STOCK",
        },
        {
          id: "35-7",
          label: "35",
          value: "35",
          stockStatusCode: "IN_STOCK",
        },
        {
          id: "36-7",
          label: "36",
          value: "36",
          stockStatusCode: "IN_STOCK",
        },
      ],
    },
  },
];

interface ProductList7Props {
  className?: string;
}

const ProductList7 = ({ className }: ProductList7Props) => {
  return (
    <section className={cn("px-5 py-32", className)}>
      <h2 className="mb-8 text-center text-2xl leading-normal font-medium">
        Suggestions just for you
      </h2>
      <div className="grid w-full items-center gap-x-1 gap-y-6 sm:grid-cols-[repeat(auto-fit,minmax(22.75rem,1fr))]">
        {PRODUCTS_LIST.map((item, index) => (
          <ProductCard {...item} key={`product-list-7-card-${index}`} />
        ))}
      </div>
    </section>
  );
};

const ProductCard = ({
  link,
  image,
  name,
  price,
  sizeHinges,
}: ProductCardProps) => {
  const { regular, sale, currency, discountPercent } = price;

  return (
    <Card className="h-full border-none bg-background p-0 shadow-none">
      <CardContent className="p-0">
        <div className="group relative">
          <a href={link}>
            <AspectRatio ratio={0.78125} className="overflow-hidden">
              <img
                src={image.src}
                alt={image.alt}
                className="block size-full object-cover object-center"
              />
            </AspectRatio>
          </a>
          <div className="absolute inset-x-0 bottom-0 hidden border bg-background p-3 opacity-0 group-hover:opacity-100 lg:block">
            <ProductDesktopForm sizeHinges={sizeHinges} />
          </div>
        </div>
        <div className="flex items-start justify-between gap-2 px-2 pt-2">
          <a href={link} className="flex flex-1 flex-col gap-1">
            <CardTitle className="text-xs font-normal">{name}</CardTitle>
            <Price
              onSale={sale != null}
              className="flex-col items-start gap-1 text-xs"
            >
              <div className="flex items-center gap-1">
                <PriceValue
                  currency={currency}
                  price={sale}
                  variant="sale"
                  className="font-semibold text-red-600"
                />
                {discountPercent && (
                  <Badge className="bg-red-600 px-1.5 py-px">
                    {discountPercent}
                  </Badge>
                )}
              </div>
              <PriceValue
                price={regular}
                currency={currency}
                variant="regular"
              />
            </Price>
          </a>
          <Button
            variant="ghost"
            size="icon"
            className="hidden rounded-full lg:flex"
          >
            <Heart />
          </Button>
          <div className="lg:hidden">
            <ProductMobileForm sizeHinges={sizeHinges} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const formSchema = z.object({
  size: z.string().optional(),
});

const ProductDesktopForm = ({ sizeHinges }: ProductFormProps) => {
  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: sizeHinges ? { size: "" } : {},
  });

  function onSubmit() {
    form.reset();
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col-reverse gap-11 lg:flex-col lg:gap-6"
    >
      {sizeHinges && (
        <Controller
          control={form.control}
          name={`${sizeHinges.name}`}
          render={({ field }) => (
            <Field className="gap-3">
              <FieldLabel asChild>
                <p className="justify-center text-center text-xs leading-normal">
                  {sizeHinges.label}
                </p>
              </FieldLabel>
              <SizeRadioGroup
                form={form}
                onSubmit={onSubmit}
                field={field}
                options={sizeHinges.options}
              />
            </Field>
          )}
        />
      )}

      {!sizeHinges && (
        <Button variant="ghost" className="text-xs uppercase">
          Add to Cart
        </Button>
      )}
    </form>
  );
};

const ProductMobileForm = ({ sizeHinges }: ProductFormProps) => {
  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: sizeHinges ? { size: "" } : {},
  });

  function onSubmit() {
    form.reset();
  }

  if (!sizeHinges) {
    return (
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col-reverse gap-11 lg:flex-col lg:gap-6"
      >
        <Button variant="ghost" size="icon" className="rounded-full">
          <ShoppingBag />
        </Button>
      </form>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <ShoppingBag />
        </Button>
      </DrawerTrigger>
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader className="px-5">
          <DrawerTitle className="text-sm">Add to Cart</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto">
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col-reverse gap-11 lg:flex-col lg:gap-6"
          >
            {sizeHinges && (
              <Controller
                control={form.control}
                name={`${sizeHinges.name}`}
                render={({ field }) => (
                  <Field className="gap-3">
                    <FieldLabel asChild>
                      <p className="hidden justify-center text-center text-xs leading-normal lg:block">
                        {sizeHinges.label}
                      </p>
                    </FieldLabel>
                    <SizeRadioGroup
                      field={field}
                      options={sizeHinges.options}
                      form={form}
                      onSubmit={onSubmit}
                    />
                  </Field>
                )}
              />
            )}
            {!sizeHinges && (
              <Button variant="ghost" className="text-xs uppercase">
                Add to Cart
              </Button>
            )}
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

const SizeRadioGroup = ({
  options,
  field,
  form,
  onSubmit,
}: SizeRadioGroupProps) => {
  if (!options) return;

  const handleOnChange = async (value: string) => {
    if (form.formState.isSubmitting) return;

    if (value !== field.value && value) {
      field.onChange(value);

      const valid = await form.trigger(field.name);
      if (valid) {
        await form.handleSubmit(onSubmit)();
      }
    }
  };

  return (
    <RadioGroup
      {...field}
      value={`${field.value}`}
      onValueChange={handleOnChange}
      className="flex w-full flex-col justify-center gap-0 lg:flex-row lg:flex-wrap lg:gap-3"
    >
      {options &&
        options.map((item, index) => (
          <Fragment key={`product-list-7-size-input-${index}`}>
            <div className="hidden lg:contents">
              <SizeOptionDesktop
                stockStatusCode={item.stockStatusCode}
                id={item.id}
                label={item.label}
                value={item.value}
              />
            </div>
            <div className="contents lg:hidden">
              <SizeOptionMobile
                stockStatusCode={item.stockStatusCode}
                id={`${item.id}-mobile`}
                label={item.label}
                value={item.value}
              />
            </div>
          </Fragment>
        ))}
    </RadioGroup>
  );
};

const SizeOptionDesktop = ({
  id,
  label,
  value,
  stockStatusCode,
}: SizeOptionProps) => {
  if (stockStatusCode === STOCK_STATUS.IN_STOCK) {
    return (
      <Field>
        <FieldLabel
          htmlFor={id}
          className="flex h-8 min-w-8 cursor-pointer overflow-hidden rounded-full px-1.5 text-xs leading-none font-normal uppercase hover:ring has-checked:bg-primary has-checked:text-primary-foreground"
        >
          <RadioGroupItem
            id={id}
            className="sr-only"
            value={value}
            aria-label={`Select ${label}`}
          />
          <div className="m-auto">{label}</div>
        </FieldLabel>
      </Field>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Field>
              <FieldLabel
                htmlFor={id}
                className="group/size flex h-8 min-w-8 cursor-pointer overflow-hidden rounded-full px-1.5 text-xs leading-none font-normal uppercase not-has-disabled:hover:ring has-checked:bg-primary has-checked:text-primary-foreground has-disabled:bg-muted has-disabled:text-muted-foreground"
              >
                <RadioGroupItem
                  id={id}
                  className="sr-only"
                  value={value}
                  aria-label={`Select ${label}`}
                  disabled={stockStatusCode === STOCK_STATUS.OUT_OF_STOCK}
                />
                <div className="m-auto flex items-center justify-center gap-1.5">
                  {stockStatusCode === STOCK_STATUS.LOW_STOCK && (
                    <ClockFading className="size-4 stroke-muted-foreground group-has-checked/size:stroke-primary-foreground" />
                  )}
                  {label}
                </div>
              </FieldLabel>
            </Field>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="bg-background px-5 shadow [&>span:nth-child(2)>svg]:bg-background [&>span:nth-child(2)>svg]:fill-background"
        >
          <span className="text-center text-xs text-muted-foreground">
            {stockStatusCode === STOCK_STATUS.LOW_STOCK
              ? "Only a few left"
              : "Out of stock"}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const SizeOptionMobile = ({
  id,
  label,
  value,
  stockStatusCode,
}: SizeOptionProps) => {
  return (
    <Field>
      <FieldLabel
        htmlFor={id}
        className="px-5 pt-5 text-sm leading-normal font-normal uppercase not-has-disabled:active:bg-muted has-disabled:text-muted-foreground"
      >
        <RadioGroupItem
          id={id}
          className="sr-only"
          value={value}
          aria-label={`Select ${label}`}
          disabled={stockStatusCode === STOCK_STATUS.OUT_OF_STOCK}
        />
        <div className="flex w-full items-center justify-between gap-2 border-b pb-5">
          {label}
          <span className="text-center text-xs text-muted-foreground normal-case">
            {stockStatusCode === STOCK_STATUS.LOW_STOCK && "Only a few left!"}
          </span>
        </div>
      </FieldLabel>
    </Field>
  );
};

export { ProductList7 };
