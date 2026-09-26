# Importación de catálogos de alimentos

NutriVida conserva el origen de cada alimento mediante `SourceCatalog`, `SourceEdition`, `SourceReference` y `EffectiveDate`.

## Columnas admitidas

```text
source,source_code,name,group,portion_grams,household_measure,energy_kcal,protein_g,carbohydrate_g,fat_g,fiber_g,sodium_mg,source_edition,source_reference,effective_date
```

## Reglas

1. El profesional confirma que tiene derecho a utilizar el archivo.
2. Se valida tipo, rango, unidad y duplicados antes de insertar.
3. La importación se previsualiza y requiere confirmación.
4. Una edición nueva no sobrescribe silenciosamente datos usados en planes antiguos.
5. Cada plan conserva la edición del catálogo usada al aprobarse.

El repositorio incluye datos demostrativos identificados como tales; no incluye el catálogo completo del SMAE.
