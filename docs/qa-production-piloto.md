# QA production piloto Agendix

Este checklist se ejecuta despues de cualquier hotfix, deploy o cambio operativo en production. No usar datos reales innecesarios. Si se crea una reserva de prueba, debe ser claramente identificable y eliminable.

## Datos de prueba permitidos

- Usar un usuario real autorizado del centro.
- Usar un paciente de prueba con nombre evidente, por ejemplo `Paciente Prueba Agendix`.
- No usar RUT, telefono, email ni notas clinicas reales para pruebas.
- No tomar capturas con datos reales visibles.

## Flujos obligatorios

| Flujo | Resultado esperado | Estado | Evidencia |
| --- | --- | --- | --- |
| Login usuario real | Entra sin error y no muestra modo demo | Pendiente usuario | Captura sin datos sensibles o nota manual |
| Dashboard | Carga datos del centro correcto | Pendiente usuario | Sin errores visibles |
| Agenda | Muestra reservas del centro correcto | Pendiente usuario | Sin errores consola |
| Pacientes | Carga y filtra dentro del centro | Pendiente usuario | Sin datos de otros centros |
| Profesionales | Lista equipo del centro | Pendiente usuario | Roles correctos |
| Servicios | Lista servicios del centro | Pendiente usuario | Sin datos demo |
| Salas | Lista salas del centro | Pendiente usuario | Sin acceso anon directo |
| Portal publico | Carga por slug del centro | Pendiente usuario | Usa vista/RPC publica minima |
| Reserva publica controlada | Crea reserva de prueba o valida flujo hasta confirmacion | Pendiente usuario | Sin pago online |
| Editar/cancelar reserva controlada | Cambia estado sin error | Pendiente usuario | Reserva de prueba cerrada |
| Ruta privada sin sesion | Redirige a login | Pendiente usuario | Probar en incognito |
| Demo production | No aparece boton/demo/datos ficticios | Pendiente usuario | Variables demo apagadas |
| Vercel logs | Sin errores criticos post-hotfix | Pendiente usuario | Revisar Runtime Logs |
| Supabase logs | Sin errores criticos post-hotfix | Pendiente usuario | Revisar API/Postgres logs |

## Criterio de cierre

Production queda aceptada para continuar el piloto cerrado solo si:

- No aparecen datos de otro centro.
- No hay errores criticos en login, agenda, pacientes o portal publico.
- El modo demo no aparece.
- El flujo publico no ofrece pago online.
- No hay errores criticos en Vercel ni Supabase despues del hotfix.

Si falla privacidad, RLS, login o portal publico, se detiene el deploy y se documenta incidente antes de seguir operando.
