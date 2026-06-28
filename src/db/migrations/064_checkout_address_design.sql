-- Checkout address design variation.
-- Controls how house/building number, zone, and street are presented to buyers.

alter table briefs
  add column if not exists checkout_address_design text not null default 'qatar_plate';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'briefs_checkout_address_design_chk'
  ) then
    alter table briefs
      add constraint briefs_checkout_address_design_chk
      check (checkout_address_design in ('qatar_plate', 'soft_card', 'classic'));
  end if;
end $$;
