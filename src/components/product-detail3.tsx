"use client";
/* eslint-disable @next/next/no-img-element */
import "photoswipe/style.css";

import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus } from "lucide-react";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ControllerRenderProps } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { badgeVariants } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

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

interface PriceProps {
  regular: number;
  currency: string;
}

type option = {
  id: string;
  label: string;
  value: string;
  color?: string;
};

interface Hinges {
  label: string;
  id: string;
  name: FieldName;
  options?: option[];
  min?: number;
  max?: number;
}

interface ProductFormProps {
  hinges?: Record<FieldName, Hinges>;
  selected?: FormType;
}

type FormType = z.infer<typeof formSchema>;
type FieldName = keyof FormType;

interface RadioGroupProps {
  options?: Array<option>;
  id: string;
  field: ControllerRenderProps<FormType>;
}

interface QuantityProps {
  field: ControllerRenderProps<FormType>;
  max?: number;
  min?: number;
}

const PRODUCT_DETAILS = {
  name: "1011 Urban Chill Jacket",
  price: {
    regular: 499.0,
    currency: "USD",
  },
  color: "blue",
  size: "xs",
  description:
    "This denim puffer jacket blends warmth and street style, featuring tonal blue shades for a distinctive look that's both bold and versatile. Designed for comfort in any season.",
  hinges: {
    quantity: {
      label: "Quantity",
      id: "quantity",
      name: "quantity",
      min: 1,
      max: 99,
    },
    size: {
      label: "Size",
      id: "size",
      name: "size",
      options: [
        {
          id: "xs",
          label: "xs",
          value: "xs",
        },
        {
          id: "s",
          label: "s",
          value: "s",
        },
        {
          id: "m",
          label: "m",
          value: "m",
        },
        {
          id: "l",
          label: "l",
          value: "l",
        },
        {
          id: "xl",
          label: "xl",
          value: "xl",
        },
      ],
    },
    color: {
      label: "Color",
      id: "color",
      name: "color",
      options: [
        {
          id: "blue",
          value: "blue",
          label: "Blue",
          color: "#0000FF",
        },
        {
          id: "black",
          value: "black",
          label: "Black",
          color: "#000000",
        },
        {
          id: "red",
          value: "red",
          label: "Red",
          color: "#FF0000",
        },
      ],
    },
  } as Record<FieldName, Hinges>,
  images: [
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-cottonbro-6764033-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-cottonbro-6764033-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-cottonbro-6764033-1.jpg 640w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-cottonbro-6764033-3.jpg",
      alt: "",
      width: 1920,
      height: 2880,
      sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
    },
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-cottonbro-6764699-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-cottonbro-6764699-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-cottonbro-6764699-2.jpg 640w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-cottonbro-6764699-3.jpg",
      alt: "",
      width: 1920,
      height: 2880,
      sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
    },
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-cottonbro-6764036-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-cottonbro-6764036-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-cottonbro-6764036-1.jpg 640w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-cottonbro-6764036-3.jpg",
      alt: "",
      width: 1920,
      height: 2880,
      sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
    },
  ],
};

interface ProductDetail3Props {
  className?: string;
}

const ProductDetail3 = ({ className }: ProductDetail3Props) => {
  return (
    <section className={cn("py-32", className)}>
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,26.5rem)]">
          <div>
            <ProductImages
              images={PRODUCT_DETAILS.images}
              galleryID="gallery-3"
            />
          </div>
          <div>
            <div className="sticky top-0 p-6 lg:p-12">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <h1 className="text-3xl leading-tight font-bold uppercase">
                    {PRODUCT_DETAILS.name}
                  </h1>
                  <Price {...PRODUCT_DETAILS.price} />
                </div>
                <ProductForm
                  hinges={PRODUCT_DETAILS.hinges}
                  selected={{
                    color: PRODUCT_DETAILS.color,
                    size: PRODUCT_DETAILS.size,
                    quantity: 1,
                  }}
                />
                <p className="text-sm leading-normal text-muted-foreground">
                  {PRODUCT_DETAILS.description}
                </p>
              </div>
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
    <div id={galleryID} className="flex flex-col gap-5">
      <Carousel
        setApi={setApi}
        opts={{
          breakpoints: {
            "(min-width: 768px)": {
              active: false,
            },
          },
        }}
        className="w-full"
      >
        <CarouselContent className="ml-0 grid-cols-2 md:grid">
          {images.map((img, index) => (
            <CarouselItem
              className="pl-0 md:first:col-span-2"
              key={`product-detail-3-image-${index}`}
            >
              <AspectRatio ratio={0.8} className="overflow-hidden">
                <a
                  href={img.src}
                  data-pswp-width={img.width}
                  data-pswp-height={img.height}
                  data-pswp-srcset={img.srcset}
                  target="_blank"
                  rel="noreferrer"
                  data-cropped="true"
                >
                  <img
                    srcSet={img.srcset}
                    alt={img.alt}
                    sizes={img.sizes}
                    className="block size-full object-cover object-center"
                  />
                </a>
              </AspectRatio>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 md:hidden">
          <ol className="my-3 flex items-center justify-center">
            {images.map((_, index) => (
              <button
                onClick={() => api?.scrollTo(index)}
                data-current={index + 1 === current}
                key={`product-detail-3-image-indicator-${index}`}
                className="flex size-4 data-[current=true]:[&>span]:bg-primary"
              >
                <span className="m-auto block size-2 rounded-full bg-primary/50"></span>
              </button>
            ))}
          </ol>
        </div>
      </Carousel>
    </div>
  );
};

const Price = ({ regular, currency }: PriceProps) => {
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
    <div aria-label="regular price" className="text-sm leading-normal">
      {formatCurrency(regular, currency)}
    </div>
  );
};

