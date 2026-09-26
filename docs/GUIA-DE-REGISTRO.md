# Guía práctica de registro — NutriVida

Esta guía permite aprender el recorrido completo con un caso ficticio. No uses información real durante la práctica y no copies estos datos a una historia clínica real.

## 1. Ingresar

1. Abre `http://localhost:4200`.
2. Ingresa con una cuenta autorizada.
3. El administrador puede gestionar usuarios, asignar pacientes y consultar toda la clínica. Cada cuenta Nutricionista puede registrar y editar únicamente a sus pacientes asignados, pero no administrar usuarios.

## 2. Caso ficticio para practicar

Usa estos datos únicamente como demostración:

| Campo | Dato de práctica |
|---|---|
| Documento | PRUEBA-001 |
| Nombres | Daniela |
| Apellidos | Torres Ruiz |
| Fecha de nacimiento | 14/03/1992 |
| Sexo al nacer | Femenino |
| Correo | daniela.prueba@example.test |
| Teléfono | +593 99 000 0001 |
| Ocupación | Comerciante |
| Objetivo | Mejorar organización de comidas y composición corporal |

Los consentimientos de correo y WhatsApp representan una autorización real. Para esta práctica déjalos desmarcados o usa exclusivamente destinos de prueba controlados por ti.

## 3. Registrar al paciente

1. Entra a **Pacientes** y pulsa **Nuevo paciente**.
2. Si ingresaste como Administrador, selecciona el **Nutricionista responsable**. Si ingresaste como Nutricionista, el sistema asigna el paciente automáticamente a tu cuenta.
3. Copia los datos ficticios de la tabla.
4. Pulsa **Guardar paciente**.
5. Comprueba que Daniela aparece como **Paciente activo**. Ese mismo expediente seguirá seleccionado en los demás módulos.

Al guardar en cualquier módulo, busca su bloque **Historial** o **Registros guardados**. Que el formulario se limpie no significa que se borró: queda listo para otro registro. El botón **Editar** vuelve a cargar la información; solo el Administrador verá **Archivar**.

## 4. Abrir la atención

En **Atención**, crea una cita con este ejemplo:

- Fecha: hoy.
- Hora: 10:00.
- Duración: 45 minutos.
- Motivo: Primera consulta nutricional; organización de horarios y evaluación de hábitos.
- Estado: Confirmada.

Guarda la atención antes de continuar.

## 5. Completar la evaluación con una plantilla

1. Entra a **Evaluaciones**.
2. Confirma que el paciente activo sea Daniela Torres Ruiz.
3. En **Plantillas rápidas**, pulsa **Usar plantilla** en **Primera consulta**.
4. La plantilla agrega títulos únicamente en campos vacíos. Sustituye cada espacio por información obtenida durante la entrevista.
5. Si ya habías escrito algo, NutriVida lo conserva.

Ejemplo de datos de práctica:

- Ingesta: desayuno 07:30, avena con banano; almuerzo 13:30, arroz, lenteja y pollo; cena 20:30, pan con queso; 5 vasos de agua; no refiere suplementos.
- Horarios: media mañana irregular; almuerza en el local de trabajo; cena en casa.
- Alergias: niega alergias conocidas.
- Intolerancias/molestias: refiere distensión después de leche entera; sin confirmación diagnóstica.
- Sueño: 6,5 horas; calidad regular.
- Ejercicio: caminata moderada, 90 minutos por semana; martes, jueves y sábado a las 18:30.
- Estreñimiento: sí, referido por la paciente.
- Bristol: tipo 2.
- Frecuencia: tres veces por semana, con esfuerzo ocasional.
- Nota: presupuesto limitado; prefiere alimentos disponibles en mercado local; acordó organizar una colación sencilla.

El apartado PES es un borrador profesional. No lo completa la plantilla porque problema, etiología y signos/síntomas requieren criterio clínico y evidencia del caso. Pulsa **Guardar evaluación** solo después de revisarlo.

## 6. Registrar antropometría y cálculo energético

En **Antropometría**, registra mediciones tomadas correctamente; para practicar puedes usar:

- Peso: 72,4 kg.
- Talla: 162 cm.
- Cintura: 88 cm.

En **Cálculo energético**:

1. Selecciona una fórmula adecuada y verifica sexo, edad, peso y talla.
2. Para la práctica selecciona actividad ligera `1,375` y ETA `10 %`.
3. Si colocas un ajuste de objetivo, documenta por qué. No copies automáticamente un déficit o superávit.
4. Revisa el desglose de fórmula, actividad y ETA antes de guardar.

No existen plantillas rápidas para mediciones ni energía: autocompletar números clínicos podría generar un plan incorrecto.

## 7. Crear el plan de menú y platos económicos

