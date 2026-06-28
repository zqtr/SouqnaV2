"use client";
/* eslint-disable @next/next/no-img-element */

import Autoplay from "embla-carousel-autoplay";
import { Eye, Share2 } from "lucide-react";

import {
  Price,
  type PriceType,
  PriceValue,
} from "@/components/price";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

type Product = {
  image: string;
  name: string;
  collection?: string;
  href: string;
  price: PriceType;
};

interface HeroData {
  title: string;
  cta: {
    label: string;
    href: string;
  };
  products: Product[];
  image: string;
}

type ProductCardProps = Product;

interface EcommerceHero6Props extends HeroData {
  className?: string;
}
const HERO_DATA: HeroData = {
  title: "Handcrafted Ceramics for Everyday Rituals",
  image:
    "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/Ceramic-Mug-in-Sunlight-2.png",
  cta: {
    label: "Shop Ceramics",
    href: "/template-showcase/products",
  },
  products: [
    {
      name: "Handcrafted Dinner Plate",
      price: {
        regular: 99.0,
        sale: 89.0,
        currency: "USD",
      },
      collection: "Clay & Craft",
      href: "/template-showcase/products",
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-micheile-10410297-3.jpg",
    },
    {
      name: "Stoneware Coffee Mug",
      price: {
        regular: 5.99,
        currency: "USD",
      },
      collection: "The Potter's Line",
      href: "/template-showcase/products",
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-20710970-15362198-3.jpg",
    },
    {
      name: "Minimal Ceramic Cup",
      price: {
        regular: 19.0,
        currency: "USD",
      },
      href: "/template-showcase/products",
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/cafeconcetto-bWlbcvFMUh4-unsplash-3.jpg",
    },
    {
      name: "Hand-Glazed Coffee Cup",
      price: {
        regular: 19.0,
        currency: "USD",
      },
      href: "/template-showcase/products",
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/hosseinqs-vlmuRQjADE4-unsplash-3.jpg",
    },
    {
      name: "Artisan Tea Kettle",
      price: {
        regular: 299.0,
        currency: "USD",
      },
      href: "/template-showcase/products",
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-alejandro-aznar-155337093-29269636-3.jpg",
    },
    {
      name: "Rustic Stoneware Cup",
      price: {
        regular: 19.0,
        currency: "USD",
      },
      href: "/template-showcase/products",
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-anna-nekrashevich-8534237-3.jpg",
    },
    {
      name: "Decorative Ceramic Vase",
      price: {
        regular: 19.0,
        currency: "USD",
      },
      href: "/template-showcase/products",
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/cindy-bartillon-THtfRdrK0nI-unsplash-3.jpg",
    },
  ],
};

const EcommerceHero6 = ({
  className,
  title = HERO_DATA.title,
  image = HERO_DATA.image,
  cta = HERO_DATA.cta,
  products = HERO_DATA.products,
}: EcommerceHero6Props) => {
  const isDesktop = useMediaQuery("(max-width: 1024px)");
  return (
    <header className={cn("py-32", className)}>
      <div className="container lg:grid lg:grid-cols-3 lg:grid-rows-[43.75rem] lg:gap-5">
        <div className="h-85 lg:col-span-2 lg:h-auto">
          <div
            style={{
              backgroundImage: `url(${image})`,
            }}
            className="relative flex size-full flex-col justify-end overflow-hidden rounded-md bg-cover bg-center bg-no-repeat p-5 after:absolute after:inset-0 after:block after:bg-black/20 sm:p-10"
          >
            <div className="relative z-10 space-y-4">
              <h1 className="max-w-120 text-3xl tracking-tight text-white md:text-5xl lg:text-6xl">
                {title}
              </h1>
              <Button asChild variant="secondary" size="lg">
                <a href={cta.href}>{cta.label}</a>
              </Button>
            </div>
          </div>
        </div>
        <div className="max-lg:mt-5">
          <div className="size-full rounded-md border bg-primary px-4 py-5 sm:py-7.5 md:px-8 lg:py-0 xl:px-18">
            <Carousel
              opts={{
                loop: true,
              }}
              plugins={[
                Autoplay({
                  delay: 6000,
                }),
              ]}
              className=""
              orientation={isDesktop ? "horizontal" : "vertical"}
            >
              <CarouselContent className="lg:h-178.5">
                {products.map((product, index) => (
                  <CarouselItem key={index} className="sm:basis-1/2">
                    <div className="">
                      <ProductCard {...product} />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      </div>
    </header>
  );
};

const ProductCard = ({ image, name, price, href }: ProductCardProps) => {
  const { regular, sale, currency } = price;

  return (
    <Card className="gap-4 rounded-none p-0">
      <CardHeader className="relative gap-0 p-0">
        <a href={href}>
          <AspectRatio ratio={1.2}>
            <img
              src={image}
              alt={name}
              className="block size-full object-cover object-center"
            />
          </AspectRatio>
        </a>
        <div className="absolute end-3 top-3">
          <div className="flex flex-col items-center gap-2">
            <Button variant="secondary" size="icon-sm">
              <Eye />
            </Button>
            <Button variant="secondary" size="icon-sm">
              <Share2 />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pb-4">
        <div className="space-y-1">
          <Price onSale={sale != null} className="font-bold">
            <PriceValue price={sale} currency={currency} variant="sale" />
            <PriceValue price={regular} currency={currency} variant="regular" />
          </Price>
          <CardTitle>
            <a className="hover:underline" href={href}>
              {name}
            </a>
          </CardTitle>
        </div>
        <Button className="w-full" variant="outline">
          Quick View
        </Button>
      </CardContent>
    </Card>
  );
};

export { EcommerceHero6 };
