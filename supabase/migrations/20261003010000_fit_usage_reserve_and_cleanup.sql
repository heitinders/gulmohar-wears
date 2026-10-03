-- Try-on allowance taken before the vendor call (so parallel requests cannot all slip under the cap) and given back
-- when the vendor fails. Plus: deleting a client removes their phone from fit_usage, as the privacy page promises.

create function public.fit_reserve_tryon(p_key text, p_day date, p_cap int) returns boolean language plpgsql as $$
declare result int;
begin
  if p_cap < 1 then return false; end if;
  insert into public.fit_usage (phone_e164, day, tryons) values (p_key, p_day, 1)
  on conflict (phone_e164, day) do update set tryons = public.fit_usage.tryons + 1
    where public.fit_usage.tryons < p_cap
  returning tryons into result;
  return found;
end $$;

create function public.fit_refund_tryon(p_key text, p_day date) returns void language sql as $$
  update public.fit_usage set tryons = greatest(tryons - 1, 0) where phone_e164 = p_key and day = p_day
$$;

revoke execute on function public.fit_reserve_tryon(text, date, int) from public, anon, authenticated;
revoke execute on function public.fit_refund_tryon(text, date) from public, anon, authenticated;
grant execute on function public.fit_reserve_tryon(text, date, int) to service_role;
grant execute on function public.fit_refund_tryon(text, date) to service_role;

-- Security definer: staff may delete a client but have no rights on fit_usage themselves.
create function public.fit_forget_usage() returns trigger language plpgsql security definer set search_path = public as $$
begin delete from public.fit_usage where phone_e164 = old.phone_e164; return old; end $$;
revoke execute on function public.fit_forget_usage() from public, anon, authenticated;
create trigger fit_clients_forget_usage after delete on public.fit_clients for each row execute function public.fit_forget_usage();
