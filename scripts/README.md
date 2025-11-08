# Scripts

Estrutura dos scripts do projeto (moved/organized). Use a rota protegida para executar scripts via API.

## Execução via API
Existe um subsistema para executar scripts em `scripts/` através da API HTTP (apenas administradores).

Endpoint:
- POST /api/v1/scripts/run

Body (JSON):
- script: string (caminho relativo dentro de `scripts/`, ex: `conversion/test_excel_to_pdf.js`)
- args: optional array of strings (args passados ao script)
- background: optional boolean (se true, a execução retorna imediatamente)

Somente scripts autorizados (whitelist) podem ser executados. Atualize `controllers/scriptController.js` para adicionar/remover entradas permitidas.

## Logs
Saída padrão e erro são gravados em `logs/scripts/` com timestamp e nome do script.

## Notas de segurança
- Apenas administradores podem chamar o endpoint (usa `adminAuthMiddleware`).
- O runner nega caminho com `..` e permite apenas scripts na whitelist.
- Para executar PowerShell (.ps1) o servidor precisa rodar no Windows/PowerShell.

## Próximos passos recomendados
- Implementar fila assíncrona (Redis + Bull) para jobs longos.
- Persistir metadados de jobs (status, saída) em um armazenamento (MongoDB).
- Adicionar limites de tempo e uso de recursos (cgroup/worker) para hardening.
