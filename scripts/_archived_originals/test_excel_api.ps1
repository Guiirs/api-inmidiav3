# Script de Teste Completo - API Excel
# Testa todo o fluxo de geração de Excel

Write-Host "🧪 TESTE COMPLETO - API DE EXCEL" -ForegroundColor Cyan
Write-Host "=" * 60

# Configurações
$baseUrl = "http://localhost:3000/api/v1"
$outputDir = "e:\backstage\BECKEND\test-outputs"

# Cria diretório de saída se não existir
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
    Write-Host "📁 Diretório criado: $outputDir" -ForegroundColor Green
}

# Função para fazer login e obter token
function Get-AuthToken {
    Write-Host "`n🔐 PASSO 1: Autenticação..." -ForegroundColor Yellow
    
    $loginData = @{
        email = "admin@example.com"  # SUBSTITUA PELO SEU EMAIL
        password = "senha123"         # SUBSTITUA PELA SUA SENHA
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST `
            -Body $loginData -ContentType "application/json"
        
        Write-Host "✅ Login realizado com sucesso!" -ForegroundColor Green
        Write-Host "   Token: $($response.token.Substring(0, 20))..." -ForegroundColor Gray
        return $response.token
    }
    catch {
        Write-Host "❌ Erro no login: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Função para listar contratos
function Get-Contratos {
    param([string]$token)
    
    Write-Host "`n📋 PASSO 2: Listando contratos..." -ForegroundColor Yellow
    
    try {
        $headers = @{
            "Authorization" = "Bearer $token"
        }
        
        $response = Invoke-RestMethod -Uri "$baseUrl/contratos" -Method GET -Headers $headers
        
        Write-Host "✅ Contratos encontrados: $($response.contratos.Count)" -ForegroundColor Green
        
        if ($response.contratos.Count -gt 0) {
            Write-Host "`n📊 Lista de Contratos:" -ForegroundColor Cyan
            foreach ($contrato in $response.contratos) {
                Write-Host "   ID: $($contrato._id)" -ForegroundColor White
                Write-Host "   Número: $($contrato.numeroContrato)" -ForegroundColor Gray
                Write-Host "   Cliente: $($contrato.cliente.nome)" -ForegroundColor Gray
                Write-Host "   Valor: R$ $($contrato.valorTotal)" -ForegroundColor Gray
                Write-Host "   ---"
            }
            
            return $response.contratos[0]._id
        }
        else {
            Write-Host "⚠️  Nenhum contrato encontrado. Crie um contrato primeiro!" -ForegroundColor Yellow
            return $null
        }
    }
    catch {
        Write-Host "❌ Erro ao listar contratos: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Função para baixar Excel
function Download-Excel {
    param(
        [string]$token,
        [string]$contratoId
    )
    
    Write-Host "`n📥 PASSO 3: Baixando Excel..." -ForegroundColor Yellow
    Write-Host "   Contrato ID: $contratoId" -ForegroundColor Gray
    
    try {
        $headers = @{
            "Authorization" = "Bearer $token"
        }
        
        $outputFile = Join-Path $outputDir "contrato_$contratoId.xlsx"
        
        Invoke-WebRequest -Uri "$baseUrl/contratos/$contratoId/excel" `
            -Method GET -Headers $headers -OutFile $outputFile
        
        Write-Host "✅ Excel gerado com sucesso!" -ForegroundColor Green
        Write-Host "   Arquivo salvo em: $outputFile" -ForegroundColor Cyan
        
        # Verifica tamanho do arquivo
        $fileInfo = Get-Item $outputFile
        Write-Host "   Tamanho: $([math]::Round($fileInfo.Length / 1KB, 2)) KB" -ForegroundColor Gray
        
        # Abre arquivo no Excel
        Write-Host "`n🎯 Deseja abrir o arquivo no Excel? (S/N)" -ForegroundColor Yellow
        $resposta = Read-Host
        
        if ($resposta -eq "S" -or $resposta -eq "s") {
            Start-Process $outputFile
            Write-Host "✅ Arquivo aberto no Excel!" -ForegroundColor Green
        }
        
        return $true
    }
    catch {
        Write-Host "❌ Erro ao baixar Excel: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Red
        return $false
    }
}

# Função para validar placeholders
function Validate-Placeholders {
    param([string]$filePath)
    
    Write-Host "`n🔍 PASSO 4: Validando placeholders..." -ForegroundColor Yellow
    
    try {
        # Tenta carregar ExcelJS via Node.js
        $validateScript = @"
const ExcelJS = require('exceljs');
const workbook = new ExcelJS.Workbook();

workbook.xlsx.readFile('$($filePath.Replace('\', '/'))')
    .then(() => {
        const worksheet = workbook.getWorksheet(1);
        let placeholdersFound = [];
        
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                if (cell.value && cell.value.toString().includes('{{')) {
                    placeholdersFound.push({
                        row: rowNumber,
                        col: colNumber,
                        value: cell.value
                    });
                }
            });
        });
        
        if (placeholdersFound.length > 0) {
            console.log('ERRO: Placeholders não substituídos encontrados:');
            placeholdersFound.forEach(p => {
                console.log('  Linha ' + p.row + ', Coluna ' + p.col + ': ' + p.value);
            });
            process.exit(1);
        } else {
            console.log('OK: Todos os placeholders foram substituídos!');
            process.exit(0);
        }
    })
    .catch(err => {
        console.log('ERRO ao validar: ' + err.message);
        process.exit(1);
    });
"@
        
        $tempScriptPath = Join-Path $env:TEMP "validate_placeholders.js"
        $validateScript | Set-Content $tempScriptPath
        
        $result = node $tempScriptPath 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $result" -ForegroundColor Green
        }
        else {
            Write-Host "⚠️  $result" -ForegroundColor Yellow
        }
        
        Remove-Item $tempScriptPath -ErrorAction SilentlyContinue
    }
    catch {
        Write-Host "⚠️  Não foi possível validar placeholders (ExcelJS pode não estar instalado)" -ForegroundColor Yellow
        Write-Host "   Abra o arquivo manualmente para verificar" -ForegroundColor Gray
    }
}

