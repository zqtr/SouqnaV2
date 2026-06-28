"use client";
/* eslint-disable @next/next/no-img-element */

import "photoswipe/style.css";

import { zodResolver } from "@hookform/resolvers/zod";
import { Star, StarHalf } from "lucide-react";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { badgeVariants } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Field, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

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

interface ProductImagesProps {
  images: Array<{
    srcset: string;
    src: string;
    alt: string;
    width: number;
    height: number;
    sizes: string;
    thumbnail: string;
  }>;
  galleryID: string;
}

interface PriceProps {
  regular: number;
  currency: string;
}

interface ReviewsProps {
  rate: number;
}

interface ProductFormProps {
  hinges?: Record<FieldName, Hinges>;
  selected: FormType;
  children?: ReactNode;
}

interface RadioGroupProps {
  options?: Array<option>;
  field: ControllerRenderProps<FormType>;
}

type FormType = z.infer<typeof formSchema>;
type FieldName = keyof FormType;

interface ProductInfoProps {
  info: {
    title: string;
    content: string;
  }[];
}

const MAX_STARS = 5;

const PRODUCT_DETAILS = {
  name: "Maison Liora Bag",
  price: {
    regular: 420.0,
    currency: "USD",
  },
  color: "rosewood",
  reviews: {
    rate: 3.5,
  },
  description:
    "Our sculptural, soft-structured handbag brings elegance and utility together in one refined piece. With a simple adjustment, it transforms from a shoulder bag to a top-handle or crossbody companion. The detachable strap allows you to carry it however the day demands-slung over your shoulder, held in hand, or worn across the body. Spacious enough to hold daily essentials like your phone, cardholder, keys, and a compact mirror. Crafted from premium pebbled leather and finished with brushed gold hardware. Secured with a magnetic flap closure, the interior includes a zip pocket and a slip compartment for added organization.",
  hinges: {
    color: {
      label: "Color",
      id: "color",
      name: "color",
      options: [
        {
          id: "charcoal",
          value: "charcoal",
          label: "Charcoal",
          color: "#333333",
        },
        {
          id: "sage",
          value: "sage",
          label: "Sage Green",
          color: "#B2C3B2",
        },
        {
          id: "rosewood",
          value: "rosewood",
          label: "Muted Rose",
          color: "#B76E79",
        },
      ],
    },
  } as Record<FieldName, Hinges>,
  info: [
    {
      title: "Composition",
      content:
        "Made from premium pebbled leather with a structured silhouette. Fully lined in soft cotton twill. Accented with brushed gold-tone hardware. Includes two interior compartments and a zip pocket. Comes with an adjustable, removable strap for versatile carry.",
    },
    {
      title: "Delivery & Returns",
      content:
        "Enjoy complimentary shipping and easy returns on all purchases. Orders within the U.S. typically ship within 5-7 business days.",
    },
    {
      title: "Bag Dimensions",
      content:
        'Height: 21 cm x Width: 28 cm (8.3" x 11") - comfortably fits daily essentials.',
    },
    {
      title: "Care Guide",
      content:
        "Wipe gently with a clean, damp cloth. Avoid harsh cleaners and direct exposure to sunlight or moisture. Store in the provided dust bag when not in use.",
    },
  ],
  images: [
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Professional-Woman-&-Tote-2.png 800w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Professional-Woman-&-Tote-1.png 427w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Professional-Woman-&-Tote-2.png",
      thumbnail:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Professional-Woman-&-Tote-1.png",
      alt: "",
      width: 800,
      height: 1200,
      sizes: "(min-width: 800px) 800px, 100vw",
    },
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Elegant-Professional-Look-2.png 800w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Elegant-Professional-Look-1.png 427w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Elegant-Professional-Look-2.png",
      thumbnail:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Elegant-Professional-Look-1.png",
      alt: "",
      width: 800,
      height: 1200,
      sizes: "(min-width: 800px) 800px, 100vw",
    },
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Stylish-Woman-1-with-Tote-2.png 800w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Stylish-Woman-1-with-Tote-1.png 427w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Stylish-Woman-1-with-Tote-2.png",
      thumbnail:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Stylish-Woman-1-with-Tote-1.png",
      alt: "",
      width: 800,
      height: 1200,
      sizes: "(min-width: 800px) 800px, 100vw",
    },
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Minimalist-Fashion-Look-2.png 800w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Minimalist-Fashion-Look-1.png 427w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Minimalist-Fashion-Look-2.png",
      thumbnail:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Minimalist-Fashion-Look-1.png",
      alt: "",
      width: 800,
      height: 1200,
      sizes: "(min-width: 800px) 800px, 100vw",
    },
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Woman-with-Leather-Tote-2.png 800w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Woman-with-Leather-Tote-1.png 800w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Woman-with-Leather-Tote-2.png",
      thumbnail:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Woman-with-Leather-Tote-1.png",
      alt: "",
      width: 800,
      height: 1200,
      sizes: "(min-width: 800px) 800px, 100vw",
    },
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Woman-with-Tote-Bag-2.png 800w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Woman-with-Tote-Bag-2.png 800w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Woman-with-Tote-Bag-2.png",
      thumbnail:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Woman-with-Tote-Bag-1.png",
      alt: "",
      width: 800,
      height: 1200,
      sizes: "(min-width: 800px) 800px, 100vw",
    },
    {
      srcset:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Stylish-Woman-in-Interior-2.png 800w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Stylish-Woman-in-Interior-1.png 800w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Stylish-Woman-in-Interior-2.png",
      thumbnail:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Stylish-Woman-in-Interior-1.png",
      alt: "",
      width: 800,
      height: 1200,
      sizes: "(min-width: 800px) 800px, 100vw",
    },
  ],
};

