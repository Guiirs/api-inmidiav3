require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://futurecriacao:40RefIWhgLc0ZtEN@botwhatsapp.2eadx.mongodb.net/?appName=botwhatsapp';

async function checkClienteField() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado ao MongoDB');
        
        const Cliente = mongoose.connection.collection('clientes');
        
        // Buscar todos os clientes
        const clientes = await Cliente.find({}).toArray();
        console.log('\n📋 Todos os clientes:');
        clientes.forEach(c => {
            console.log(`  - ${c.nome} (empresa: ${c.empresa})`);
        });
        
        // Buscar qual empresa o usuário está logado
        const empresaId = '6900ce7cd4411495a0cff9e0';
        console.log(`\n🔍 Buscando clientes para empresa: ${empresaId}`);
        
        const clientesDaEmpresa = await Cliente.find({ empresa: mongoose.Types.ObjectId.createFromHexString(empresaId) }).toArray();
        console.log(`✅ Encontrados ${clientesDaEmpresa.length} clientes`);
        clientesDaEmpresa.forEach(c => {
            console.log(`  - ${c.nome}`);
        });
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

checkClienteField();
