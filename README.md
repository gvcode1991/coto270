# coto270

Herramienta web para generar un ranking semanal de productos elaborados desde una planilla.

## Como usarla

1. Abrir `index.html` en el navegador.
2. Seleccionar una planilla `.xlsx`, `.xls` u `.ods`.
3. Presionar `Generar Ranking`.

La pagina lee la primera hoja del archivo, suma las columnas de `UNI/KG` y `Venta Total`, y ordena los productos de mayor a menor venta.

## Formato esperado

La planilla debe tener una columna con encabezado `Producto`.

Si existen encabezados `UNI/KG` y `Venta Total`, la app los detecta automaticamente. Si no los encuentra, usa el formato historico:

- Producto: columna C
- UNI/KG: columnas D, F, H, J, L, N y P
- Venta Total: columnas E, G, I, K, M, O y Q

Los importes pueden venir como numero, con signo `$`, con separadores argentinos como `1.234,56`, o con separadores internacionales como `1,234.56`.

## Notas

La lectura de planillas usa SheetJS desde CDN. Si la pagina se abre sin conexion a internet y la libreria no esta en cache, se mostrara un mensaje indicando que no pudo cargarse.
