# Pulso de Ventas

Aplicacion web estatica para analizar ventas de productos elaborados desde una planilla.

## Como usarla

1. Abrir la app desde un servidor local o GitHub Pages.
2. Seleccionar una planilla `.xlsx`, `.xls` u `.ods`.
3. Presionar `Generar Ranking`.

La pagina lee la primera hoja del archivo, detecta departamentos, separa `PLU` y `Producto`, suma `UNI/KG` y `Venta Total`, y muestra rankings con filtros, ordenamiento y paginacion.

Tambien genera un ranking por DTO. Cada tabla agrupa productos por departamento, muestra un resumen de unidades y kilos vendidos, y permite filtrar por texto, por tipo (`UNI` o `KG`) y ordenar por venta o producto.

## Estructura

- `index.html`: pantalla principal de la aplicacion.
- `src/main.js`: punto de entrada de React.
- `src/PulsoApp.js`: estado principal de la aplicacion.
- `src/components/`: componentes visuales de menu, carga, tablas, resumen y paginacion.
- `src/lib/`: lectura de planillas, reglas de producto, formatos y utilidades.
- `src/constants.js`: version, paginacion y columnas base.
- `src/styles.css`: estilos de layout, tablas, menu lateral y mobile.
- `assets/images/`: logos e iconos de Pulso de Ventas.

## Formato esperado

La planilla debe tener datos de departamento, producto, unidades/kilos vendidos y venta. El `PLU` puede venir en una columna propia o al inicio del texto de producto.

Si existen encabezados `DTO`, `Departamento`, `Producto`, `UNI/KG` y `Venta Total`, la app los detecta automaticamente. Si no los encuentra, usa el formato historico:

- DTO: columna A
- Departamento: columna B
- Producto: columna C, con el PLU al inicio del texto
- UNI/KG: columnas D, F, H, J, L, N y P
- Venta Total: columnas E, G, I, K, M, O y Q

Los importes pueden venir como numero, con signo `$`, con separadores argentinos como `1.234,56`, o con separadores internacionales como `1,234.56`.

## Notas

La lectura de planillas usa SheetJS desde CDN. Si la pagina se abre sin conexion a internet y la libreria no esta en cache, se mostrara un mensaje indicando que no pudo cargarse.
