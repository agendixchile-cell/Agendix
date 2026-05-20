# Prompt para Claude Design — Landing Agendix (agendixchile.cl)

> Pegar el bloque siguiente en Claude Design tal cual. Está construido a partir del lenguaje visual real de la plataforma (`globals.css`, componentes UI, layouts auth/dashboard y página pública `/[slug]`). No requiere edición previa.

---

## INSTRUCCIÓN AL MODELO

Diseña una landing page SaaS B2B en español (Chile) para **Agendix**, plataforma de gestión operacional para centros de salud (agenda clínica, reservas online, pacientes, profesionales, salas, fichas clínicas y recordatorios). La landing debe ser visualmente **indistinguible** de la plataforma actual; reutiliza con precisión el sistema de design tokens, tipografía, jerarquía, componentes y signature elements que se detallan abajo. Prioriza claridad operacional sobre dramatismo de marketing: la pieza debe leerse como software clínico serio, no como SaaS genérico.

Entrega como un único archivo Next.js App Router (`app/page.tsx`) con Tailwind v4 utility classes alineadas al `globals.css` que se transcribe íntegro al final. No introduzcas dependencias adicionales; usa Lucide React para iconografía (ya está disponible).

---

## 1. IDENTIDAD VISUAL — NO NEGOCIABLE

### 1.1 Paleta cromática (hex exactos)

| Token | Hex | Uso |
|---|---|---|
| `--agendix-primary` | `#F9735B` | CTA primario, links, icon fills, acentos |
| `--agendix-primary-dark` | `#E85C45` | Hover de CTA primario |
| `--agendix-primary-950` | `#7A2519` | Texto sobre tintes claros, selección |
| `--agendix-ink` | `#22211F` | Hero dark section (NO usar `#000000`) |
| `--agendix-background` | `#FAFAF8` | Fondo global de la página |
| `--agendix-soft` | `#FFF4EF` | Paneles tintados, hover sutil, badges orange |
| `auth-background` | `#FCFBF9` | Bandas alternas de sección (más cálido aún) |
| `--agendix-surface` | `#FFFFFF` | Cards, modales, surfaces elevadas |
| `--agendix-text` | `#1E293B` | Texto principal (slate-800) |
| `--agendix-muted` | `#64748B` | Texto secundario (slate-500) |
| Slate-400 | `#94A3B8` | Texto terciario, eyebrows en off-state |
| `--agendix-border` | `#E5E7EB` | Bordes 1px estándar |
| `--agendix-border-strong` | `#CBD5E1` | Bordes con mayor contraste |
| Emerald-500 | `#22C55E` | Estado positivo, indicador de éxito |
| Sky-500 | `#3B82F6` | Información, badges azules |
| Violet-500 | `#8B7CF6` | Acento secundario excepcional |
| Amber-500 | `#F59E0B` | Warning |
| Red-500 | `#EF4444` | Danger |

**Regla cromática crítica.** El coral `#F9735B` es el único color que carga peso de marca; el resto del sistema debe leerse en escala de grises cálidos con `#FAFAF8` como base. Las secciones jamás usan fondos saturados; el contraste se construye con la sección oscura `#22211F` y los paneles soft `#FFF4EF`. No introducir gradientes salvo washes muy sutiles tipo `from-orange-50/40 to-transparent` decorativos.

### 1.2 Tipografía

Fuente única **Inter** (vía `--font-sans`). Sin serifs, sin display fonts.

| Rol | Tamaño | Peso | Tracking | Color |
|---|---|---|---|---|
| Hero H1 | `text-4xl sm:text-5xl lg:text-6xl` | `font-bold` | `tracking-tight` | `text-slate-900` |
| Section H2 | `text-3xl sm:text-4xl` | `font-bold` | `tracking-tight` | `text-slate-900` |
| Card title H3 | `text-lg` | `font-semibold` | — | `text-slate-900` |
| Eyebrow | `text-[11px]` | `font-medium` | `uppercase tracking-wide` | `text-slate-400` |
| Lead/subtítulo hero | `text-lg sm:text-xl` | normal | `leading-7` | `text-slate-500` |
| Body | `text-sm` o `text-base` | normal | `leading-6` | `text-slate-600` / `text-slate-500` |
| Stat valor | `text-3xl sm:text-4xl` | `font-semibold` | `tracking-tight leading-none` | `text-slate-800` |
| Pricing valor | `text-4xl sm:text-5xl` | `font-bold` | `tracking-tight` | `text-slate-900` |
| Label/microcopy | `text-xs` | `font-medium` | — | `text-slate-500` |

### 1.3 Radios, sombras y bordes

