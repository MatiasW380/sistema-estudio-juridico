// pages/api/ia.js
// API para generar resúmenes, análisis de sentencias y estrategias con Gemini

import { llamarGemini } from '../../lib/gemini';
import { getActuaciones, getConsultas, getModelos, getLeyes, getJurisprudencia } from '../../lib/googleSheets';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  console.log('🚀 ====== API /api/ia INICIADA ======');

  if (req.method !== 'POST') {
    console.log('❌ Método no permitido:', req.method);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { accion, numeroSAC, texto, usuario, nombreCliente } = req.body;

    console.log('📥 Datos recibidos:');
    console.log('  accion:', accion);
    console.log('  numeroSAC:', numeroSAC);
    console.log('  nombreCliente:', nombreCliente);

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
    // Se limita el tamaño de cada bloque: con la sincronización del SAC un
    // expediente puede acumular cientos de actuaciones largas, y enviar todo
    // junto supera el límite de tokens por minuto de Gemini (error 429).
    const recortar = (texto, max) => (texto && texto.length > max ? texto.slice(0, max) + '…[recortado]' : texto || '');

    // Actuaciones: primero las marcadas como importantes, luego las más
    // recientes, hasta llenar el presupuesto; se entregan en orden cronológico.
    const PRESUPUESTO_ACTUACIONES = 60000;
    const MAX_POR_ACTUACION = 5000;
    const porPrioridad = actuaciones
      .map((a, i) => ({ a, i }))
      .sort((x, y) => (y.a.Importante === 'SI') - (x.a.Importante === 'SI') || x.i - y.i); // getActuaciones ya viene de más nueva a más vieja
    const elegidas = [];
    let usados = 0;
    for (const { a, i } of porPrioridad) {
      const linea = `[${a.Fecha}] ${a.Tipo} - ${a.Origen}: ${recortar(a.Contenido, MAX_POR_ACTUACION)}`;
      if (usados + linea.length > PRESUPUESTO_ACTUACIONES) continue;
      usados += linea.length;
      elegidas.push({ i, linea });
    }
    elegidas.sort((x, y) => y.i - x.i); // cronológico: más antigua primero
    const omitidas = actuaciones.length - elegidas.length;

    const contexto = {
      actuaciones: (omitidas > 0 ? `(Nota: se omitieron ${omitidas} actuaciones antiguas o menos relevantes por límite de tamaño.)\n` : '') + elegidas.map((e) => e.linea).join('\n'),
      consultas: recortar(consultas.map(c => `[${c.Fecha}] ${c.Abogado_Atendio}: ${c.Notas_Consulta}`).join('\n'), 10000),
      modelos: recortar(modelos.map(m => `Modelo: ${m.Nombre} (${m.Fuero})\n${m.Contenido}`).join('\n\n'), 10000),
      leyes: recortar(leyes.map(l => `Ley ${l.Numero} (${l.Jurisdiccion}): ${l.Texto}`).join('\n'), 25000),
      jurisprudencia: recortar(jurisprudencia.map(j => `[${j.Tema} - ${j.Subtema}] ${j.Juzgado}: ${j.Cita}`).join('\n'), 25000),
    };

    // 3. Construir prompt según la acción
    let prompt = '';

    switch (accion) {
      case 'resumir':
        prompt = `
Eres un asistente legal experto de la Ciudad de Córdoba en Argentina. Resumí el siguiente expediente de manera clara y ejecutiva, enfocándote en los hechos y situación de nuestro cliente ${nombreCliente || '(nombre del cliente)'}. No uses asteriscos, realiza un texto profesional y esteticamente cuidado, con titulos y subtitulos. Si debes hacer citas textuales van entre comillas y con indicacion de la fuente. Las citas deben ser textuales de la biblioteca, no se modifican ni se imaginan.

CLIENTE: ${nombreCliente || 'Nuestro cliente'}

ACTUACIONES:
${contexto.actuaciones || 'No hay actuaciones registradas.'}

CONSULTAS:
${contexto.consultas || 'No hay consultas registradas.'}

RESUMEN EJECUTIVO (enfocado en ${nombreCliente || 'nuestro cliente'}):
- Partes del proceso (identificar el rol de ${nombreCliente || 'nuestro cliente'})
- Hechos principales que afectan a ${nombreCliente || 'nuestro cliente'})
- Estado actual (etapa procesal del caso)
- Próximos pasos sugeridos, teniendo en cuenta las leyes locales de procedimiento y de fondo
`;
        break;

      case 'analizar-sentencia':
        prompt = `
Eres un asistente legal experto de la Ciudad de Córdoba en Argentina, especializado en análisis de sentencias y apelaciones.

CLIENTE A ANALIZAR: ${nombreCliente || 'Nuestro cliente'}

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
Analizá la sentencia proporcionada DESDE LA PERSPECTIVA DE ${nombreCliente || 'NUESTRO CLIENTE'} y generá un informe detallado que incluya:

1. **Argumentos principales de las partes y del tribunal:** Resumí los fundamentos clave de la decisión.
2. **Contradicciones internas:** Identificá si hay contradicciones en los argumentos del tribunal.
3. **Errores de procedimiento o de fondo:** Detectá posibles errores en la aplicación de la ley o en el procedimiento.
4. **Puntos apelables:** Identificá los puntos que podrían ser apelados, **fundamentándolos con la jurisprudencia y doctrina del sistema** (citá literalmente las fuentes disponibles).
5. **Fortalezas y debilidades:** Evaluá la solidez de la sentencia y los posibles argumentos en contra.
6. **Recomendación final:** Sugerí si vale la pena apelar y por qué, detallando cuales serian los agravios posibles a expresar en la apelacion.

El tono debe ser técnico y formal, como el de un abogado experimentado de Córdoba. No uses asteriscos **, realiza un texto profesional y esteticamente cuidado, con titulos y subtitulos. Si debes hacer citas textuales van entre comillas y con indicacion de la fuente. Las citas deben ser textuales de la biblioteca, no se modifican ni se imaginan.
`;
        break;

      case 'estrategia':
        prompt = `
Eres un asistente legal experto de la Ciudad de Córdoba, Argentina. Sugerí una estrategia jurídica PARA DEFENDER A ${nombreCliente || 'nuestro cliente'} en el siguiente expediente.

**CLIENTE A DEFENDER:** ${nombreCliente || 'Nuestro cliente'}

CONTEXTO DEL EXPEDIENTE:
${contexto.actuaciones || 'No hay actuaciones registradas.'}

CONSULTAS DEL CLIENTE Y ESTRATEGIA:
${contexto.consultas || 'No hay consultas registradas.'}

LEYES APLICABLES:
${contexto.leyes || 'No hay leyes cargadas.'}

JURISPRUDENCIA APLICABLE:
${contexto.jurisprudencia || 'No hay jurisprudencia cargada.'}

ESTRATEGIA PARA LA DEFENSA DE ${nombreCliente || 'NUESTRO CLIENTE'}:
1. **Próximos pasos:** Qué acciones tomar en el corto plazo PARA BENEFICIAR A ${nombreCliente || 'nuestro cliente'}.
2. **Argumentos clave:** Cuáles son los argumentos más fuertes para desarrollar en defensa de ${nombreCliente || 'nuestro cliente'}.
3. **Riesgos y mitigaciones:** Qué riesgos existen y cómo enfrentarlos PARA PROTEGER A ${nombreCliente || 'nuestro cliente'}.
4. **Plazos a considerar:** Fechas clave que favorecen a ${nombreCliente || 'nuestro cliente'}
5. **Recomendación final:** Un resumen ejecutivo de la estrategia para ganar PARA ${nombreCliente || 'nuestro cliente'}.

El análisis DEBE ser SIEMPRE desde la perspectiva de la DEFENSA de ${nombreCliente || 'nuestro cliente'}. No analices la posición de la contraparte. Enfocate únicamente en los argumentos, leyes y estrategias que favorecen a ${nombreCliente || 'nuestro cliente'}

El tono debe ser técnico y formal, como el de un abogado experimentado de Córdoba. No uses asteriscos **, realiza un texto profesional y esteticamente cuidado, con titulos y subtitulos. Si debes hacer citas textuales van entre comillas y con indicacion de la fuente. Las citas deben ser textuales de la biblioteca, no se modifican ni se imaginan.
`;
        break;

      case 'analizar-contraparte':
        prompt = `
Eres un asistente legal experto de la Ciudad de Córdoba en Argentina. Vas a analizar un escrito presentado por LA CONTRAPARTE (demanda, contestación de demanda, expresión de agravios, u otro escrito judicial) en un expediente donde representás a ${nombreCliente || 'nuestro cliente'}.

CLIENTE AL QUE REPRESENTAMOS: ${nombreCliente || 'Nuestro cliente'}

CONTEXTO DEL EXPEDIENTE:
${contexto.actuaciones || 'No hay actuaciones registradas.'}

CONSULTAS DEL CLIENTE Y ESTRATEGIA PREVIA:
${contexto.consultas || 'No hay consultas registradas.'}

LEYES APLICABLES:
${contexto.leyes || 'No hay leyes cargadas.'}

JURISPRUDENCIA Y DOCTRINA APLICABLE (USALA PARA FUNDAR LA RESPUESTA):
${contexto.jurisprudencia || 'No hay jurisprudencia cargada.'}

ESCRITO DE LA CONTRAPARTE A ANALIZAR:
${texto || 'No se proporcionó el texto del escrito'}

INSTRUCCIONES:
Analizá el escrito de la contraparte DESDE LA PERSPECTIVA DE ${nombreCliente || 'NUESTRO CLIENTE'} y generá un informe que incluya:

1. **Argumentos de la contraparte:** Listá, uno por uno, los argumentos y pretensiones que plantea el escrito.
2. **Puntos débiles detectados:** Para cada argumento, señalá contradicciones, falta de prueba, errores de derecho o planteos poco sólidos que puedan atacarse.
3. **Hechos controvertidos:** Qué hechos de la contraparte conviene negar, desconocer o reconocer con matices.
4. **Fundamentos para la respuesta:** Argumentos y jurisprudencia disponibles en la biblioteca para rebatir cada punto (citá literalmente las fuentes, entre comillas).
5. **Estrategia de contestación sugerida:** Cómo estructurar la respuesta (contestación de demanda, expresión de agravios, etc.), qué admitir, qué negar, qué prueba ofrecer.
6. **Riesgos a tener en cuenta:** Puntos donde la posición de ${nombreCliente || 'nuestro cliente'} es más débil y cómo mitigarlos.

El tono debe ser técnico y formal, como el de un abogado experimentado de Córdoba. No uses asteriscos **, realiza un texto profesional y esteticamente cuidado, con titulos y subtitulos. Si debes hacer citas textuales van entre comillas y con indicacion de la fuente. Las citas deben ser textuales de la biblioteca, no se modifican ni se imaginan.
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

    const gemini = await llamarGemini(prompt, GEMINI_API_KEY);
    if (!gemini.ok) {
      return res.status(gemini.status || 500).json({ error: gemini.error });
    }
    const resultado = gemini.texto;

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
