import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from 'souqna';

export const CategoryOpen = () => (
  <Select open defaultValue="dates">
    <SelectTrigger style={{ width: 240 }}>
      <SelectValue placeholder="Choose a category" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>Food &amp; beverage</SelectLabel>
        <SelectItem value="dates">Dates &amp; sweets</SelectItem>
        <SelectItem value="coffee">Coffee &amp; karak</SelectItem>
        <SelectItem value="spices">Spices &amp; herbs</SelectItem>
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>Retail</SelectLabel>
        <SelectItem value="abayas">Abayas &amp; fashion</SelectItem>
        <SelectItem value="oud" disabled>
          Oud &amp; perfumes
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
);
