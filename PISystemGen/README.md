PISystemGen
=========

Subsystem para orquestrar a geração de PI (preencher template Excel e converter para PDF).

Estrutura
- `generator.js` — wrappers que usam `services/excelServiceV2.js` para gerar buffers (Excel/PDF) e salvar temporários.
- `jobManager.js` — gerenciador simples em memória de jobs (queued/running/done/failed).
- `controller.js` — handlers HTTP para iniciar geração e consultar status.
- `routes.js` — rotas Express que expõem a API: `POST /generate`, `GET /status/:jobId`.

Uso
- POST /api/v1/pi-gen/generate { contratoId, background=true }
  - Se background=true retorna jobId imediatamente.
  - Se background=false espera a conclusão e retorna o PDF (download).
- GET /api/v1/pi-gen/status/:jobId — retorna status do job.

Notas
- O job manager atual é in-memory; para produção recomenda-se persistência em MongoDB e uso de fila (Bull/Redis) para escalabilidade.
- Os arquivos temporários ficam em `PISystemGen/tmp/`.
