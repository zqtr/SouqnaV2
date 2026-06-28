import { TemplateShowcaseProductDetail } from '@/components/template-showcase/TemplateShowcaseProductDetail';

type Props = {
  params: Promise<{ productId: string }>;
};

export default async function TemplateShowcaseProductIdPage({ params }: Props) {
  const { productId } = await params;
  return <TemplateShowcaseProductDetail segment={productId} />;
}