interface ProductDetail4Props {
  className?: string;
}

const ProductDetail4 = ({ className }: ProductDetail4Props) => {
  return (
    <section className={cn("bg-muted py-32", className)}>
      <div className="mx-auto w-full max-w-[1340px] lg:px-10">
        <div className="grid grid-cols-1 gap-7.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26.25rem)] lg:gap-14 xl:gap-20">
          <div>
            <ProductImages
              images={PRODUCT_DETAILS.images}
              galleryID="gallery-4"
            />
          </div>

          <div className="px-5">
            <div className="sticky top-5">
              <div className="flex flex-col gap-2">
                <h1 className="font-instrument-sans text-2xl leading-normal tracking-wider uppercase">
                  {PRODUCT_DETAILS.name}
                </h1>
                <div className="flex items-center justify-between gap-2">
                  <Price {...PRODUCT_DETAILS.price} />
                  <Reviews rate={PRODUCT_DETAILS.reviews.rate} />
                </div>
              </div>
              <Separator className="my-6" />
              <ProductForm
                hinges={PRODUCT_DETAILS.hinges}
                selected={{
                  color: PRODUCT_DETAILS.color,
                }}
              >
                <p className="text-sm leading-normal text-muted-foreground">
                  {PRODUCT_DETAILS.description}
                </p>
              </ProductForm>
              <div className="mt-8">
                <ProductInfo info={PRODUCT_DETAILS.info} />
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
  const [current, setCurrent] = useState(0);
  const ignoreScroll = useRef(false);
  const isDesktop = useMediaQuery("(width >= 1024px)");
  const slideHeightRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (!api || !isDesktop) return;

    const slides = api.slideNodes();
    if (slides.length === 0) return;
    const firstSlide = slides[0];
    if (!firstSlide) return;

    slideHeightRef.current = firstSlide.offsetHeight;

    let lastIndex = -1;
    let ticking = false;

    const updateCurrentIndex = () => {
      if (!slideHeightRef.current) return;
      const scrollTop = window.scrollY;
      const slideHeight = slideHeightRef.current;
      const index = Math.round(scrollTop / slideHeight);

      if (index !== lastIndex) {
        lastIndex = index;
        setCurrent(index);
      }
    };

    const onScroll = () => {
      if (ignoreScroll.current || ticking) return;

      ticking = true;
      requestAnimationFrame(() => {
        updateCurrentIndex();
        ticking = false;
      });
    };

    const onResize = () => {
      const slide = slides[0];
      if (!slide) return;
      const newHeight = slide.offsetHeight;
      slideHeightRef.current = newHeight;
      updateCurrentIndex();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [api, isDesktop, setCurrent]);

  const handleThumbnailClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget;
    const index = Number(target.getAttribute("data-index"));

    const slides = api?.slideNodes();

    if (slides && index >= 0 && index < slides.length) {
      const slide = slides[index];
      if (!slide) return;
      const offsetTop = slide.getBoundingClientRect().top + window.scrollY;
      const headerOffset = 80;
      ignoreScroll.current = true;
      window.scrollTo({
        top: offsetTop - headerOffset,
        behavior: "smooth",
      });
      setCurrent(index);

      setTimeout(() => {
        ignoreScroll.current = false;
      }, 500);
    }
  };

  if (!images) return;

  return (
    <div id={galleryID} className="relative flex gap-20">
      <div className="sticky top-5 hidden self-start lg:block">
        <ol className="flex max-h-[calc(100dvh-2.5rem)] w-fit flex-col gap-4 overflow-y-auto p-px [-ms-overflow-style:none] [scrollbar-width:none] [::-webkit-scrollbar]:hidden">
          {images.map((img, index) => (
            <li
              className="w-14 shrink-0 grow-0"
              key={`product-detail-4-image-thumbnail-${index}`}
            >
              <button
                data-state={index === current ? "active" : "inactive"}
                data-index={index}
                type="button"
                onClick={handleThumbnailClick}
                className="block aspect-square w-14 overflow-hidden ring-foreground transition-shadow duration-200 data-[state=active]:ring"
              >
                <img
                  src={img.thumbnail}
                  alt={img.alt}
                  className="block size-full object-cover object-center"
                />
              </button>
            </li>
          ))}
        </ol>
      </div>
      <Carousel
        setApi={setApi}
        opts={{
          breakpoints: {
            "(min-width: 1024px)": {
              active: false,
            },
          },
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-5 md:-ml-6 lg:ml-0 lg:flex-col">
          {images.map((img, index) => (
            <CarouselItem
              className="pl-5 md:pl-6 lg:pl-0"
              key={`product-detail-4-image-${index}`}
            >
              <AspectRatio ratio={1} className="size-full overflow-hidden">
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
        <div className="lg:hidden">
          <ol className="mt-4 flex items-center justify-center">
            {images.map((_, index) => (
              <button
                onClick={() => api?.scrollTo(index)}
                data-current={index + 1 === current}
                key={`product-detail-4-image-indicator-${index}`}
                className="flex size-5.5 data-[current=true]:[&>span]:bg-primary"
              >
                <span className="m-auto block size-1.5 rounded-full bg-primary/50"></span>
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
    <div
      aria-label="regular price"
      className="text-lg leading-relaxed text-muted-foreground"
    >
      {formatCurrency(regular, currency)}
    </div>
  );
};

const Reviews = ({ rate }: ReviewsProps) => {
  const renderStars = () => {
    const fullStars = Math.floor(rate);
    const hasHalfStar = rate % 1 >= 0.5;
    const emptyStars = MAX_STARS - fullStars - (hasHalfStar ? 1 : 0);

    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star
          key={`product-detail-4-star-full-${i}`}
          className="size-3 fill-black stroke-black dark:invert"
        />,
      );
    }

    if (hasHalfStar) {
      stars.push(
        <div key="product-detail-4-half-star" className="relative size-3">
          <StarHalf className="absolute top-0 right-0 size-full fill-black stroke-black dark:invert" />
          <StarHalf className="absolute top-0 left-0 size-full -scale-x-100 fill-black/15 stroke-black/15 dark:invert" />
        </div>,
      );
    }

    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star
          key={`product-detail-4-star-empty-${i}`}
          className="size-3 fill-black/15 stroke-black/15 dark:invert"
        />,
      );
    }

    return stars;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">{renderStars()}</div>
      <div className="text-xs text-muted-foreground">({rate})</div>
    </div>
  );
};

const formSchema = z.object({
  color: z.string(),
});

const ProductForm = ({ hinges, selected, children }: ProductFormProps) => {
  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      color: selected?.color,
    },
  });

  function onSubmit() {
    form.reset();
  }

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
            <Field>
              <FieldLabel
                className="text-sm leading-normal font-normal"
                asChild
              >
                <p className="text-muted-foreground">
                  {colorHinges.label}:{" "}
                  <span className="text-foreground">{currentColor}</span>
                </p>
              </FieldLabel>
              <ColorRadioGroup field={field} options={colorHinges.options} />
            </Field>
          )}
        />
      )}
      {children}
      <div className="flex flex-col gap-4">
        <Button variant="outline">Add to Cart</Button>
        <Button>Buy it Now</Button>
      </div>
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
      className="flex flex-wrap items-center gap-2"
    >
      {options.map((item, index) => (
        <div key={`product-detail-4-color-input-${index}`}>
          <label
            htmlFor={item.id}
            className="flex size-8.5 cursor-pointer items-center justify-center overflow-hidden ring-primary duration-400 has-checked:ring"
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
              className="size-7.5"
            ></div>
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
          key={`product-detail-4-info-${index}`}
          value={`item-${index}`}
        >
          <AccordionTrigger className="text-base text-muted-foreground uppercase">
            {item.title}
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 text-balance">
            <p className="text-sm leading-normal text-muted-foreground">
              {item.content}
            </p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export { ProductDetail4 };
