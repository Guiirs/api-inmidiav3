require('dotenv').config();
const axios = require('axios');

async function testPlacasDisponiveisEndpoint() {
    try {
        // 1. Login para obter token
        console.log('🔐 Fazendo login...');
        const loginResponse = await axios.post('http://localhost:4000/api/v1/auth/login', {
            email: 'admin@example.com', // Use um email válido do seu banco
            password: 'admin123' // Use a senha válida
        });

        const token = loginResponse.data.token;
        console.log('✅ Login bem-sucedido\n');

        // 2. Testar endpoint /api/v1/placas/disponiveis
        console.log('📊 Testando endpoint /api/v1/placas/disponiveis...');
        const params = new URLSearchParams({
            dataInicio: '2025-01-01',
            dataFim: '2025-12-31'
        });

        const response = await axios.get(
            `http://localhost:4000/api/v1/placas/disponiveis?${params.toString()}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        console.log(`\n✅ Resposta recebida:`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Placas encontradas: ${response.data.data?.length || 0}`);
        
        if (response.data.data && response.data.data.length > 0) {
            console.log('\n📝 Amostras (5 primeiras):');
            response.data.data.slice(0, 5).forEach(p => {
                console.log(`   ${p.numero_placa}: disponivel=${p.disponivel}, regiao=${p.regiao?.nome || 'N/A'}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.error('\n💡 Dica: Verifique se o email e senha estão corretos');
        }
        process.exit(1);
    }
}

testPlacasDisponiveisEndpoint();
