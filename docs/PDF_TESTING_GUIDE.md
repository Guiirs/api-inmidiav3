# Guia de Teste - Novo Layout PDF

## Alterações Implementadas ✅

### 1. Modelo PropostaInterna (`models/PropostaInterna.js`)
Adicionados três novos campos ao schema:

```javascript
produto: {
    type: String,
    trim: true,
    default: 'OUTDOOR'
}

descricaoPeriodo: {
    type: String,
    trim: true
}

valorProducao: {
    type: Number,
    default: 0
}
```

### 2. Service PI (`services/piService.js`)
Atualizado o método `getById` para incluir mais campos das placas no populate:

```javascript
select: 'numero_placa codigo tipo regiao nomeDaRua tamanho'
```

### 3. Service PDF (`services/pdfService.js`)
Refatoração completa do layout para corresponder ao CONTRATO.xlsx:

- ✅ Cabeçalho profissional com logo
- ✅ Seção de Agência e Anunciante em 2 colunas
- ✅ Detalhes com novos campos (Produto, Descrição do Período)
- ✅ Tabela de programação em formato grid
- ✅ Descrição detalhada de cada placa com localização
- ✅ Seção de totalização (Valor Produção + Valor Veiculação = Valor Total)
- ✅ Texto legal atualizado
- ✅ 4 assinaturas (Agência, Anunciante, Veículo/Gerência, Contato)

## Como Testar

### 1. Reiniciar o Servidor
```powershell
# Parar o servidor se estiver rodando
# Iniciar novamente
npm start
```

### 2. Testar Download de PDF Existente
```bash
# Substitua {id} pelo ID de uma PI existente
GET /api/v1/pis/{id}/download
```

### 3. Criar Nova PI com Novos Campos
```json
POST /api/v1/pis
{
    "cliente": "ID_DO_CLIENTE",
    "tipoPeriodo": "quinzenal",
    "dataInicio": "2025-01-01",
    "dataFim": "2025-01-15",
    "valorTotal": 5000,
    "descricao": "Campanha Outdoor Janeiro 2025",
    "formaPagamento": "30/60 dias",
    "placas": ["ID_PLACA_1", "ID_PLACA_2"],
    
    // NOVOS CAMPOS
    "produto": "OUTDOOR",
    "descricaoPeriodo": "BISEMANA 01 - Janeiro/2025",
    "valorProducao": 500
}
```

### 4. Verificar PDF Gerado
O PDF gerado deve conter:

1. **Cabeçalho**
   - Logo da empresa (se existir em `public/logo_contrato.png`)
   - Título "PROPOSTA INTERNA (PI)"
   - Número da PI

2. **Seção de Partes**
   - Coluna Esquerda: Dados da Agência (Empresa)
   - Coluna Direita: Dados do Anunciante (Cliente)

3. **Detalhes**
   - Título (descricao da PI)
   - Produto (novo campo)
   - Período (descricaoPeriodo ou datas formatadas)
   - Autorização Nº
   - Data de emissão
   - Contato/Atendimento
   - Condições de PGTO
   - Segmento

4. **Programação**
   - Tabela com colunas: PLACA | DESCRIÇÃO/LOCALIZAÇÃO | PERÍODO | VALOR
   - Cada placa com sua localização (nomeDaRua) e região

5. **Totalização**
   - OBSERVAÇÕES sobre produção
   - VALOR PRODUÇÃO (novo campo)
   - VALOR VEICULAÇÃO (calculado: valorTotal - valorProducao)
   - VALOR TOTAL
   - VENCIMENTO

6. **Rodapé**
   - Texto legal completo
   - 4 linhas de assinatura

## Compatibilidade com PIs Antigas

As PIs criadas antes desta atualização continuarão funcionando normalmente:

- **produto**: Usará o valor padrão "OUTDOOR"
- **descricaoPeriodo**: Usará as datas formatadas (dataInicio - dataFim)
- **valorProducao**: Usará 0, então "Valor Veiculação" = "Valor Total"

## Troubleshooting

### Erro: "Logo não encontrado"
- Adicione o arquivo de logo em: `public/logo_contrato.png`
- Ou o PDF gerará com o texto "[LOGO]" no lugar

### Placas sem localização
- Certifique-se que o campo `nomeDaRua` está preenchido nas placas
- O PDF mostrará "Localização não informada" se o campo estiver vazio

### Erros de Formatação
- Verifique se todos os campos obrigatórios da PI estão preenchidos
- Confirme que cliente e empresa têm todos os dados necessários

## Endpoints Relacionados

- `GET /api/v1/pis` - Listar PIs
- `GET /api/v1/pis/:id` - Buscar PI específica
- `GET /api/v1/pis/:id/download` - Gerar e baixar PDF
- `POST /api/v1/pis` - Criar nova PI
- `PUT /api/v1/pis/:id` - Atualizar PI

## Arquivos Modificados

1. ✅ `models/PropostaInterna.js` - Schema atualizado
2. ✅ `services/piService.js` - Populate atualizado
3. ✅ `services/pdfService.js` - Layout completamente refatorado
4. ✅ `docs/PDF_LAYOUT_IMPLEMENTATION.md` - Documentação técnica
5. ✅ `scripts/apply_pdfService_code.ps1` - Script de aplicação

## Backup

Backup automático foi criado em:
- `services/pdfService.js.backup`

Para reverter as alterações:
```powershell
Copy-Item "services/pdfService.js.backup" -Destination "services/pdfService.js"
```

## Próximos Passos

1. ✅ Testar geração de PDF com PI existente
2. ✅ Testar criação de nova PI com novos campos
3. ✅ Validar layout do PDF gerado
4. ⏳ Adicionar logo da empresa em `public/logo_contrato.png`
5. ⏳ Atualizar frontend para incluir novos campos no formulário de criação/edição de PI

## Suporte

Para mais informações sobre o mapeamento de dados API -> PDF, consulte:
`docs/PDF_LAYOUT_IMPLEMENTATION.md`
