# Despliegue en producción

Guía para poner NutriVida en un servidor. Requiere SDK .NET 10 y Node.js 24 para compilar, y SQL Server en el servidor. El HTTPS lo aporta IIS, nginx o el balanceador que tenga el alojamiento.

## 1. Compilar

```powershell
dotnet publish backend/src/NutriVida.Api -c Release -o publicar/api
npm --prefix frontend ci
npm --prefix frontend run build
```

La aplicación web queda en `frontend/dist/`. Copia el contenido de su carpeta `browser` al sitio web estático.

## 2. Indicar la URL de la API

Edita `config.js` en el sitio web publicado. No hace falta volver a compilar:

```js
window.NUTRIVIDA_CONFIG = { apiBaseUrl: 'https://api.tu-dominio.com/api' };
```

El servidor web debe devolver `index.html` para las rutas que no sean archivos (por ejemplo `/pacientes`).

## 3. Variables de entorno de la API

Todos los secretos van como variables de entorno o en el almacén de secretos del alojamiento, nunca en el repositorio.

| Variable | Valor |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ConnectionStrings__NutriVida` | Cadena de conexión de SQL Server |
| `Authentication__Issuer` | `https://api.tu-dominio.com` |
| `Authentication__Audience` | `nutrivida-web` |
| `Authentication__SigningKey` | Secreto aleatorio de 32 bytes o más |
| `Security__AllowedOrigins__0` | `https://app.tu-dominio.com` |
| `Security__TrustForwardedHeaders` | `true` si hay un proxy o balanceador delante |
| `AllowedHosts` | `api.tu-dominio.com` |
| `Database__ApplyMigrationsOnStartup` | `true` para crear o actualizar la base al arrancar |
| `Bootstrap__AdminName` | Nombre de la cuenta administradora |
| `Bootstrap__AdminEmail` | Correo de la cuenta administradora |
| `Bootstrap__AdminPassword` | Contraseña temporal de 12 caracteres o más |
| `Messaging__SharedLinkDays` | Días de vigencia del enlace del PDF; por defecto 7, máximo 30 |

Generar una clave de firma:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Correo y WhatsApp son opcionales: consulta [CORREO-SMTP.md](CORREO-SMTP.md) y [WHATSAPP-CLOUD.md](WHATSAPP-CLOUD.md). Sin ellos la app usa enlaces `mailto:` y `wa.me`.

La API se niega a arrancar en producción si detecta la clave de desarrollo, un origen `localhost` o secretos de mensajería incompletos.

## 4. Primera puesta en marcha

1. Arranca la API con las variables anteriores. Se aplican las migraciones y, si no existe ninguna cuenta, se crea la administradora con cambio de contraseña obligatorio. Producción no carga datos ni alimentos de demostración.
2. Comprueba `https://api.tu-dominio.com/health/ready`: debe responder `ready`.
3. Entra con la cuenta administradora y cambia la contraseña.
4. **Retira `Bootstrap__AdminPassword` del entorno.**
5. En Configuración, escribe el nombre del consultorio y los criterios predeterminados.
6. En Alimentos, importa el catálogo autorizado. Consulta [DATA-IMPORT.md](DATA-IMPORT.md).
7. En Usuarios y roles, crea las cuentas de nutricionistas.

## 5. Fotos de platos

Las fotos se guardan en `wwwroot/uploads` de la API. Esa carpeta debe conservarse entre despliegues y tener permiso de escritura. Son públicas por URL: no subas fotos de pacientes.

## 6. Copias de seguridad

Programa copias automáticas de la base y de `wwwroot/uploads`, y prueba una restauración antes de atender pacientes. Sin copias, un fallo del servidor puede perder historias clínicas de forma definitiva.

## 7. Actualizar a una versión nueva

1. Haz una copia de seguridad.
2. Publica la API y el sitio web nuevos, conservando `config.js` y `wwwroot/uploads`.
3. Reinicia la API. Las migraciones se aplican al arrancar.
4. Comprueba `/health/ready` y entra a la aplicación.

## Recuperar el acceso

- **Nutricionista:** en Usuarios y roles, Administración le asigna una contraseña temporal. Eso cierra sus sesiones abiertas.
- **Cuenta bloqueada:** tras 5 intentos fallidos se bloquea 15 minutos; también se desbloquea al asignar una contraseña temporal.
- **Administración:** usa la herramienta `backend/herramientas/NutriVida.RestablecerClave` desde el servidor, como explica el README.
