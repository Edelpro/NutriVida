# Entrega al cliente

Qué incluye NutriVida y qué debe completarse antes de atender pacientes reales.

## Qué incluye

- **Pacientes:** expediente, ficha única con avance y alergias, archivado y restauración por Administración.
- **Agenda:** atenciones con control de horarios ocupados.
- **Evaluación:** recordatorio de 24 horas con cálculo automático de calorías, proteína, carbohidrato y grasa, historia alimentaria, antecedentes clínicos, medicación, laboratorios, embarazo o lactancia, sueño, ejercicio y salud digestiva.
- **Diagnóstico PES:** lista de códigos NCP, opción de escribir otro, borrador y aprobación por el profesional.
- **Antropometría:** pliegues, perímetros y diámetros ISAK, datos de paciente clínico (peso habitual, altura de rodilla, agarre, edema, ascitis), IMC, índices, circunferencia y área muscular del brazo, suma de pliegues y evolución del peso.
- **Cálculo energético:** Mifflin-St Jeor y Harris-Benedict revisada, con responsable registrado.
- **Plan nutricional:** catálogo con porción editable y cálculo por equivalentes, plantillas con menú completo, platos con costo, menú por día, aviso de alergias, meta desde el último cálculo y aprobación.
- **Seguimiento y reportes:** controles, evolución y PDF clínico.
- **Entrega al paciente:** correo y WhatsApp con consentimiento. El paciente solo recibe planes y diagnósticos aprobados, sin notas ni antecedentes.
- **Seguridad:** roles, aislamiento por nutricionista, bloqueo tras 5 intentos, sesiones revocables y auditoría de cambios, consultas y descargas.

## Aviso importante: listas de alimentos

**Las listas completas del SMAE y de la Universidad San Francisco de Quito (USFQ) no vienen cargadas en NutriVida.** El programa trae solo alimentos de demostración `EcuadorDemo`, que son ficticios y no sirven para atender pacientes. El cálculo por equivalentes usa promedios por grupo, no la lista SMAE completa.

No se cargaron porque sus condiciones de uso no lo permiten sin autorización:

- **USFQ:** la tabla de 2021 tiene licencia Creative Commons Atribución-NoComercial 4.0, que no permite el uso comercial. Hay que preguntar a la USFQ si el uso de la clínica y la venta de este sistema están permitidos. Fuente: <https://doi.org/10.18272/ba.v11i.3326>
- **SMAE:** es una publicación de pago de Fomento de Nutrición y Salud, A.C. (5.ª edición, 2024). Su sitio no publica ninguna licencia para usar la base en otro programa, por lo que hay que pedir permiso por escrito. Sitio: <https://midietasmae.com.mx/>; correo publicado: dudas.smae@gmail.com

Cuando exista la autorización, las listas se cargan desde **Catálogo → Importar**, con el formato de [DATA-IMPORT.md](DATA-IMPORT.md).

## Antes de atender pacientes reales

Estos puntos no se resuelven con código: los debe aportar o aprobar el cliente.

| # | Pendiente | Responsable |
|---|---|---|
| 1 | Validar fórmulas, terminología PES, reportes y flujos con un nutricionista | Cliente / nutricionista |
| 2 | Revisar con un abogado el consentimiento, la retención de datos y el cumplimiento de la LOPDP | Cliente / abogado |
| 3 | Obtener la autorización y aportar las listas SMAE y USFQ (ver el aviso de arriba). Se cargan por CSV. Producción arranca sin alimentos | Cliente |
| 3a | Confirmar los promedios por grupo del SMAE y los códigos de diagnóstico contra la edición que use la clínica | Cliente / nutricionista |
| 4 | Definir dónde se aloja, con HTTPS, dominio y SQL Server | Cliente / proveedor |
| 5 | Crear las credenciales SMTP y de WhatsApp Business si se quiere envío directo | Cliente |
| 6 | Programar copias de seguridad y probar una restauración | Cliente / proveedor |
| 7 | Decidir la vigencia del enlace del PDF (por defecto 7 días) y si se envía por enlace o solo como adjunto | Cliente |
| 8 | Hacer una prueba piloto con usuarios reales antes del uso general | Cliente |

## Límites conocidos

- **Adultos:** las ecuaciones energéticas se aceptan de 18 a 120 años, y el peso desde 20 kg. Un menor puede registrarse, pero no se calcula su energía.
- **Embarazo y lactancia:** se registran, pero las ecuaciones no incluyen ese ajuste; lo valora el profesional.
- **IMC:** se muestra sin clasificación diagnóstica.
- **Aviso de alergias:** compara palabras entre lo registrado y el nombre del alimento. Ayuda, pero no detecta ingredientes ocultos ni sinónimos, y no reemplaza la revisión profesional.
- **Contraseña olvidada:** la restablece Administración; no hay recuperación automática por correo.
- **Cédula:** se valida solo cuando se escriben 10 dígitos, porque el campo también admite pasaportes y códigos.
- **Fuera de alcance:** portal del paciente, facturación, teleconsulta e inteligencia artificial, según `PRODUCT.md`.

## Documentación

- Uso diario: [INSTRUCTIVO-DE-USO.md](INSTRUCTIVO-DE-USO.md) y [GUIA-DE-REGISTRO.md](GUIA-DE-REGISTRO.md).
- Instalación: [DESPLIEGUE.md](DESPLIEGUE.md).
- Seguridad: [SECURITY.md](SECURITY.md).
- Catálogo: [DATA-IMPORT.md](DATA-IMPORT.md).
- Mensajería: [CORREO-SMTP.md](CORREO-SMTP.md) y [WHATSAPP-CLOUD.md](WHATSAPP-CLOUD.md).
- Evidencia de pruebas: [qa/VERIFICATION.md](qa/VERIFICATION.md).
