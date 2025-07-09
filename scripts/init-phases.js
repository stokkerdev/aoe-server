const mongoose = require('mongoose');
const TournamentPhase = require('../models/TournamentPhase');
require('dotenv').config();

async function initializePhases() {
  try {
    console.log('🔄 Inicializando fases del torneo...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Verificar si ya existen fases
    const existingPhases = await TournamentPhase.countDocuments();
    if (existingPhases > 0) {
      console.log(`⚠️ Ya existen ${existingPhases} fases en la base de datos`);
      process.exit(0);
    }
    
    const phases = [
      {
        phaseId: 'fase1',
        name: 'Fase 1 - Liga Regular',
        description: 'Primera fase del torneo Age of Araganes con formato de liga regular',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        status: 'completed',
        rules: 'Reglas estándar de la liga regular. Partidas FFA con puntuación estándar.',
        maxPlayers: 8,
        format: 'league',
        pointsMultiplier: 1
      },
      {
        phaseId: 'fase2',
        name: 'Fase 2 - Liga Avanzada',
        description: 'Segunda fase del torneo con reglas avanzadas y mayor competitividad',
        startDate: new Date('2025-02-01'),
        endDate: null,
        status: 'active',
        rules: 'Reglas avanzadas. Multiplicador de puntos 1.2x. Nuevas restricciones de civilizaciones.',
        maxPlayers: 8,
        format: 'league',
        pointsMultiplier: 1.2
      }
    ];
    
    await TournamentPhase.insertMany(phases);
    console.log(`✅ ${phases.length} fases creadas exitosamente`);
    
    // Mostrar fases creadas
    phases.forEach(phase => {
      console.log(`   📅 ${phase.name} (${phase.status})`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error inicializando fases:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initializePhases();
}

module.exports = initializePhases;