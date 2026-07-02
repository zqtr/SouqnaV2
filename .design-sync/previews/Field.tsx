import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Input,
  Textarea,
} from 'souqna';

export const BasicField = () => (
  <div style={{ maxWidth: 380 }}>
    <Field>
      <FieldLabel htmlFor="f-store-name">Storefront name</FieldLabel>
      <Input id="f-store-name" placeholder="e.g. Al Wakrah Dates" />
      <FieldDescription>
        Shown on your public page and order receipts.
      </FieldDescription>
    </Field>
  </div>
);

export const WithError = () => (
  <div style={{ maxWidth: 380 }}>
    <Field data-invalid="true">
      <FieldLabel htmlFor="f-iban">Payout IBAN</FieldLabel>
      <Input id="f-iban" defaultValue="QA12 QNBA 0000" aria-invalid />
      <FieldError>IBAN must be 29 characters for Qatari accounts.</FieldError>
    </Field>
  </div>
);

export const FieldSetGroup = () => (
  <div style={{ maxWidth: 420 }}>
    <FieldSet>
      <FieldLegend>Store profile</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="f-owner">Owner name</FieldLabel>
          <Input id="f-owner" defaultValue="Maryam Al-Kuwari" />
        </Field>
        <Field>
          <FieldLabel htmlFor="f-about">About the store</FieldLabel>
          <Textarea
            id="f-about"
            placeholder="Fresh karak and Arabic coffee, brewed daily in Souq Waqif…"
          />
          <FieldDescription>Appears under your storefront banner.</FieldDescription>
        </Field>
      </FieldGroup>
    </FieldSet>
  </div>
);
