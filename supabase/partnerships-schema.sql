-- Zama partnerships pipeline
-- Apply after cms-schema.sql, farmer-private-schema.sql, and
-- admin-notifications-schema.sql.

create table if not exists public.partnership_requests (
  id uuid primary key default gen_random_uuid(),
  source_contact_message_id uuid unique references public.contact_messages (id) on delete set null,
  contact_name text not null,
  organisation_name text not null,
  email text not null,
  phone text not null default '',
  partner_type text not null,
  message text not null,
  location text not null default '',
  dzongkhag text not null default '',
  status text not null default 'new' check (status in ('new', 'in_review', 'contacted', 'approved', 'declined')),
  admin_notes text not null default '',
  archived_at timestamptz,
  archived_by text,
  farmer_id text references public.farmers (id) on delete set null,
  status_updated_at timestamptz not null default now(),
  status_updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partnership_requests_created_idx on public.partnership_requests (created_at desc);
create index if not exists partnership_requests_status_idx on public.partnership_requests (status, archived_at, created_at desc);
create index if not exists partnership_requests_type_idx on public.partnership_requests (partner_type, created_at desc);

alter table public.partnership_requests enable row level security;

drop policy if exists "partnership requests admin all" on public.partnership_requests;
create policy "partnership requests admin all" on public.partnership_requests
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists partnership_requests_set_updated_at on public.partnership_requests;
create trigger partnership_requests_set_updated_at
  before update on public.partnership_requests
  for each row execute function public.set_updated_at();

-- The public page reads this through the existing content block policy. Keep
-- the configuration in one typed block rather than exposing an admin-only
-- configuration table to visitors.
insert into public.content_blocks (key, value)
values (
  'partnership',
  '{
    "tag": "Partner with Zama",
    "heading": "Bring better food closer to your people.",
    "intro": "Tell us about your organisation and the kind of partnership you have in mind. The Zama team will review it as a partnership request, not a general contact message.",
    "highlights": [
      { "title": "Workplaces", "copy": "Fresh boxes, meal support, or team-friendly food programmes." },
      { "title": "Hospitality & community", "copy": "Useful food options for hotels, campuses, gyms, and local groups." },
      { "title": "Local producers", "copy": "A clear route for farms and makers to reach more Thimphu kitchens." }
    ],
    "formEyebrow": "Partnership enquiry",
    "formHeading": "Start a partnership conversation.",
    "formCopy": "A few details help us send your request to the right person.",
    "submitLabel": "Send partnership request",
    "privacyCopy": "No commitment is created by this form. We will use your details only to discuss the partnership you describe.",
    "intakeOpen": true,
    "pausedTitle": "Partnership applications are paused.",
    "pausedCopy": "We are not accepting new partnership requests right now. Please check back soon.",
    "partnerTypes": [
      { "id": "office_workplace", "label": "Office or workplace" },
      { "id": "hotel_hospitality", "label": "Hotel or hospitality" },
      { "id": "gym_wellness", "label": "Gym or wellness space" },
      { "id": "university_school", "label": "University or school" },
      { "id": "farm_producer", "label": "Farm or producer" },
      { "id": "other", "label": "Other" }
    ]
  }'::jsonb
)
on conflict (key) do nothing;

-- Preserve old partnership enquiries that were submitted through the generic
-- contact form. The source ID makes this safe to re-run.
insert into public.partnership_requests (
  source_contact_message_id,
  contact_name,
  organisation_name,
  email,
  phone,
  partner_type,
  message,
  location,
  dzongkhag,
  status,
  created_at,
  updated_at,
  status_updated_at
)
select
  message.id,
  message.name,
  coalesce(nullif(trim((regexp_match(message.message, '(?m)^Organisation:[[:space:]]*(.+)$'))[1]), ''), message.name),
  message.email,
  coalesce(nullif(trim((regexp_match(message.message, '(?m)^Phone:[[:space:]]*(.+)$'))[1]), ''), ''),
  case lower(coalesce(trim((regexp_match(message.message, '(?m)^Partnership type:[[:space:]]*(.+)$'))[1]), ''))
    when 'office or workplace' then 'office_workplace'
    when 'hotel or hospitality' then 'hotel_hospitality'
    when 'gym or wellness space' then 'gym_wellness'
    when 'university or school' then 'university_school'
    when 'farm or producer' then 'farm_producer'
    else 'other'
  end,
  message.message,
  '',
  '',
  'new',
  message.created_at,
  message.created_at,
  message.created_at
from public.contact_messages message
where message.topic = 'partnership'
on conflict (source_contact_message_id) do nothing;

create or replace function public.partnership_partner_types()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select value->'partnerTypes'
      from public.content_blocks
      where key = 'partnership'
        and jsonb_typeof(value->'partnerTypes') = 'array'),
    '[
      {"id":"office_workplace","label":"Office or workplace"},
      {"id":"hotel_hospitality","label":"Hotel or hospitality"},
      {"id":"gym_wellness","label":"Gym or wellness space"},
      {"id":"university_school","label":"University or school"},
      {"id":"farm_producer","label":"Farm or producer"},
      {"id":"other","label":"Other"}
    ]'::jsonb
  );
$$;

