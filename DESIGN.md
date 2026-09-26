---
version: alpha
name: "NutriVida"
description: "Historia clínica nutricional con precisión botánica inspirada en el aguacate del cliente."
colors:
  primary: "#347A16"
  primary-hover: "#28620F"
  fresh: "#8DBA26"
  avocado-soft: "#DEECA4"
  background: "#FDFDFD"
  surface: "#FFFFFF"
  surface-muted: "#F5F8EF"
  text: "#3B230F"
  text-muted: "#6D6255"
  border: "#DDD9CF"
  border-soft: "rgba(59, 35, 15, 0.10)"
  border-section: "rgba(59, 35, 15, 0.16)"
  section-wash: "rgba(141, 186, 38, 0.055)"
  warning: "#B96C0B"
  danger: "#B33A2B"
  success: "#347A16"
  focus: "#60961E"
typography:
  display:
    fontFamily: "Georgia, Cambria, serif"
    fontSize: "2rem"
    lineHeight: "1.15"
  sans:
    fontFamily: "Aptos, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: "1.5"
  data:
    fontFamily: "Aptos, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    lineHeight: "1.4"
rounded:
  DEFAULT: "0.625rem"
  sm: "0.375rem"
  md: "0.625rem"
  lg: "1rem"
  organic: "2.5rem"
spacing:
  xs: "0.375rem"
  sm: "0.625rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  page-max: "92rem"
components:
  button:
    height: "2.75rem"
  field:
    height: "2.75rem"
  sidebar:
    width: "13.5rem"
  dialog:
    width: "36rem"
  table:
    height: "3.25rem"
---

# NutriVida Design System

## Overview

### Creative North Star

Una libreta clínica precisa colocada junto a un huerto de aguacates: papel blanco real, tinta café, indicadores verdes y una única curva orgánica que concentra la atención. La referencia visual es el símbolo de aguacate entregado por el cliente y los conceptos en `docs/design/`.

### Product context and register

- **Audience and primary job:** nutricionistas de Ecuador que documentan una consulta y convierten datos clínicos en un plan revisable.
- **Target market(s) and evidence:** Ecuador; solicitud explícita del cliente y uso de tablas alimentarias ecuatorianas.
- **Locale(s) and language policy:** `es-EC`; términos clínicos requieren revisión por nutricionista ecuatoriano.
- **Usage scene:** escritorio o tableta durante consulta; uso frecuente, atención dividida y densidad media.
- **Register:** producto clínico autenticado.
- **Memorable signature:** un contorno orgánico de hoja/aguacate marca el elemento clínico actualmente enfocado.
- **Restraint:** formularios, tablas y decisiones clínicas permanecen rectos, claros y familiares.
- **Anti-references:** no glassmorphism, no tablero de tarjetas repetitivas, no estética de gimnasio, no verdes neón dominantes.
- **Token ownership/runtime mapping:** modelo B. `frontend/src/styles.scss` es la fuente canónica en ejecución; este archivo refleja exactamente sus variables. La verificación compara ambos archivos.

## Colors

El blanco verdadero domina. `primary` identifica acciones seguras y navegación; `fresh` se reserva para progreso y gráficos. `warning` marca información incompleta, nunca error clínico. Café oscuro reemplaza al negro para vincular la interfaz con el hueso del aguacate. El foco usa un anillo visible de dos tonos. `border-section` delimita únicamente bloques clínicos completos; `border-soft` separa contenido interno y `section-wash` identifica encabezados sin convertir todo en tarjetas.

## Typography

Georgia se usa con moderación en títulos de página y marca. Aptos/Segoe UI gobierna controles, formularios y datos. Números tabulares se activan en métricas. La interfaz usa sentence case y español directo.

## Layout

Sidebar persistente de 13.5rem en escritorio; cajón modal bajo 900px. El contenido usa una cuadrícula de 12 columnas con máximo de 92rem. Los formularios mantienen flujo natural; las tablas tienen su propio desbordamiento horizontal. El ritmo usa 6, 10, 16, 24 y 32px derivados de la referencia, no una retícula decorativa rígida.

## Elevation & Depth