- Radios canónicos: `rounded-lg` (0.625rem) en pills, `rounded-xl` (0.75rem) en botones e inputs, `rounded-2xl` (1rem) en cards y secciones, `rounded-full` solo en badges y avatares.
- Sombras: **sutiles, casi imperceptibles**. Patrón base `shadow-sm shadow-slate-900/[0.035]`. Cards de hero o pricing destacado `shadow-xl shadow-slate-900/[0.06]`. Nunca usar shadow-2xl ni sombras coloreadas saturadas.
- Bordes: 1px, `border-slate-200/80` o `border-orange-200/70` cuando hay tinte. Empty states usan `border-dashed border-orange-200/70`.
- Ring 1px (`ring-1 ring-slate-200/80`) en avatares, símbolos e icon-containers.

### 1.4 Iconografía

Lucide React, stroke-width default, tamaño `16-20px` en contenedores, `24px` en hero ilustrativo. Iconos viven en contenedores 9×9 a 11×11 con esquema:

```
<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500 ring-1 ring-orange-200/60">
  <Icon size={20} />
</span>
```

Variantes tonales válidas (siempre con el mismo patrón ring-1 + bg-50 + text-500/600):
`orange` (default), `emerald` (verde), `sky` (azul), `violet` (lavanda), `slate` (gris), `red` (alerta). Una tonal distinta por feature para crear variedad sin romper marca.

### 1.5 Logo y símbolo

- Wordmark PNG en `/agendix-wordmark.png` (existe en `/public`). Usar en header y footer. Altura `h-10` mobile / `h-11` desktop.
- Symbol SVG inline (A con círculo central y V inferior, todo en `#F9735B`) dentro de un contenedor `rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200/80`. Tamaños `h-11 w-11` (md) o `h-14 w-14` (lg).

---

## 2. COMPONENTES BASE A REPRODUCIR

Replicar **exactamente** estos patrones, ya canónicos en la plataforma. No reinventar variantes.

### 2.1 Botón primario

```
className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white shadow-sm shadow-orange-600/20 transition-all hover:bg-orange-600 active:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2"
```

### 2.2 Botón secundario

```
className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-900/[0.035] transition-all hover:border-orange-200 hover:bg-orange-50/50 hover:text-slate-900"
```

### 2.3 Card estándar (`agendix-surface`)

```
className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-900/[0.04]"
```

### 2.4 Card soft tintada (`agendix-soft-panel`)

```
className="rounded-2xl border border-slate-200/80 bg-[#FFF4EF] p-6"
```

### 2.5 Badge

```
className="inline-flex items-center whitespace-nowrap rounded-full border border-orange-200/80 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold leading-5 text-orange-700"
```

### 2.6 Sección hero oscura (signature element)

```
className="overflow-hidden rounded-3xl bg-[#22211F] px-6 py-10 text-white shadow-xl shadow-slate-950/[0.12] sm:px-10 sm:py-14"
```

Dentro: eyebrow `text-white/55 uppercase`, H1 blanco, secundarios `text-white/70`, CTA primario coral mantiene su estilo (alto contraste sobre fondo ink).

### 2.7 Grid de contenedor

`mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8`. Para hero y full-bleed `max-w-[1280px]`. Nunca exceder 1440px.

---

## 3. ESTRUCTURA DE LA LANDING

Una sola página, scroll vertical, secciones separadas por `py-20 sm:py-24` con bandas alternas `bg-[#FAFAF8]` y `bg-[#FCFBF9]` (cálido sobre cálido, contraste mínimo).

### 3.1 Header sticky

`sticky top-0 z-30` con `bg-white/85 backdrop-blur-xl border-b border-slate-200/70`. Altura `h-16`. Izquierda: wordmark. Centro (desktop): nav links (`Producto`, `Funcionalidades`, `Planes`, `FAQ`) en `text-sm font-medium text-slate-600 hover:text-slate-900`. Derecha: link `Iniciar sesión` (texto, color `text-slate-700 hover:text-orange-600`) + botón primario `Crear cuenta` que apunta a `https://app.agendixchile.cl/register`.

### 3.2 Hero (sección 1)

Layout: dos columnas en desktop (`lg:grid-cols-[1.1fr_1fr] gap-12 items-center`), single column mobile.

