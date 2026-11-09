# Reportes: guardado confiable (5.24.0)

Primera etapa para comparar semanas más adelante. Implementada sobre `dev`; no incluye comparaciones ni generación de informes.

## Datos conservados

- Archivo, fecha de creación, período y productos con PLU, departamento, cantidades, venta total y ventas diarias.
- Los nuevos documentos incluyen `autor.id` y el nombre del usuario de la sesión, no los datos de autor enviados desde el navegador.
- `UnidadMedida` conserva una medida explícita UNI/KG si está presente; de lo contrario usa la regla vigente del importador (UNI en la descripción; el resto KG). No consulta el inventario ni inventa equivalencias. Revisar esa clasificación antes de comparar archivos de otros comercios.
- El resumen nuevo separa `unidades` y `kilogramos`. `unidadesKg` continúa por compatibilidad, pero no se utiliza como un total comparable entre medidas diferentes.
- Los valores inválidos provocan rechazo, no se convierten silenciosamente en cero ni se descartan productos. Se admiten cero y valores negativos; no se agregan nuevas reglas contables ni se recalculan las ventas recibidas.

El período se obtiene de las fechas diarias válidas existentes, ordenadas y sin repetir. No se supone que el rango represente siete días completos ni se usa la fecha de carga como semana de venta. Sin fechas se conserva el archivo con período vacío; no debería utilizarse en comparaciones semanales hasta identificar su período en una etapa posterior.

## Duplicados y revisiones

Una huella SHA-256 del contenido normalizado identifica copias sin depender del nombre del archivo ni del orden de sus productos. Incluye las fechas y los datos de las líneas; no compara únicamente los totales. Repetir la carga devuelve el original sin modificar su autor, fecha ni productos.

Si el nombre y el período coinciden pero los datos son distintos, el servidor responde 409 sin sobrescribir. Se puede guardar una revisión independiente renombrando el archivo, con un nuevo identificador. No hay borrado ni reemplazo automático de históricos.

Se conserva el índice único anterior de nombre/período y se añade uno único `sparse` para `huellaContenido`. El guardado espera la inicialización de índices y propaga cualquier error. La configuración vigente de Mongoose crea índices automáticamente: comprobar en una base de desarrollo que los índices están listos antes de promover. No usar `syncIndexes` ni eliminar índices históricos.

Los documentos antiguos sin huella se comparan por contenido dentro del mismo período, sin escribirlos ni migrarlos. Si un histórico está mal formado y no se puede normalizar, no se afirma que sea idéntico; la protección de nombre/período sigue vigente. Los duplicados antiguos preexistentes no se eliminan en esta entrega. Esta búsqueda puede costar más en períodos con muchos históricos sin huella; una migración opcional de huellas, previamente respaldada y auditada, queda fuera de esta etapa.

## Historial y permisos

`Reportes guardados` mantiene la paginación, añade búsqueda por nombre literal y filtros por solapamiento de período. Un archivo sin fechas no aparece al filtrar por fechas. El detalle muestra cantidades separadas y el autor, o indica que no se registró en un histórico. No se atribuyen autores retroactivamente. Las medidas faltantes de históricos se interpretan con la regla anterior solo para visualización, sin modificar la base.

Se conservan las rutas y los permisos actuales: sesión obligatoria; `reportes:cargar` para guardar y `reportes:ver` para listar/consultar. Los filtros se aplican en servidor antes de paginar. Los errores no se muestran como una lista vacía ni como un guardado exitoso.

## Cómo verificar

1. En un entorno de desarrollo con una base independiente, cargar un archivo compatible, generar el ranking y volver a Cargar ventas para guardar.
2. Abrir el historial, verificar período, autor, productos, cantidades y dinero; recargar y volver a abrirlo.
3. Guardar otra vez el mismo archivo y una copia renombrada: deben conservar el mismo reporte.
4. Cambiar datos manteniendo nombre y período: debe devolver conflicto. Renombrar esa revisión y guardarla: debe crear otro registro sin alterar el anterior.
5. Probar otra semana, un archivo sin fechas, filtros, paginación y permisos de distintos roles. Contrastar los números con las planillas de prueba.

Las pruebas automatizadas usan modelos/respuestas simuladas, sin datos ni credenciales reales. Cubren normalización, fechas, metadatos, duplicados nuevos/legados, carreras de inserción simuladas, conflictos, índices declarados, filtros, errores y navegación móvil. La persistencia y la concurrencia contra MongoDB real requieren validación aparte en una base de desarrollo; no se ejecutan en producción.

No se ejecutaron migraciones de datos ni merges hacia `prod`/`main`. El siguiente paso será seleccionar dos semanas y validar su comparabilidad antes de calcular variaciones.

Verificación de esta entrega: 70 pruebas de lógica y 54 de interfaz aprobadas, además de sintaxis, construcción estática y comprobación HTTP del servidor. Las pruebas de interfaz incluyen escritorio, Android emulado y WebKit/iPhone; no equivalen a pruebas en dispositivos físicos. La integración contra MongoDB real queda pendiente.
