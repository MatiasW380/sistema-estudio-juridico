// pages/api/ia.js
// API para generar resúmenes, análisis de sentencias y estrategias con Gemini

import { getActuaciones, getConsultas, getModelos, getLeyes, getJurisprudencia } from '../../lib/googleSheets';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';

export default async function handler(req, res) {
  console.log('🚀 ====== API /api/ia INICIADA ======');

  if (req.method !== 'POST') {
    console.log('❌ Método no permitido:', req.method);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { accion, numeroSAC, texto, usuario } = req.body;

    console.log('📥 Datos recibidos:');
    console.log('  accion:', accion);
    console.log('  numeroSAC:', numeroSAC);

    if (!numeroSAC) {
      console.log('❌ numeroSAC faltante');
      return res.status(400).json({ error: 'numeroSAC es obligatorio' });
    }

    // 1. Recopilar contexto del expediente
    console.log('📚 Recopilando contexto del expediente...');
    const [actuaciones, consultas, modelos, leyes, jurisprudencia] = await Promise.all([
      getActuaciones(numeroSAC),
      getConsultas(numeroSAC),
      getModelos(),
      getLeyes(),
      getJurisprudencia(),
    ]);

    console.log('📊 Contexto recopilado:');
    console.log('  Actuaciones:', actuaciones.length);
    console.log('  Consultas:', consultas.length);
    console.log('  Modelos:', modelos.length);
    console.log('  Leyes:', leyes.length);
    console.log('  Jurisprudencia:', jurisprudencia.length);

    // 2. Construir el contexto
    const contexto = {
      actuaciones: actuaciones.map(a => `[${a.Fecha}] ${a.Tipo} - ${a.Origen}: ${a.Contenido}`).join('\n'),
      consultas: consultas.map(c => `[${c.Fecha}] ${c.Abogado_Atendio}: ${c.Notas_Consulta}`).join('\n'),
      modelos: modelos.map(m => `Modelo: ${m.Nombre} (${m.Fuero})\n${m.Contenido}`).join('\n\n'),
      leyes: leyes.map(l => `Ley ${l.Numero} (${l.Jurisdiccion}): ${l.Texto}`).join('\n'),
      jurisprudencia: jurisprudencia.map(j => `[${j.Tema} - ${j.Subtema}] ${j.Juzgado}: ${j.Cita}`).join('\n'),
    };

    // 3. Construir prompt según la acción
    let prompt = '';

    switch (accion) {
      case 'resumir':
        prompt = `
Eres un asistente legal experto. Resumí el siguiente expediente de manera clara y ejecutiva.

ACTUACIONES:
${contexto.actuaciones || 'No hay actuaciones registradas.'}

CONSULTAS:
${contexto.consultas || 'No hay consultas registradas.'}

RESUMEN EJECUTIVO:
- Partes del proceso
- Hechos principales
- Estado actual (etapa procesal)
- Próximos pasos sugeridos
- Riesgos y oportunidades del caso
`;
        break;

      case 'analizar-sentencia':
        prompt = `
Eres un asistente legal experto en derecho argentino, especializado en análisis de sentencias y apelaciones.

CONTEXTO DEL EXPEDIENTE:
${contexto.actuaciones || 'No hay actuaciones registradas.'}

CONSULTAS DEL CLIENTE Y ESTRATEGIA:
${contexto.consultas || 'No hay consultas registradas.'}

LEYES APLICABLES:
${contexto.leyes || 'No hay leyes cargadas.'}

JURISPRUDENCIA Y DOCTRINA APLICABLE (USALA PARA FUNDAR EL ANÁLISIS):
${contexto.jurisprudencia || 'No hay jurisprudencia cargada.'}

TEXTO DE LA SENTENCIA A ANALIZAR:
${texto || 'No se proporcionó texto de sentencia'}

INSTRUCCIONES:
Analizá la sentencia proporcionada y generá un informe detallado que incluya:

1. **Argumentos principales del tribunal:** Resumí los fundamentos clave de la decisión.
2. **Contradicciones internas:** Identificá si hay contradicciones en los argumentos del tribunal.
3. **Errores de procedimiento o de fondo:** Detectá posibles errores en la aplicación de la ley o en el procedimiento.
4. **Puntos apelables:** Identificá los puntos que podrían ser apelados, **fundamentándolos con la jurisprudencia y doctrina del sistema** (citá literalmente las fuentes disponibles).
5. **Fortalezas y debilidades:** Evaluá la solidez de la sentencia y los posibles argumentos en contra.
6. **Recomendación final:** Sugerí si vale la pena apelar y por qué.

El tono debe ser técnico y formal, como el de un abogado experimentado de Córdoba.
`;
        break;

      case 'estrategia':
        prompt = `
Eres un asistente legal experto en derecho argentino. Sugerí una estrategia jurídica para el siguiente expediente.

CONTEXTO DEL EXPEDIENTE:
${contexto.actuaciones || 'No hay actuaciones registradas.'}

CONSULTAS DEL CLIENTE Y ESTRATEGIA:
${contexto.consultas || 'No hay consultas registradas.'}

LEYES APLICABLES:
${contexto.leyes || 'No hay leyes cargadas.'}

JURISPRUDENCIA APLICABLE:
${contexto.jurisprudencia || 'No hay jurisprudencia cargada.'}

ESTRATEGIA SUGERIDA:
1. **Próximos pasos:** Qué acciones tomar en el corto plazo.
2. **Argumentos clave:** Cuáles son los argumentos más fuertes para desarrollar.
3. **Riesgos y mitigaciones:** Qué riesgos existen y cómo enfrentarlos.
4. **Plazos a considerar:** Fechas clave a tener en cuenta.
5. **Recomendación final:** Un resumen ejecutivo de la estrategia.

El tono debe ser técnico y formal, como el de un abogado experimentado de Córdoba.
`;
        break;

      default:
        console.log('❌ Acción no válida:', accion);
        return res.status(400).json({ error: 'Acción no válida' });
    }

    // 4. Verificar que GEMINI_API_KEY existe
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY no está configurada');
      return res.status(500).json({ error: 'GEMINI_API_KEY no está configurada en Vercel' });
    }

    // 5. Llamar a Gemini
    console.log('📤 Enviando prompt a Gemini...');
    console.log('📤 Longitud del prompt:', prompt.length);

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en Gemini:', response.status, errorText);
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'Límite de uso de Gemini alcanzado. Esperá 24 horas o verificá tu API Key.' 
        });
      }
      
      return res.status(response.status).json({ 
        error: `Error en Gemini: ${response.status}`,
        details: errorText 
      });
    }

    const data = await response.json();
    const resultado = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar respuesta.';

    console.log('✅ Gemini respondió exitosamente. Longitud:', resultado.length);

    // 6. Devolver resultado
    return res.status(200).json({
      success: true,
      resultado,
      contexto: {
        actuacionesCount: actuaciones.length,
        consultasCount: consultas.length,
        modelosCount: modelos.length,
        leyesCount: leyes.length,
        jurisprudenciaCount: jurisprudencia.length,
      },
    });

  } catch (error) {
    console.error('❌ Error en IA:', error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
}
