-- Memastikan kolom `no_urut` tabel santri terisi otomatis saat insert.
-- Kode aplikasi (impor Excel dan form santri) tidak mengirim `no_urut`.
--
-- `halaqoh` TIDAK diurus di sini: kolom itu generated column (dikonfirmasi lewat error
-- 428C9 saat percobaan pertama), jadi database sudah mengisinya dari kelas dan bagian.
--
-- Skrip ini aman dijalankan ulang. Jika `no_urut` sudah punya default, identity, atau
-- generated expression, skrip hanya menampilkan notice dan tidak mengubah apa pun.

do $migration$
declare
  v_col record;
begin
  select is_generated, is_identity, column_default
  into v_col
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'santri'
    and column_name = 'no_urut';

  if not found then
    raise exception 'Kolom public.santri.no_urut tidak ditemukan.';
  end if;

  if v_col.is_generated = 'ALWAYS'
     or v_col.is_identity = 'YES'
     or v_col.column_default is not null then
    raise notice 'no_urut sudah terisi otomatis oleh database. Tidak ada yang diubah.';
    return;
  end if;

  create sequence if not exists public.santri_no_urut_seq;

  perform setval(
    'public.santri_no_urut_seq',
    greatest((select coalesce(max(no_urut), 0) from public.santri), 1),
    (select count(*) > 0 from public.santri)
  );

  execute $fn$
    create or replace function public.santri_set_no_urut()
    returns trigger
    language plpgsql
    as $body$
    begin
      if new.no_urut is null then
        new.no_urut := nextval('public.santri_no_urut_seq');
      end if;
      return new;
    end;
    $body$
  $fn$;

  drop trigger if exists trg_santri_set_no_urut on public.santri;
  create trigger trg_santri_set_no_urut
    before insert on public.santri
    for each row execute function public.santri_set_no_urut();

  raise notice 'Trigger pengisi no_urut dipasang.';
end
$migration$;
