# 🎨 Integração Frontend - Novos Campos PDF

## Novos Campos Disponíveis na API

A API agora suporta 3 novos campos opcionais no modelo `PropostaInterna`:

```javascript
{
    // ... campos existentes ...
    
    // NOVOS CAMPOS OPCIONAIS
    produto: String,           // Ex: "OUTDOOR", "PAINEL", "BUSDOOR"
    descricaoPeriodo: String,  // Ex: "BISEMANA 26 - Janeiro/2025"
    valorProducao: Number      // Ex: 500.00
}
```

---

## 📝 Exemplo de Formulário HTML

```html
<!-- Formulário de Criação/Edição de PI -->
<form id="piForm">
    <!-- Campos Existentes -->
    <div class="form-group">
        <label for="descricao">Título/Descrição *</label>
        <input type="text" id="descricao" name="descricao" required>
    </div>
    
    <div class="form-group">
        <label for="cliente">Cliente *</label>
        <select id="cliente" name="cliente" required>
            <!-- Options de clientes -->
        </select>
    </div>
    
    <div class="form-group">
        <label for="tipoPeriodo">Tipo de Período *</label>
        <select id="tipoPeriodo" name="tipoPeriodo" required>
            <option value="quinzenal">Quinzenal</option>
            <option value="mensal">Mensal</option>
        </select>
    </div>
    
    <div class="form-row">
        <div class="form-group">
            <label for="dataInicio">Data Início *</label>
            <input type="date" id="dataInicio" name="dataInicio" required>
        </div>
        
        <div class="form-group">
            <label for="dataFim">Data Fim *</label>
            <input type="date" id="dataFim" name="dataFim" required>
        </div>
    </div>
    
    <!-- NOVO CAMPO 1: Produto -->
    <div class="form-group">
        <label for="produto">Tipo de Produto</label>
        <select id="produto" name="produto">
            <option value="OUTDOOR">OUTDOOR</option>
            <option value="PAINEL">PAINEL</option>
            <option value="BUSDOOR">BUSDOOR</option>
            <option value="FRONTLIGHT">FRONTLIGHT</option>
            <option value="BACKLIGHT">BACKLIGHT</option>
        </select>
        <small class="form-text">Opcional. Padrão: OUTDOOR</small>
    </div>
    
    <!-- NOVO CAMPO 2: Descrição do Período -->
    <div class="form-group">
        <label for="descricaoPeriodo">Descrição do Período</label>
        <input type="text" id="descricaoPeriodo" name="descricaoPeriodo" 
               placeholder="Ex: BISEMANA 26 - Janeiro/2025">
        <small class="form-text">Opcional. Se vazio, usará as datas formatadas no PDF</small>
    </div>
    
    <div class="form-group">
        <label for="valorTotal">Valor Total *</label>
        <input type="number" id="valorTotal" name="valorTotal" step="0.01" required>
    </div>
    
    <!-- NOVO CAMPO 3: Valor de Produção -->
    <div class="form-group">
        <label for="valorProducao">Valor de Produção</label>
        <input type="number" id="valorProducao" name="valorProducao" step="0.01" value="0">
        <small class="form-text">Opcional. Será subtraído do Valor Total para calcular Valor de Veiculação</small>
    </div>
    
    <!-- Campo de Cálculo Automático -->
    <div class="form-group calculated">
        <label>Valor de Veiculação (calculado)</label>
        <input type="text" id="valorVeiculacao" readonly>
    </div>
    
    <div class="form-group">
        <label for="formaPagamento">Condições de Pagamento</label>
        <input type="text" id="formaPagamento" name="formaPagamento" 
               placeholder="Ex: 30/60/90 dias">
    </div>
    
    <div class="form-group">
        <label for="placas">Placas *</label>
        <select id="placas" name="placas" multiple required>
            <!-- Options de placas -->
        </select>
    </div>
    
    <button type="submit" class="btn btn-primary">Salvar Proposta Interna</button>
</form>
```

---

## 💻 JavaScript para Calcular Valor de Veiculação

