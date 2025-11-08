# Script para adicionar placeholders no CONTRATO_cells.json
# Uso: .\add_placeholders.ps1

Write-Host "🔧 ADICIONANDO PLACEHOLDERS AO CONTRATO_CELLS.JSON" -ForegroundColor Cyan
Write-Host "=" * 60

$jsonPath = "e:\backstage\BECKEND\docs\CONTRATO_cells.json"

# Verifica se arquivo existe
if (-not (Test-Path $jsonPath)) {
    Write-Host "❌ Arquivo não encontrado: $jsonPath" -ForegroundColor Red
    exit 1
}

Write-Host "📂 Carregando arquivo..." -ForegroundColor Yellow
$jsonContent = Get-Content $jsonPath -Raw | ConvertFrom-Json

# Mapa de substituições
$replacements = @{
    # Textos comuns que devem virar placeholders
    "FUTURE OUTDOOR" = "{{AGENCIA_NOME}}"
    "RUA EXEMPLO, 123" = "{{AGENCIA_ENDERECO}}"
    "CENTRO" = "{{AGENCIA_BAIRRO}}"
    "CIDADE EXEMPLO" = "{{AGENCIA_CIDADE}}"
    "12.345.678/0001-90" = "{{AGENCIA_CNPJ}}"
    
    # Cliente
    "CLIENTE EXEMPLO LTDA" = "{{ANUNCIANTE_NOME}}"
    "RUA DO CLIENTE, 456" = "{{ANUNCIANTE_ENDERECO}}"
    "98.765.432/0001-10" = "{{ANUNCIANTE_CNPJ}}"
    
    # Valores
    "R$ 5.000,00" = "{{VALOR_TOTAL}}"
    "R$ 500,00" = "{{VALOR_PRODUCAO}}"
    "R$ 4.500,00" = "{{VALOR_VEICULACAO}}"
    
    # Datas
    "01/01/2025" = "{{DATA_INICIO}}"
    "31/01/2025" = "{{DATA_FIM}}"
    "JANEIRO/2025" = "{{PERIODO}}"
    
    # Outros
    "OUTDOOR 9X3" = "{{PRODUTO}}"
    "30/60 DIAS" = "{{FORMA_PAGAMENTO}}"
    "PI-2025-001" = "{{CONTRATO_NUMERO}}"
}

Write-Host "🔍 Substituindo valores por placeholders..." -ForegroundColor Yellow

$count = 0
foreach ($row in $jsonContent.rows) {
    foreach ($cell in $row.cells) {
        if ($cell.value) {
            $originalValue = $cell.value
            
            # Tenta substituir valor exato
            foreach ($key in $replacements.Keys) {
                if ($cell.value -eq $key) {
                    $cell.value = $replacements[$key]
                    $count++
                    Write-Host "  ✓ Linha $($row.rowNumber), Coluna $($cell.column): '$originalValue' → '$($cell.value)'" -ForegroundColor Green
                }
            }
            
            # Substitui parcialmente (para textos compostos)
            foreach ($key in $replacements.Keys) {
                if ($cell.value -like "*$key*") {
                    $cell.value = $cell.value -replace [regex]::Escape($key), $replacements[$key]
                    $count++
                    Write-Host "  ✓ Linha $($row.rowNumber), Coluna $($cell.column): '$originalValue' → '$($cell.value)'" -ForegroundColor Green
                }
            }
        }
    }
}

# Salva backup
$backupPath = $jsonPath -replace "\.json$", "_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
Write-Host "`n💾 Criando backup em: $backupPath" -ForegroundColor Yellow
Copy-Item $jsonPath $backupPath

# Salva arquivo modificado
Write-Host "💾 Salvando arquivo modificado..." -ForegroundColor Yellow
$jsonContent | ConvertTo-Json -Depth 10 | Set-Content $jsonPath -Encoding UTF8

Write-Host "`n✅ CONCLUÍDO!" -ForegroundColor Green
Write-Host "📊 Total de substituições: $count" -ForegroundColor Cyan
Write-Host "📂 Backup salvo em: $backupPath" -ForegroundColor Cyan
Write-Host "📄 Arquivo atualizado: $jsonPath" -ForegroundColor Cyan

Write-Host "`n🎯 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Revisar o arquivo manualmente se necessário"
Write-Host "2. Adicionar mais placeholders conforme sua necessidade"
Write-Host "3. Reiniciar o backend: npm start"
Write-Host "4. Testar a geração: GET /api/v1/contratos/:id/excel"

Write-Host "`n📋 PLACEHOLDERS ADICIONADOS:" -ForegroundColor Cyan
$replacements.GetEnumerator() | ForEach-Object {
    Write-Host "  $($_.Value.PadRight(30)) ← $($_.Key)" -ForegroundColor White
}
