require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');
    
    const Placa = require('./models/Placa');
    
    // Contar placas
    const total = await Placa.countDocuments();
    const disponiveis = await Placa.countDocuments({disponivel: true});
    const indisponiveis = await Placa.countDocuments({disponivel: false});
    
    console.log('📊 Status das Placas:');
    console.log(`   Total: ${total}`);
    console.log(`   Disponíveis (true): ${disponiveis}`);
    console.log(`   Indisponíveis (false): ${indisponiveis}`);
    
    // Amostras
    console.log('\n📝 Amostras (5 primeiras):');
    const samples = await Placa.find().limit(5).select('numero_placa disponivel');
    samples.forEach(p => {
      console.log(`   ${p.numero_placa}: disponivel=${p.disponivel}`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Teste concluído');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

test();
