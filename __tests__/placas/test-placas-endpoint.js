require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./config/config');
const axios = require('axios');

async function testPlacasDisponiveisEndpoint() {
    try {
        console.log('🔐 Conectando ao MongoDB para buscar usuário...');
        await mongoose.connect(config.mongoUri);
        
        const User = require('./models/User');
        const user = await User.findOne();
        
        if (!user) {
            console.log('❌ Nenhum usuário encontrado no banco');
            process.exit(1);
        }

        console.log(`✅ Usando usuário: ${user.email}`);
        console.log(`   EmpresaId: ${user.empresa}`);
        console.log('');

        // Fechar conexão MongoDB antes de fazer requisições HTTP
        await mongoose.disconnect();

        // Gerar token JWT manualmente
        console.log('🔐 Gerando token JWT...');
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: user._id, email: user.email, empresaId: user.empresa },
            config.jwtSecret,
            { expiresIn: '1h' }
        );
        console.log('✅ Token gerado\n');

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
        } else {
            console.log('\n⚠️ PROBLEMA: Nenhuma placa retornada!');
            console.log('   Isso explica por que o frontend mostra todas como indisponíveis');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.error('\n💡 Dica: Problema com autenticação');
        }
        if (error.stack) {
            console.error('\nStack:', error.stack);
        }
        process.exit(1);
    }
}

testPlacasDisponiveisEndpoint();
