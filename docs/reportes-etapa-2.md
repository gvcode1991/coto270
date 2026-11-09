# Comparación de semanas (5.25.0)

Segunda etapa, implementada en `dev` sobre el guardado confiable de la etapa 1. Es una consulta de solo lectura: no modifica reportes, inventario, usuarios ni balances. Todavía no genera ni guarda informes permanentes, ni exporta PDF/Excel.

## Recorrido

1. Abrir Reportes guardados con una cuenta admin o gerente.
2. Elegir Usar como base en un reporte y Usar para comparar en otro. La selección se mantiene al cambiar páginas, buscar o filtrar fechas. No se permite seleccionar el mismo registro en ambos lugares.
3. Pulsar Comparar reportes. Se muestran los nombres y períodos utilizados, las advertencias y el total general.
4. Alternar Departamentos / Productos. Los productos permiten búsqueda por PLU/nombre, filtro por presencia en los reportes y paginación de hasta 15 productos. Las tablas se desplazan horizontalmente en móvil sin ensanchar la página.
5. Volver a reportes conserva la selección y los filtros mientras se permanezca en esta pantalla. Al recargar se debe seleccionar nuevamente; no se presenta una comparación temporal como informe guardado.

## Cálculo y relaciones

El servidor calcula siempre `comparado − base` a partir de las líneas originales guardadas, no de resúmenes editables del navegador ni del inventario actual. Unidades, kilogramos y dinero se mantienen separados. Las filas repetidas de un producto se suman, sin descartar importes.

Los productos se vinculan por PLU exacto, conservando ceros iniciales. Un cambio de descripción no crea otro producto, pero reutilizar un PLU para un artículo distinto no se puede detectar automáticamente con el modelo actual: revisar esas situaciones antes de interpretar el resultado.

Los departamentos se relacionan por DTO cuando existe. Si falta el código se usa el nombre sin diferencias de mayúsculas/tildes y se advierte de esta limitación. Si el código cambia, se muestran departamentos distintos. Si un PLU cambia de departamento, los totales por departamento reflejan ese movimiento y aparece una advertencia; el producto sigue vinculado por PLU en el total general.

`Solo en la base` y `Solo en la comparada` significan presencia en los archivos elegidos, no alta/baja del inventario ni prueba de que el producto no exista. El lado ausente aporta cero al cálculo. No se denomina merma a una caída de ventas. Un incremento en pesos no equivale por sí solo a ganancia ni demuestra un aumento de cantidades vendidas.

El porcentaje es `(comparado − base) / base × 100` solamente cuando la base es positiva. Con base cero se muestra Sin base de comparación; con base negativa, Base negativa. La diferencia absoluta se conserva en ambos casos. No se divide por cero ni se muestran porcentajes infinitos. Los valores se calculan sin redondear las cantidades originales; la interfaz los presenta con hasta dos decimales y moneda ARS.

Si un PLU cambia de UNI a KG o tiene medidas ambiguas dentro del mismo reporte, se mantienen sus cantidades observadas pero se anulan sus diferencias/porcentajes de cantidad. También se anulan esas variaciones en los departamentos afectados y en el total general, para no atribuir una reclasificación a crecimiento real. El dinero sigue siendo comparable. No se agregan conversiones entre unidades y kilos.

## Períodos y datos incompletos

- Sin inicio/fin válidos, sin productos o con fechas diarias fuera de rango/inconsistentes se rechaza la comparación (422). Los reportes permanecen guardados y consultables individualmente.
- Los períodos parciales, de diferente duración, superpuestos o invertidos generan advertencias. Se respeta el orden elegido y no se extrapolan ni prorratean importes.
- Se revisa la cobertura de siete fechas con detalle diario y el rango de siete días. Esto no acredita por sí solo la integridad contable del archivo ni que existieran ventas todos los días.
- Si las sumas diarias no coinciden con los totales semanales se advierte y se utilizan los totales guardados sin corregirlos silenciosamente.
- Los históricos sin medida explícita siguen la regla previa del importador (UNI en descripción; el resto KG), con una advertencia. Su clasificación debe verificarse, especialmente en archivos de otros comercios.
- Los números inválidos y desbordamientos numéricos provocan rechazo, no se reemplazan por cero.

## API y permisos

`GET /api/reports/compare?base=ID&comparado=ID` devuelve `{ comparacion }`, con metadatos de ambos reportes, advertencias y métricas generales, por departamento y por producto. Cada métrica contiene `base`, `comparado`, `diferencia`, `porcentaje` y `estado`; los resultados no calculables son `null`, no cero.

La ruta se declara antes de `/:id`. Aplica los mismos controles de base disponible, sesión y `reportes:ver` que el historial. Los IDs se validan en el servidor, deben ser distintos y ambos registros deben existir. No se aceptan totales enviados por el cliente. Sigue siendo un negocio por instalación/base: no se introduce multicomercio.

## Verificación y pendientes

Las pruebas de lógica incluyen porcentajes, bases cero/negativas, sumas coherentes, renombrados, duplicados de líneas, productos ausentes/exclusivos, cambios de medida/departamento, fechas, históricos, permisos e inexistencia de reportes. Las pruebas de interfaz recorren selección entre páginas, errores y reintento, filtros, paginación de productos, navegación y tablas móviles en claro/oscuro.

Se usan datos y respuestas de prueba, sin conectarse a MongoDB real. Sigue pendiente contrastar dos semanas conocidas en una base de desarrollo y verificar dispositivos físicos antes de promover. No se ejecutan migraciones ni despliegues en Render. Los informes con resultados guardados y exportación son etapas posteriores.

Resultados: 83 pruebas de lógica y 63 de interfaz aprobadas, además de sintaxis, construcción estática y servidor HTTP local. Se repitió el recorrido completo de comparación en los tres navegadores tras el último ajuste de navegación y capturas (3 pruebas adicionales aprobadas). Las capturas usan datos ficticios:

- [Escritorio, claro](capturas/comparacion-semanas-escritorio.png)
- [Móvil, oscuro](capturas/comparacion-semanas-movil.png)