La jerarquía depende de un contorno exterior cálido y opaco, reglas interiores más suaves y un lavado verde casi imperceptible en encabezados clínicos. Sombras únicamente en navegación móvil, diálogos y el foco orgánico principal. No hay sombras en cada sección.

## Shapes

Controles y paneles usan 10px; el foco principal puede usar curvas de hasta 40px. Botones no son píldoras. Divisores son de 1px y los iconos tienen trazo redondeado coherente.

## Components

### Foundational visual states

Hover oscurece o eleva contraste; foco nunca depende solo de color; estados busy conservan tamaño. El cargador predeterminado es un spinner pequeño dentro de una región con altura reservada. No se usan esqueletos en la primera versión.

### Buttons and actions

Una acción primaria sólida por región. Acciones secundarias usan borde; acciones peligrosas quedan separadas y exigen diálogo. `Guardar cambios` y su confirmación usan el mismo verbo.

### Navigation and data display

El sidebar muestra texto e icono, con fondo aguacate pálido en la ruta actual. Tablas conservan cabecera, paginación y comparación horizontal en móvil. Los gráficos siempre tienen alternativa textual.

Los módulos que construyen y controlan una intervención muestran una ruta guiada compartida en este orden: **Catálogo → Platos → Menú del paciente → Seguimiento**. La etapa actual usa el lavado aguacate y un subrayado verde; las demás siguen siendo enlaces visibles. En el sidebar, la navegación se separa en **Consulta**, **Plan nutricional** y **Entrega**, y las cuatro etapas del plan llevan numeración persistente. La posición en la ruta nunca afirma que una etapa está completa: usa **Anterior**, **Estás aquí** y **Después**. La ruta guiada explica la tarea actual y ofrece acciones explícitas **Anterior** y **Siguiente**; el cuarto paso finaliza con acceso a **Reportes**.

El dashboard de referencia aprobado organiza agenda, paciente actual, distribución por objetivo, pendientes y pacientes recientes en una composición blanca de densidad media. Los datos visibles siempre vienen de la API; un fallo de conexión muestra recuperación explícita y nunca se sustituye silenciosamente con información ficticia.

### Clinical context and feature ownership

Cada flujo clínico muestra el selector compartido `Paciente activo`. Un alta selecciona automáticamente ese expediente y Evaluación, Cálculo energético, Seguimiento, Menús, Reportes y Mensajería conservan el mismo identificador. La lista se adapta al rol: Administración ve todos los expedientes, su columna `Nutricionista responsable` y el selector para asignar o reasignar; Nutricionista ve únicamente sus pacientes y las altas se asignan automáticamente a su cuenta. La barra de contexto muestra el profesional responsable sin convertir la selección en edición. En Evaluación, seleccionar un paciente abre primero la última historia guardada en modo lectura; `Editar evaluación` y `Nueva evaluación` son las únicas acciones que abren el formulario. Los valores históricos que ya no pertenecen a una lista vigente siguen visibles y se conservan al editar. Los módulos Angular usan `modulos/<módulo>/{paginas,modelos,acceso-datos}`; `nucleo` contiene sesión, configuración HTTP y contexto transversal, mientras `compartido` conserva componentes presentacionales reutilizables.

Los seguimientos representan controles reales y no semanas obligatorias. La interfaz permite registrar la fecha del control, un período evaluado opcional y un próximo control opcional con intervalos sugeridos o personalizados; los indicadores que no se midieron permanecen vacíos en lugar de inventarse.

### Authentication and roles

La pantalla de acceso usa la misma marca y paleta, pero no muestra el shell clínico. Su firma visual son dos hojas de formulario superpuestas con una rotación controlada al alternar entre `Ingresar` y `Solicitar acceso`; la hoja activa se separa del fondo mediante borde cálido y sombra estratificada visible, sin contorno oscuro pesado. El movimiento desaparece con `prefers-reduced-motion`. La solicitud se guarda como petición pendiente para el administrador y nunca crea una cuenta pública. La aplicación personal conserva una única cuenta `ClinicAdmin`; todas las solicitudes y cuentas nuevas son `Nutritionist`. Usuarios y Configuración se ocultan y protegen para `ClinicAdmin`. El perfil y el cierre de sesión viven en el pie del sidebar.

