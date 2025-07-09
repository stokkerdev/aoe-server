const express = require('express');
const Match = require('../models/Match');
const Player = require('../models/Player');
const { validateMatch } = require('../middleware/validation');
const router = express.Router();

// GET /api/matches - Obtener todas las partidas
router.get('/', async (req, res) => {
  try {
    const { 
      status = 'completed', 
      playerId, 
      map, 
      sortBy = 'date', 
      order = 'desc',
      limit = 20,
      page = 1 
    } = req.query;
    
    // Construir filtros
    const filters = { status };
    if (playerId) filters['players.playerId'] = playerId;
    if (map) filters.map = new RegExp(map, 'i');
    
    // Construir ordenamiento
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };
    
    // Paginación
    const pageSize = parseInt(limit);
    const skip = (parseInt(page) - 1) * pageSize;
    
    const matches = await Match.find(filters)
      .sort(sortOptions)
      .limit(pageSize)
      .skip(skip)
      .select('-__v');
    
    const total = await Match.countDocuments(filters);
    
    res.json({
      success: true,
      data: matches,
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
      error: 'Error obteniendo partidas',
      details: error.message
    });
  }
});

// GET /api/matches/:id - Obtener una partida específica
router.get('/:id', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).select('-__v');
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Partida no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo partida',
      details: error.message
    });
  }
});

// POST /api/matches - Crear nueva partida
router.post('/', validateMatch, async (req, res) => {
  try {
    const { date, duration, map, players, gameMode = 'FFA', notes, phaseId = 'fase2', adminNotes, createdBy = 'admin' } = req.body;
    
    // Validar que todos los jugadores existan
    const playerIds = players.map(p => p.playerId);
    const existingPlayers = await Player.find({ id: { $in: playerIds } });
    
    if (existingPlayers.length !== playerIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Uno o más jugadores no existen en la base de datos'
      });
    }
    
    // Calcular puntos para cada jugador
    const totalPlayers = players.length;
    const playersWithPoints = players.map(player => ({
      ...player,
      pointsEarned: totalPlayers - player.finalPosition
    }));
    
    // Crear la partida
    const match = new Match({
      phaseId,
      date: new Date(date),
      duration,
      map,
      gameMode,
      totalPlayers,
      players: playersWithPoints,
      notes,
      adminNotes,
      createdBy
    });
    
    await match.save();
    
    // Actualizar estadísticas de cada jugador
    for (const playerData of playersWithPoints) {
      const player = await Player.findOne({ id: playerData.playerId });
      if (player) {
        // Actualizar estadísticas del jugador
        player.updateStatsFromMatch({
          scores: playerData.scores,
          position: playerData.finalPosition,
          totalPlayers
        });
        
        // Agregar al historial
        player.matchHistory.unshift({
          matchId: match._id,
          date: match.date,
          map: match.map,
          duration: `${match.duration} min`,
          position: playerData.finalPosition,
          totalPlayers,
          scores: playerData.scores,
          totalScore: playerData.totalScore,
          opponents: playersWithPoints
            .filter(p => p.playerId !== playerData.playerId)
            .map(p => p.playerName)
        });
        
        await player.save();
      }
    }
    
    res.status(201).json({
      success: true,
      data: match,
      message: 'Partida creada exitosamente'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Error creando partida',
      details: error.message
    });
  }
});

// PUT /api/matches/:id - Actualizar partida
router.put('/:id', async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Partida no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: match,
      message: 'Partida actualizada exitosamente'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Error actualizando partida',
      details: error.message
    });
  }
});

// DELETE /api/matches/:id - Eliminar partida
router.delete('/:id', async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Partida no encontrada'
      });
    }
    
    // TODO: Revertir estadísticas de jugadores (implementar si es necesario)
    
    res.json({
      success: true,
      message: 'Partida eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error eliminando partida',
      details: error.message
    });
  }
});

// GET /api/matches/player/:playerId - Obtener partidas de un jugador específico
router.get('/player/:playerId', async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const pageSize = parseInt(limit);
    const skip = (parseInt(page) - 1) * pageSize;
    
    const matches = await Match.find({ 
      'players.playerId': req.params.playerId,
      status: 'completed'
    })
      .sort({ date: -1 })
      .limit(pageSize)
      .skip(skip)
      .select('-__v');
    
    const total = await Match.countDocuments({ 
      'players.playerId': req.params.playerId,
      status: 'completed'
    });
    
    res.json({
      success: true,
      data: matches,
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
      error: 'Error obteniendo partidas del jugador',
      details: error.message
    });
  }
});

module.exports = router;