insert into public.services (id, name, description, price, duration_minutes, image_url, active)
values
  (
    'service-cut',
    'Corte tradicional',
    'Corte clássico com acabamento impecável.',
    45,
    45,
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=80',
    true
  ),
  (
    'service-grad',
    'Degrade',
    'Estilo moderno com acabamento refinado.',
    60,
    60,
    'https://images.unsplash.com/photo-1521590832167-7e5a4f7d1a00?auto=format&fit=crop&w=900&q=80',
    true
  ),
  (
    'service-zero',
    'Zero',
    'Corte rente com acabamento preciso.',
    40,
    30,
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=80',
    true
  ),
  (
    'service-highlights',
    'Luzes',
    'Coloração com luzes para renovar o visual.',
    120,
    120,
    'https://images.unsplash.com/photo-1521590832167-7e5a4f7d1a00?auto=format&fit=crop&w=900&q=80',
    true
  ),
  (
    'service-beard',
    'Barba',
    'Design e modelagem com toalha quente.',
    35,
    30,
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=80',
    true
  ),
  (
    'service-combo',
    'Barba e Cabelo',
    'Pacote premium para o visual completo.',
    80,
    75,
    'https://images.unsplash.com/photo-1593491324841-6a598ed6a8f2?auto=format&fit=crop&w=900&q=80',
    true
  ),
  (
    'service-brow',
    'Sombrancelha',
    'Modelagem precisa com foco na simetria.',
    25,
    20,
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
    true
  )
on conflict (id) do nothing;