El módulo Usuarios muestra primero las solicitudes pendientes con acciones explícitas para aceptar o rechazar, y después la tabla paginada de cuentas. Aceptar exige asignar una contraseña temporal y confirma que se creará una cuenta `Nutritionist`. Los cambios de rol o estado muestran un resumen antes de guardarse. No existe una acción de eliminación definitiva.

Mensajería prepara primero el PDF clínico. Cuando WhatsApp Cloud está configurado, presenta destino enmascarado y confirmación explícita antes de cargar el PDF a Meta como documento; evita reenvíos duplicados y distingue aceptado, entregado y leído. Sin proveedor conserva un enlace temporal de 7 días y confirmación en la aplicación externa.

La marca de ejecución usa `frontend/public/assets/brand/nutrivida-mark-transparent.png`; los conceptos aprobados quedan en `docs/design/concepto-acceso-nutrivida.png` y `docs/design/concepto-usuarios-roles.png`.

### Food imagery

Las fotografías de platos son referencias visuales clicables para elegir tiempos de comida; no representan una prescripción ni reemplazan gramajes, porciones o fuente alimentaria. Comparten encuadre cenital, plato blanco cálido, fondo verde crema y fotografía editorial natural.

El catálogo permite crear alimentos personalizados además de importar ediciones autorizadas. El formulario individual usa nombres clínicos visibles —medida casera, peso de la porción, energía, proteína, carbohidrato, grasa, fibra, sodio y fuente o referencia— y mantiene cualquier código técnico fuera de la interfaz. Estos alimentos quedan marcados como `Personalizado` y son editables; nunca se presentan como parte de Ecuador o SMAE.

El módulo Platos y preparaciones funciona como recetario visual paginado: tarjetas con fotografía opcional, macronutrientes, fibra, costo y acceso directo al menú. La ficha ampliada mantiene ingredientes, gramajes, preparación, principales aportantes y video demostrativo opcional. La fotografía y el video son referencias visuales; nunca sustituyen cantidades, fuente alimentaria ni validación profesional. Las fotografías se cargan como JPG, PNG o WebP de hasta 5 MB; los videos se enlazan desde un proveedor web para evitar archivos pesados en SQL Server. Los precios se identifican siempre como estimaciones locales con fecha de referencia; nunca se presentan como valores del catálogo nutricional.

Las plantillas rápidas tienen un único propietario canónico y se guardan en SQL Server por clínica y módulo. Usan un conjunto breve de tarjetas con borde `border-soft`, encabezado compacto y advertencia permanente de revisión. En Evaluación agregan una estructura únicamente a campos vacíos; en Seguimiento completan solo la nota profesional vacía; en Mensajería sustituyen de forma explícita asunto y cuerpo, pero nunca preparan ni envían por sí solas. En Planes de menú la tarjeta resume categoría, objetivo y alcance; `Usar como base` copia nombre y notas al borrador. Mediciones antropométricas, valores energéticos y diagnóstico PES nunca se autocompletan. La nutricionista puede crear y editar; solo Administración puede archivar. Todo contenido permanece editable y requiere la acción de guardado del módulo.

### Forms and overlays

Campos de 44px, etiqueta visible y mensaje de ayuda/error estable. Los selects y fechas del MVP son nativos de plataforma por decisión explícita. Diálogos usan foco contenido y el toast vive arriba a la derecha.

### Iconography

SVG lineal propio, 20px, trazo 1.8, extremos redondeados. Los iconos nunca sustituyen etiquetas de navegación o acciones clínicas.

### Motion

Transiciones de estado de 180–240ms. La entrada inicial se limita a una secuencia sutil. `prefers-reduced-motion` elimina desplazamiento y reduce duración.

### Content and data visualization

Voz profesional, tranquila y específica. Fechas `dd MMM yyyy`, zona `America/Guayaquil`, decimales con configuración `es-EC`. Resultados de fórmulas muestran unidad y fuente; ninguna estimación se presenta como certeza.

## Do's and Don'ts

- **Do:** usar la curva orgánica solo para dirigir la atención clínica.
- **Do:** mantener la fuente, edición y responsable junto a cálculos y planes.
- **Don't:** convertir todas las áreas en tarjetas o píldoras verdes.
- **Don't:** ocultar advertencias, incertidumbre o datos faltantes mediante color decorativo.
