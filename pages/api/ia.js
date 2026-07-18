// pages/api/ia.js
// API para generar escritos, resúmenes, análisis y sugerencias con Gemini

import { getActuaciones, getConsultas, getModelos, getLeyes, getJurisprudencia, guardarCorreccionIA } from '../../lib/googleSheets';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export default async function handler(req, res) {
  console.log('🚀 ====== API /api/ia INICIADA ======');
  console.log('📤 Método:', req.method);

  if (req.method !== 'POST') {
    console.log('❌ Método no permitido:', req.method);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { accion, numeroSAC, texto, tipo, usuario } = req.body;

    console.log('📥 Datos recibidos:');
    console.log('  accion:', accion);
    console.log('  numeroSAC:', numeroSAC);
    console.log('  texto:', texto ? 'SI (texto proporcionado)' : 'NO');

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
      case 'generar-escrito':
        prompt = `
Eres un asistente legal experto en derecho argentino, especializado en la redacción de escritos judiciales para la provincia de Córdoba.

CONTEXTO DEL EXPEDIENTE:
${contexto.actuaciones || 'No hay actuaciones registradas.'}

CONSULTAS DEL CLIENTE Y ESTRATEGIA:
${contexto.consultas || 'No hay consultas registradas.'}

MODELOS DE ESCRITOS DISPONIBLES (elige el más adecuado según el contexto):
${contexto.modelos || 'No hay modelos cargados.'}

LEYES APLICABLES:
${contexto.leyes || 'No hay leyes cargadas.'}

JURISPRUDENCIA APLICABLE:
${contexto.jurisprudencia || 'No hay jurisprudencia cargada.'}

INSTRUCCIONES:
1. Redactá un escrito judicial completo, profesional y formal.
2. Usá el modelo de escrito más adecuado como base.
3. Citá las leyes y jurisprudencia relevantes de manera LITERAL (copiá el texto exacto).
4. Incorporá los hechos y la estrategia de las consultas.
5. El tono debe ser el de un abogado experimentado de Córdoba.
6. No inventes citas ni hechos que no estén en el contexto.
7. Si no hay suficiente información, indicá qué falta.

ESCRITO GENERADO:`;
        break;

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
`;
        break;

      case 'analizar-sentencia':
        prompt = `
Analizá la siguiente sentencia y proporcioná un análisis detallado:

${texto || 'No se proporcionó texto de sentencia'}

ANÁLISIS:
1. Argumentos principales del tribunal.
2. Puntos débiles o contradicciones.
3. Posibles errores.
4. Estrategias de apelación.
5. Riesgos y oportunidades.
`;
        break;

      case 'detectar-errores':
        prompt = `
Revisá el siguiente texto legal y detectá posibles errores:

${texto || 'No se proporcionó texto'}

REVISIÓN:
1. Errores formales (plazos, términos, etc.).
2. Contradicciones internas.
3. Omisiones relevantes.
4. Sugerencias de mejora.
`;
        break;

      case 'estrategia':
        prompt = `
Basado en el estado actual del expediente, sugerí una estrategia jurídica:

ACTUACIONES:
${contexto.actuaciones || 'No hay actuaciones registradas.'}

CONSULTAS:
${contexto.consultas || 'No hay consultas registradas.'}

ESTRATEGIA SUGERIDA:
1. Próximos pasos.
2. Argumentos clave a desarrollar.
3. Riesgos y mitigaciones.
4. Plazos a considerar.
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
