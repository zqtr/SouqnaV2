"use client";

/* eslint-disable @next/next/no-img-element */

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

type FooterLink = {
  title?: string;
  text: string;
  href?: string;
};

type SocialIcon = {
  title: string;
  light: string;
  dark: string;
};

type SocialLink = {
  link: string;
  icon: SocialIcon;
};

type FooterLinksSection = {
  title: string;
  id: string;
  links?: FooterLink[];
  items?: FooterLink[];
  socialMediaLinks?: SocialLink[];
};

type ContactForm = {
  title?: string;
  text?: string;
};

type HomeLink = {
  logo: {
    light: string;
    dark: string;
  };
  link: string;
};

type FooterData = {
  sections: FooterLinksSection[];
  contactForm: ContactForm;
  submenu?: FooterLink[];
  paymentMethods?: string[];
  copyrightCaption?: string;
  homeLink: HomeLink;
  image: string;
};

type ContactFormProps = ContactForm;

interface FooterLinksProps {
  links?: FooterLink[];
}

interface FooterContactInfoProps {
  items?: FooterLink[];
  socialMediaLinks?: SocialLink[];
}

interface SocialMediaSectionProps {
  links?: SocialLink[];
}

interface EcommerceFooter18Props extends FooterData {
  className?: string;
}

const SOCIAL_ICONS = {
  facebook: {
    title: "Facebook",
    light:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/facebook-icon.svg",
    dark: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/facebook-icon.svg",
  },
  x: {
    title: "X",
    light:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/x.svg",
    dark: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/x.svg",
  },
  instagram: {
    title: "Instagram",
    light:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/instagram-icon.svg",
    dark: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/instagram-icon.svg",
  },
} as const;

const FOOTER_DATA: FooterData = {
  homeLink: {
    logo: {
      light: "/brand/souqna-lockup.svg",
      dark: "/brand/souqna-lockup.svg",
    },
    link: "/",
  },
  sections: [
    {
      title: "Contact us",
      id: "contact_us",
      items: [
        {
          title: "Customer Support",
          text: "Daily merchant support in Qatar.",
        },
        {
          title: "Call Us",
          text: "+974 0000 0000",
          href: "tel:+97400000000",
        },
        {
          title: "Email Us",
          text: "hello@souqna.qa",
          href: "mailto:hello@souqna.qa",
        },
        {
          title: "Address",
          text: "Doha, Qatar",
        },
      ],
      socialMediaLinks: [
        {
          icon: SOCIAL_ICONS.facebook,
          link: "/",
        },
        {
          icon: SOCIAL_ICONS.x,
          link: "/",
        },
        {
          icon: SOCIAL_ICONS.instagram,
          link: "/",
        },
      ],
    },
    {
      title: "Shop",
      id: "shop",
      links: [
        {
          text: "New Launches",
          href: "/template-showcase/products?sort=newest",
        },
        {
          text: "Best Sellers",
          href: "/template-showcase/products?sort=popular",
        },
        {
          text: "Product Collections",
          href: "/template-showcase/products",
        },
        {
          text: "Gifts & Sets",
          href: "/template-showcase/products?tag=gifts",
        },
      ],
    },
    {
      title: "Support",
      id: "support",
      links: [
        {
          text: "Contact Us",
          href: "/contact",
        },
        {
          text: "FAQs",
          href: "/faq",
        },
        {
          text: "Order Tracking",
          href: "/orders",
        },
        {
          text: "Returns & Exchanges",
          href: "/returns",
        },
      ],
    },
    {
      title: "About",
      id: "about",
      links: [
        {
          text: "Our Story",
          href: "/about",
        },
        {
          text: "All Products",
          href: "/template-showcase/products",
        },
        {
          text: "Store Policies",
          href: "/policies",
        },
        {
          text: "Contact",
          href: "/contact",
        },
      ],
    },
  ],
  contactForm: {
    title: "Keep customers close after checkout",
    text: "Use this footer for policies, store contact details, and customer updates across a premium Souqna storefront.",
  },
  submenu: [
    {
      text: "Returns Policy",
      href: "/returns",
    },
    {
      text: "Terms Of Service",
      href: "/terms",
    },
    {
      text: "Privacy Policy",
      href: "/privacy",
    },
  ],
  paymentMethods: [
    "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/payment-methods/amazonpay.svg",
    "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/payment-methods/applepay.svg",
    "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/payment-methods/mastercard.svg",
    "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/payment-methods/paypal.svg",
    "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/payment-methods/visa.svg",
    "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/payment-methods/discover.svg",
  ],
  copyrightCaption: "(c) 2026 Souqna. Built for modern commerce.",
  image:
    "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/promotional/Neatly-Organized-Clothing-Selection-2.png",
};