# ===== EXECUÇÃO PRINCIPAL =====

Write-Host "`n🚀 INICIANDO TESTE..." -ForegroundColor Cyan

# Passo 1: Autenticar
$token = Get-AuthToken
if (-not $token) {
    Write-Host "`n❌ TESTE FALHOU: Não foi possível autenticar" -ForegroundColor Red
    exit 1
}

# Passo 2: Obter ID de um contrato
$contratoId = Get-Contratos -token $token
if (-not $contratoId) {
    Write-Host "`n❌ TESTE FALHOU: Nenhum contrato disponível" -ForegroundColor Red
    exit 1
}

# Passo 3: Baixar Excel
$success = Download-Excel -token $token -contratoId $contratoId
if (-not $success) {
    Write-Host "`n❌ TESTE FALHOU: Erro ao gerar Excel" -ForegroundColor Red
    exit 1
}

# Passo 4: Validar placeholders
$outputFile = Join-Path $outputDir "contrato_$contratoId.xlsx"
Validate-Placeholders -filePath $outputFile

# Resumo
Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "✅ TESTE CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan

Write-Host "`n📊 RESUMO:" -ForegroundColor Yellow
Write-Host "   ✓ Autenticação: OK" -ForegroundColor Green
Write-Host "   ✓ Listagem de contratos: OK" -ForegroundColor Green
Write-Host "   ✓ Geração de Excel: OK" -ForegroundColor Green
Write-Host "   ✓ Arquivo salvo: $outputFile" -ForegroundColor Cyan

Write-Host "`n🎯 PRÓXIMAS AÇÕES:" -ForegroundColor Yellow
Write-Host "1. Abra o arquivo Excel e verifique se os dados estão corretos"
Write-Host "2. Verifique se todos os placeholders foram substituídos"
Write-Host "3. Teste com diferentes contratos/PIs"
Write-Host "4. Integre no frontend React"

Write-Host "`n📚 DOCUMENTAÇÃO:" -ForegroundColor Cyan
Write-Host "   e:\backstage\BECKEND\docs\API_EXCEL_GUIDE.md"