En **Platos y preparaciones** puedes crear una preparación reutilizable, por ejemplo:

- Nombre: Lentejas con arroz y ensalada.
- Porciones: 4.
- Ingredientes: lenteja, arroz, tomate, cebolla y aceite según la receta preparada.
- Costo: usa un precio local comprobado y registra su fecha; es una estimación, no un dato nutricional oficial.

En la fila del plato guardado pulsa **Usar en un plan**. NutriVida abre **Plan de menú** y deja ese plato seleccionado. Luego:

1. Elige primero el día y el tiempo de comida.
2. En **Opción A**, pulsa **Añadir plato al menú** para reutilizar el plato seleccionado; o usa **Opción B** para añadir un alimento individual.
3. Abre **Usar una plantilla rápida** solamente si necesitas una base reutilizable por objetivo o presupuesto.
4. Confirma fuente y versión del alimento. Los datos `EcuadorDemo` son solo demostrativos.
5. Revisa la sección **Menú en construcción**, completa nombre y notas, y pulsa **Guardar plan**.

Las plantillas creadas por el profesional se almacenan en SQL Server por módulo y pueden editarse o reutilizarse.

## 8. Registrar seguimiento y evolución

1. Entra a **Seguimiento y evolución** cuando exista un control real con el paciente.
2. Elige **Control habitual**, **Adherencia y barreras** o **Síntomas digestivos**.
3. La plantilla completa solamente la nota profesional vacía.
4. Registra la fecha del control. El período evaluado, el próximo control y los indicadores son opcionales.
5. Si acuerdan una nueva cita, elige 7, 14, 21, 30 días o un intervalo personalizado. No es obligatorio hacer el control cada semana.

Ejemplo de práctica:

- Peso: 71,9 kg.
- Adherencia referida: 75 %.
- Ejercicio: caminata moderada, 110 minutos.
- Sueño: 6,8 horas.
- Bristol: tipo 3.
- Síntomas: distensión en dos ocasiones después de consumir leche.
- Nota: logró organizar el desayuno cuatro días; la principal barrera fue el horario de trabajo; acordó llevar una colación de bajo costo.

Pulsa **Guardar seguimiento** y comprueba que aparezca en el historial inferior.

## 9. Generar reporte y preparar mensaje

1. En **Reportes**, revisa la información recuperada del expediente y genera el documento. Una plantilla nunca sustituye esta revisión.
2. En **Mensajería**, elige **Plan listo**, **Recordatorio de seguimiento** o **Actualización de cita**.
3. Personaliza el texto. Evita escribir diagnóstico u otros datos sensibles en el asunto.
4. Selecciona un canal que tenga consentimiento registrado.
5. Pulsa **Preparar envío**. NutriVida registra la preparación y muestra un botón para abrir correo o WhatsApp; el envío final se confirma fuera de NutriVida.

## Cómo funcionan las plantillas rápidas

- **Evaluación:** agregan una estructura de entrevista solo a campos vacíos.
- **Seguimiento:** agregan una estructura a la nota profesional si está vacía.
- **Mensajería:** sustituyen asunto y texto porque elegir una plantilla es una acción explícita; después siguen siendo editables.
- **Todos los módulos anteriores:** permiten crear y editar plantillas guardadas en SQL Server; solo el Administrador puede archivarlas.
- Ninguna plantilla guarda un registro, emite un diagnóstico, prescribe un plan o envía un mensaje automáticamente.

## Comprobación final

Antes de cerrar el caso, verifica que el nombre del **Paciente activo** sea correcto en cada pantalla, que los datos aparezcan en los historiales, que el plan tenga fuente alimentaria identificada y que cualquier mensaje tenga consentimiento y destino correctos.

---

## Registro completo listo para copiar, módulo por módulo

Este caso es **ficticio y educativo**. Sirve para aprender el sistema; no constituye diagnóstico ni prescripción y no debe copiarse en la historia de una persona real.

### 0. Usuarios y roles (solo Administrador)

Este módulo administra al personal que entra a NutriVida, no a los pacientes.

| Campo | Dato de práctica |
|---|---|
| Nombre completo | Nutricionista de Prueba |
| Correo institucional | nutricionista.prueba@nutrivida.local |
| Rol | Nutricionista |
| Contraseña temporal | PruebaNutri2026! |
| Cuenta activa | Sí |
| Solicitar cambio de contraseña | Sí |

Pulsa **Guardar usuario**. La contraseña es únicamente para una cuenta local de práctica y debe cambiarse al primer ingreso. El rol Nutricionista puede registrar y editar información clínica; el Administrador también gestiona usuarios y acciones administrativas.

### 1. Pacientes

Pulsa **Nuevo paciente** y registra:

