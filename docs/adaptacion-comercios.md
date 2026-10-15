# Adaptación comercial de Pulso de Ventas

## Alcance de esta entrega

Pulso conserva React, Express, MongoDB, sesiones, roles, lectura Excel/ODS, rankings, filtros, gráficos, inventario, balances e historial. Se añade identidad configurable y una presentación más sencilla para kioscos, almacenes, minimercados y supermercados. No es una conversión a punto de venta ni un sistema multicomercio.

`Tu negocio` permite al administrador guardar un nombre de hasta 100 caracteres y uno de cinco rubros. Solo modifica la colección `businesses`, en el documento `_id: principal`. Los demás documentos e identificadores no se migran ni se reclasifican. Sin documento se devuelve `Elaborados` / `otro`, sin escribir. Sin MongoDB la configuración no se puede guardar y el análisis local sigue disponible, incluso con una cookie de sesión anterior.

`GET /api/business` devuelve `{ negocio: { nombre, rubro, configurado } }`. La identidad es pública para mostrarla antes del inicio de sesión. `PUT /api/business` requiere base disponible, sesión y rol admin; valida campos y devuelve el negocio realmente guardado. No se cambiaron los contratos de los endpoints existentes.

## Un negocio por instalación

Los productos, usuarios, reportes y balances actuales se comparten dentro de una base. No contienen una clave de negocio. Los roles limitan acciones, no separan comercios. Cambiar el nombre o el rubro no crea una empresa independiente.

Para operar negocios independientes en esta etapa se necesitan instalaciones y bases distintas, con credenciales, sesiones y administración separadas. Un selector o filtro de pantalla no proporciona aislamiento.

## Compatibilidad y límites de importación

- Se mantienen UNI y KG y las reglas numéricas vigentes, incluido el apareamiento de columnas de unidades y Venta PVP del formato actual. No se deducen precios desde el nombre o el contenido del envase.
- Los departamentos de columnas identificadas explícitamente admiten nombres comerciales largos. La agrupación conserva el nombre recibido y los identificadores originales, como 25 o 28.
- Sin encabezados identificables siguen las heurísticas del formato histórico: columnas alternadas de unidades/venta, inferencia por contenido y reconocimiento particular de panadería/rotisería. No garantizan cualquier planilla de un tercero.
- `obtenerTipoUnidad` interpreta `UNI` en la descripción como unidad y el resto como kg. Una botella, un paquete o un nombre sin esa marca puede clasificarse mal. No se cambió esta regla por rubro. El inventario permite elegir UNI/KG explícitamente para los conteos, pero los rankings actuales no resuelven automáticamente su medida desde el inventario.
- `pareceProducto` todavía reconoce marcas como COTO, unidades del formato histórico y longitud del texto en las rutas de inferencia. La columna Departamento explícita evita usar esa longitud para rechazar nombres extensos.
- Los encabezados con PVP, fechas y pares diarios corresponden al reporte original. Se excluyen ajustes, mermas, reprocesos y transferencias del ranking como antes. No se cambiaron esas exclusiones sin especificación contable.
- El nombre del archivo, por sí solo, no determina un nuevo formato. El rubro no cambia ningún algoritmo.
- Balance conserva los dos parciales y el cierre mensual y propone el próximo jueves como fecha editable. No se cambiaron esos valores por rubro; una agenda de conteos configurable queda para otra etapa.

## Etapas posteriores, no implementadas

### Archivos de otros comercios

Crear perfiles de importación con asignación explícita de código, producto, departamento, fecha, cantidad, medida y venta. Mostrar una vista previa y validar totales antes de confirmar. Mantener un perfil legado del 270 y pruebas con planillas reales anonimizadas; evitar reemplazar heurísticas en silencio.

### Litros y presentaciones

Versionar un contrato de medida explícita por producto y por línea de reporte. Diferenciar unidades vendidas, contenido de envase y unidad base (por ejemplo una botella y sus litros). Definir factores de conversión y redondeos con el usuario, preservar los snapshots históricos y migrar UNI/KG solo con equivalencias verificadas.

### Costos y márgenes

Definir fuente de costo, moneda, impuestos, vigencia y método de valoración antes de calcular márgenes. Guardar versiones de costo por fecha y validar devoluciones, descuentos y elaboración. No hay métricas de costo o margen en esta entrega.

### Aislamiento multicomercio

