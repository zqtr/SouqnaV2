/* eslint-disable @next/next/no-img-element */
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ProductCategory = {
  title: string;
  image: {
    src: string;
    alt: string;
  };
  summary: string;
  link: string;
};

type ProductCategories2Props = {
  title: string;
  productCategories: ProductCategory[];
  className?: string;
};

const PRODUCT_CATEGORIES = {
  title: "Product Categories",
  productCategories: [
    {
      title: "Sunglasses",
      summary: "Modern shades blending style and sun protection",
      image: {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/accessories/Checkered-Sunglasses-on-Stone-Pedestal-2.png",
        alt: "",
      },
      link: "/template-showcase/products",
    },
    {
      title: "Jewelry",
      summary: "Elegant pieces to elevate every look",
      image: {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/accessories/Gold-Hoop-Earrings-on-Ceramic-Dish-2.png",
        alt: "",
      },
      link: "/template-showcase/products",
    },
    {
      title: "Coats & Jackets",
      summary: "Layer up with timeless outerwear styles",
      image: {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Minimalist-Fashion-Portrait-2.png",
        alt: "",
      },
      link: "/template-showcase/products",
    },
    {
      title: "Bags",
      summary: "Functional designs crafted for daily wear",
      image: {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Woman-with-Tote-Bag-2.png",
        alt: "",
      },
      link: "/template-showcase/products",
    },
    {
      title: "Shoes",
      summary: "Step forward with comfort and style",
      image: {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Minimalist-Beige-Sneakers-2.png",
        alt: "",
      },
      link: "/template-showcase/products",
    },
    {
      title: "Dresses",
      summary: "Effortless silhouettes for every occasion",
      image: {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555033-2.jpg",
        alt: "",
      },
      link: "/template-showcase/products",
    },
  ],
};

const ProductCategories2 = ({
  title = PRODUCT_CATEGORIES.title,
  productCategories = PRODUCT_CATEGORIES.productCategories,
  className,
}: ProductCategories2Props) => {
  return (
    <section className={cn("py-32", className)}>
      <div className="container">
        <div className="flex flex-col gap-10">
          <h2 className="animate-in text-center text-4xl leading-snug font-medium duration-600 fade-in slide-in-from-bottom-6">
            {title}
          </h2>
          <div className="gap grid grid-cols-2 gap-x-2.5 gap-y-10 lg:grid-cols-3">
            {productCategories?.map((item, index) => (
              <div
                key={item.title}
                style={{
                  animationDelay: `${100 * index}ms`,
                }}
                className="animate-out opacity-0 duration-700 fade-in-100 fill-mode-forwards"
              >
                <ProductCategoryCard {...item} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const ProductCategoryCard = ({
  title,
  image,
  summary,
  link,
}: ProductCategory) => {
  return (
    <Card className="rounded-none border-none bg-background p-0 shadow-none">
      <CardContent className="p-0">
        <a href={link} className="flex flex-col gap-4">
          <AspectRatio
            ratio={1.363277259}
            className="overflow-hidden rounded-xl"
          >
            <img
              src={image.src}
              alt={image.alt}
              className="size-full origin-center object-cover object-center transition-transform duration-400 hover:scale-115"
            />
          </AspectRatio>
          <div className="space-y-1">
            <CardTitle className="text-center text-lg leading-tight font-medium sm:text-xl md:text-2xl">
              {title}
            </CardTitle>
            <CardDescription className="text-center">{summary}</CardDescription>
          </div>
        </a>
      </CardContent>
    </Card>
  );
};

export { ProductCategories2 };