| Campo | Dato de práctica |
|---|---|
| Nombres | Daniela |
| Apellidos | Torres Ruiz |
| Identificación | PRUEBA-001 |
| Fecha de nacimiento | 14/03/1992 |
| Sexo para fórmulas | Femenino |
| Correo | daniela.prueba@example.test |
| Teléfono / WhatsApp | +593990000001 |
| Ocupación | Comerciante |
| Objetivo acordado | Mejorar la organización de comidas y la composición corporal de forma gradual. |
| Consentimiento para correo | Desmarcado para la primera práctica |
| Consentimiento para WhatsApp | Desmarcado para la primera práctica |

Pulsa **Guardar paciente**. Antes de continuar, confirma que la franja **Paciente activo** muestre a Daniela Torres Ruiz. Si deseas probar mensajería, edita luego el expediente y activa solamente el consentimiento de un canal de prueba controlado por ti.

### 2. Atención

| Campo | Dato de práctica |
|---|---|
| Paciente activo | Daniela Torres Ruiz |
| Fecha | Fecha actual |
| Hora | 10:00 |
| Motivo | Primera consulta nutricional para revisar horarios, hábitos y objetivo acordado. |

Pulsa **Guardar atención** y comprueba que aparezca en la agenda o historial. La atención representa la cita; la historia nutricional se completa en Evaluaciones.

### 3. Evaluaciones

Puedes pulsar **Primera consulta** en Plantillas rápidas y después reemplazar la estructura con estos datos:

| Campo | Dato de práctica |
|---|---|
| Recordatorio de ingesta habitual | Desayuno 07:30: avena con banano. Almuerzo 13:30: arroz, lenteja, pollo y ensalada. Cena 20:30: pan con queso. Agua: 5 vasos al día. No refiere suplementos. |
| Horarios y contexto | Media mañana irregular. Almuerza en el local de trabajo y cena en casa. |
| Alergias confirmadas | Niega alergias conocidas. |
| Intolerancias o molestias | Refiere distensión después de leche entera; no presenta diagnóstico confirmado. |
| Horas de sueño | 6.5 |
| Calidad | Regular |
| Minutos de ejercicio por semana | 90 |
| Tipo de ejercicio | Caminata moderada |
| Horario y frecuencia | Martes, jueves y sábado a las 18:30; 30 minutos por sesión. |
| Estreñimiento referido | Sí |
| Frecuencia de evacuación | Tres veces por semana, con esfuerzo ocasional. |
| Bristol | Tipo 2 — grumosa |
| Notas clínicas | Presupuesto limitado; prefiere alimentos disponibles en el mercado local. Acordó organizar una colación sencilla. |
| Código o dominio | Conductual-ambiental — práctica |
| Problema | Patrón de alimentación irregular. |
| Etiología relacionada | Relacionado con horarios variables de trabajo y ausencia de una colación planificada. |
| Signos y síntomas | Evidenciado en la entrevista por media mañana irregular, cena tardía y cinco vasos de agua al día. |

Pulsa **Guardar evaluación**. Los campos del enunciado PES deben revisarse siempre por una nutricionista; la plantilla no debe emitir un diagnóstico automáticamente.

### 4. Cálculo energético

| Campo | Dato de práctica |
|---|---|
| Fórmula | Mifflin–St Jeor (1990) |
| Sexo usado por la ecuación | Femenino |
| Peso | 72.4 kg |
| Estatura | 162 cm |
| Edad | 34 años |
| Factor de actividad | 1.375 — ligera |
| ETA | 10 % |
| Ajuste de objetivo | 0 kcal |

Pulsa **Calcular** y revisa el desglose. Para aprender el flujo, deja el ajuste en cero; un déficit o superávit real requiere valoración profesional individual.

### 5. Platos y preparaciones

Antes de crear el plan, pulsa **Nuevo plato**:

| Campo | Dato de práctica |
|---|---|
| Nombre del plato | Lentejas con arroz y ensalada |
| Tiempo de comida | Almuerzo |
| Porciones que rinde | 4 |
| Preparación | Cocinar las lentejas y el arroz por separado. Preparar la ensalada con tomate y cebolla. Distribuir en cuatro porciones y añadir el aceite medido al servir. |
| Preparación en minutos | 50 |
| Fecha de referencia del costo | Fecha actual |
| Nota sobre precios | Estimación educativa; actualizar con precios locales antes de usar. |

Agrega ingredientes disponibles en el catálogo:

| Ingrediente | Porciones | Costo total USD de práctica |
|---|---:|---:|
| Lenteja cocida | 4 | 1.20 |
| Arroz cocido | 4 | 0.80 |
| Tomate | 2 | 0.50 |
| Cebolla | 1 | 0.25 |
| Aceite vegetal | 1 | 0.20 |

Los precios son ficticios. Pulsa **Guardar plato** y confirma que aparezca en el listado.

