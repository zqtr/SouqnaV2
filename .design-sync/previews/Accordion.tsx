import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from 'souqna';

export const StorefrontFaq = () => (
  <Accordion
    type="single"
    collapsible
    defaultValue="delivery"
    style={{ maxWidth: 480, width: '100%' }}
  >
    <AccordionItem value="delivery">
      <AccordionTrigger>How long does delivery take in Doha?</AccordionTrigger>
      <AccordionContent>
        Orders inside Doha arrive within 24 hours. Al Wakrah and Al Khor
        deliveries take 1–2 business days. You can track every order from
        your Souqna dashboard.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="payments">
      <AccordionTrigger>Which payment methods do you accept?</AccordionTrigger>
      <AccordionContent>
        We accept debit cards, Apple Pay, and cash on delivery across Qatar.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="returns">
      <AccordionTrigger>Can I return an opened dates box?</AccordionTrigger>
      <AccordionContent>
        Unopened items can be returned within 7 days for a full refund.
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);