```javascript
// Função para calcular automaticamente o Valor de Veiculação
function calcularValorVeiculacao() {
    const valorTotal = parseFloat(document.getElementById('valorTotal').value) || 0;
    const valorProducao = parseFloat(document.getElementById('valorProducao').value) || 0;
    const valorVeiculacao = valorTotal - valorProducao;
    
    document.getElementById('valorVeiculacao').value = 
        valorVeiculacao.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
}

// Event listeners para atualizar o cálculo
document.getElementById('valorTotal').addEventListener('input', calcularValorVeiculacao);
document.getElementById('valorProducao').addEventListener('input', calcularValorVeiculacao);

// Submissão do formulário
document.getElementById('piForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        descricao: document.getElementById('descricao').value,
        cliente: document.getElementById('cliente').value,
        tipoPeriodo: document.getElementById('tipoPeriodo').value,
        dataInicio: document.getElementById('dataInicio').value,
        dataFim: document.getElementById('dataFim').value,
        valorTotal: parseFloat(document.getElementById('valorTotal').value),
        formaPagamento: document.getElementById('formaPagamento').value,
        placas: Array.from(document.getElementById('placas').selectedOptions)
                     .map(option => option.value),
        
        // NOVOS CAMPOS (opcionais)
        produto: document.getElementById('produto').value || 'OUTDOOR',
        descricaoPeriodo: document.getElementById('descricaoPeriodo').value || null,
        valorProducao: parseFloat(document.getElementById('valorProducao').value) || 0
    };
    
    try {
        const response = await fetch('/api/v1/pis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Seu token JWT
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const pi = await response.json();
            alert('PI criada com sucesso!');
            
            // Opcional: Fazer download do PDF
            window.open(`/api/v1/pis/${pi._id}/download`, '_blank');
        } else {
            const error = await response.json();
            alert(`Erro: ${error.message}`);
        }
    } catch (error) {
        console.error('Erro ao criar PI:', error);
        alert('Erro ao criar PI');
    }
});
```

---

## 🎯 Exemplo com React/Vue

### React (Hooks)

```jsx
import { useState, useEffect } from 'react';

function PIForm() {
    const [formData, setFormData] = useState({
        descricao: '',
        cliente: '',
        tipoPeriodo: 'quinzenal',
        dataInicio: '',
        dataFim: '',
        valorTotal: 0,
        valorProducao: 0,
        produto: 'OUTDOOR',
        descricaoPeriodo: '',
        formaPagamento: '',
        placas: []
    });
    
    const [valorVeiculacao, setValorVeiculacao] = useState(0);
    
    // Calcula automaticamente o valor de veiculação
    useEffect(() => {
        const veiculacao = formData.valorTotal - formData.valorProducao;
        setValorVeiculacao(veiculacao);
    }, [formData.valorTotal, formData.valorProducao]);
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const response = await fetch('/api/v1/pis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                const pi = await response.json();
                // Redirecionar ou mostrar sucesso
                window.open(`/api/v1/pis/${pi._id}/download`, '_blank');
            }
        } catch (error) {
            console.error('Erro ao criar PI:', error);
        }
    };
    
    return (
        <form onSubmit={handleSubmit}>
            {/* Campos do formulário */}
            
            <div className="form-group">
                <label>Tipo de Produto</label>
                <select name="produto" value={formData.produto} onChange={handleChange}>
                    <option value="OUTDOOR">OUTDOOR</option>
                    <option value="PAINEL">PAINEL</option>
                    <option value="BUSDOOR">BUSDOOR</option>
                </select>
            </div>
            
            <div className="form-group">
                <label>Descrição do Período</label>
                <input
                    type="text"
                    name="descricaoPeriodo"
                    value={formData.descricaoPeriodo}
                    onChange={handleChange}
                    placeholder="Ex: BISEMANA 26"
                />
            </div>
            
            <div className="form-group">
                <label>Valor Total</label>
                <input
                    type="number"
                    name="valorTotal"
                    value={formData.valorTotal}
                    onChange={handleChange}
                    required
                />
            </div>
            
            <div className="form-group">
                <label>Valor de Produção</label>
                <input
                    type="number"
                    name="valorProducao"
                    value={formData.valorProducao}
                    onChange={handleChange}
                />
            </div>
            
            <div className="form-group calculated">
                <label>Valor de Veiculação (calculado)</label>
                <input
                    type="text"
                    value={valorVeiculacao.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                    })}
                    readOnly
                />
            </div>
            
            <button type="submit">Salvar PI</button>
        </form>
    );
}
```

---

## 📱 Exemplo de Resposta da API

### Criação de PI

**Request:**
```http
POST /api/v1/pis
Content-Type: application/json
Authorization: Bearer {token}

{
    "cliente": "507f1f77bcf86cd799439011",
    "descricao": "Campanha Verão 2025",
    "tipoPeriodo": "quinzenal",
    "dataInicio": "2025-01-01",
    "dataFim": "2025-01-15",
    "valorTotal": 5000,
    "formaPagamento": "30/60 dias",
    "placas": ["507f191e810c19729de860ea"],
    "produto": "OUTDOOR",
    "descricaoPeriodo": "BISEMANA 01 - Janeiro/2025",
    "valorProducao": 500
}
```