Columna izquierda:
- Badge superior con check de verificación: `Para centros de salud en Chile`.
- H1 (4-5 líneas máx, sin emojis, sin signos de puntuación inflados): `Tu centro de salud, operando como una sola agenda.`
- Subtítulo (1-2 líneas, 24-28 palabras): `Agendix unifica reservas online, agenda clínica, pacientes y recordatorios en un solo lugar. Menos coordinación manual, más ocupación, mejor experiencia para tus pacientes.`
- Dos CTAs lado a lado: `Crear cuenta` (primario, link a `https://app.agendixchile.cl/register`) y `Ver demo` (secundario, link a `https://app.agendixchile.cl/login` o `/demo`).
- Microcopy bajo CTAs: `Sin tarjeta de crédito · Listo para operar en minutos` en `text-xs text-slate-400`.

Columna derecha:
- Mock visual del producto. Usar un card `rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/[0.06] p-5` que simule la vista de agenda diaria con bloques de cita coloreados (orange-50, emerald-50, sky-50) y horas en columna izquierda. Header del mock con punto verde + texto `En vivo`. Mantener jerarquía visual auténtica (no añadir charts decorativos falsos).

### 3.3 Social proof / cintilla de confianza

Banda angosta (`py-8`) sobre `bg-[#FCFBF9]`. Línea: `Centros de salud que ya operan con Agendix` en eyebrow + logos placeholder en grayscale (5-6 nombres tipo *Clínica Dental Norte*, *Centro Kinésico Andes*, *Vital Salud*, etc., en texto Inter semibold slate-400 — no inventar logos reales). Si Claude Design genera imágenes, deben ser monogramas en gris.

### 3.4 Problema (sección 3)

Banda `bg-[#FAFAF8]`. H2 centrado `Coordinar un centro de salud no debería tomar todo el día.` con subtítulo de una línea. Grid de 3 columnas en desktop, single en mobile. Cada item: icono en contenedor coral, titular corto (4-6 palabras), descripción 2 líneas en `text-slate-500`. Ítems sugeridos:

1. **Reservas dispersas.** Llamados, WhatsApp y planillas que se desincronizan entre la recepción y los profesionales.
2. **Ausencias y huecos de agenda.** Pacientes que no llegan y bloques productivos que nadie alcanza a reasignar.
3. **Información fragmentada.** Fichas, historial y datos de contacto repartidos entre carpetas, mails y cuadernos.

### 3.5 Solución / cómo funciona (sección 4)

Banda `bg-[#FCFBF9]`. Layout zig-zag clásico — tres bloques alternados imagen/texto. Cada bloque: tag con número `01`, `02`, `03` en eyebrow, titular `text-2xl font-bold`, párrafo corto, lista de 3 sub-features con check icon en coral.

Bloques:

1. **Agenda y reservas en un mismo flujo.** El paciente reserva online en tu portal público (`agendixchile.cl/[tu-centro]`) y aparece confirmado en la agenda del profesional, sin doble entrada.
2. **Centro de operación clínica.** Pacientes, profesionales, salas y servicios gestionados con permisos por rol, con visión consolidada de ocupación y desempeño.
3. **Recordatorios y seguimiento sin fricción.** Confirmaciones automáticas por email, fichas clínicas estructuradas y respaldo continuo.

### 3.6 Features grid (sección 5)

Banda `bg-[#FAFAF8]`. H2: `Todo lo que tu centro necesita, en una sola plataforma.` Grid 3 columnas desktop, 2 tablet, 1 mobile. **8 cards** correspondientes a los módulos reales del producto. Cada card usa el patrón `agendix-surface` con icon-container tonal distinto rotando entre las 6 tonalidades disponibles para crear ritmo:

| Card | Tonal | Icono Lucide |
|---|---|---|
| Agenda clínica | orange | `Calendar` |
| Reservas públicas | sky | `Globe` |
| Pacientes | violet | `Users` |
| Profesionales | emerald | `UserCheck` |
| Salas y recursos | orange | `MapPin` |
| Servicios y precios | sky | `Tag` |
| Recordatorios automáticos | emerald | `Bell` |
| Fichas clínicas | violet | `FileText` |

Cada card: titular 1 línea, descripción 2-3 líneas, sin botón CTA por card (mantener limpieza).

### 3.7 Beneficios cuantitativos (sección 6)

Banda hero-oscura `bg-[#22211F]`. H2 en blanco: `Resultados operacionales que sí se sienten.` Grid de 4 stat-cards en blanco translúcido `bg-white/[0.04] border border-white/10 rounded-2xl p-6`. Cada stat:

- Valor grande `text-4xl font-bold text-white tracking-tight`
- Label en `text-sm text-white/55`

Stats sugeridos (mantener creíbles, evitar inflar):
- **−40%** tiempo dedicado a coordinar agenda
- **+25%** ocupación promedio mensual
- **<2 min** para reservar una hora desde el portal público
- **24/7** disponibilidad de reservas online

### 3.8 Para quién es Agendix (sección 7)

