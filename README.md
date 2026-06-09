# Assistente Python - Vercel Function

Backend serverless para o assistente IA do interpretador Python de Programação I.

## Variáveis de ambiente na Vercel

Obrigatória:

- GEMINI_API_KEY

Opcional:

- GEMINI_MODEL = gemini-2.5-flash
- ALLOWED_ORIGIN = URL exata do GitHub Pages, se quiser restringir CORS. Se não configurar, a função aceita a origem que chamou.

## Rota

/api/assistente-python

GET retorna uma mensagem de teste.
POST recebe JSON com: modo, codigo, saida, erro, desafio.
