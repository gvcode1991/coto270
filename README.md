# coto270

Herramienta web para generar un ranking semanal de productos elaborados desde una planilla.

## Como usarla

1. Abrir `index.html` en el navegador.
2. Seleccionar una planilla `.xlsx`, `.xls` u `.ods`.
3. Presionar `Generar Ranking`.

La pagina lee la primera hoja del archivo, muestra `Departamento`, extrae el `PLU` desde los numeros al inicio del producto, muestra `Producto`, suma las columnas de `UNI/KG` y `Venta Total`, y ordena los productos de mayor a menor venta.

Tambien genera un ranking por DTO con hasta 4 tablas. Cada tabla agrupa los productos del mismo DTO, usa `Departamento` como titulo, y ordena los productos desde el mas vendido hasta el menos vendido.

## Formato esperado

La planilla debe tener columnas con encabezados `DTO`, `Departamento` y `Producto`. El `PLU` debe estar al inicio del texto de producto.

Si existen encabezados `DTO`, `Departamento`, `Producto`, `UNI/KG` y `Venta Total`, la app los detecta automaticamente. Si no los encuentra, usa el formato historico:

- DTO: columna A
- Departamento: columna B
- Producto: columna C, con el PLU al inicio del texto
- UNI/KG: columnas D, F, H, J, L, N y P
- Venta Total: columnas E, G, I, K, M, O y Q

Los importes pueden venir como numero, con signo `$`, con separadores argentinos como `1.234,56`, o con separadores internacionales como `1,234.56`.

## Notas

La lectura de planillas usa SheetJS desde CDN. Si la pagina se abre sin conexion a internet y la libreria no esta en cache, se mostrara un mensaje indicando que no pudo cargarse.