Banda `bg-[#FCFBF9]`. 3 cards en grid horizontal. Cada card con avatar coral con iniciales + perfil + dolor que resuelve. Perfiles:

- **Centros multidisciplinarios.** Coordinan profesionales, salas y servicios desde un solo lugar.
- **Profesionales independientes.** Levantan su agenda online sin depender de TI ni planillas.
- **Cadenas y franquicias clínicas.** Visión consolidada por sucursal sin perder autonomía operativa.

### 3.9 Planes (sección 8)

Banda `bg-[#FAFAF8]`. H2: `Un plan para cada etapa del centro.` Subtítulo: `Empieza simple. Escala cuando tu operación lo pida.` 3 columnas, plan medio destacado con borde coral y badge `Más elegido`.

Estructura de cada plan (mantener prosa sobria, sin lenguaje hyperbólico):

**Inicial** — para profesionales que recién levantan su agenda online.
- Precio: `Desde $0 / mes` o `Gratis` según política comercial.
- Incluye: 1 profesional, agenda online, reservas públicas, recordatorios por email, soporte por correo.
- CTA: `Empezar ahora` (secundario).

**Profesional** *(destacado)* — para centros con equipo y agenda activa.
- Precio: `$XX.XXX CLP / mes` (placeholder claramente marcado).
- Incluye: hasta 5 profesionales, fichas clínicas, gestión de salas y servicios, métricas operacionales, soporte prioritario.
- CTA: `Probar Profesional` (primario coral).

**Centro** — para operaciones consolidadas y multi-sucursal.
- Precio: `A medida`.
- Incluye: profesionales ilimitados, multi-sucursal, integraciones, onboarding asistido, SLA.
- CTA: `Hablar con ventas` (secundario).

Cards de plan: `rounded-2xl border bg-white p-7 shadow-sm`. El destacado: `border-orange-300 ring-1 ring-orange-200/50 shadow-xl shadow-orange-600/[0.08]`.

### 3.10 Confianza, seguridad y datos (sección 9)

Banda `bg-[#FCFBF9]`. Una banda angosta con 4 ítems en línea (desktop). Cada uno: icono coral + título corto + línea de descripción. Items: `Datos en infraestructura segura`, `Cumplimiento con normativa chilena`, `Respaldos automáticos`, `Acceso por roles y permisos`. Esta sección refuerza confianza B2B; no exagerar certificaciones que aún no existen.

### 3.11 FAQ (sección 10)

Banda `bg-[#FAFAF8]`. Layout dos columnas: izquierda H2 + lead, derecha lista de 6 preguntas en accordion (`<details>` HTML semántico, abrir la primera por default). Cada item: `border-b border-slate-200/80 py-5`, pregunta `text-base font-semibold text-slate-900`, respuesta `text-sm text-slate-600 leading-6`.

Preguntas obligatorias (responder con tono operacional, no hiperbólico, 2-3 líneas máx cada una):
1. ¿Cómo migro los pacientes y la agenda actual a Agendix?
2. ¿Mis pacientes pueden reservar sin crear cuenta?
3. ¿Cómo manejan los datos clínicos y la privacidad?
4. ¿Funciona para centros con varios profesionales y salas?
5. ¿Qué pasa con los recordatorios y las confirmaciones?
6. ¿Tienen un periodo de prueba?

### 3.12 CTA final (sección 11)

Card a ancho completo dentro del container, fondo `#22211F`, padding `py-16`. Centrado: eyebrow `text-orange-300 uppercase`, H2 blanco `Pon a operar tu centro hoy.`, subtítulo blanco/70, dos CTAs: primario `Crear cuenta gratis` y secundario en variante outline blanca (`border-white/30 text-white hover:bg-white/5`).

### 3.13 Footer

`bg-[#FAFAF8] border-t border-slate-200/80`. 4 columnas desktop, stack mobile.
- Col 1: wordmark + tagline `Sistema operacional para centros de salud.` + ciudad `Santiago, Chile`.
- Col 2: **Producto** — Funcionalidades, Planes, Demo, Login.
- Col 3: **Empresa** — Sobre Agendix, Contacto, Blog *(si aplica)*.
- Col 4: **Legal** — Privacidad (`/privacidad`), Términos (`/terminos`).

Línea inferior: `© 2026 Agendix · Todos los derechos reservados.` en `text-xs text-slate-400`.

---

## 4. MICROCOPY — TONO Y REGLAS