const EcommerceFooter18 = ({
  className,
  sections = FOOTER_DATA.sections,
  contactForm = FOOTER_DATA.contactForm,
  homeLink = FOOTER_DATA.homeLink,
  paymentMethods = FOOTER_DATA.paymentMethods,
  image = FOOTER_DATA.image,
  copyrightCaption = FOOTER_DATA.copyrightCaption,
  submenu = FOOTER_DATA.submenu,
}: EcommerceFooter18Props) => {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const allAccordionIds = sections.map(({ id }) => id);

  const [activeAccordionItem, setActiveAccordionItem] =
    useState<string[]>(allAccordionIds);

  const handleOnChange = (ids: string[]) => {
    setActiveAccordionItem(ids);
  };

  return (
    <footer className={cn("relative", className)}>
      <div className="relative z-20 bg-background">
        <div className="container">
          <div className="pt-9 pb-12.5">
            <div className="grid-cols-2 space-y-5 lg:grid lg:gap-x-5 lg:gap-y-5 xl:grid-cols-7">
              <Accordion
                value={activeAccordionItem}
                disabled={isDesktop}
                type="multiple"
                onValueChange={handleOnChange}
                className="lg:contents"
              >
                {sections.map(
                  ({ title, links, items, id, socialMediaLinks }) => (
                    <AccordionItem
                      value={id}
                      key={id}
                      className="border-none xl:first:col-span-2"
                    >
                      <AccordionTrigger className="text-lg leading-snug font-semibold hover:no-underline disabled:opacity-100 lg:pt-0 lg:text-xl lg:[&>svg]:hidden">
                        {title}
                      </AccordionTrigger>
                      <AccordionContent>
                        <FooterLinks links={links} />
                        <FooterContactInfo
                          items={items}
                          socialMediaLinks={socialMediaLinks}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  ),
                )}
              </Accordion>
              <div className="xl:col-span-2">
                <ContactFormSection
                  title={contactForm.title}
                  text={contactForm.text}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 items-center justify-center gap-4 border-y py-4 lg:grid-cols-3">
            <div className="max-lg:justify-self-center">
              <Select>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="Arabic">Arabic</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="justify-self-center">
              <a href={homeLink.link} className="inline-block w-full max-w-55">
                <img
                  className="w-full dark:hidden"
                  src={homeLink.logo.light}
                  alt="Souqna"
                />
                <img
                  className="hidden w-full dark:inline-block"
                  src={homeLink.logo.dark}
                  alt="Souqna"
                />
              </a>
            </div>
            <div className="lg:justify-self-end">
              <PaymentMethods cards={paymentMethods} />
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-20 rounded-b-xl bg-background py-4">
        <div className="container flex flex-col items-center justify-between gap-2 lg:flex-row">
          <p className="text-xs max-lg:text-center">{copyrightCaption}</p>
          <FooterSubMenu links={submenu} />
        </div>
      </div>
      <div className="sticky bottom-0 -mt-2.5 h-30 overflow-hidden lg:aspect-[8.458] lg:h-auto">
        <img
          src={image}
          alt="footer image"
          className="block size-full object-cover object-center"
        />
      </div>
    </footer>
  );
};

const newsletterFormSchema = z.object({
  email: z.string().email(),
});

const ContactFormSection = ({ title, text }: ContactFormProps) => {
  const form = useForm({
    resolver: zodResolver(newsletterFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = () => {
    form.reset();
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="text-lg leading-snug font-semibold lg:text-xl">
          {title}
        </h3>
        <p className="text-sm leading-relaxed">{text}</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <InputGroup>
                  <InputGroupInput
                    {...field}
                    aria-invalid={fieldState.invalid}
                    placeholder="Email Address"
                  />
                  <InputGroupAddon>
                    <Mail />
                  </InputGroupAddon>
                </InputGroup>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Button variant="secondary">Subscribe</Button>
        </div>
      </form>
    </div>
  );
};

const FooterLinks = ({ links }: FooterLinksProps) => {
  if (!links) return;

  return (
    <ul className="space-y-1.5">
      {links.map(({ href, text }, index) => (
        <li key={index}>
          <a
            href={href}
            className="text-sm underline-offset-2 transition-all hover:underline hover:opacity-80"
          >
            {text}
          </a>
        </li>
      ))}
    </ul>
  );
};

const FooterContactInfo = ({
  items,
  socialMediaLinks,
}: FooterContactInfoProps) => {
  if (!items) return;

  return (
    <div className="space-y-4">
      <dl className="space-y-2.5 sm:space-y-1.5">
        {items.map(({ text, href, title }, index) => (
          <div
            className="flex flex-col items-start gap-2 text-sm sm:flex-row"
            key={index}
          >
            <dt>{title}:</dt>
            {href ? (
              <dd>
                <a
                  className="break-all text-muted-foreground underline"
                  href={href}
                >
                  {text}
                </a>
              </dd>
            ) : (
              <dd>{text}</dd>
            )}
          </div>
        ))}
      </dl>
      <SocialMediaSection links={socialMediaLinks} />
    </div>
  );
};

const PaymentMethods = ({ cards }: { cards?: string[] }) => {
  if (!cards) return;

  return (
    <div className="space-y-3">
      <p className="text-xs font-light max-lg:text-center">Payment Methods</p>
      <ul className="flex flex-wrap items-center justify-center gap-3">
        {cards.map((card) => (
          <li key={crypto.randomUUID()}>
            <img className="w-8" src={card} alt="card" />
          </li>
        ))}
      </ul>
    </div>
  );
};

const SocialMediaSection = ({ links }: SocialMediaSectionProps) => {
  if (!links) return;

  return (
    <ul className="flex flex-wrap items-center gap-0.5">
      {links.map(({ icon, link }) => (
        <li key={crypto.randomUUID()}>
          <Button size="icon-sm" asChild className="rounded-full">
            <a href={link}>
              <img
                className="size-3.5 dark:hidden"
                alt={icon.title}
                src={icon.light}
              />
              <img
                className="hidden size-3.5 dark:block"
                alt={icon.title}
                src={icon.dark}
              />
            </a>
          </Button>
        </li>
      ))}
    </ul>
  );
};

const FooterSubMenu = ({ links }: { links?: FooterLink[] }) => {
  if (!links) return;

  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 max-lg:justify-center">
      {links.map(({ href, text }) => (
        <li key={crypto.randomUUID()}>
          <a href={href} className="text-xs">
            {text}
          </a>
        </li>
      ))}
    </ul>
  );
};

export { EcommerceFooter18 };
