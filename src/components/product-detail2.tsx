"use client";
/* eslint-disable @next/next/no-img-element */
import "photoswipe/style.css";

import { zodResolver } from "@hookform/resolvers/zod";
import type { LucideIcon } from "lucide-react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  Ruler,
  Shirt,
  Truck,
  ZoomIn,
} from "lucide-react";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ControllerRenderProps } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useGoogleFont } from "@/hooks/use-google-font";
import { cn } from "@/lib/utils";

type StockStatusCode = "IN_STOCK" | "OUT_OF_STOCK";

interface StockInfo {
  stockStatusCode?: StockStatusCode;
  stockQuantity?: number;
}

type option = {
  id: string;
  label: string;
  value: string;
  stockInfo: StockInfo;
};

interface Hinges {
  label: string;
  id: string;
  name: FieldName;
  options?: option[];
  min?: number;
  max?: number;
}

interface QuantityProps {
  field: ControllerRenderProps<FormType>;
  max?: number;
  min?: number;
  id?: string;
}

interface ProductFormProps {
  hinges?: Record<FieldName, Hinges>;
  selected: FormType;
}

interface RadioGroupProps {
  options?: Array<option>;
  field: ControllerRenderProps<FormType>;
}

interface PriceProps {
  regular: number;
  sale?: number;
  currency: string;
  text?: string;
}

interface ProductImagesProps {
  images: Array<{
    srcset: string;
    src: string;
    alt: string;
    width: number;
    height: number;
    sizes: string;
  }>;
  galleryID: string;
}

type FormType = z.infer<typeof formSchema>;
type FieldName = keyof FormType;

interface ProductInfoProps {
  info: {
    title: {
      icon: LucideIcon;
      text: string;
    };
    content: string;
  }[];
}