- Español neutro chileno, formal pero accesible. Tratar de tú al lector (centro/profesional).
- **Prohibido**: emojis, exclamaciones múltiples, lenguaje de growth-hack (`¡Revoluciona!`, `Únete a miles!`, `🚀`), claims sin sustento (`la mejor`, `#1`).
- **Permitido**: lenguaje operacional, cifras verificables, beneficios concretos del flujo clínico.
- Headlines no terminan en signo de admiración. Punto al final aceptable, mejor sin puntuación.
- Subtítulos: máximo 28 palabras, una idea por subtítulo.
- Botones: verbos en imperativo, 2-3 palabras (`Crear cuenta`, `Ver demo`, `Hablar con ventas`).

---

## 5. ACCESIBILIDAD Y RESPONSIVE

- Contraste mínimo WCAG AA en todos los pares texto/fondo (validar `text-slate-500` sobre `#FAFAF8` y `text-white/55` sobre `#22211F`).
- Tamaño mínimo de texto body: 14px (`text-sm`).
- Targets táctiles ≥ 44×44 px en botones y enlaces principales (`h-11` cumple).
- `focus-visible:ring-2 ring-orange-400/70 ring-offset-2` en todos los elementos interactivos.
- Mobile-first. Breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`. La densidad de información debe reducirse, no comprimirse.
- Imágenes con `alt` real; iconos decorativos con `aria-hidden="true"`.

---

## 6. CTAs OBLIGATORIOS (URLs reales)

- **Crear cuenta / Registro**: `https://app.agendixchile.cl/register`
- **Iniciar sesión**: `https://app.agendixchile.cl/login`
- **Contacto comercial**: `mailto:contacto@agendixchile.cl` (placeholder editable)
- La landing **no** debe manejar sesiones ni replicar dashboards.

---

## 7. ENTREGABLE TÉCNICO

- Stack: Next.js 15 App Router + Tailwind v4 + TypeScript.
- Un único archivo `app/page.tsx` autocontenido con todas las secciones.
- Importar Lucide solo lo necesario.
- No usar `localStorage`, ni animaciones JS pesadas; transiciones CSS `transition-all duration-200 ease-out` son suficientes.
- Optimizado para LCP < 2.5s — sin imágenes pesadas en hero; el mock del producto se renderiza como JSX puro.

---

## 8. `globals.css` DE REFERENCIA (transcrito íntegro de la plataforma)

```css
@import "tailwindcss";

:root {
  --agendix-primary: #F9735B;
  --agendix-primary-dark: #E85C45;
  --agendix-primary-950: #7A2519;
  --agendix-ink: #22211F;
  --agendix-secondary: #22C55E;
  --agendix-secondary-dark: #16A34A;
  --agendix-accent: #3B82F6;
  --agendix-lavender: #7c6df2;
  --agendix-surface: #ffffff;
  --agendix-surface-raised: #ffffff;
  --agendix-background: #FAFAF8;
  --agendix-soft: #FFF4EF;
  --agendix-border: #E5E7EB;
  --agendix-border-strong: #CBD5E1;
  --agendix-text: #1E293B;
  --agendix-muted: #64748B;
  --agendix-success: #22C55E;
  --agendix-warning: #F59E0B;
  --agendix-danger: #EF4444;
  --agendix-info: #3B82F6;
  --background: var(--agendix-background);
  --foreground: var(--agendix-text);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-ink: var(--agendix-ink);
  --font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  --color-orange-50: #FFF4EF;
  --color-orange-100: #FFE8DC;
  --color-orange-200: #FFD0BC;
  --color-orange-300: #FFB09A;
  --color-orange-400: #FB9080;
  --color-orange-500: #F9735B;
  --color-orange-600: #E85C45;
  --color-orange-700: #C8432E;
  --color-orange-800: #A33325;
  --color-orange-900: #7A2519;
  --color-orange-950: #451209;

  --color-emerald-500: #22C55E;
  --color-emerald-600: #16A34A;
  --color-sky-500: #3B82F6;
  --color-violet-500: #8B7CF6;

  --radius-lg: 0.625rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-3xl: 1.25rem;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
}
```

---

## 9. CRITERIO DE ACEPTACIÓN

La landing está bien resuelta si, puesta lado a lado con `https://agendix-three.vercel.app/login` y con la página pública `/[slug]` de un centro, un observador identifica de inmediato que pertenecen al mismo sistema visual: misma tipografía Inter, mismo coral `#F9735B` como único acento de marca, mismo fondo cálido `#FAFAF8`, mismos radios `rounded-2xl`, mismas sombras casi imperceptibles, misma sección oscura `#22211F` como contrapunto. Si la pieza se siente "moderna SaaS genérica" con gradientes, glassmorphism, neón o dark mode forzado, está mal resuelta.

---

**FIN DEL PROMPT.**
