# Integración SAC (Poder Judicial Córdoba) + LexHub

## 🚀 Configuración

### 1. Instalar Puppeteer

```bash
npm install puppeteer
# o
yarn add puppeteer
```

### 2. Archivos creados

```
/pages/api/sac/
  ├── auth.js                    → Conectar con SAC + obtener expedientes
  └── obtener-movimientos.js     → Obtener movimientos de un expediente

/pages/
  └── sac-sync.js                → Interfaz de sincronización
```

### 3. Variables de entorno (si es necesario)

No se requieren variables de entorno inicialmente. Las credenciales se pasan directamente desde el formulario.

**NOTA IMPORTANTE:** Las credenciales NO se almacenan. Se usan solo para la sesión de Puppeteer y se descartan después.

---

## 📝 Cómo usar

### Paso 1: Acceder a la página de sincronización

```
http://localhost:3000/sac-sync
```

### Paso 2: Ingresar credenciales del SAC

- Usuario: Tu usuario del Poder Judicial (matriculado)
- Contraseña: Tu contraseña del SAC

### Paso 3: Seleccionar expediente

Se muestra lista de todos los expedientes vinculados a tu usuario.

### Paso 4: Confirmar datos del cliente

Sistema pide:
- Nombre del cliente (requerido)
- Teléfono (opcional)
- DNI (opcional)
- Domicilio (opcional)

### Paso 5: Guardar en LexHub

Sistema:
1. Crea el cliente en Google Sheets
2. Obtiene los movimientos del SAC
3. Guarda expediente + movimientos
4. Redirige a la ficha del cliente

---

## 🔧 APIs creadas

### POST /api/sac/auth

**Body:**
```json
{
  "usuario": "tu_usuario",
  "contraseña": "tu_contraseña"
}
```

**Response exitoso:**
```json
{
  "success": true,
  "expedientes": [
    {
      "numero": "14769590",
      "caratula": "Apellido, Nombre c/ Otro",
      "fuero": "Civil",
      "estado": "Activo",
      "link": ""
    }
  ],
  "count": 15,
  "message": "Se encontraron 15 expedientes"
}
```

### POST /api/sac/obtener-movimientos

**Body:**
```json
{
  "usuario": "tu_usuario",
  "contraseña": "tu_contraseña",
  "numeroSAC": "14769590"
}
```

**Response exitoso:**
```json
{
  "success": true,
  "expediente": {
    "numero": "14769590",
    "caratula": "Apellido, Nombre c/ Otro",
    "movimientos": [
      {
        "id": 0,
        "foja": "1",
        "fecha": "15/08/2026",
        "tipo": "Presentación",
        "descripcion": "Demanda inicial",
        "texto": "..."
      }
    ],
    "totalMovimientos": 8
  },
  "message": "Se encontraron 8 movimientos"
}
```

---

## ⚠️ Consideraciones técnicas

### Scraping del SAC

El SAC está basado en HTML tradicional (no es una SPA con React). Puppeteer navega el sitio:

1. Abre navegador
2. Va a https://www.justiciacordoba.gob.ar/portalee/Pages/Index.aspx
3. Llena usuario/contraseña
4. Hace login
5. Extrae datos de tablas HTML

**Tiempo estimado:** 10-15 segundos por conexión (dependiendo del servidor del SAC)

### Estructura del HTML del SAC

El script intenta detectar:
- Tablas HTML estándar
- Divs con clase "expediente"
- Elementos con data-attributes

Si el SAC cambia su interfaz, el scraper podría no funcionar.

**Solución futura:** Investigar si el Poder Judicial ofrece una API oficial.

---

## 🐛 Debugging

Si algo no funciona:

### 1. Revisar logs en la consola del servidor

```
🔐 Iniciando conexión con SAC...
📍 Accediendo a SAC...
✍️  Autenticando...
📄 URL actual: https://www.justiciacordoba.gob.ar/portalee/...
```

### 2. Revisar response de la API

En el navegador, Network tab → Buscar `/api/sac/auth` → Ver response JSON

### 3. Problemas comunes

| Problema | Solución |
|----------|----------|
| "Credenciales inválidas" | Verificar usuario/contraseña en SAC directamente |
| "No se encontraron expedientes" | El SAC cambió estructura HTML → revisar selectores |
| "Timeout" | SAC lento o caído → reintentar |

---

## 🔐 Seguridad

**✅ LO QUE HACE BIEN:**
- Credenciales NO se guardan en BD
- Se usan solo para la sesión de Puppeteer
- Se descartan después de obtener datos
- HTTPS para toda comunicación

**⚠️ LO QUE FALTA:**
- Rate limiting (evitar muchos logins rápidos)
- Cifrar credentials en tránsito (si se desea guardar para auto-sync)
- Auditoría de accesos
- Validar que el usuario pueda acceder a ese expediente

---

## 📊 Qué se guarda en LexHub

### En Google Sheets → Hoja `Clientes_y_Expedientes`

```
ID_Cliente | Nombre | Telefono | DNI | Domicilio | Numero_SAC | Caratula | ...
```

### En Google Drive

Se crean carpetas:
```
/LexHub/SAC_Expedientes/
  ├── 14769590_libro.txt       (movimientos extraídos)
  ├── 14769590_metadata.json   (datos del expediente)
```

---

## 🚀 Próximas mejoras

### Fase 2: Después de probar MVP
1. **OCR de PDF descargados** → `obtener-movimientos.js` descarga adjuntos
2. **Búsqueda full-text** → Indexar todo el contenido
3. **Auto-sync** → Tarea cron que revisa cambios cada 6 horas
4. **Alertas** → Notificar cuando hay novedades

### Fase 3: Integraciones avanzadas
1. **Detectar automáticamente tipos de acción** → Plazo, audiencia, sentencia
2. **Crear tareas en LexHub** → Automáticamente desde los movimientos
3. **Calcular plazos** → Basado en tipo de operación
4. **Sugerir redacción de escritos** → Basado en el estado del expediente

---

## 📞 Testing con tu usuario real

**Cuando esté listo para testear:**

1. Asegúrate de tener usuario activo en SAC
2. Accede a `/sac-sync` en LexHub
3. Ingresa tus credenciales
4. Selecciona un expediente conocido
5. Revisa que traiga los movimientos correctos
6. Confirma que se guardó en Google Sheets

---

## 📋 Checklist antes de producción

- [ ] Testear con al menos 3 expedientes reales
- [ ] Verificar que los movimientos se extraen correctamente
- [ ] Probar con expedientes de diferentes fueros
- [ ] Documentar selectors HTML si el SAC cambió
- [ ] Agregar tests de integración
- [ ] Investigar si SAC tiene API oficial
- [ ] Configurar rate limiting en el API
- [ ] Agregar auditoría de accesos al SAC
