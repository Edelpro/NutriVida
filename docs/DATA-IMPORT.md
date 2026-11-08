# Importación de catálogos de alimentos

NutriVida conserva el origen de cada alimento mediante `SourceCatalog`, `SourceEdition`, `SourceReference` y `EffectiveDate`.

## Columnas admitidas

```text
source,source_code,name,group,portion_grams,household_measure,energy_kcal,protein_g,carbohydrate_g,fat_g,fiber_g,sodium_mg,source_edition,source_reference,effective_date
```

## Archivos de Excel

Se aceptan CSV separados por coma (con punto decimal) o por punto y coma (con coma decimal), como los que guarda Excel en español. La columna `exchange_group` es opcional y guarda el grupo de intercambio, por ejemplo "Cereales sin grasa". Cada fila del SMAE debe registrar la porción de 1 equivalente: al cambiar los gramos en pantalla, los nutrientes y equivalentes se recalculan en proporción.

El repositorio no incluye las listas del SMAE ni de la Universidad San Francisco de Quito. El cliente debe aportar esos archivos con autorización de uso; las condiciones de cada fuente están en [ENTREGA-AL-CLIENTE.md](ENTREGA-AL-CLIENTE.md).

La tabla USFQ 2021 expresa sus valores por 100 g de porción comestible (100 mL en líquidos), según su resumen: al convertirla, usa `portion_grams` = 100. Cita sugerida para `source_reference`: Herrera Fontana et al. (2021), Bitácora Académica 11, https://doi.org/10.18272/ba.v11i.3326. El PDF no ofrece Excel ni CSV en la página de la revista, y sus columnas exactas aún no se han revisado.

## Reglas

1. El profesional confirma que tiene derecho a utilizar el archivo.
2. Se valida tipo, rango, unidad y duplicados antes de insertar. En archivos separados por coma, los números usan punto decimal (`1.5`); una coma decimal rechaza el archivo y se indica la fila. Topes por porción: 5000 g, 10000 kcal, 1000 g de proteína, carbohidrato, grasa o fibra, y 100000 mg de sodio.
3. La importación se previsualiza y requiere confirmación.
4. Una edición nueva no sobrescribe silenciosamente datos usados en planes antiguos.
5. Cada plan conserva la edición del catálogo usada al aprobarse.

El repositorio incluye datos demostrativos identificados como tales; no incluye el catálogo completo del SMAE.
