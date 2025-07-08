const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const Player = require('../models/Player');
const Match = require('../models/Match');
require('dotenv').config();

async function migrateFromJSON() {
  try {
    console.log('🔄 Iniciando migración de datos JSON a MongoDB...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Leer datos JSON existentes
    const dataPath = path.join(__dirname, '../../data/data.json');
    const matchesPath = path.join(__dirname, '../../data/matches-history.json');
    
    let playersData = { players: [] };
    let matchesData = [];
    
    try {
      const playersFile = await fs.readFile(dataPath, 'utf8');
      playersData = JSON.parse(playersFile);
      console.log(`📊 Encontrados ${playersData.players.length} jugadores`);
    } catch (error) {
      console.log('⚠️ No se encontró archivo de jugadores, creando datos de ejemplo');
    }
    
    try {
      const matchesFile = await fs.readFile(matchesPath, 'utf8');
      matchesData = JSON.parse(matchesFile);
      console.log(`🎮 Encontradas ${matchesData.length} partidas`);
    } catch (error) {
      console.log('⚠️ No se encontró archivo de partidas');
    }
    
    // Limpiar colecciones existentes
    await Player.deleteMany({});
    await Match.deleteMany({});
    console.log('🧹 Colecciones limpiadas');
    
    // Migrar jugadores
    for (const playerData of playersData.players) {
      const player = new Player({
        playerId: playerData.id,
        name: playerData.name,
        avatar: playerData.avatar || '',
        matches: playerData.matches || 0,
        wins: playerData.wins || 0,
        points: playerData.points || 0,
        joinDate: playerData.joinDate ? new Date(playerData.joinDate) : new Date(),
        favoriteStrategy: playerData.favoriteStrategy || 'none',
        favoriteCivilization: playerData.favoriteCivilization || 'none',
        status: playerData.status || 'active',
        categoryStats: playerData.categoryStats || {
          military: { worst: 0, average: 0, best: 0 },
          economy: { worst: 0, average: 0, best: 0 },
          technology: { worst: 0, average: 0, best: 0 },
          society: { worst: 0, average: 0, best: 0 }
        },
        matchHistory: playerData.matchHistory || []
      });
      
      await player.save();
    }
    
    console.log(`✅ ${playersData.players.length} jugadores migrados`);
    
    // Migrar partidas (si existen)
    for (const matchData of matchesData) {
      if (matchData.players && matchData.players.length >= 4) {
        const match = new Match({
          date: new Date(matchData.date),
          duration: matchData.duration || 45,
          map: matchData.map || 'Arabia',
          gameMode: matchData.gameMode || 'FFA',
          totalPlayers: matchData.players.length,
          players: matchData.players.map(p => ({
            playerId: p.id,
            playerName: p.name || 'Unknown',
            scores: p.scores || { military: 0, economy: 0, technology: 0, society: 0 },
            totalScore: p.totalScore || 0,
            finalPosition: p.position || 1,
            pointsEarned: p.pointsEarned || 0
          })),
          status: 'completed'
        });
        
        await match.save();
      }
    }
    
    console.log(`✅ ${matchesData.length} partidas migradas`);
    
    // Mostrar estadísticas finales
    const totalPlayers = await Player.countDocuments();
    const totalMatches = await Match.countDocuments();
    
    console.log('\n📈 Migración completada:');
    console.log(`   👥 Jugadores: ${totalPlayers}`);
    console.log(`   🎮 Partidas: ${totalMatches}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migrateFromJSON();
}

module.exports = migrateFromJSON;