# WhatsApp Business Cloud en NutriVida

NutriVida puede cargar el resumen clínico PDF a Meta y enviarlo como documento real. El token de Meta nunca debe guardarse en Git, `appsettings.json`, capturas ni mensajes de soporte.

## 1. Obtener los datos de Meta

En [Meta for Developers](https://developers.facebook.com/) crea o abre una aplicación Business y agrega el producto WhatsApp. En **WhatsApp > API Setup**:

1. Agrega y verifica el teléfono receptor de prueba.
2. Copia `Phone number ID`; no es el número telefónico visible.
3. Genera un access token. Para producción usa un token de usuario del sistema con el permiso `whatsapp_business_messaging`, no el token temporal de pruebas.
4. Conserva el App Secret solo para configurar el webhook de producción.

Meta recibe primero el archivo mediante `POST /{phone-number-id}/media` y devuelve un Media ID. NutriVida usa después ese ID en `POST /{phone-number-id}/messages` con `type: document`.

## 2. Configurar el envío local sin publicar secretos

Abre Developer PowerShell en esta carpeta:

```powershell
cd C:\Users\PC\Documents\ChatGPT\proyecto\backend\src\NutriVida.Api
dotnet user-secrets set "Messaging:WhatsAppCloud:Enabled" "true"
dotnet user-secrets set "Messaging:WhatsAppCloud:GraphApiVersion" "v23.0"
dotnet user-secrets set "Messaging:WhatsAppCloud:PhoneNumberId" "TU_PHONE_NUMBER_ID"
dotnet user-secrets set "Messaging:WhatsAppCloud:AccessToken" "TU_ACCESS_TOKEN"
```

Los secretos de desarrollo quedan fuera del repositorio. El almacén local de `user-secrets` evita subirlos por accidente, pero no está cifrado; protege la sesión de Windows.

Ejecuta la API con HTTPS:

```powershell
dotnet run --launch-profile https
```

En Mensajería selecciona el paciente con consentimiento de WhatsApp, pulsa **Preparar envío**, revisa el destino enmascarado, marca la confirmación y pulsa **Enviar PDF por WhatsApp**. Una segunda pulsación no repite un envío ya aceptado.

## 3. Ventana de conversación y plantilla

Un documento libre funciona dentro de la ventana de atención iniciada por el usuario. Para iniciar una conversación fuera de esa ventana se necesita una plantilla utilitaria aprobada con encabezado `DOCUMENT`.

Cuando Meta apruebe la plantilla, configúrala:

```powershell
dotnet user-secrets set "Messaging:WhatsAppCloud:TemplateName" "nombre_exacto_aprobado"
dotnet user-secrets set "Messaging:WhatsAppCloud:TemplateLanguage" "es"
```

Si `TemplateName` queda vacío, NutriVida usa un mensaje de documento normal. Si tiene valor, usa la plantilla aprobada y coloca el PDF en su encabezado.

## 4. Publicar con HTTPS y recibir estados

El envío saliente puede probarse desde localhost. Para que Meta notifique **entregado**, **leído** o **fallido**, la API sí necesita una URL pública HTTPS estable.

Configura en el servidor variables de entorno, nunca valores dentro del repositorio:

```text
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__NutriVida=...
Authentication__Issuer=https://api.tu-dominio.com
Authentication__Audience=nutrivida-web
Authentication__SigningKey=...
Security__AllowedOrigins__0=https://app.tu-dominio.com
Messaging__WhatsAppCloud__Enabled=true
Messaging__WhatsAppCloud__GraphApiVersion=v23.0
Messaging__WhatsAppCloud__PhoneNumberId=...
Messaging__WhatsAppCloud__AccessToken=...
Messaging__WhatsAppCloud__AppSecret=...
Messaging__WhatsAppCloud__VerifyToken=...
```

En Meta configura:

- Callback URL: `https://api.tu-dominio.com/api/communications/whatsapp/webhook`
- Verify token: el mismo valor de `Messaging__WhatsAppCloud__VerifyToken`.
- Suscripción: campo `messages`.

El webhook valida `X-Hub-Signature-256` con el App Secret antes de cambiar estados. La API de producción ya exige HTTPS/HSTS, clave JWT no demostrativa, CORS con dominio real y configuración completa de WhatsApp cuando el proveedor está habilitado.

## 5. Interpretar los estados

- **Preparado:** el PDF todavía no fue enviado.
- **Confirmación pendiente:** la llamada externa comenzó y no debe repetirse automáticamente.
- **Aceptado por WhatsApp:** Meta devolvió un `wamid`; aún no garantiza recepción.
- **Entregado:** el webhook de Meta confirmó entrega al dispositivo.
- **Leído:** el webhook confirmó lectura cuando el usuario permite esa confirmación.
- **Rechazado:** Meta devolvió un error conocido; se puede corregir y volver a preparar.

Los PDF contienen información de salud. Antes de producción deben aprobarse el texto de consentimiento, el contrato de tratamiento con Meta, la retención, la región de alojamiento y el procedimiento de incidentes.
