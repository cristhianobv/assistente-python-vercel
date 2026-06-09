const MODES = {
  dica: 'Dê uma dica curta e progressiva. Não entregue o código completo.',
  erro: 'Explique o erro de forma simples, apontando a provável causa e como o aluno pode investigar.',
  revisao: 'Revise o código e indique melhorias didáticas, sem reescrever tudo para o aluno.',
  visualg: `Explique este código como se o aluno estivesse acostumado com Visualg.
Mostre as equivalências mais importantes, quando aparecerem no código:
- escreva ou escreval -> print()
- leia -> input()
- se -> if
- senao -> else
- enquanto -> while
- <- -> =
- mod/resto -> %
- fimse/fimenquanto -> em Python o bloco é definido pela indentação.
Explique a lógica passo a passo, de forma curta e didática.`
};

const MODEL = 'gemini-2.0-flash-lite';

function applyCors(req, res) {
  const configuredOrigin = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.origin || '*';

  res.setHeader('Access-Control-Allow-Origin', configuredOrigin || origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
}

function sendJson(req, res, status, payload) {
  applyCors(req, res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function cleanText(value, limit = 6000) {
  return String(value || '').slice(0, limit).trim();
}

function parseBody(rawBody) {
  if (!rawBody) return {};

  if (typeof rawBody === 'object' && rawBody !== null && !Buffer.isBuffer(rawBody)) {
    return rawBody;
  }

  const text = Buffer.isBuffer(rawBody)
    ? rawBody.toString('utf8')
    : String(rawBody);

  return JSON.parse(text || '{}');
}

function montarPrompt({ modo, codigo, saida, erro, desafio }) {
  const modeInstruction = MODES[modo] || MODES.dica;

  return `Você é um assistente didático de Programação I para alunos iniciantes que estão migrando do Visualg para Python.

Regras obrigatórias:
- Responda em português do Brasil.
- Seja claro, encorajador e didático.
- Não entregue a solução completa pronta, a menos que o aluno já tenha feito quase tudo certo e a correção seja mínima.
- Priorize pistas, perguntas orientadoras e explicações curtas.
- Foque em conceitos iniciais: print, input, int, float, if, else, while, contador, acumulador, resto/módulo, indentação e variáveis.
- Se houver erro, explique a causa provável em linguagem simples.
- Se comparar com Visualg, use equivalências como escreva -> print, leia -> input, enquanto -> while, se -> if, senao -> else.
- Termine a resposta com uma frase completa. Não deixe a última frase incompleta.

Tipo de ajuda solicitado:
${modeInstruction}

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

Responda em no máximo 12 linhas curtas.`;
}

export default async function handler(req, res) {
  applyCors(req, res);

  const model = MODEL;

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

if (req.method === 'GET') {
  return sendJson(req, res, 200, {
    ok: false,
    erro: 'Use POST.',
    status: 'Função online.',
    modelo: model
  });
}

  if (req.method !== 'POST') {
    return sendJson(req, res, 405, {
      ok: false,
      erro: 'Use POST.',
      modelo: model
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return sendJson(req, res, 500, {
      ok: false,
      erro: 'GEMINI_API_KEY não configurada na Vercel.',
      modelo: model
    });
  }

  try {
    const body = parseBody(req.body);

    const modo = cleanText(body.modo, 40);
    const codigo = cleanText(body.codigo, 9000);
    const saida = cleanText(body.saida, 3000);
    const erro = cleanText(body.erro, 3000);
    const desafio = cleanText(body.desafio, 1500);

    if (!codigo) {
      return sendJson(req, res, 400, {
        ok: false,
        erro: 'Código vazio.',
        modelo: model
      });
    }

    const prompt = montarPrompt({ modo, codigo, saida, erro, desafio });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
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
            temperature: 0.25,
            topP: 0.9,
            maxOutputTokens: 1000
          }
        })
      }
    );

    const data = await response.json().catch(() => null);

if (!response.ok) {
  const message = data?.error?.message || 'Erro ao chamar a API do Gemini.';

  let friendlyMessage = message;

  if (
    message.includes('Quota exceeded') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('rate limit') ||
    message.includes('limit: 0')
  ) {
    friendlyMessage =
      '🤖 O assistente está temporariamente indisponível porque o limite da IA foi atingido. Você ainda pode executar programas, resolver desafios e testar exemplos normalmente. Tente novamente mais tarde.';
  }

  return sendJson(req, res, response.status, {
    ok: false,
    erro: friendlyMessage,
    modelo: model
  });
}

    const finishReason = data?.candidates?.[0]?.finishReason || '';
    const resposta = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('\n')
      .trim();

    if (!resposta) {
      return sendJson(req, res, 502, {
        ok: false,
        erro: 'A IA não retornou texto.',
        modelo: model
      });
    }

    return sendJson(req, res, 200, {
      ok: true,
      resposta,
      finishReason,
      modelo: model
    });
  } catch (error) {
    return sendJson(req, res, 500, {
      ok: false,
      erro: String(error?.message || error),
      modelo: model
    });
  }
}
