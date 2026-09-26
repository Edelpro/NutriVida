# Seguridad, privacidad y permisos

Los datos de salud son sensibles conforme a la Ley Orgánica de Protección de Datos Personales de Ecuador. Fuente legal de referencia: https://www.gob.ec/sites/default/files/regulations/2025-01/01%20Ley%20Org%C3%A1nica%20de%20Protecci%C3%B3n%20de%20Datos%20Personales.pdf

## Decisiones implementadas

- Denegación por defecto en producción.
- Autenticación JWT con expiración de ocho horas y validación de emisor, audiencia, firma y vigencia.
- Contraseñas locales derivadas con PBKDF2-SHA256, sal aleatoria y comparación en tiempo constante.
- Roles únicos de la aplicación personal: `Nutritionist` y `ClinicAdmin`.
- Existe una sola cuenta `ClinicAdmin`, protegida contra cambio de rol o desactivación. Toda cuenta nueva se crea como `Nutritionist`.
- No existe registro público: una solicitud de acceso se guarda como pendiente, está limitada por IP y no crea una cuenta. Solo un `ClinicAdmin` autenticado puede aceptarla, asignar una contraseña temporal y crear la cuenta `Nutritionist`; también puede rechazarla sin crear acceso.
- La administración de usuarios está limitada a la clínica indicada por el token JWT y nunca expone hashes ni sales de contraseña.
- `ClinicAdmin` consulta todos los pacientes de su clínica y puede asignarlos o reasignarlos. `Nutritionist` solo consulta el expediente y los registros clínicos de pacientes cuyo `AssignedNutritionistUserId` coincide con el identificador de su token.
- Un nutricionista no puede ser desactivado mientras conserve pacientes activos asignados; Administración debe reasignarlos primero.
- Las contraseñas temporales requieren al menos 12 caracteres y pueden exigir cambio en el siguiente ingreso.
- Cuando una cuenta exige cambio, el resto de las rutas queda bloqueado hasta validar la contraseña actual y crear una nueva diferente de al menos 12 caracteres.
- Un administrador no puede desactivar su propia cuenta, quitarse su propio rol ni dejar la clínica sin otro administrador activo.
- Autorización en servidor; la interfaz solo refleja permisos.
- Registros clínicos archivables, no eliminables de forma definitiva.
- Bitácora para creación, modificación, aprobación, generación y envío.
- Bitácora de aplicación append-only: no tiene rutas para modificar o eliminar eventos, registra actor, entidad, acción, campos y correlación, y excluye hashes/sales de contraseña. Una política de retención y protección a nivel SQL debe aprobarse antes de producción.
- Aislamiento por `clinic_id` y por profesional responsable en todos los recorridos de pacientes y sus registros clínicos. Un expediente ajeno responde como no encontrado para evitar enumeración por URL.
- Límite de intentos de acceso y límite global de solicitudes para reducir abuso automatizado.
- Producción exige HTTPS/HSTS, encabezados defensivos, CORS con dominio real y una clave JWT de 32 bytes o más que no sea la de desarrollo.
- Secretos únicamente mediante variables de entorno o almacén de secretos.
- Correo y WhatsApp requieren consentimiento vigente. El envío directo por WhatsApp exige confirmación explícita del profesional, carga el PDF a Meta mediante HTTPS y bloquea repeticiones de un registro aceptado o incierto.
- Los estados de WhatsApp recibidos por webhook se aceptan únicamente después de validar `X-Hub-Signature-256` con el App Secret.
- La mensajería no incluye el expediente completo en el texto abierto.

## Decisiones que debe aprobar el cliente antes de producción

- Texto y mecanismo de consentimiento informado.
- Política de conservación, anonimización y eliminación.
- Responsables y encargados del tratamiento.
- Revisión final de permisos del administrador para el entorno productivo.
- Tiempo de expiración y mecanismo de acceso a reportes.
- Proveedor, región y contrato de alojamiento.
- Respuesta a incidentes y periodicidad de copias de seguridad.

Hasta obtener esas decisiones, la eliminación definitiva permanece bloqueada. En desarrollo se mantienen `mailto:` y `wa.me` como alternativa; WhatsApp Cloud solo se habilita explícitamente con secretos externos y confirmación humana por cada PDF.

## Configuración mínima de producción

No copies `appsettings.Development.json` al servidor. Configura, como secretos del entorno, `ConnectionStrings__NutriVida` y `Authentication__SigningKey`; configura además `Authentication__Issuer`, `Authentication__Audience`, `Security__AllowedOrigins__0` y `AllowedHosts`. Si habilitas WhatsApp Cloud, configura también `Messaging__WhatsAppCloud__PhoneNumberId`, `AccessToken`, `AppSecret` y `VerifyToken`. La API rechaza el arranque si detecta la clave demostrativa, un origen localhost o secretos incompletos en producción.
