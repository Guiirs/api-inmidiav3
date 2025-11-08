# Script para extrair e aplicar o código do pdfService.js

$docPath = "e:\backstage\BECKEND\docs\PDF_LAYOUT_IMPLEMENTATION.md"
$targetPath = "e:\backstage\BECKEND\services\pdfService.js"

# Lê o documento
$content = Get-Content $docPath -Raw

# Extrai apenas o código JavaScript entre ```javascript e ```
$pattern = '(?s)```javascript\s+(.*?)\s+```'
if ($content -match $pattern) {
    $code = $matches[1]
    
    # Cria backup do arquivo atual se existir
    if (Test-Path $targetPath) {
        Copy-Item $targetPath "$targetPath.backup"
        Write-Host "Backup criado: $targetPath.backup"
    }
    
    # Escreve o código extraído no arquivo
    Set-Content -Path $targetPath -Value $code -Encoding UTF8
    Write-Host "Arquivo pdfService.js atualizado com sucesso!"
    Write-Host "Total de linhas: $($code.Split("`n").Length)"
} else {
    Write-Host "ERRO: Não foi possível extrair o código JavaScript do documento."
}
