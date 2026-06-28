"use client";
/* eslint-disable @next/next/no-img-element */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Controller } from "react-hook-form";
import { z } from "zod";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const OFFER_MODAL = {
  logo: {
    src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/symbols/ux.svg",
    alt: "",
  },
  title: "Join Now & Enjoy 20% Off",
  description:
    "Join our mailing list for updates and offers. You can unsubscribe at any time.",
  image: {
    src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/promotional/Cozy-Smartphone-Interaction-2.png",
    alt: "",
  },
};

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type Image = {
  src: string;
  alt: string;
};

type FormType = z.infer<typeof formSchema>;

type OfferModalData = {
  logo: Image;
  image: Image;
  title: string;
  description: string;
};

type Offermodal5Props = OfferModalData;

const OfferModal5 = ({
  title = OFFER_MODAL.title,
  logo = OFFER_MODAL.logo,
  description = OFFER_MODAL.description,
  image = OFFER_MODAL.image,
}: Offermodal5Props) => {
  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit() {
    form.reset();
  }

  return (
    <Sheet defaultOpen>
      <SheetContent className="w-full max-md:!max-w-[calc(100dvw-2.5rem)] md:max-w-150 [&>button:hover>svg]:rotate-180 [&>button>svg]:size-5 [&>button>svg]:transition-all">
        <div className="max-h-full overflow-y-auto">
          <div className="space-y-4 p-6 md:p-16">
            <div className="basis-1/2 space-y-8">
              <SheetHeader className="gap-8 p-0">
                {logo && (
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    className="size-11 lg:size-16 dark:invert"
                  />
                )}
                <div className="space-y-4">
                  <SheetTitle className="text-2xl leading-tight font-medium md:text-3xl lg:text-4xl">
                    {title}
                  </SheetTitle>
                  <SheetDescription className="text-xl leading-tight">
                    {description}
                  </SheetDescription>
                </div>
              </SheetHeader>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-start gap-3 max-sm:flex-col">
                  <Controller
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <Field
                        className="w-full flex-1"
                        data-invalid={fieldState.invalid}
                      >
                        <Input
                          className="h-10 rounded-full px-6"
                          placeholder="Email Address"
                          {...field}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  <Button
                    size="lg"
                    className="rounded-full max-sm:w-full sm:basis-30"
                  >
                    Join
                  </Button>
                </div>
              </form>
            </div>
            <p className="text-xs text-muted-foreground">
              By signing up, you consent to our{" "}
              <a href="/terms" className="underline underline-offset-3">
                Terms of Use
              </a>{" "}
              and{" "}
              <a href="/privacy" className="underline underline-offset-3">
                Privacy Policy
              </a>
              .
            </p>
          </div>
          <div className="h-1/2 basis-1/2">
            <AspectRatio ratio={1} className="overflow-hidden">
              <img
                src={image.src}
                alt={image.alt}
                className="block size-full object-cover object-center"
              />
            </AspectRatio>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export { OfferModal5 };
