"use client";
/* eslint-disable @next/next/no-img-element */
import Autoplay from "embla-carousel-autoplay";

import type { PriceType } from "@/components/price";
import { Price, PriceValue } from "@/components/price";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface EcommerceHero1Props {
  className?: string;
  carouselItems?: CarouselItem[][];
}

interface Product {
  name: string;
  description: string;
  image: string;
  link: string;
  price: PriceType;
}

interface CarouselItem {
  image: string;
  title: string;
  product: Product;
}

const CAROUSEL_ITEMS: CarouselItem[][] = [
  [
    {
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/Green-Glass-Vase-with-Pink-Flowers-2.png",
      title: "Fresh Floral Accents",
      product: {
        name: "Green Glass Flower Vase",
        description: "Hand-blown glass vase with soft floral styling",
        image:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/Elegant-Vase-with-Pink-Flowers-1.png",
        link: "/template-showcase/products",
        price: {
          regular: 100,
          currency: "USD",
        },
      },
    },
    {
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/Serene-Teapot-Still-Life-2.png",
      title: "Calm Tea Moments",
      product: {
        name: "Minimal Ceramic Teapot",
        description: "Elegant teapot designed for everyday brewing",
        image:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/Serene-Teapot-Still-Life-1.png",
        link: "/template-showcase/products",
        price: {
          regular: 100,
          currency: "USD",
        },
      },
    },
  ],
  [
    {
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-alejandro-aznar-155337093-29269636-2.jpg",
      title: "Modern Home Decor",
      product: {
        name: "Stoneware Table Vase",
        description: "Modern ceramic vase for shelves or tables",
        image:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-alejandro-aznar-155337093-29269637-1.jpg",
        link: "/template-showcase/products",
        price: {
          regular: 100,
          currency: "USD",
        },
      },
    },
    {
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-micheile-10410293-2.jpg",
      title: "Timeless Ceramics",
      product: {
        name: "Artisan Ceramic Bowl",
        description: "Handcrafted bowl with natural textures",
        image:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/other/pexels-micheile-10410297-1.jpg",
        link: "/template-showcase/products",
        price: {
          regular: 100,
          currency: "USD",
        },
      },
    },
  ],
];

const EcommerceHero1 = ({
  className,
  carouselItems = CAROUSEL_ITEMS,
}: EcommerceHero1Props) => {
  return (
    <header className={cn("py-32", className)}>
      <div className="container">
        <div className="rounded-xl bg-primary px-5 py-4 max-lg:p-2">
          <Carousel
            opts={{
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 6000,
              }),
            ]}
          >
            <CarouselContent>
              {carouselItems.map((item, index) => (
                <CarouselItem key={index}>
                  <div className="flex h-full flex-col gap-4 lg:flex-row lg:gap-8">
                    {item.map((item, index) => (
                      <div className="lg:flex-1" key={index}>
                        <div className="space-y-4">
                          <div className="relative size-full h-80 overflow-hidden rounded-xl before:absolute before:inset-0 before:block before:bg-black/25 sm:h-100 lg:h-140">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="block size-full object-cover object-center"
                            />
                            <div className="absolute inset-x-3 bottom-3 lg:start-6 lg:bottom-6">
                              <ProductCard product={item.product} />
                            </div>
                          </div>
                          <h2 className="text-2xl font-bold text-primary-foreground max-md:text-center">
                            {item.title}
                          </h2>
                        </div>
                      </div>
                    ))}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </header>
  );
};

const ProductCard = ({ product }: { product: Product }) => {
  const { regular, sale, currency } = product.price;

  return (
    <Card className="relative w-full flex-row gap-0 overflow-hidden p-0 max-sm:bg-background/40 max-sm:backdrop-blur-md md:h-64 md:w-45 md:flex-col lg:h-80 lg:w-50">
      <a href={product.link} className="absolute inset-0 z-10 rounded-xl"></a>
      <CardHeader className="gap-0 p-0 max-sm:hidden">
        <div className="aspect-[1.4] overflow-hidden lg:aspect-square">
          <img
            src={product.image}
            alt={product.name}
            className="block size-full object-cover object-center"
          />
        </div>
      </CardHeader>
      <CardContent className="flex h-full flex-col justify-between px-4 py-2.5">
        <div>
          <CardTitle className="line-clamp-2 text-base font-bold text-shadow-sm">
            {product.name}
          </CardTitle>
          <CardDescription className="my-1.5 line-clamp-1 max-sm:text-foreground">
            {product.description}
          </CardDescription>
        </div>
        <Price
          onSale={sale != null}
          className="flex-nowrap text-lg font-semibold"
        >
          <PriceValue price={sale} currency={currency} variant="sale" />
          <PriceValue price={regular} currency={currency} variant="regular" />
        </Price>
      </CardContent>
    </Card>
  );
};

export { EcommerceHero1 };
