"use client";
/* eslint-disable @next/next/no-img-element */

import { Minus } from "lucide-react";
import { useEffect, useState } from "react";

import { Rating } from "@/components/rating";
import { Card, CardContent } from "@/components/ui/card";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

type ReviewType = {
  rate: number;
  comment: string;
  author: string;
  date: Date;
  image: {
    src: string;
    alt: string;
  };
};

interface Reviews9Props {
  reviews: ReviewType[];
  title: string;
  className?: string;
}

type ReviewCardProps = ReviewType;

const REVIEWS: ReviewType[] = [
  {
    rate: 5,
    comment: "This sculptural lamp adds warm character and elegance to rooms.",
    author: "Emma Thompson",
    date: new Date(),
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/furniture/Modern-Artistic-Lamp-1.png",
      alt: "",
    },
  },
  {
    rate: 5,
    comment:
      "The minimalist sofa feels luxurious, comfortable, and perfect for relaxing.",
    author: "Emma Thompson",
    date: new Date(),
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/furniture/Modern-Minimalist-Sofa-1.png",
      alt: "",
    },
  },
  {
    rate: 5,
    comment:
      "Beautiful wooden cabinet enhances my space with warmth and functionality.",
    author: "Emma Thompson",
    date: new Date(),
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/furniture/Modern-Wooden-Cabinet-1.png",
      alt: "",
    },
  },
  {
    rate: 5,
    comment:
      "This modern sculpture elevates my interior with refined artistic presence.",
    author: "Emma Thompson",
    date: new Date(),
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/furniture/Minimalist-Interior-with-Sculptural-Element-1.png",
      alt: "",
    },
  },
  {
    rate: 5,
    comment:
      "The minimalist sideboard blends seamlessly while offering stunning visual simplicity.",
    author: "Emma Thompson",
    date: new Date(),
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/furniture/Minimalist-Wooden-Sideboard-1.png",
      alt: "",
    },
  },
];

const Reviews9 = ({
  reviews = REVIEWS,
  title = "Reviews",
  className,
}: Reviews9Props) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onButtonClick = (index: number) => {
    if (!api) return;
    api?.scrollTo(index);
  };

  useEffect(() => {
    if (!api) return;

    const updateCurrent = (api: CarouselApi) => {
      setCurrent(api?.selectedScrollSnap() ?? 0);
    };

    const updateScrollSnaps = (api: CarouselApi) => {
      setScrollSnaps(api?.scrollSnapList() ?? []);
    };

    updateCurrent(api);
    updateScrollSnaps(api);

    api
      .on("reInit", updateCurrent)
      .on("select", updateCurrent)
      .on("resize", updateScrollSnaps);

    return () => {
      api
        .off("reInit", updateCurrent)
        .off("select", updateCurrent)
        .off("resize", updateScrollSnaps);
    };
  }, [api]);

  return (
    <section className={cn("py-32", className)}>
      <div className="container space-y-10">
        <h2 className="text-4xl font-medium tracking-tighter xl:text-5xl">
          {title}
        </h2>
        <Carousel setApi={setApi}>
          <CarouselContent>
            {reviews.map((review, index) => (
              <CarouselItem className="sm:basis-1/2 lg:basis-1/3" key={index}>
                <ReviewCard {...review} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="max-xl:hidden">
            <CarouselNext className="right-0 size-16 translate-x-1/2 bg-background/40 backdrop-blur-lg [&>svg]:!size-6" />
            <CarouselPrevious className="left-0 size-16 -translate-x-1/2 bg-background/40 backdrop-blur-lg [&>svg]:!size-6" />
          </div>
        </Carousel>
        <div className="-mt-5 flex items-center justify-center xl:hidden">
          {scrollSnaps.map((_, index) => (
            <button
              data-state={current === index ? "active" : "inactive"}
              className="group flex size-4"
              key={index}
              onClick={() => {
                onButtonClick(index);
              }}
            >
              <span className="m-auto block size-2 rounded-full bg-primary/20 group-data-[state=active]:bg-primary"></span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

const ReviewCard = ({
  rate,
  comment,
  author,
  date,
  image,
}: ReviewCardProps) => {
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  return (
    <Card className="h-full overflow-hidden bg-primary/5 p-0">
      <CardContent className="flex h-full p-0 max-xl:flex-col-reverse">
        <div className="flex-1 space-y-6 p-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 max-xl:justify-center">
              <Rating className="[&_svg]:size-4 [&>div]:size-4" rate={rate} />
              <p className="font-bold">{rate.toFixed(2)}</p>
            </div>
            <p className="text-lg font-medium max-xl:text-center">{comment}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 max-xl:justify-center">
            <p className="text-sm font-medium text-muted-foreground">
              {author}
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Minus className="size-3.5" />
              <p>{formatDate(date)}</p>
            </div>
          </div>
        </div>
        <div className="h-full shrink-0 basis-37.5">
          <div className="h-full overflow-hidden rounded-xl max-xl:aspect-[0.8]">
            <img
              src={image.src}
              alt={image.alt}
              className="block size-full object-cover object-center"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
export { Reviews9 };
