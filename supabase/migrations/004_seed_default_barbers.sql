insert into public.barbers (id, name, photo_url, specialty, active)
values
  (
    'barber-1',
    'Mateus',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80',
    'Cortes clássicos',
    true
  ),
  (
    'barber-3',
    'Caio',
    'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=500&q=80',
    'Barba e sobrancelha',
    true
  ),
  (
    'barber-4',
    'Bruno',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80',
    'Cortes modernos',
    true
  ),
  (
    'barber-5',
    'Lucas',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80',
    'Degradê e acabamento',
    true
  ),
  (
    'barber-6',
    'André',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80',
    'Barba e cortes clássicos',
    true
  )
on conflict (id) do nothing;