1. Crear una colección de negocios con identificadores estables y membresías usuario-negocio con rol. Las credenciales pueden seguir siendo globales, pero la autorización debe comprobar la membresía activa en cada petición.
2. Ejecutar primero una migración de ensayo sobre una copia: crear un negocio legado y completar `businessId` en productos, reportes, balances, actividad y sesiones/contexto de acceso, conservando todos los `_id` existentes.
3. Sustituir el índice único global de PLU por `{ businessId, PLU }`, el de balance por `{ businessId, fecha, tipo }` y el de reporte por `{ businessId, nombreArchivo, periodo.inicio, periodo.fin }`. Construir y verificar los índices nuevos antes de retirar los antiguos. No quitar índices en esta entrega.
4. Exigir `businessId` autorizado desde el servidor en todas las lecturas, modificaciones, importaciones y borrados. No confiar en un identificador enviado por el navegador sin comprobar membresía. Incluir actividad y limpieza de registros en ese ámbito.
5. Probar que usuarios de negocios distintos no puedan listar, consultar por ID, modificar, importar ni eliminar datos ajenos, y verificar sesiones, unicidad y cuentas con varias membresías.
6. Planificar respaldo, ventana de cambio, validación de cantidades por colección e índices y reversión. Activar el multicomercio solo después de completar el aislamiento de extremo a extremo.

## Comprobación y prueba manual

La base verificada fue `origin/dev` en `bc452a1`, versión 5.20.1, con los cambios locales de administración 5.21.0 conservados en un commit independiente. Antes de la adaptación pasaron 43 pruebas de lógica y 27 de interfaz, sintaxis, servidor y construcción estática. No se encontró AGENTS.md aplicable.

Las pruebas nuevas usan documentos y respuestas simulados, no una base de producción. Cubren valores predeterminados, guardado y recuperación, permisos, datos inválidos, errores sin falso éxito, identidad al recargar, teclado y departamentos extensos. Las pruebas anteriores verifican ventas, inventario y balances. Las capturas corresponden a la interfaz real con datos ficticios de prueba, no a métricas del comercio.

Para ver la interfaz y analizar planillas localmente:

```sh
pnpm install --frozen-lockfile
pnpm preview
```

Abrir `http://127.0.0.1:4177/#/carga`. Este comando no lee `.env`, no conecta MongoDB y no crea usuarios. La edición de Tu negocio requiere un servidor con MongoDB y una sesión admin; no se presenta una simulación de guardado en el modo local.

Para validar la persistencia real, configurar una base de pruebas vacía e independiente en un entorno local o de desarrollo autorizado. Registrar allí la primera cuenta (admin), abrir `#/negocio`, guardar nombre/rubro y recargar. Crear un segundo usuario con otro rol y verificar que no pueda editar. Comprobar planillas, inventario y balances de prueba antes de promover cambios.

```sh
pnpm run check
pnpm test
pnpm run test:server
pnpm run build:pages
pnpm run test:ui
```

Pendiente fuera del entorno automatizado: prueba con MongoDB de desarrollo real, envío de correo real, Safari/Chrome en dispositivos físicos y despliegue. No se ejecutan migraciones destructivas, merges a prod/main ni cambios en Render con esta entrega.

## Resultados de la versión 5.22.0

- `npm test`: 53 pruebas aprobadas, ninguna omitida.
- `npm run test:ui`: 39 pruebas aprobadas en Chromium de escritorio, emulación Android y WebKit/iPhone. Las llamadas de datos se simulan; esto no confirma integración con MongoDB real ni sustituye dispositivos físicos.
- `npm run check`: comprobación de sintaxis de los archivos JavaScript.
- `npm run test:server`: servidor HTTP local, configuración predeterminada, escritura bloqueada sin base y modo local con cookie anterior, aprobados.
- `npm run build:pages`: construcción estática 5.22.0 aprobada.
- No se ejecutó `test:security`: requiere una conexión MongoDB; no se usaron las credenciales ni los datos reales para pruebas.

Capturas reales de las pruebas, con datos ficticios:

- [Carga en escritorio, claro](capturas/escritorio-carga-claro.png)
- [Tu negocio, claro](capturas/escritorio-negocio-claro.png)
- [Tu negocio, oscuro](capturas/escritorio-negocio-oscuro.png)
- [Carga en móvil, claro](capturas/movil-carga-claro.png)
- [Menú en móvil, oscuro](capturas/movil-menu-oscuro.png)
- [Inventario en móvil, oscuro](capturas/movil-inventario-oscuro.png)
- [Gráficos en escritorio, oscuro](capturas/escritorio-graficos-oscuro.png)

En móvil las tablas extensas conservan desplazamiento horizontal dentro de su contenedor, sin ensanchar la página. El menú se cierra con Escape o al navegar; al cerrarlo sus enlaces no quedan accesibles fuera de pantalla. Safari móvil puede requerir activar su navegación completa por teclado para recorrer todos los enlaces con Tab.