### 6. Planes de menú

| Campo | Dato de práctica |
|---|---|
| Nombre del plan | Plan inicial económico — Daniela |
| Meta energética | Usa el resultado calculado y revisado por la profesional |
| Notas profesionales | Distribución inicial de práctica. Priorizar alimentos accesibles, agua y horarios regulares. Revisar tolerancia y adherencia en el siguiente control. |

Agrega elementos para el lunes usando los alimentos que existan en el catálogo:

| Día | Tiempo | Selección | Porciones |
|---|---|---|---:|
| Lunes | Desayuno | Avena | 1 |
| Lunes | Desayuno | Banano | 1 |
| Lunes | Almuerzo | Plato guardado: Lentejas con arroz y ensalada | 1 |
| Lunes | Media tarde | Fruta disponible | 1 |
| Lunes | Cena | Huevo | 1 |

Pulsa **Agregar** después de cada fila y finalmente **Guardar plan**. No inventes alimentos si no aparecen: primero deben existir en Alimentos con su fuente identificada.

### 7. Alimentos

Este módulo funciona principalmente como catálogo. Busca **lenteja**, **arroz**, **avena**, **banano** y **huevo**, y comprueba nombre, grupo, medida casera y fuente.

Para importar un CSV:

| Campo | Ejemplo |
|---|---|
| Fuente | Tabla Ecuador autorizada o SMAE con licencia |
| Edición | La edición exacta del documento adquirido |
| Referencia | Institución, año y licencia correspondientes |
| Archivo | CSV preparado con la estructura admitida por NutriVida |

No registres `EcuadorDemo` como fuente clínica oficial. Las tablas Ecuador y SMAE deben utilizarse con autorización/licencia y revisión de su versión.

### 8. Seguimiento y evolución

| Campo | Dato de práctica |
|---|---|
| Fecha del seguimiento | Fecha real del control |
| Período evaluado | Últimos 14 días (opcional) |
| Próximo control | Dentro de 14 días (opcional y ajustable) |
| Estado del objetivo | En progreso |
| Peso | 71.9 kg |
| Adherencia | 75 % |
| Ejercicio | Caminata moderada |
| Minutos | 110 |
| Sueño promedio | 6.8 horas |
| Bristol frecuente | Tipo 3 |
| Síntomas o dificultades | Distensión en dos ocasiones después de consumir leche entera. Dificultad para realizar la colación por el horario de trabajo. |
| Ajustes acordados | Probar una alternativa sin lactosa y preparar una colación accesible. |
| Nota profesional | Organizó el desayuno cuatro días. Se acordó llevar una fruta o una colación accesible y continuar observando la tolerancia digestiva. |

Pulsa **Guardar seguimiento** y confirma que el registro aparezca en el historial inferior.

### 9. Reportes

Reportes no solicita crear otra historia: reúne los datos del paciente activo. Comprueba que muestre a Daniela, su evaluación, cálculo, plan y seguimiento. Luego pulsa **Descargar PDF clínico**. La API genera el documento y registra la acción en Auditoría.

Antes de entregarlo, revisa nombres, fechas, unidades y que no se incluyan datos de otro paciente.

### 10. Mensajería

Para una prueba segura, usa un correo o teléfono controlado por ti y registra previamente el consentimiento correspondiente en Pacientes.

| Campo | Dato de práctica |
|---|---|
| Paciente | Daniela Torres Ruiz |
| Plan a compartir | Plan inicial económico — Daniela |
| Canal | Correo o WhatsApp con consentimiento registrado |
| Plantilla rápida | Plan listo |
| Asunto | Tu plan nutricional está listo |
| Mensaje | Hola Daniela, tu plan nutricional ya está disponible. Revísalo mediante el enlace seguro y escríbenos si tienes alguna duda. |

Pulsa **Preparar envío**. Esto crea el registro y habilita **Abrir correo** o **Abrir WhatsApp**; la persona usuaria todavía debe revisar y confirmar el envío en la aplicación externa.

### 11. Configuración

| Campo | Dato sugerido |
|---|---|
| Nombre | NutriVida — Consulta nutricional |
| Zona horaria | America/Guayaquil (UTC−5) |
| Dirección | Dirección real del consultorio |
| Fórmula predeterminada | Mifflin–St Jeor |
| ETA predeterminado | 10 % |

Configuración aplica a la clínica completa, no a un paciente. Solo el Administrador debe cambiar estos valores.

## Orden corto para memorizar

**Paciente → Atención → Evaluación → Cálculo energético → Plato → Plan de menú → Seguimiento → Reporte → Mensajería.**

Si cambias de paciente, mira siempre la franja **Paciente activo** antes de guardar. Ese control evita que un registro termine en el expediente equivocado.
