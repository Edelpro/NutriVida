# Correo SMTP real en NutriVida

NutriVida puede enviar el informe nutricional como PDF adjunto mediante un servidor SMTP. La contraseña nunca debe guardarse en Git, `appsettings.json`, capturas ni mensajes de soporte.

## 1. Datos necesarios

Solicita al proveedor de correo:

- servidor SMTP, por ejemplo `smtp.gmail.com` o el servidor de tu dominio;
- puerto (normalmente `587` con `StartTls` o `465` con `SslOnConnect`);
- nombre de usuario;
- contraseña SMTP o contraseña de aplicación;
- correo y nombre del remitente.

Para una clínica se recomienda una cuenta del dominio del consultorio y un proveedor con condiciones adecuadas para información de salud. No uses una contraseña normal si el proveedor ofrece contraseñas de aplicación.

## 2. Configurar en desarrollo sin publicar secretos

Abre Developer PowerShell y ejecuta, sustituyendo solamente los valores de ejemplo:

```powershell
cd C:\Users\PC\Documents\ChatGPT\proyecto\backend\src\NutriVida.Api
dotnet user-secrets set "Messaging:Smtp:Enabled" "true"
dotnet user-secrets set "Messaging:Smtp:Host" "smtp.proveedor.com"
dotnet user-secrets set "Messaging:Smtp:Port" "587"
dotnet user-secrets set "Messaging:Smtp:SocketSecurity" "StartTls"
dotnet user-secrets set "Messaging:Smtp:Username" "consultorio@tu-dominio.com"
dotnet user-secrets set "Messaging:Smtp:Password" "TU_CONTRASENA_SMTP_O_DE_APLICACION"
dotnet user-secrets set "Messaging:Smtp:FromEmail" "consultorio@tu-dominio.com"
dotnet user-secrets set "Messaging:Smtp:FromName" "NutriVida"
```

El almacén local de `user-secrets` queda fuera del repositorio, pero no está cifrado. Protege la cuenta de Windows y no muestres esos valores en capturas.

## 3. Probar el flujo

1. Reinicia la API después de guardar los secretos.
2. En **Configuración > Integraciones**, Correo transaccional debe mostrar **Disponible**.
3. En el expediente del paciente registra un correo válido y su consentimiento real.
4. En **Mensajería**, selecciona Correo, el plan, asunto y texto.
5. Pulsa **Preparar envío**, descarga y revisa el PDF.
6. Marca la confirmación del destino enmascarado y pulsa **Enviar PDF por correo**.
7. El historial mostrará **Aceptado por correo** cuando el servidor SMTP lo acepte.

“Aceptado” confirma que el servidor recibió el mensaje; la entrega final depende del proveedor y de la bandeja del destinatario. NutriVida impide repetir un envío ya aceptado.

## 4. Producción

Configura secretos del servidor con variables de entorno:

```text
Messaging__Smtp__Enabled=true
Messaging__Smtp__Host=smtp.proveedor.com
Messaging__Smtp__Port=587
Messaging__Smtp__SocketSecurity=StartTls
Messaging__Smtp__Username=...
Messaging__Smtp__Password=...
Messaging__Smtp__FromEmail=...
Messaging__Smtp__FromName=NutriVida
```

La API de producción se detiene al iniciar si SMTP está habilitado y falta una configuración obligatoria. El PDF se adjunta directamente y la contraseña nunca se devuelve al frontend ni se registra en la base de datos.

