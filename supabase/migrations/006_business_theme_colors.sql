alter table public.business_settings
  add column if not exists theme_colors jsonb not null default '{
    "projectBackground": "#0a0d10",
    "subBackground": "#11161d",
    "title": "#ffffff",
    "subtitle": "#d6d3d1",
    "description": "#d6d3d1",
    "scheduleButton": "#d4af6b",
    "whatsappButton": "#11161d",
    "navbar": "#0f1217",
    "navbarText": "#d6d3d1",
    "barberTitle": "#ffffff",
    "barberDescription": "#f6e5b3",
    "barberAccent": "#d4af6b",
    "barberCard": "#1c1917",
    "formPanel": "#1c1917",
    "formField": "#0c0a09",
    "formText": "#d6d3d1"
  }'::jsonb;