const PRODUCT_DETAILS = {
  name: "Maison Liora Bag",
  price: {
    regular: 420.0,
    sale: 399.0,
    currency: "USD",
  },
  color: "black",
  material: "leather",
  description:
    "Our sculptural, soft-structured handbag brings elegance and utility together in one refined piece. With a simple adjustment, it transforms from a shoulder bag to a top-handle or crossbody companion. The detachable strap allows you to carry it however the day demands-slung over your shoulder, held in hand, or worn across the body. Spacious enough to hold daily essentials like your phone, cardholder, keys, and a compact mirror. Crafted from premium pebbled leather and finished with brushed gold hardware. Secured with a magnetic flap closure, the interior includes a zip pocket and a slip compartment for added organization.",
  hinges: {
    color: {
      label: "Color",
      id: "color",
      name: "color",
      options: [
        {
          id: "green",
          value: "green",
          label: "Green",
          stockInfo: {
            stockStatusCode: "IN_STOCK",
          },
        },
        {
          id: "black",
          value: "black",
          label: "Black",
          stockInfo: {
            stockStatusCode: "IN_STOCK",
          },
        },
        {
          id: "white",
          value: "white",
          label: "White",
          stockInfo: {
            stockStatusCode: "OUT_OF_STOCK",
          },
        },
        {
          id: "red",
          value: "red",
          label: "Red",
          stockInfo: {
            stockStatusCode: "OUT_OF_STOCK",
          },
        },
      ],
    },
    material: {
      label: "Material",
      id: "material",
      name: "material",
      options: [
        {
          id: "leather",
          value: "leather",
          label: "Leather",
          stockInfo: {
            stockStatusCode: "IN_STOCK",
          },
        },
        {
          id: "polyester",
          value: "polyester",
          label: "Polyester",
          stockInfo: {
            stockStatusCode: "IN_STOCK",
          },
        },
        {
          id: "nylon",
          value: "nylon",
          label: "Nylon",
          stockInfo: {
            stockStatusCode: "IN_STOCK",
          },
        },
      ],
    },
    quantity: {
      label: "Quantity",
      id: "quantity",
      name: "quantity",
      min: 1,
      max: 99,
    },
  } as Record<FieldName, Hinges>,
  info: [
    {
      title: {
        icon: Shirt,
        text: "Composition",
      },
      content:
        "Made from premium pebbled leather with a structured silhouette. Fully lined in soft cotton twill. Accented with brushed gold-tone hardware. Includes two interior compartments and a zip pocket. Comes with an adjustable, removable strap for versatile carry.",
    },
    {
      title: {
        icon: Truck,
        text: "Delivery & Returns",
      },
      content:
        "Enjoy complimentary shipping and easy returns on all purchases. Orders within the U.S. typically ship within 5-7 business days.",
    },
    {
      title: {
        icon: Ruler,
        text: "Bag Dimensions",
      },
      content:
        'Height: 21 cm x Width: 28 cm (8.3" x 11") - comfortably fits daily essentials.',
    },
    {
      title: {
        icon: Heart,
        text: "Care Guide",
      },
      content:
        "Wipe gently with a clean, damp cloth. Avoid harsh cleaners and direct exposure to sunlight or moisture. Store in the provided dust bag when not in use.",
    },
  ],
  images: [
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Professional-Woman-&-Tote-2.png 800w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Professional-Woman-&-Tote-1.png 427w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Professional-Woman-&-Tote-2.png",
      alt: "",
      width: 800,
      height: 1200,
      sizes: "(min-width: 800px) 800px, 100vw",
    },
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Elegant-Professional-Look-2.png 800w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Elegant-Professional-Look-1.png 427w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Elegant-Professional-Look-2.png",
      alt: "",
      width: 800,
      height: 1200,
      sizes: "(min-width: 800px) 800px, 100vw",
    },
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Stylish-Woman-1-with-Tote-2.png 800w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Stylish-Woman-1-with-Tote-1.png 427w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Stylish-Woman-1-with-Tote-2.png",
      alt: "",
      width: 800,
      height: 1200,
      sizes: "(min-width: 800px) 800px, 100vw",
    },
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Minimalist-Fashion-Look-2.png 800w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Minimalist-Fashion-Look-1.png 427w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Minimalist-Fashion-Look-2.png",
      alt: "",
      width: 800,
      height: 1200,
      sizes: "(min-width: 800px) 800px, 100vw",
    },
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Woman-with-Leather-Tote-2.png 800w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Woman-with-Leather-Tote-1.png 800w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Woman-with-Leather-Tote-2.png",
      alt: "",
      width: 800,
      height: 1200,
      sizes: "(min-width: 800px) 800px, 100vw",
    },
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Woman-with-Tote-Bag-2.png 800w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Woman-with-Tote-Bag-2.png 800w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Woman-with-Tote-Bag-2.png",
      alt: "",
      width: 800,
      height: 1200,
      sizes: "(min-width: 800px) 800px, 100vw",
    },
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Stylish-Woman-in-Interior-2.png 800w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Stylish-Woman-in-Interior-1.png 800w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Stylish-Woman-in-Interior-2.png",
      alt: "",
      width: 800,
      height: 1200,
      sizes: "(min-width: 800px) 800px, 100vw",
    },
  ],
};

interface ProductDetail2Props {
  className?: string;
}

