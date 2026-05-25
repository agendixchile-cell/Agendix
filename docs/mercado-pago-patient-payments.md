# Cobros de pacientes con Mercado Pago

Este flujo es para cobrar sesiones, reservas, servicios o abonos desde un centro/profesional hacia sus pacientes. No corresponde al billing de planes de Agendix.

## Variables de entorno

Configurar en local y en Vercel:

```env
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_PUBLIC_KEY=
MERCADO_PAGO_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

`MERCADO_PAGO_ACCESS_TOKEN` y `SUPABASE_SERVICE_ROLE_KEY` son secretos de servidor y nunca deben exponerse con prefijo `NEXT_PUBLIC_`.

## Migracion Supabase

Aplicar:

```bash
supabase db push
```

Migracion incluida:

```text
supabase/migrations/20260525190000_patient_payments.sql
```

Crea:

- `patient_payments`
- `patient_payment_events`

Ambas tablas tienen RLS. `authenticated` puede operar solo pagos de su organizacion; el webhook usa service role desde backend.

## Webhook Mercado Pago

Configurar la URL:

```text
https://TU_DOMINIO/api/webhooks/mercado-pago
```

Activar eventos de pagos. El webhook valida firma con `MERCADO_PAGO_WEBHOOK_SECRET` cuando esta configurado.

## Flujo de prueba

1. Crear paciente.
2. Crear servicio con precio en CLP.
3. Crear reserva asociada a paciente y servicio.
4. Abrir la reserva y presionar `Generar link de pago`.
5. Confirmar monto y descripcion.
6. Copiar o abrir el link de Mercado Pago.
7. Completar pago en Mercado Pago.
8. Confirmar que el webhook actualice `patient_payments.status`.
9. Revisar la reserva: debe mostrar `Pagado`, `Cobro pendiente` o `Rechazado`.
10. Revisar el paciente desde `Pagos`: debe mostrar su historial.

## Pendientes futuros

- Agregar credenciales por organizacion si cada centro opera con su propia cuenta Mercado Pago.
- Implementar `fintoc.ts` con Checkout Sessions y webhook propio.
- Agregar reembolsos desde UI cuando el proveedor soporte la operacion.
- Agregar conciliacion manual para pagos fuera de Mercado Pago.
