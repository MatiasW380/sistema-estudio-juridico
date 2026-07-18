// pages/api/ia-general.js
// API para consultas generales de IA usando la biblioteca del sistema

import { getLeyes, getJurisprudencia, getModelos } from '../../lib/googleSheets';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';

export default async function handler(req, res) {
  console.log('🚀 ====== API /api/ia-general INICIADA ======');

  if (req.method !== 'POST') {
    console.log('❌ Método no permitido:', req.method);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { consulta } = req.body;

    if (!consulta || consulta.trim() === '') {
      return res.status(400).json({ error: 'La consulta es obligatoria' });
    }

    console.log('📥 Consulta recibida:', consulta);

    // 1. Recopilar toda la biblioteca del sistema
    console.log('📚 Recopilando biblioteca...');
    const [leyes, jurisprudencia, modelos] = await Promise.all([
      getLeyes(),
      getJurisprudencia(),
      getModelos(),
    ]);

    console.log('📊 Biblioteca recopilada:');
    console.log('  Leyes:', leyes.length);
    console.log('  Jurisprudencia:', jurisprudencia.length);
    console.log('  Modelos:', modelos.length);

    // 2. Construir el contexto de la biblioteca
    const contexto = {
      leyes: leyes.map(l => `Ley ${l.Numero} (${l.Jurisdiccion}): ${l.Texto}`).join('\n'),
      jurisprudencia: jurisprudencia.map(j => `[${j.Tema} - ${j.Subtema}] ${j.Juzgado}: ${j.Cita}`).join('\n'),
      modelos: modelos.map(m => `Modelo: ${m.Nombre} (${m.Fuero})\n${m.Contenido}`).join('\n\n'),
    };

    // 3. Construir prompt
    const prompt = `
Eres un asistente legal experto en derecho argentino, especializado en la provincia de Córdoba.

Tu tarea es responder consultas generales sobre derecho utilizando EXCLUSIVAMENTE la siguiente biblioteca legal del sistema:

=== LEYES ===
${contexto.leyes || 'No hay leyes cargadas en el sistema.'}

=== JURISPRUDENCIA Y DOCTRINA ===
${contexto.jurisprudencia || 'No hay jurisprudencia cargada en el sistema.'}

=== MODELOS DE ESCRITOS ===
${contexto.modelos || 'No hay modelos cargados en el sistema.'}

INSTRUCCIONES IMPORTANTES:
1. Respondé la consulta utilizando ÚNICAMENTE la información de la biblioteca proporcionada.
2. Si la información necesaria no está en la biblioteca, indicá claramente que no hay información disponible en el sistema.
3. No inventes leyes, jurisprudencia o doctrina que no estén en la biblioteca.
4. Citá las fuentes específicas (leyes, jurisprudencia) que uses en tu respuesta.
5. El tono debe ser técnico y formal, como el de un abogado experimentado de Córdoba.

CONSULTA DEL USUARIO:
${consulta}

RESPUESTA (basada exclusivamente en la biblioteca del sistema):
`;

    // 4. Verificar que GEMINI_API_KEY existe
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY no está configurada');
      return res.status(500).json({ error: 'GEMINI_API_KEY no está configurada en Vercel' });
    }

    // 5. Llamar a Gemini
    console.log('📤 Enviando consulta a Gemini...');
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

    return res.status(200).json({
      success: true,
      resultado,
      fuentes: {
        leyesCount: leyes.length,
        jurisprudenciaCount: jurisprudencia.length,
        modelosCount: modelos.length,
      },
    });

  } catch (error) {
    console.error('❌ Error en IA general:', error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
}
