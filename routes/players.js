const express = require('express');
const Player = require('../models/Player');
const { validatePlayer, validatePlayerUpdate } = require('../middleware/validation');
const router = express.Router();

// GET /api/players - Obtener todos los jugadores
router.get('/', async (req, res) => {
  try {
    const { status, sortBy = 'points', order = 'desc', limit, page = 1 } = req.query;
    
    // Construir filtros
    const filters = {};
    if (status) filters.status = status;
    
    // Construir ordenamiento
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };
    
    // Paginación
    const pageSize = parseInt(limit) || 50;
    const skip = (parseInt(page) - 1) * pageSize;
    
    const players = await Player.find(filters)
      .sort(sortOptions)
      .limit(pageSize)
      .skip(skip)
      .select('-__v');
    
    const total = await Player.countDocuments(filters);
    
    res.json({
      success: true,
      data: players,
      pagination: {
        page: parseInt(page),
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo jugadores',
      details: error.message
    });
  }
});

// GET /api/players/:id - Obtener un jugador específico
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findOne({ playerId: req.params.id }).select('-__v');
    
    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Jugador no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: player
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo jugador',
      details: error.message
    });
  }
});

// POST /api/players - Crear nuevo jugador
router.post('/', validatePlayer, async (req, res) => {
  try {
    const existingPlayer = await Player.findOne({ playerId: req.body.playerId });
    
    if (existingPlayer) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un jugador con ese ID'
      });
    }
    
    const player = new Player(req.body);
    await player.save();
    
    res.status(201).json({
      success: true,
      data: player,
      message: 'Jugador creado exitosamente'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Error creando jugador',
      details: error.message
    });
  }
});

// PUT /api/players/:id - Actualizar jugador
router.put('/:id', validatePlayerUpdate, async (req, res) => {
  try {
    const player = await Player.findOneAndUpdate(
      { playerId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Jugador no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: player,
      message: 'Jugador actualizado exitosamente'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Error actualizando jugador',
      details: error.message
    });
  }
});

// DELETE /api/players/:id - Eliminar jugador
router.delete('/:id', async (req, res) => {
  try {
    const player = await Player.findOneAndDelete({ playerId: req.params.id });
    
    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Jugador no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Jugador eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error eliminando jugador',
      details: error.message
    });
  }
});

// GET /api/players/:id/stats - Obtener estadísticas detalladas de un jugador
router.get('/:id/stats', async (req, res) => {
  try {
    const player = await Player.findOne({ playerId: req.params.id }).select('-__v');
    
    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Jugador no encontrado'
      });
    }
    
    // Calcular estadísticas adicionales
    const stats = {
      basic: {
        matches: player.matches,
        wins: player.wins,
        losses: player.matches - player.wins,
        points: player.points,
        winRatio: player.winRatio,
        totalAverage: player.totalAverage
      },
      categories: player.categoryStats,
      recentMatches: player.matchHistory.slice(0, 10),
      performance: {
        bestMatch: player.matchHistory.reduce((best, match) => 
          match.totalScore > (best?.totalScore || 0) ? match : best, null),
        worstMatch: player.matchHistory.reduce((worst, match) => 
          match.totalScore < (worst?.totalScore || Infinity) ? match : worst, null)
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas',
      details: error.message
    });
  }
});

// GET /api/players/leaderboard - Obtener tabla de clasificación
router.get('/leaderboard/ranking', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const leaderboard = await Player.find({ status: 'active' })
      .sort({ points: -1, wins: -1, matches: 1 })
      .limit(parseInt(limit))
      .select('playerId name points wins matches winRatio avatar -_id');
    
    const leaderboardWithRank = leaderboard.map((player, index) => ({
      ...player.toObject(),
      rank: index + 1
    }));
    
    res.json({
      success: true,
      data: leaderboardWithRank
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo leaderboard',
      details: error.message
    });
  }
});

module.exports = router;