'use client';

import * as React from 'react';
import type { Block, BlockType } from '@/lib/blocks/types';
import type { BlockContext } from '@/components/storefront/blocks/BlockContext';
import { HeroBlock } from '@/components/storefront/blocks/HeroBlock';
import { BannerBlock } from '@/components/storefront/blocks/BannerBlock';
import { TextBlock } from '@/components/storefront/blocks/TextBlock';
import { ImageBlock } from '@/components/storefront/blocks/ImageBlock';
import { GalleryBlock } from '@/components/storefront/blocks/GalleryBlock';
import { ProductGridBlock } from '@/components/storefront/blocks/ProductGridBlock';
import { ProductListBlock } from '@/components/storefront/blocks/ProductListBlock';
import { FeaturedProductBlock } from '@/components/storefront/blocks/FeaturedProductBlock';
import { ServiceListBlock } from '@/components/storefront/blocks/ServiceListBlock';
import { MenuBlock } from '@/components/storefront/blocks/MenuBlock';
import { CalendarBlock } from '@/components/storefront/blocks/CalendarBlock';
import { ContactCardBlock } from '@/components/storefront/blocks/ContactCardBlock';
import { InquireCtaBlock } from '@/components/storefront/blocks/InquireCtaBlock';
import { SpacerBlock } from '@/components/storefront/blocks/SpacerBlock';
import { DividerBlock } from '@/components/storefront/blocks/DividerBlock';
import { DepthShowcaseBlock } from '@/components/storefront/blocks/DepthShowcaseBlock';
import { AuroraRibbonBlock } from '@/components/storefront/blocks/AuroraRibbonBlock';
import { PortalHeroBlock } from '@/components/storefront/blocks/PortalHeroBlock';
import * as Primitives from './browser-primitives';
export { BrowserSouqyProvider, useBrowserSouqyContext } from './browser-context';
import { useBrowserSouqyContext } from './browser-context';

function useBlock<T extends BlockType, P>(type: T, props: P): Block & { props: P } {
  const reactId = React.useId();
  return { id: `pro-${type}-${reactId.replace(/:/gu, '')}`, type, props } as unknown as Block & { props: P };
}

function bind<P>(type: BlockType, Renderer: React.ComponentType<{ block: Block & { props: P }; ctx: BlockContext }>) {
  return function BrowserSdkComponent(props: P) {
    const context = useBrowserSouqyContext();
    const block = useBlock(type, props);
    return <Renderer block={block} ctx={context} />;
  };
}

export const Hero = bind('hero', HeroBlock);
export const Banner = bind('banner', BannerBlock);
export const Text = bind('text', TextBlock);
export const Image = bind('image', ImageBlock);
export const Gallery = bind('gallery', GalleryBlock);
export const ProductGrid = bind('productGrid', ProductGridBlock);
export const ProductList = bind('productList', ProductListBlock);
export const FeaturedProduct = bind('featuredProduct', FeaturedProductBlock);
export const ServiceList = bind('serviceList', ServiceListBlock);
export const Menu = bind('menu', MenuBlock);
export const Calendar = bind('calendar', CalendarBlock);
export const ContactCard = bind('contactCard', ContactCardBlock);
export const InquireCta = bind('inquireCta', InquireCtaBlock);
export const Spacer = bind('spacer', SpacerBlock);
export const Divider = bind('divider', DividerBlock);
export const DepthShowcase = bind('depthShowcase', DepthShowcaseBlock);
export const AuroraRibbon = bind('auroraRibbon', AuroraRibbonBlock);
export const PortalHero = bind('portalHero', PortalHeroBlock);

export const Section = Primitives.Section;
export const Stack = Primitives.Stack;
export const Grid = Primitives.Grid;
export const Quote = Primitives.Quote;
export const Marquee = Primitives.Marquee;
export const Custom = Primitives.Custom;

export function useSouqyContext() { return useBrowserSouqyContext(); }
export function useStorefront() { return useBrowserSouqyContext().storefront; }
export function useProducts() { return useBrowserSouqyContext().products; }
export function useTheme() { return useBrowserSouqyContext().theme; }
export function useLocale() { return useBrowserSouqyContext().storefront.locale; }
export function useIsRtl() { return useBrowserSouqyContext().isRtl; }

export const browserSouqnaSdk = {
  Hero, Banner, Text, Image, Gallery, ProductGrid, ProductList, FeaturedProduct,
  ServiceList, Menu, Calendar, ContactCard, InquireCta, Spacer, Divider,
  DepthShowcase, AuroraRibbon, PortalHero, Section, Stack, Grid, Quote, Marquee,
  Custom, useSouqyContext, useStorefront, useProducts, useTheme, useLocale, useIsRtl,
};
