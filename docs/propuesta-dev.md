# Propuesta hacia dev: adaptación comercial 5.22.0

Rama de origen: `codex/adaptacion-comercios`. Destino para revisión: `dev`.

La rama parte de `dev` / `origin/dev` en `bc452a1`. Los cambios locales previos de administración se conservaron en `d9aa176`, como un commit independiente: eliminación protegida de usuarios y paginación/limpieza de actividad. No se descartó trabajo local.

## Cambios propuestos

- Identidad configurable con nombre y rubro en Tu negocio, exclusiva de admin y persistida en un documento MongoDB independiente.
- Valores predeterminados compatibles, sin migrar productos, reportes, usuarios ni balances.
- Presentación unificada clara/oscura, navegación comprensible, formularios y tablas adaptables, menú móvil y foco de teclado.
- Departamentos comerciales extensos cuando existe una columna identificada; cálculos e identificadores originales conservados.
- Vista local sin conexión a MongoDB y documentación explícita de límites del importador y del alcance de un negocio por base.

No se añaden dependencias. No se implementan multicomercio, columnas configurables, litros ni márgenes.

## Revisión antes de promover

1. Revisar el diff y las [capturas](adaptacion-comercios.md#resultados-de-la-versión-5220).
2. Probar localmente la carga de una planilla compatible y contrastar cantidades/ventas conocidas.
3. En una base de desarrollo independiente, comprobar guardado/recarga de Tu negocio con admin, rechazo sin permisos e inventario/balances de prueba. Esa integración real queda pendiente.
4. Ejecutar los scripts documentados y revisar Safari/Chrome físicos.
5. Autorizar por separado el merge hacia dev y cualquier despliegue. Después mantener el flujo `dev → prod → main`, con validación entre etapas.

Esta propuesta no autoriza merges, cambios en Render ni escritura de pruebas en la base real.
