# Assistente Python - Programação I - Vercel Function

Backend mínimo para o assistente de IA do Interpretador Python usado em Programação I.

## Arquivos

- `api/assistente-python.js`: rota serverless da Vercel.
- `package.json`: configuração mínima do projeto Node.

## Como publicar na Vercel

1. Crie um novo repositório no GitHub, por exemplo: `assistente-python-programacao-i`.
2. Envie esta pasta para esse repositório.
3. Na Vercel, clique em **Add New Project** e importe esse repositório.
4. Em **Settings > Environment Variables**, adicione:

```text
GEMINI_API_KEY = sua_chave_do_google_ai_studio
```

Opcional:

```text
GEMINI_MODEL = gemini-2.5-flash
ALLOWED_ORIGIN = https://seuusuario.github.io
```

Se `ALLOWED_ORIGIN` ficar vazio, a função aceitará chamadas de qualquer origem usando `*`.

5. Faça o deploy.
6. Copie a URL final da função, parecida com:

```text
https://nome-do-projeto.vercel.app/api/assistente-python
```

7. No arquivo `interpretador_python.html`, altere a linha:

```javascript
const ASSISTENTE_API_URL='https://SEU-PROJETO.vercel.app/api/assistente-python';
```

para a URL real da sua Vercel Function.

## Teste rápido

Depois do deploy, teste a rota com uma requisição POST enviando JSON:

```json
{
  "modo": "dica",
  "codigo": "print('Olá Mundo')",
  "saida": "Olá Mundo",
  "erro": "",
  "desafio": ""
}
```

A resposta esperada terá este formato:

```json
{
  "ok": true,
  "resposta": "..."
}
```

## Observação didática

O prompt foi configurado para ajudar alunos iniciantes sem entregar a solução pronta. A ideia é orientar o estudante, especialmente em erros de indentação, `input`, conversão com `int`/`float`, `if/else`, `while`, contadores, acumuladores e operador de resto.