**Response:**
```json
{
    "_id": "507f1f77bcf86cd799439012",
    "empresa": "507f1f77bcf86cd799439010",
    "cliente": {
        "_id": "507f1f77bcf86cd799439011",
        "nome": "Cliente Exemplo LTDA",
        "email": "contato@cliente.com",
        "telefone": "(11) 98765-4321"
    },
    "pi_code": "PI-1234567890-ABCDEF",
    "tipoPeriodo": "quinzenal",
    "dataInicio": "2025-01-01T00:00:00.000Z",
    "dataFim": "2025-01-15T00:00:00.000Z",
    "valorTotal": 5000,
    "valorProducao": 500,
    "descricao": "Campanha Verão 2025",
    "produto": "OUTDOOR",
    "descricaoPeriodo": "BISEMANA 01 - Janeiro/2025",
    "formaPagamento": "30/60 dias",
    "placas": [
        {
            "_id": "507f191e810c19729de860ea",
            "numero_placa": "001",
            "nomeDaRua": "Av. Paulista"
        }
    ],
    "status": "em_andamento",
    "createdAt": "2025-11-07T22:00:00.000Z",
    "updatedAt": "2025-11-07T22:00:00.000Z"
}
```

---

## 🎨 CSS Sugerido

```css
/* Estilos para os novos campos */
.form-group {
    margin-bottom: 1.5rem;
}

.form-group.calculated {
    background-color: #f8f9fa;
    padding: 1rem;
    border-radius: 4px;
    border: 1px dashed #dee2e6;
}

.form-group.calculated input {
    background-color: transparent;
    border: none;
    font-weight: bold;
    color: #28a745;
    font-size: 1.1rem;
}

.form-text {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.875em;
    color: #6c757d;
}

/* Destaque para campos novos */
.form-group.new-field {
    position: relative;
}

.form-group.new-field::before {
    content: "NOVO";
    position: absolute;
    top: -8px;
    right: 10px;
    background: #28a745;
    color: white;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: bold;
}
```

---

## 📊 Validações Recomendadas

```javascript
function validarPI(formData) {
    const erros = [];
    
    // Validações obrigatórias
    if (!formData.descricao) erros.push('Descrição é obrigatória');
    if (!formData.cliente) erros.push('Cliente é obrigatório');
    if (!formData.dataInicio) erros.push('Data de início é obrigatória');
    if (!formData.dataFim) erros.push('Data de fim é obrigatória');
    if (formData.valorTotal <= 0) erros.push('Valor total deve ser maior que zero');
    if (!formData.placas || formData.placas.length === 0) {
        erros.push('Selecione pelo menos uma placa');
    }
    
    // Validações dos novos campos
    if (formData.valorProducao < 0) {
        erros.push('Valor de produção não pode ser negativo');
    }
    
    if (formData.valorProducao > formData.valorTotal) {
        erros.push('Valor de produção não pode ser maior que o valor total');
    }
    
    // Validação de datas
    const inicio = new Date(formData.dataInicio);
    const fim = new Date(formData.dataFim);
    if (fim <= inicio) {
        erros.push('Data de fim deve ser posterior à data de início');
    }
    
    return erros;
}
```

---

## 🚀 Dicas de UX

1. **Calcular automaticamente:** Mostre o valor de veiculação em tempo real
2. **Valores padrão:** Preencha "OUTDOOR" como produto padrão
3. **Sugestões:** Ofereça sugestões para descricaoPeriodo baseado nas datas
4. **Preview:** Mostre uma prévia do PDF antes de salvar
5. **Validação:** Valide os valores antes de enviar

---

## 📥 Download do PDF

```javascript
// Função para fazer download do PDF de uma PI
async function downloadPDF(piId) {
    try {
        const response = await fetch(`/api/v1/pis/${piId}/download`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `PI_${piId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            throw new Error('Erro ao baixar PDF');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao baixar PDF');
    }
}

// Uso:
downloadPDF('507f1f77bcf86cd799439012');
```

---

## ✨ Conclusão

Com essas integrações, o frontend terá:
- ✅ Formulário completo com todos os novos campos
- ✅ Cálculo automático de valores
- ✅ Validações client-side
- ✅ Download de PDF integrado
- ✅ UX otimizada

Para mais informações, consulte:
- `docs/PDF_LAYOUT_IMPLEMENTATION.md` - Detalhes técnicos
- `docs/PDF_TESTING_GUIDE.md` - Guia de testes