const formSchema = z.object({
  color: z.string(),
  quantity: z.number().min(1),
  size: z.string(),
});

const ProductForm = ({ hinges, selected }: ProductFormProps) => {
  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      size: selected?.size,
      color: selected?.color,
    },
  });

  function onSubmit() {
    form.reset();
  }

  const quantityHinges = hinges?.quantity;
  const sizeHinges = hinges?.size;
  const colorHinges = hinges?.color;

  const currentColorId = form.watch("color");
  const currentColor = useMemo(
    () =>
      colorHinges?.options?.find((item) => item.value === currentColorId)
        ?.label ?? "",
    [currentColorId, colorHinges],
  );

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
            <Field className="gap-2">
              <FieldLabel
                className="text-sm leading-normal font-normal"
                asChild
              >
                <p>
                  {colorHinges.label}: {currentColor}
                </p>
              </FieldLabel>
              <ColorRadioGroup
                field={field}
                options={colorHinges.options}
                id={colorHinges.id}
              />
            </Field>
          )}
        />
      )}
      {sizeHinges && (
        <Controller
          control={form.control}
          name={sizeHinges.name}
          render={({ field }) => (
            <Field className="gap-2">
              <FieldLabel
                className="text-sm leading-normal font-normal"
                asChild
              >
                <p>{sizeHinges.label}</p>
              </FieldLabel>
              <SizeRadioGroup
                field={field}
                options={sizeHinges.options}
                id={sizeHinges.id}
              />
            </Field>
          )}
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        {quantityHinges && (
          <Controller
            control={form.control}
            name={quantityHinges.name}
            render={({ field }) => (
              <Field>
                <Quantity
                  field={field}
                  min={quantityHinges?.min}
                  max={quantityHinges?.max}
                />
              </Field>
            )}
          />
        )}
        <Button className="flex-1" variant="secondary">
          Add to cart
        </Button>
        <Button className="flex-1">Buy it now</Button>
      </div>
    </form>
  );
};

const ColorRadioGroup = ({ options, id, field }: RadioGroupProps) => {
  if (!options) return;

  return (
    <RadioGroup
      {...field}
      value={`${field.value}`}
      id={id}
      onValueChange={(value) => {
        if (value != field.value && value) {
          field.onChange(value);
        }
      }}
      className="flex w-full flex-wrap items-center gap-2 !shadow-none"
    >
      {options.map((item, index) => (
        <div key={`product-detail-3-color-input-${index}`}>
          <label
            htmlFor={item.id}
            className="flex size-5.5 cursor-pointer items-center justify-center overflow-hidden ring-primary duration-400 has-checked:ring"
          >
            <RadioGroupItem
              id={item.id}
              className="sr-only"
              value={item.value}
              aria-label={`Select ${item.label}`}
            />
            <div
              style={{
                backgroundColor: item.color,
              }}
              className="size-4.5"
            ></div>
          </label>
        </div>
      ))}
    </RadioGroup>
  );
};

const SizeRadioGroup = ({ options, id, field }: RadioGroupProps) => {
  if (!options) return;

  return (
    <RadioGroup
      {...field}
      value={`${field.value}`}
      id={id}
      onValueChange={(value) => {
        if (value != field.value && value) {
          field.onChange(value);
        }
      }}
      className="flex w-full flex-wrap items-center gap-2"
    >
      {options.map((item, index) => (
        <div key={`product-detail-3-size-input-${index}`}>
          <label
            htmlFor={item.id}
            className="flex h-9 min-w-28 cursor-pointer items-center justify-center overflow-hidden rounded-md border px-3 py-1 text-sm uppercase shadow-xs duration-400 has-checked:bg-primary has-checked:text-primary-foreground lg:min-w-40"
          >
            <RadioGroupItem
              id={item.id}
              className="sr-only"
              value={item.value}
              aria-label={`Select ${item.label}`}
            />
            <div className="text-center">{item.label}</div>
          </label>
        </div>
      ))}
    </RadioGroup>
  );
};

const Quantity = ({ field, max, min }: QuantityProps) => {
  return (
    <div className="flex h-9 w-full max-w-40 min-w-28 items-center justify-between overflow-hidden rounded-md border shadow-xs">
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
        className="h-full w-full flex-1 [appearance:textfield] rounded-none border-0 px-1 text-center shadow-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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

export { ProductDetail3 };