const ProductDetail2 = ({ className }: ProductDetail2Props) => {
  useGoogleFont("Assistant");
  return (
    <section
      className={cn("bg-background py-32 font-sans", className)}
      style={
        {
          "--font-sans": "Assistant",
        } as React.CSSProperties
      }
    >
      <div className="mx-auto w-full max-w-[75rem] px-4 md:px-12.5">
        <div className="relative flex flex-col gap-4 md:flex-row md:gap-10">
          <div className="basis-[65%]">
            <ProductImages
              images={PRODUCT_DETAILS.images}
              galleryID="gallery-2"
            />
          </div>
          <div className="basis-[35%]">
            <div className="sticky top-12 flex flex-col gap-5">
              <h1 className="text-3xl leading-tight md:text-[2.5rem]">
                {PRODUCT_DETAILS.name}
              </h1>
              <div className="flex items-center gap-2.5">
                <Price {...PRODUCT_DETAILS.price} />
              </div>
              <ProductForm
                hinges={PRODUCT_DETAILS.hinges}
                selected={{
                  color: PRODUCT_DETAILS.color,
                  material: PRODUCT_DETAILS.material,
                  quantity: 1,
                }}
              />
              <p className="text-base leading-loose text-muted-foreground">
                {PRODUCT_DETAILS.description}
              </p>
              <ProductInfo info={PRODUCT_DETAILS.info} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ProductImages = ({ images, galleryID }: ProductImagesProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(1);
  const lightboxRef = useRef<PhotoSwipeLightbox | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    const lightbox = new PhotoSwipeLightbox({
      gallery: "#" + galleryID,
      children: "a",
      bgOpacity: 1,
      wheelToZoom: true,
      arrowPrev: false,
      arrowNext: false,
      close: false,
      zoom: false,
      counter: false,
      mainClass: "[&>div:first-child]:!bg-background",
      pswpModule: () => import("photoswipe"),
    });
    lightbox.init();
    lightboxRef.current = lightbox;
    const buttonClassName = cn(
      buttonVariants({
        variant: "outline",
        size: "icon",
        className: "rounded-full",
      }),
    );
    const indicatorClassName = cn(badgeVariants({ variant: "secondary" }));

    lightbox.on("uiRegister", () => {
      if (lightbox?.pswp?.ui) {
        lightbox.pswp.ui.registerElement({
          name: "custom-close-btn",
          order: 10,
          isButton: false,
          appendTo: "root",
          className: "absolute top-5 right-5",
          html: `
            <button type="button" id="pswp-close" class="${buttonClassName}">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
          `,
          onInit: (el, pswp) => {
            el.querySelector("#pswp-close")?.addEventListener("click", () =>
              pswp.close(),
            );
          },
        });
      }

      if (lightbox?.pswp?.ui) {
        lightbox.pswp.ui.registerElement({
          name: "custom-indicator-btn",
          order: 10,
          isButton: false,
          appendTo: "root",
          className: "absolute top-5 left-5",
          html: `
            <div id="pswp-indicator" class="${indicatorClassName} h-8.5 px-4 !rounded-full">
            </div>
          `,
          onInit: (el, pswp) => {
            const indicatorElem = el.querySelector("#pswp-indicator");
            let prevIndex = -1;

            pswp.on("change", () => {
              prevIndex = pswp.currIndex;
              if (indicatorElem) {
                indicatorElem.innerHTML = `${prevIndex + 1} / ${pswp.getNumItems()}`;
              }
            });
          },
        });
      }

      if (lightbox?.pswp?.ui) {
        lightbox.pswp.ui.registerElement({
          name: "custom-next-prev-btns",
          order: 10,
          isButton: false,
          appendTo: "root",
          className: "absolute top-1/2 inset-x-0 -translate-y-1/2",
          html: `
          <div class="flex items-center justify-between px-4">
            <button id="pswp-prev" class="${buttonClassName}">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button id="pswp-next" class="${buttonClassName}">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
            
          `,
          onInit: (el, pswp) => {
            el.querySelector("#pswp-prev")?.addEventListener("click", () =>
              pswp.prev(),
            );
            el.querySelector("#pswp-next")?.addEventListener("click", () =>
              pswp.next(),
            );
          },
        });
      }
    });

    return () => lightbox.destroy();
  }, [galleryID]);

  const onSelect = useCallback((api: CarouselApi) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
    setCurrent(api.selectedScrollSnap() + 1);
  }, []);

  useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);

    return () => {
      api?.off("select", onSelect);
    };
  }, [api, onSelect]);

  useEffect(() => {
    if (lightboxRef.current && api) {
      lightboxRef.current.on("change", () => {
        api?.scrollTo(lightboxRef.current?.pswp?.currIndex || 0);
      });
    }
  }, [api, current]);

  if (!images) return;

  return (
    <div className="flex flex-col gap-3" id={galleryID}>
      <Carousel
        setApi={setApi}
        opts={{
          breakpoints: {
            "(min-width: 768px)": {
              active: false,
            },
          },
        }}
      >
        <CarouselContent className="gap-2 md:m-0 md:grid md:grid-cols-2">
          {images.map((img, index) => (
            <CarouselItem
              className="first:col-span-2 md:p-0"
              key={`product-detail-2-image-${index}`}
            >
              <AspectRatio ratio={1} className="overflow-hidden">
                <a
                  href={img.src}
                  data-pswp-width={img.width}
                  data-pswp-height={img.height}
                  target="_blank"
                  rel="noreferrer"
                  data-cropped="true"
                  className="hover:cursor-zoom-in"
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="block size-full object-cover object-center"
                  />
                  <Badge
                    className="pointer-events-none absolute top-3 left-3 size-8 rounded-full bg-background p-1.5 text-xs shadow md:hidden"
                    variant="secondary"
                  >
                    <ZoomIn className="!size-3.5 stroke-muted-foreground" />
                  </Badge>
                </a>
              </AspectRatio>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="flex items-center justify-center gap-2.5 md:hidden">
        <Button
          disabled={!canScrollPrev}
          size="icon"
          variant="ghost"
          onClick={() => api?.scrollPrev()}
        >
          <ChevronLeft className="size-3 stroke-1" />
        </Button>
        <p className="text-xs text-muted-foreground">
          {current}/{images.length}
        </p>
        <Button
          disabled={!canScrollNext}
          size="icon"
          variant="ghost"
          onClick={() => api?.scrollNext()}
        >
          <ChevronRight className="size-3 stroke-1" />
        </Button>
      </div>
    </div>
  );
};

const Price = ({ regular, sale, currency }: PriceProps) => {
  if (!regular || !currency) return;

  const formatCurrency = (
    value: number,
    currency: string = "USD",
    locale: string = "en-US",
  ) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(value);
  };

  return (
    <div className="flex items-start gap-2">
      {sale && (
        <div
          data-sale={!!sale}
          aria-label="sale price"
          className="text-2xl leading-tight text-primary"
        >
          {formatCurrency(sale, currency)}
        </div>
      )}
      <div
        data-sale={!!sale}
        aria-label="regular price"
        className="text-2xl leading-tight data-[sale=true]:text-xl data-[sale=true]:text-muted-foreground data-[sale=true]:line-through"
      >
        {formatCurrency(regular, currency)}
      </div>
    </div>
  );
};

const formSchema = z.object({
  color: z.string(),
  quantity: z.number().min(1),
  material: z.string(),
});

const ProductForm = ({ hinges, selected }: ProductFormProps) => {
  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: selected.quantity,
      color: selected.color,
      material: selected.material,
    },
  });

  function onSubmit() {
    form.reset();
  }

  const colorHinges = hinges?.color;
  const materialHinges = hinges?.material;
  const quantityHinges = hinges?.quantity;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      {colorHinges && (
        <Controller
          control={form.control}
          name={colorHinges.name}
          render={({ field }) => (
            <Field>
              <FieldLabel
                asChild
                className="text-sm leading-normal text-muted-foreground"
              >
                <h2>{colorHinges.label}</h2>
              </FieldLabel>
              <ColorRadioGroup field={field} options={colorHinges.options} />
            </Field>
          )}
        />
      )}

      {materialHinges && (
        <Controller
          control={form.control}
          name={materialHinges.name}
          render={({ field }) => (
            <Field>
              <FieldLabel
                asChild
                className="text-sm leading-normal text-muted-foreground"
              >
                <h2>{materialHinges.label}</h2>
              </FieldLabel>
              <MaterialRadioGroup
                field={field}
                options={materialHinges.options}
              />
            </Field>
          )}
        />
      )}

      {quantityHinges && (
        <Controller
          control={form.control}
          name={quantityHinges.name}
          render={({ field }) => (
            <Field>
              <FieldLabel
                htmlFor={quantityHinges.id}
                className="text-sm leading-normal text-muted-foreground"
              >
                {quantityHinges.label}
              </FieldLabel>
              <Quantity
                field={field}
                min={quantityHinges.min}
                max={quantityHinges.max}
                id={quantityHinges.id}
              />
            </Field>
          )}
        />
      )}

      <div className="flex flex-col gap-2.5">
        <Button size="lg" variant="outline">
          Add to cart
        </Button>
        <Button size="lg">Purchase</Button>
      </div>
    </form>
  );
};

