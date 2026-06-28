# Pulso de Ventas

Aplicacion web para analizar ventas de productos elaborados desde una planilla. La version 5 incorpora un backend opcional con Express y MongoDB sin quitar el funcionamiento local del navegador.

## Licencia

Pulso de Ventas es software privado y propietario. Todos los derechos estan reservados por Gabriel Villamayor. No esta permitido copiar, modificar, distribuir, publicar, alojar, vender ni reutilizar este proyecto sin autorizacion previa y por escrito.

## Como usarla

1. Abrir la app desde un servidor local, Express o GitHub Pages.
2. Seleccionar una planilla `.xlsx`, `.xls` u `.ods`.
3. Presionar `Generar Ranking`.

La pagina lee la primera hoja del archivo, detecta departamentos, separa `PLU` y `Producto`, suma `UNI/KG` y `Venta Total`, y muestra rankings con filtros, ordenamiento y paginacion. Cuando la planilla incluye fechas diarias, permite consultar la semana completa o elegir un dia especifico.

Tambien genera un ranking por DTO. Cada tabla agrupa productos por departamento, muestra un resumen de unidades y kilos vendidos, y permite filtrar por texto, por tipo (`UNI` o `KG`) y ordenar por venta o producto.

La seccion `Graficos por departamento` compara ventas, unidades o kilos mediante barras horizontales. Los graficos se actualizan con el filtro de fecha seleccionado.

El menu utiliza vistas separadas para carga, ranking, graficos y cada departamento. La navegacion funciona con los botones atras y adelante del navegador y es compatible con GitHub Pages.

La vista `Balance` permite preparar los dos parciales y el cierre mensual. Cada producto queda identificado por PLU, departamento y tipo de conteo (`UNI` o `KG`), con una cantidad contada opcional y persistencia en MongoDB.

La vista `Cuenta` permite registrar usuarios, iniciar sesion y cerrarla. Las contraseñas se protegen con `scrypt` y las sesiones se almacenan en MongoDB mediante una cookie privada `httpOnly`. El analisis local sigue disponible sin cuenta, pero guardar reportes o balances requiere una sesion activa.

## Backend e historial

El backend es opcional. Sin MongoDB, la carga de archivos, los rankings, los filtros y los graficos continúan funcionando normalmente.

1. Crear un archivo privado `.env` en la carpeta principal.
2. Agregar las variables `PORT`, `MONGODB_URI`, `MONGODB_DB_NAME` y `CLIENT_ORIGIN`.
3. Para sesiones, agregar `SESSION_COOKIE_NAME`, `SESSION_COOKIE_SECURE` y `SESSION_COOKIE_SAME_SITE`.
4. Ejecutar `npm install`.
5. Ejecutar `npm start`.
6. Abrir `http://localhost:3000`.

Los archivos `.env*` estan excluidos de Git y nunca deben subirse al repositorio.

## Publicacion en Render

El archivo `render.yaml` prepara un Web Service que publica React y Express bajo el mismo dominio. Render utiliza la rama `main`, ejecuta `npm install`, inicia con `npm start` y comprueba el servicio mediante `/api/health`.

1. Realizar el merge manual de `dev` hacia `main`.
2. En Render seleccionar `New > Blueprint`.
3. Conectar el repositorio `gvcode1991/coto270`.
4. Confirmar el Blueprint detectado desde `render.yaml`.
5. Cargar `MONGODB_URI` como variable privada cuando Render la solicite.
6. Crear el servicio y esperar que el estado indique `Live`.
7. En MongoDB Atlas autorizar las direcciones de salida indicadas por Render en la configuracion de red del servicio.

Las cookies se configuran como seguras en Render y las credenciales de MongoDB no se guardan en Git.

Cuando MongoDB esta conectado aparece el boton `Guardar reporte`. Si se vuelve a guardar el mismo archivo para el mismo periodo, el registro se actualiza para evitar duplicados.

Endpoints iniciales:

- `GET /api/health`: estado del servidor y MongoDB.
- `GET /api/reports`: listado de reportes guardados.
- `GET /api/reports/:id`: detalle de un reporte.
- `POST /api/reports`: guarda o actualiza un reporte procesado.
- `POST /api/auth/register`: crea una cuenta.
- `POST /api/auth/login`: inicia una sesion.
- `GET /api/auth/me`: devuelve el usuario de la sesion.
- `POST /api/auth/logout`: cierra y revoca la sesion.
- `GET /api/balances`: listado de balances mensuales.
- `POST /api/balances`: crea o actualiza un balance.
- `DELETE /api/balances/:id`: elimina un balance.

## Estructura

- `index.html`: pantalla principal de la aplicacion.
- `src/main.js`: punto de entrada de React.
- `src/PulsoApp.js`: estado principal de la aplicacion.
- `src/components/`: componentes visuales de menu, carga, tablas, resumen y paginacion.
- `src/lib/`: lectura de planillas, reglas de producto, formatos y utilidades.
- `src/constants.js`: version, paginacion y columnas base.
- `src/styles.css`: estilos de layout, tablas, menu lateral y mobile.
- `assets/images/`: logos e iconos de Pulso de Ventas.
- `server/`: API Express, conexion con MongoDB y persistencia de reportes.

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