create or replace function public.create_partnership_request(
  p_contact_name text,
  p_organisation_name text,
  p_email text,
  p_phone text default '',
  p_partner_type text default '',
  p_message text default '',
  p_location text default '',
  p_dzongkhag text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_types jsonb;
  v_request public.partnership_requests;
begin
  if char_length(trim(coalesce(p_contact_name, ''))) not between 1 and 120
    or char_length(trim(coalesce(p_organisation_name, ''))) not between 1 and 160
    or char_length(trim(coalesce(p_email, ''))) not between 3 and 254
    or char_length(trim(coalesce(p_message, ''))) not between 1 and 4000
    or char_length(trim(coalesce(p_phone, ''))) > 60
    or char_length(trim(coalesce(p_location, ''))) > 160
    or char_length(trim(coalesce(p_dzongkhag, ''))) > 100 then
    raise exception 'One or more partnership fields are invalid.';
  end if;

  if trim(p_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address.';
  end if;

  v_partner_types := public.partnership_partner_types();
  if not exists (
    select 1
    from jsonb_array_elements(v_partner_types) type_option
    where type_option->>'id' = trim(coalesce(p_partner_type, ''))
  ) then
    raise exception 'Choose a valid partnership type.';
  end if;

  if trim(p_partner_type) = 'farm_producer'
    and (trim(coalesce(p_location, '')) = '' or trim(coalesce(p_dzongkhag, '')) = '') then
    raise exception 'Farm location and Dzongkhag are required for farm or producer requests.';
  end if;

  insert into public.partnership_requests (
    contact_name, organisation_name, email, phone, partner_type, message, location, dzongkhag
  ) values (
    trim(p_contact_name), trim(p_organisation_name), lower(trim(p_email)), trim(coalesce(p_phone, '')),
    trim(p_partner_type), trim(p_message), trim(coalesce(p_location, '')), trim(coalesce(p_dzongkhag, ''))
  ) returning * into v_request;

  return to_jsonb(v_request);
end;
$$;

create or replace function public.get_admin_partnership_requests()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(request) order by request.created_at desc)
    from public.partnership_requests request
  ), '[]'::jsonb);
end;
$$;

create or replace function public.update_admin_partnership_request(
  p_request_id uuid,
  p_status text,
  p_admin_notes text default '',
  p_archived boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.partnership_requests;
  v_farmer_id text;
  v_name_base text;
  v_max_sort integer;
begin
  if not public.is_admin() then
    return jsonb_build_object('status', 'forbidden');
  end if;

  if p_status is null or p_status not in ('new', 'in_review', 'contacted', 'approved', 'declined') then
    raise exception 'Choose a valid partnership status.';
  end if;
  if char_length(coalesce(p_admin_notes, '')) > 5000 then
    raise exception 'Admin notes must be 5,000 characters or fewer.';
  end if;

  update public.partnership_requests request
  set
    status = p_status,
    admin_notes = trim(coalesce(p_admin_notes, '')),
    archived_at = case when coalesce(p_archived, false) then now() else null end,
    archived_by = case when coalesce(p_archived, false) then lower(auth.email()) else null end,
    status_updated_at = case when request.status is distinct from p_status then now() else request.status_updated_at end,
    status_updated_by = case when request.status is distinct from p_status then lower(auth.email()) else request.status_updated_by end
  where request.id = p_request_id
  returning * into v_request;

  if v_request.id is null then raise exception 'Partnership request not found.'; end if;

  if v_request.status = 'approved'
    and v_request.partner_type = 'farm_producer'
    and v_request.farmer_id is null then
    v_name_base := regexp_replace(lower(v_request.organisation_name), '[^a-z0-9]+', '-', 'g');
    v_name_base := trim(both '-' from v_name_base);
    if v_name_base = '' then v_name_base := 'farm'; end if;
    v_farmer_id := left(v_name_base, 42) || '-' || replace(left(v_request.id::text, 8), '-', '');
    select coalesce(max(sort_order), -1) + 1 into v_max_sort from public.farmers;

    insert into public.farmers (
      id, name, location, dzongkhag, products, tags, years_farming, bio,
      verified, partner_since, image, sort_order, published
    ) values (
      v_farmer_id, v_request.organisation_name, v_request.location, v_request.dzongkhag,
      '{}'::text[], '{}'::text[], 0, '', false, null, '', v_max_sort, false
    ) on conflict (id) do nothing;

    insert into public.farmer_private_info (
      farmer_id, contact_phone, contact_email, preferred_contact_method, admin_notes
    ) values (
      v_farmer_id,
      v_request.phone,
      v_request.email,
      case when v_request.phone <> '' then 'Phone' else 'Email' end,
      'Created from partnership request ' || v_request.id || E'\n\nContact: ' || v_request.contact_name || E'\n\nRequest:\n' || v_request.message ||
        case when v_request.admin_notes <> '' then E'\n\nPartnership notes:\n' || v_request.admin_notes else '' end
    ) on conflict (farmer_id) do nothing;

    update public.partnership_requests
    set farmer_id = v_farmer_id
    where id = v_request.id
    returning * into v_request;
  end if;

  return to_jsonb(v_request);
end;
$$;

revoke all on function public.partnership_partner_types() from public;
grant execute on function public.partnership_partner_types() to anon, authenticated;
revoke all on function public.create_partnership_request(text, text, text, text, text, text, text, text) from public;
grant execute on function public.create_partnership_request(text, text, text, text, text, text, text, text) to anon, authenticated;
revoke all on function public.get_admin_partnership_requests() from public;
grant execute on function public.get_admin_partnership_requests() to authenticated;
revoke all on function public.update_admin_partnership_request(uuid, text, text, boolean) from public;
grant execute on function public.update_admin_partnership_request(uuid, text, text, boolean) to authenticated;

create or replace function public.notify_admin_partnership_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.emit_admin_notification(
    'partnership_request_received',
    'New partnership request',
    new.organisation_name || ' submitted a partnership request.',
    '#/admin?tab=partnerships',
    'partnership_request_received:' || new.id
  );
  return new;
end;
$$;

drop trigger if exists admin_notification_partnership_requests on public.partnership_requests;
create trigger admin_notification_partnership_requests
  after insert on public.partnership_requests
  for each row execute function public.notify_admin_partnership_request();