const Quantity = ({ field, max, min, id }: QuantityProps) => {
  return (
    <div className="flex h-9 w-31 items-center justify-between overflow-hidden rounded-md border shadow-xs">
      <Button
        onClick={() =>
          field.onChange(Math.max(min || 1, Number(field.value || 1) - 1))
        }
        variant="ghost"
        type="button"
        size="icon"
        className="shrink-0 rounded-none"
      >
        <Minus className="stroke-muted-foreground" />
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
        id={id}
        min={Math.max(min ?? 1, 1)}
        max={max ?? 99}
        className="h-full w-full flex-1 [appearance:textfield] rounded-none border-0 !bg-background px-1 text-center shadow-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
        <Plus className="stroke-muted-foreground" />
      </Button>
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
      className="flex w-full flex-wrap items-start gap-4"
    >
      {options.map((item, index) => (
        <div className="basis-20" key={`product-detail-2-size-input-${index}`}>
          <label
            htmlFor={item.id}
            className="flex h-8 items-center justify-center rounded-md border-1 border-primary px-3 text-sm leading-snug font-normal has-checked:bg-primary has-checked:text-primary-foreground has-data-[disabled=true]:border-border has-data-[disabled=true]:text-muted-foreground has-data-[disabled=true]:line-through"
          >
            <RadioGroupItem
              id={item.id}
              className="sr-only"
              value={item.value}
              aria-label={`Select ${item.label}`}
              data-disabled={item.stockInfo.stockStatusCode === "OUT_OF_STOCK"}
            />
            <span>{item.label}</span>
          </label>
        </div>
      ))}
    </RadioGroup>
  );
};

