/* eslint-disable @next/next/no-img-element */
import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ImageMedia = {
  type: "image";
  alt: string;
  src: string;
  srcSet?: string;
  sizes?: string;
};

type VideoMedia = {
  type: "video";
  src: string;
};

type MediaItem = ImageMedia | VideoMedia;

interface ProductCategory {
  title: string;
  text: string;
  link: string;
  cta?: {
    link: string;
    text: string;
  };
  media: MediaItem;
}

interface ProductCategories5Props {
  categories: ProductCategory[];
  className?: string;
}

const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    title: "Effortless Style",
    text: "Up to 50% off",
    link: "/template-showcase/products",
    media: {
      type: "video",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/6764045-hd_720_1280_25fps.mp4",
    },
  },
  {
    title: "Everyday Essentials",
    text: "Up to 50% off",
    cta: {
      link: "/template-showcase/products",
      text: "See More",
    },
    link: "/template-showcase/products",
    media: {
      type: "image",
      srcSet:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-cottonbro-6764036-3.jpg 1920w, /images/block/ecommerce/clothes/pexels-cottonbro-6764036-2.jpg 1280w, /images/block/ecommerce/clothes/pexels-cottonbro-6764036-1.jpg 640w",
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-cottonbro-6764036-3.jpg",
      sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      alt: "",
    },
  },
];

const ProductCategories5 = ({
  categories = PRODUCT_CATEGORIES,
  className,
}: ProductCategories5Props) => {
  const category1 = categories[0] ?? PRODUCT_CATEGORIES[0]!;
  const category2 = categories[1] ?? PRODUCT_CATEGORIES[1] ?? category1;

  return (
    <section className={cn("py-32", className)}>
      <div className="container">
        <div className="grid grid-cols-1 border lg:grid-cols-2 xl:grid-cols-3">
          <div className="col-span-1">
            <div className="relative aspect-square size-full px-10.5 py-8 lg:aspect-auto lg:min-h-150">
              <div className="relative z-10">
                <h2 className="mb-1 text-3xl leading-tight font-semibold text-black sm:text-4xl">
                  {category1.title}
                </h2>
                <p className="text-xl leading-tight text-black sm:text-2xl">
                  {category1.text}
                </p>
              </div>
              <div className="absolute end-4 bottom-4 z-10">
                <Button size="icon" className="size-11 rounded-full" asChild>
                  <a href={category1.link}>
                    <ShoppingBag />
                  </a>
                </Button>
              </div>
              <div className="absolute inset-0">
                <video
                  muted
                  autoPlay
                  loop
                  className="size-full object-cover object-center"
                  src={category1.media.src}
                ></video>
              </div>
            </div>
          </div>
          <div className="xl:col-span-2">
            <div className="relative aspect-square size-full px-10.5 py-8 before:pointer-events-none before:absolute before:inset-x-0 before:-bottom-px before:z-10 before:h-2/3 before:bg-gradient-to-t before:from-white/80 before:to-transparent lg:aspect-auto lg:min-h-150">
              <div className="relative z-20 flex size-full flex-col items-center justify-end gap-3 pb-6.5">
                <div>
                  <h2 className="mb-1 text-center text-3xl leading-tight font-semibold text-black sm:text-4xl">
                    {category2.title}
                  </h2>
                  <p className="text-center text-xl leading-tight text-black sm:text-2xl">
                    {category2.text}
                  </p>
                </div>
                {category2.cta && (
                  <Button size="lg" asChild>
                    <a href={category2.cta.link}> {category2.cta.text}</a>
                  </Button>
                )}
              </div>
              <div className="absolute inset-0">
                {category2.media.type === "image" && (
                  <img
                    sizes={category2.media?.sizes}
                    srcSet={category2.media?.srcSet}
                    src={category2.media.src}
                    alt=""
                    className="size-full object-cover object-[50%_30%]"
                  />
                )}
              </div>
              <div className="absolute end-4 bottom-4 z-10">
                <Button size="icon" className="size-11 rounded-full" asChild>
                  <a href={category2.link}>
                    <ShoppingBag />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { ProductCategories5 };
