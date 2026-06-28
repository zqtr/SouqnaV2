"use client";
/* eslint-disable @next/next/no-img-element */
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import type { ControllerRenderProps, UseFormReturn } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

import { Price, PriceValue } from "@/components/price";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CarouselApi } from "@/components/ui/carousel";
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

interface ListCarouselProps {
  productsList: Array<ProductCard>;
}

type Image = {
  src: string;
  alt: string;
};

type Option = {
  id: string;
  label: string;
  color: string;
  value: string;
  image: Image;
};

interface Product {
  name: string;
  collection: {
    label: string;
    link: string;
  };
  variantId: string;
  image: {
    src: string;
    alt: string;
  };
  link: string;
  price: ProductPrice;
  quickAdd?: boolean;
  variants?: {
    name: FieldName;
    options: Array<Option>;
  };
  stockStatusCode: StockStatusCode;
}

type ProductCard = Product;

type ProductCardProps = ProductCard;

interface ProductPrice {
  regular: number;
  sale?: number;
  currency: string;
}

type FieldName = keyof FormType;

type FormType = z.infer<typeof formSchema>;

interface ProductFormProps {
  colorHinges?: {
    name: FieldName;
    options: Omit<Option, "image">[];
  };
  form: UseFormReturn<FormType>;
}

interface RadioGroupProps {
  options?: Omit<Option, "image">[];
  field: ControllerRenderProps<FormType>;
}

type ColorOptionProps = Omit<Option, "image">;

type ProductList = Array<Product>;

const PRODUCTS_LIST: ProductList = [
  {
    collection: {
      label: "Spring Hues",
      link: "/template-showcase/products",
    },
    name: "Mint Guard Case",
    variantId: "mint_guard",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung--uF6u5Cmnsw-unsplash-3.jpg",
      alt: "",
    },
    price: {
      regular: 59.0,
      currency: "USD",
    },
    quickAdd: true,
    stockStatusCode: "OUT_OF_STOCK",
  },
  {
    collection: {
      label: "Abstract Hues",
      link: "/template-showcase/products",
    },
    name: "Midnight Streak Case",
    variantId: "midnight_black-1",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-CubSQS4iYEE-unsplash-3.jpg",
      alt: "",
    },
    price: {
      regular: 59.0,
      sale: 49.0,
      currency: "USD",
    },
    variants: {
      name: "color",
      options: [
        {
          id: "midnight_black-1",
          label: "Midnight Black",
          color: "#0B0B0B",
          value: "midnight_black",
          image: {
            src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-CubSQS4iYEE-unsplash-3.jpg",
            alt: "",
          },
        },
        {
          id: "royal_indigo-1",
          label: "Royal Indigo",
          color: "#3B0A45",
          value: "royal_indigo",
          image: {
            src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-wyEh0ZnwUFM-unsplash-3.jpg",
            alt: "",
          },
        },
        {
          id: "vibrant_tangerine-1",
          label: "Vibrant Tangerine",
          color: "#FF6400",
          value: "vibrant_tangerine",
          image: {
            src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-kfv-hU9ZVkk-unsplash-3.jpg",
            alt: "",
          },
        },
      ],
    },
    quickAdd: true,
    stockStatusCode: "IN_STOCK",
  },
  {
    collection: {
      label: "Shades of Serenity",
      link: "/template-showcase/products",
    },
    name: "Amethyst Glow Case",
    variantId: "pastel_lavender",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-EVL1nwmdg_g-unsplash-3.jpg",
      alt: "",
    },
    price: {
      regular: 59.0,
      currency: "USD",
    },
    variants: {
      name: "color",
      options: [
        {
          id: "pastel_charcoal-1",
          label: "Charcoal Gray",
          color: "#4A4A4A",
          value: "pastel_charcoal",
          image: {
            src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-h_t-VwFFLAY-unsplash-3.jpg",
            alt: "",
          },
        },
        {
          id: "pastel_lavender-1",
          label: "Lavender",
          color: "#CBA4DB",
          value: "pastel_lavender",
          image: {
            src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-EVL1nwmdg_g-unsplash-3.jpg",
            alt: "",
          },
        },
        {
          id: "pastel_peach-1",
          label: "Peach",
          color: "#FFDAB9",
          value: "pastel_peach",
          image: {
            src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-f-scc2htKNQ-unsplash-3.jpg",
            alt: "",
          },
        },
      ],
    },
    quickAdd: true,
    stockStatusCode: "IN_STOCK",
  },
  {
    collection: {
      label: "Art in Motion",
      link: "/template-showcase/products",
    },
    name: "Color Rush Case",
    variantId: "color_rush",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-f-scc2htKNQ-unsplash-3.jpg",
      alt: "",
    },
    price: {
      regular: 59.0,
      currency: "USD",
    },
    quickAdd: true,
    stockStatusCode: "IN_STOCK",
  },
  {
    collection: {
      label: "Highland Horizons",
      link: "/template-showcase/products",
    },
    name: "Monochrome Peaks Case",
    variantId: "monochrome_peaks",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-fCO3tBcnkhg-unsplash-3.jpg",
      alt: "",
    },
    price: {
      regular: 59.0,
      currency: "USD",
    },
    quickAdd: true,
    stockStatusCode: "IN_STOCK",
  },
  {
    collection: {
      label: "Retro Remix",
      link: "/template-showcase/products",
    },
    name: "Twist & Grid Case",
    variantId: "twist_&_grid",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-h_t-VwFFLAY-unsplash-3.jpg",
      alt: "",
    },
    price: {
      regular: 59.0,
      currency: "USD",
    },
    quickAdd: true,
    stockStatusCode: "IN_STOCK",
  },
  {
    collection: {
      label: "Bold Statements",
      link: "/template-showcase/products",
    },
    name: "Citrus Words Case",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-kfv-hU9ZVkk-unsplash-3.jpg",
      alt: "",
    },
    price: {
      regular: 59.0,
      currency: "USD",
    },
    variants: {
      name: "color",
      options: [
        {
          id: "midnight_black-2",
          label: "Midnight Black",
          color: "#0B0B0B",
          value: "midnight_black",
          image: {
            src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-OXW7AuNsKVI-unsplash-3.jpg",
            alt: "",
          },
        },
        {
          id: "royal_indigo-2",
          label: "Royal Indigo",
          color: "#3B0A45",
          value: "royal_indigo",
          image: {
            src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-wyEh0ZnwUFM-unsplash-3.jpg",
            alt: "",
          },
        },
        {
          id: "vibrant_tangerine-2",
          label: "Vibrant Tangerine",
          color: "#FF6400",
          value: "vibrant_tangerine",
          image: {
            src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-kfv-hU9ZVkk-unsplash-3.jpg",
            alt: "",
          },
        },
      ],
    },
    variantId: "vibrant_tangerine-2",
    quickAdd: true,
    stockStatusCode: "IN_STOCK",
  },
  {
    collection: {
      label: "Above the Horizon",
      link: "/template-showcase/products",
    },
    name: "Sky Drift Case",
    variantId: "sky_drift",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-mAUQI0qnKGw-unsplash-3.jpg",
      alt: "",
    },
    price: {
      regular: 59.0,
      currency: "USD",
    },
    quickAdd: true,
    stockStatusCode: "IN_STOCK",
  },
  {
    collection: {
      label: "Celestial Series",
      link: "/template-showcase/products",
    },
    name: "Midnight Veil Case",
    variantId: "midnight_veil",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-OXW7AuNsKVI-unsplash-3.jpg",
      alt: "",
    },
    price: {
      regular: 59.0,
      currency: "USD",
    },
    quickAdd: true,
    stockStatusCode: "IN_STOCK",
  },
  {
    collection: {
      label: "Coastal Dreams",
      link: "/template-showcase/products",
    },
    name: "Tide Whisper Case",
    variantId: "tide_whisper",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/jascent-leung-wyEh0ZnwUFM-unsplash-3.jpg",
      alt: "",
    },
    price: {
      regular: 59.0,
      currency: "USD",
    },

    quickAdd: true,
    stockStatusCode: "IN_STOCK",
  },
];

