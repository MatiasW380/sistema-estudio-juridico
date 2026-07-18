// pages/api/ia.js
// API para generar escritos, resúmenes, análisis y sugerencias con Gemini

import { getActuaciones, getConsultas, getModelos, getLeyes, getJurisprudencia, guardarCorreccionIA } from '../../lib/googleSheets';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export default async function handler(req, res) {
  console.log('🚀 ====== API /api/ia INICIADA ======');
  console.log('📤 Método:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { accion, numeroSAC, texto, tipo, usuario } = req.body;

    if (!numeroSAC) {
      return res.status(400).json({ error: 'numeroSAC es obligatorio' });
    }

    // 1. Recopilar contexto del expediente
    const actuaciones = await getActuaciones(numeroSAC);
    const consultas = await getConsultas(numeroSAC);
    const modelos = await getModelos();
    const leyes = await getLeyes();
    const jurisprudencia = await getJurisprudencia();

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
    let systemInstruction = '';

    switch (accion) {
      case 'generar-escrito':
        prompt = `
Eres un asistente legal experto en derecho argentino, especializado en la redacción de escritos judiciales para la provincia de Córdoba.

CONTEXTO DEL EXPEDIENTE:
${contexto.actuaciones}

CONSULTAS DEL CLIENTE Y ESTRATEGIA:
${contexto.consultas}

MODELOS DE ESCRITOS DISPONIBLES (elige el más adecuado según el contexto):
${contexto.modelos}

LEYES APLICABLES:
${contexto.leyes}

JURISPRUDENCIA APLICABLE:
${contexto.jurisprudencia}

INSTRUCCIONES:
1. Redactá un escrito judicial completo, profesional y formal.
2. Usá el modelo de escrito más adecuado como base.
3. Citá las leyes y jurisprudencia relevantes de manera LITERAL (copiá el texto exacto).
4. Incorporá los hechos y la estrategia de las consultas.
5. El tono debe ser el de un abogado experimentado de Córdoba.
6. No inventes citas ni hechos que no estén en el contexto.

ESCIRTO GENERADO:`;
        break;

      case 'resumir':
        prompt = `
Eres un asistente legal experto. Resumí el siguiente expediente de manera clara y ejecutiva.

ACTUACIONES:
${contexto.actuaciones}

CONSULTAS:
${contexto.consultas}

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
${contexto.actuaciones}

CONSULTAS:
${contexto.consultas}

ESTRATEGIA SUGERIDA:
1. Próximos pasos.
2. Argumentos clave a desarrollar.
3. Riesgos y mitigaciones.
4. Plazos a considerar.
`;
        break;

      default:
        return res.status(400).json({ error: 'Acción no válida' });
    }

    // 4. Llamar a Gemini
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
      console.error('❌ Error en Gemini:', errorText);
      return res.status(500).json({ error: 'Error al llamar a Gemini' });
    }

    const data = await response.json();
    const resultado = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar respuesta.';

    // 5. Devolver resultado
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
