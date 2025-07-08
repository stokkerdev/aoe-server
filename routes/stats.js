const express = require('express');
const Player = require('../models/Player');
const Match = require('../models/Match');
const router = express.Router();

// GET /api/stats/tournament - Estadísticas generales del torneo
router.get('/tournament', async (req, res) => {
  try {
    // Estadísticas básicas
    const totalPlayers = await Player.countDocuments({ status: 'active' });
    const totalMatches = await Match.countDocuments({ status: 'completed' });
    
    // Líder actual
    const leader = await Player.findOne({ status: 'active' })
      .sort({ points: -1, wins: -1 })
      .select('playerId name points wins matches');
    
    // Mejor ratio de victorias
    const playersWithMatches = await Player.find({ 
      status: 'active', 
      matches: { $gt: 0 } 
    }).select('playerId name wins matches');
    
    const bestRatioPlayer = playersWithMatches.reduce((best, player) => {
      const ratio = (player.wins / player.matches) * 100;
      const bestRatio = best ? (best.wins / best.matches) * 100 : 0;
      return ratio > bestRatio ? player : best;
    }, null);
    
    // Mejores en cada categoría
    const bestInCategories = {};
    const categories = ['military', 'economy', 'technology', 'society'];
    
    for (const category of categories) {
      const bestPlayer = await Player.findOne({ status: 'active' })
        .sort({ [`categoryStats.${category}.best`]: -1 })
        .select(`playerId name categoryStats.${category}`);
      
      bestInCategories[category] = bestPlayer ? {
        playerId: bestPlayer.playerId,
        name: bestPlayer.name,
        value: bestPlayer.categoryStats[category].best
      } : null;
    }
    
    // Estadísticas de partidas
    const matchStats = await Match.getTournamentStats();
    
    res.json({
      success: true,
      data: {
        totalPlayers,
        totalMatches,
        leader: leader ? {
          playerId: leader.playerId,
          name: leader.name,
          points: leader.points,
          wins: leader.wins,
          matches: leader.matches
        } : null,
        bestRatioPlayer: bestRatioPlayer ? {
          playerId: bestRatioPlayer.playerId,
          name: bestRatioPlayer.name,
          ratio: ((bestRatioPlayer.wins / bestRatioPlayer.matches) * 100).toFixed(1)
        } : null,
        bestInCategories,
        matchStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas del torneo',
      details: error.message
    });
  }
});

// GET /api/stats/leaderboard - Tabla de clasificación completa
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const leaderboard = await Player.find({ status: 'active' })
      .sort({ points: -1, wins: -1, matches: 1 })
      .limit(parseInt(limit))
      .select('playerId name points wins matches avatar categoryStats');
    
    const leaderboardWithStats = leaderboard.map((player, index) => ({
      rank: index + 1,
      playerId: player.playerId,
      name: player.name,
      avatar: player.avatar,
      points: player.points,
      wins: player.wins,
      matches: player.matches,
      losses: player.matches - player.wins,
      winRatio: player.winRatio,
      totalAverage: player.totalAverage,
      categoryAverages: {
        military: player.categoryStats.military.average,
        economy: player.categoryStats.economy.average,
        technology: player.categoryStats.technology.average,
        society: player.categoryStats.society.average
      }
    }));
    
    res.json({
      success: true,
      data: leaderboardWithStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo leaderboard',
      details: error.message
    });
  }
});

// GET /api/stats/maps - Estadísticas por mapa
router.get('/maps', async (req, res) => {
  try {
    const mapStats = await Match.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$map',
          totalMatches: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
          avgScore: { $avg: { $avg: '$players.totalScore' } }
        }
      },
      { $sort: { totalMatches: -1 } }
    ]);
    
    res.json({
      success: true,
      data: mapStats.map(stat => ({
        map: stat._id,
        totalMatches: stat.totalMatches,
        avgDuration: Math.round(stat.avgDuration),
        avgScore: Math.round(stat.avgScore)
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas de mapas',
      details: error.message
    });
  }
});

// GET /api/stats/recent-activity - Actividad reciente
router.get('/recent-activity', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recentMatches = await Match.find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('date map duration winner players totalPlayers');
    
    const activity = recentMatches.map(match => ({
      type: 'match',
      date: match.date,
      description: `Partida en ${match.map} - Ganador: ${match.winner.playerName}`,
      details: {
        map: match.map,
        duration: `${match.duration} min`,
        players: match.totalPlayers,
        winner: match.winner.playerName
      }
    }));
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo actividad reciente',
      details: error.message
    });
  }
});

module.exports = router;