interface ProductList6Props {
  className?: string;
}

const ProductList6 = ({ className }: ProductList6Props) => {
  return (
    <section className={cn("py-32", className)}>
      <div className="container">
        <ListCarousel productsList={PRODUCTS_LIST} />
      </div>
    </section>
  );
};

const ListCarousel = ({ productsList }: ListCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = (api: CarouselApi) => {
      if (!api) return;
      setCurrent(api.selectedScrollSnap() + 1);
    };
    onSelect(api);
    api.on("select", onSelect);

    return () => {
      api?.off("select", onSelect);
    };
  }, [api]);

  if (!productsList) return;

  return (
    <Carousel
      opts={{
        align: "start",
      }}
      setApi={setApi}
    >
      <div className="flex items-center justify-between pb-6">
        <div className="flex flex-wrap items-end gap-2">
          <h2 className="text-lg leading-tight font-black uppercase xl:text-xl">
            Most Popular
          </h2>
          <p className="text-sm font-medium text-muted-foreground xl:text-base">
            Discounts Up to 30%
          </p>
        </div>
        <div className="hidden items-center gap-2 xl:flex">
          <CarouselPrevious className="static translate-0" />
          <CarouselNext className="static translate-0" />
        </div>
      </div>
      <CarouselContent>
        {productsList.map((product, index) => (
          <CarouselItem
            key={`product-list-6-item-${index}`}
            className="sm:basis-1/2 xl:basis-1/4"
          >
            <ProductCard {...product} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="flex items-center justify-center pt-5 xl:hidden">
        {productsList.map((_, index) => (
          <button
            onClick={() => api?.scrollTo(index)}
            data-active={current === index + 1}
            className="flex size-6 after:m-auto after:h-1 after:w-5 after:bg-muted-foreground/50 after:transition-colors data-[active=true]:after:bg-primary sm:last:hidden"
            key={`product-list-6-pagination-bullets-${index}`}
          ></button>
        ))}
      </div>
    </Carousel>
  );
};

const formSchema = z.object({
  color: z.string(),
});

const ProductCard = ({
  name,
  image,
  stockStatusCode,
  price,
  link,
  collection,
  quickAdd,
  variants,
  variantId,
}: ProductCardProps) => {
  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      color: variantId,
    },
  });
  const selectedVariant = form.watch("color");
  const currentVariantImage =
    variants?.options.find((item) => item.value === selectedVariant)?.image ||
    image;

  const { regular, sale, currency } = price;

  function onSubmit() {
    form.reset();
  }

  return (
    <Card className="group gap-2 rounded-none border-none bg-background p-0 shadow-none">
      <CardHeader className="gap-0 p-0">
        <AspectRatio ratio={0.76984127} className="overflow-hidden">
          <a href={link} className="block size-full">
            {currentVariantImage && (
              <img
                src={currentVariantImage?.src}
                alt={currentVariantImage?.alt}
                className="block size-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
              />
            )}
          </a>
          {quickAdd && stockStatusCode === STOCK_STATUS.IN_STOCK && (
            <div className="absolute inset-x-5 bottom-5 transition-opacity duration-400 group-hover:opacity-100 xl:opacity-0">
              <Button
                onClick={() => {
                  form.trigger().then((valid) => {
                    if (valid) {
                      form.handleSubmit(onSubmit)();
                    }
                  });
                }}
                className="w-full"
              >
                Quick Add
              </Button>
            </div>
          )}
        </AspectRatio>
      </CardHeader>
      <CardContent className="p-0">
        {(stockStatusCode || price?.sale) && (
          <div className="text-sm">
            {stockStatusCode === STOCK_STATUS.OUT_OF_STOCK ? (
              <span className="text-muted-foreground">Sold out</span>
            ) : (
              price.sale && <span className="text-destructive">Sale</span>
            )}
          </div>
        )}
        <div
          className={`pt-0.5 ${stockStatusCode === STOCK_STATUS.IN_STOCK && !price?.sale && "mt-5"}`}
        >
          <a className="text-sm font-bold" href={collection.link}>
            {collection.label}
          </a>
          <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
            <CardTitle className="text-sm font-normal">{name}</CardTitle>
            <div className="transition-opacity duration-400 group-hover:opacity-100 xl:opacity-0">
              <ProductForm colorHinges={variants} form={form} />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="relative mt-1 flex-col items-start gap-3 p-0 xl:flex-row">
        <div className="transition-opacity duration-400 xl:group-hover:opacity-0">
          <Price onSale={sale != null} className="text-sm font-medium">
            <PriceValue price={sale} currency={currency} variant="sale" />
            <PriceValue price={regular} currency={currency} variant="regular" />
          </Price>
        </div>
        <div className="absolute flex items-center gap-3 bg-background opacity-0 transition-opacity duration-400 group-hover:opacity-100">
          <Button variant="link" className="h-fit p-0 underline">
            Shop Now
          </Button>
          <Button
            variant="link"
            className="h-fit p-0 text-muted-foreground underline"
          >
            Quick View
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

const ProductForm = ({ colorHinges, form }: ProductFormProps) => {
  if (!colorHinges) return;

  return (
    <form>
      <Controller
        control={form.control}
        name={colorHinges.name}
        render={({ field }) => (
          <Field>
            <ColorRadioGroup field={field} options={colorHinges.options} />
          </Field>
        )}
      />
    </form>
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
      className="flex gap-0"
    >
      {options &&
        options.map((item, index) => (
          <Field key={`product-list-6-color-input-${index}`}>
            <ColorOption
              label={item.label}
              id={item.id}
              color={item.color}
              value={item.value}
            />
          </Field>
        ))}
    </RadioGroup>
  );
};

const ColorOption = ({ id, value, color, label }: ColorOptionProps) => {
  return (
    <FieldLabel
      htmlFor={id}
      aria-label={label}
      className="relative flex size-5 cursor-pointer after:pointer-events-none after:absolute after:inset-1/2 after:size-1 after:-translate-1/2 after:rounded-full after:bg-white after:opacity-0 after:transition-opacity has-checked:after:opacity-100"
    >
      <RadioGroupItem id={id} className="sr-only" value={value} />
      <div
        style={{
          backgroundColor: color,
        }}
        className="m-auto size-2.5 rounded-full"
      ></div>
    </FieldLabel>
  );
};

export { ProductList6 };
