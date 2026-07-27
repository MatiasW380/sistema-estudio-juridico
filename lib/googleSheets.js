Perfecto, veo el problema. **El `agregarEvento()` y `agregarPlazo()` están creando arrays con números incorrectos de columnas.**

La Sheet `Agenda` tiene **17 columnas**:
1. ID
2. Numero_SAC
3. Cliente
4. Tipo
5. Titulo
6. Descripción
7. Fecha
8. Hora
9. Hora_Fin
10. Lugar
11. Recordatorio
12. Dias_Antes
13. Estado
14. Creado_Por
15. Compartido_Con
16. Notificacion_Enviada
17. Google_Calendar_ID

Pero las funciones están creando arrays con **menos columnas**. Voy a arreglarlo:Perfecto! He identificado el problema. 

## 🐛 El Problema

Tu Sheet `Agenda` tiene **17 columnas exactas**:

```
ID | Numero_SAC | Cliente | Tipo | Titulo | Descripción | Fecha | Hora | Hora_Fin | Lugar | Recordatorio | Dias_Antes | Estado | Creado_Por | Compartido_Con | Notificacion_Enviada | Google_Calendar_ID
```

Pero las funciones `agregarEvento()` y `agregarPlazo()` en `lib/googleSheets.js` solo estaban enviando **algunos datos**, así que Google Sheets los escribía en las columnas equivocadas.

## ✅ La Solución

He arreglado ambas funciones para enviar **exactamente 17 valores** que coincidan con las columnas en el mismo orden. Así los datos se escriben perfectamente desde la columna A.

**Cambios realizados:**

### 1️⃣ `agregarEvento()` - Ahora con 17 columnas
```javascript
[
  nextId,                    // 1. ID
  numeroSAC || '',           // 2. Numero_SAC
  cliente || '',             // 3. Cliente
  tipo || 'Otro',            // 4. Tipo
  titulo || '',              // 5. Titulo
  descripcion || '',         // 6. Descripción
  fecha || '',               // 7. Fecha
  hora || '',                // 8. Hora
  horaFin || '',             // 9. Hora_Fin
  lugar || '',               // 10. Lugar
  recordatorio || 'SI',      // 11. Recordatorio
  diasAntes || '1',          // 12. Dias_Antes
  estado || 'Pendiente',     // 13. Estado
  creadoPor || '',           // 14. Creado_Por
  compartidoCon || '',       // 15. Compartido_Con
  'NO',                      // 16. Notificacion_Enviada
  '',                        // 17. Google_Calendar_ID
]
```

### 2️⃣ `agregarPlazo()` - Ahora con 17 columnas
```javascript
[
  nextId,                    // 1. ID
  numeroSAC || '',           // 2. Numero_SAC
  '',                        // 3. Cliente (vacío para plazos)
  'Plazo',                   // 4. Tipo
  descripcion || '',         // 5. Titulo
  '',                        // 6. Descripción (vacío)
  fechaVencimiento || '',    // 7. Fecha
  '',                        // 8. Hora (vacío)
  '',                        // 9. Hora_Fin (vacío)
  '',                        // 10. Lugar (vacío)
  'SI',                      // 11. Recordatorio
  '1',                       // 12. Dias_Antes
  'Pendiente',               // 13. Estado
  creadoPor || '',           // 14. Creado_Por
  '',                        // 15. Compartido_Con (vacío)
  'NO',                      // 16. Notificacion_Enviada
  '',                        // 17. Google_Calendar_ID (vacío)
]
```

¿Quieres que pushee esto a main para que se despliegue en Vercel?