const MaterialRadioGroup = ({ options, field }: RadioGroupProps) => {
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
      className="flex w-full flex-wrap items-start gap-4"
    >
      {options.map((item, index) => (
        <div key={`product-detail-2-material-input-${index}`}>
          <label
            htmlFor={item.id}
            className="flex h-8 items-center justify-center rounded-md border-1 border-primary px-3 text-sm leading-snug font-normal has-checked:bg-primary has-checked:text-primary-foreground has-data-[disabled=true]:border-border has-data-[disabled=true]:text-muted-foreground has-data-[disabled=true]:line-through"
          >
            <RadioGroupItem
              id={item.id}
              className="sr-only"
              value={item.value}
              data-disabled={item.stockInfo.stockStatusCode === "OUT_OF_STOCK"}
            />
            <span>{item.label}</span>
          </label>
        </div>
      ))}
    </RadioGroup>
  );
};

const ProductInfo = ({ info }: ProductInfoProps) => {
  if (!info) return;
  return (
    <Accordion type="multiple" className="w-full">
      {info.map((item, index) => (
        <AccordionItem
          key={`product-detail-2-info-${index}`}
          value={`item-${index}`}
        >
          <AccordionTrigger>
            <div className="text-base">{item.title.text}</div>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 text-balance">
            <p className="text-base leading-loose text-muted-foreground">
              {item.content}
            </p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export { ProductDetail2 };
