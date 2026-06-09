const MODES = {
  dica: 'Dê uma dica curta e progressiva. Não entregue o código completo.',
  erro: 'Explique o erro de forma simples, apontando a provável causa e como o aluno pode investigar.',
  revisao: 'Revise o código e indique melhorias didáticas, sem reescrever tudo para o aluno.',
  visualg: 'Compare a lógica do código Python com Visualg, usando linguagem simples.'
};

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function cleanText(value, limit = 6000) {
  return String(value || '').slice(0, limit).trim();
}

function parseBody(rawBody) {
  if (!rawBody) return {};
  if (typeof rawBody === 'object' && rawBody !== null && !Buffer.isBuffer(rawBody)) return rawBody;
  const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  return JSON.parse(text || '{}');
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, erro: 'Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 500, { ok: false, erro: 'GEMINI_API_KEY não configurada na Vercel.' });
  }

  try {
    const body = parseBody(req.body);
    const modo = cleanText(body.modo, 40);
    const codigo = cleanText(body.codigo, 9000);
    const saida = cleanText(body.saida, 3000);
    const erro = cleanText(body.erro, 3000);
    const desafio = cleanText(body.desafio, 1500);

    if (!codigo) {
      return sendJson(res, 400, { ok: false, erro: 'Código vazio.' });
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const modeInstruction = MODES[modo] || MODES.dica;

    const prompt = `Você é um assistente didático de Programação I para alunos iniciantes que estão migrando do Visualg para Python.

Regras obrigatórias:
- Responda em português do Brasil.
- Seja breve, claro e encorajador.
- Não entregue a solução completa pronta, a menos que o aluno já tenha feito quase tudo certo e a correção seja mínima.
- Priorize pistas, perguntas orientadoras e explicações curtas.
- Foque em conceitos iniciais: print, input, int, float, if, else, while, contador, acumulador, resto/módulo, indentação e variáveis.
- Se houver erro, explique a causa provável em linguagem simples.
- Se comparar com Visualg, use equivalências como escreva -> print, leia -> input, enquanto -> while, se -> if, senao -> else.

Tipo de ajuda solicitado: ${modeInstruction}

Desafio atual, se houver:
${desafio || '(não informado)'}

Código do aluno:
\`\`\`python
${codigo}
\`\`\`

Saída ou mensagem exibida:
\`\`\`
${saida || '(sem saída informada)'}
\`\`\`

Erro capturado, se houver:
\`\`\`
${erro || '(sem erro informado)'}
\`\`\`

Responda com no máximo 8 linhas.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.35,
          topP: 0.9,
          maxOutputTokens: 500
        }
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.error?.message || 'Erro ao chamar a API do Gemini.';
      return sendJson(res, response.status, { ok: false, erro: message });
    }

    const resposta = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n').trim();

    if (!resposta) {
      return sendJson(res, 502, { ok: false, erro: 'A IA não retornou texto.' });
    }

    return sendJson(res, 200, { ok: true, resposta });
  } catch (error) {
    return sendJson(res, 500, { ok: false, erro: String(error?.message || error) });
  }
}
