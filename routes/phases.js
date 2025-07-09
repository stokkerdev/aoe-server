const express = require('express');
const TournamentPhase = require('../models/TournamentPhase');
const Match = require('../models/Match');
const Player = require('../models/Player');
const router = express.Router();

// GET /api/phases - Obtener todas las fases
router.get('/', async (req, res) => {
  try {
    const { status, sortBy = 'startDate', order = 'asc' } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };
    
    const phases = await TournamentPhase.find(filters)
      .sort(sortOptions)
      .select('-__v');
    
    res.json({
      success: true,
      data: phases
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo fases',
      details: error.message
    });
  }
});

// GET /api/phases/:phaseId - Obtener una fase específica
router.get('/:phaseId', async (req, res) => {
  try {
    const phase = await TournamentPhase.findOne({ phaseId: req.params.phaseId });
    
    if (!phase) {
      return res.status(404).json({
        success: false,
        error: 'Fase no encontrada'
      });
    }
    
    // Obtener estadísticas de la fase
    const matches = await Match.countDocuments({ 
      phaseId: req.params.phaseId,
      status: 'completed' 
    });
    
    const players = await Player.find({ status: 'active' });
    
    res.json({
      success: true,
      data: {
        ...phase.toObject(),
        stats: {
          totalMatches: matches,
          totalPlayers: players.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo fase',
      details: error.message
    });
  }
});

// POST /api/phases - Crear nueva fase
router.post('/', async (req, res) => {
  try {
    const phase = new TournamentPhase(req.body);
    await phase.save();
    
    res.status(201).json({
      success: true,
      data: phase,
      message: 'Fase creada exitosamente'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Error creando fase',
      details: error.message
    });
  }
});

// PUT /api/phases/:phaseId - Actualizar fase
router.put('/:phaseId', async (req, res) => {
  try {
    const phase = await TournamentPhase.findOneAndUpdate(
      { phaseId: req.params.phaseId },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!phase) {
      return res.status(404).json({
        success: false,
        error: 'Fase no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: phase,
      message: 'Fase actualizada exitosamente'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Error actualizando fase',
      details: error.message
    });
  }
});

// GET /api/phases/:phaseId/leaderboard - Tabla de clasificación por fase
router.get('/:phaseId/leaderboard', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    // Obtener partidas de la fase
    const matches = await Match.find({ 
      phaseId: req.params.phaseId,
      status: 'completed' 
    });
    
    // Calcular puntos por jugador en esta fase
    const playerStats = {};
    
    matches.forEach(match => {
      match.players.forEach(player => {
        if (!playerStats[player.playerId]) {
          playerStats[player.playerId] = {
            playerId: player.playerId,
            playerName: player.playerName,
            matches: 0,
            wins: 0,
            points: 0,
            totalScore: 0
          };
        }
        
        const stats = playerStats[player.playerId];
        stats.matches++;
        stats.points += player.pointsEarned;
        stats.totalScore += player.totalScore;
        
        if (player.finalPosition === 1) {
          stats.wins++;
        }
      });
    });
    
    // Convertir a array y ordenar
    const leaderboard = Object.values(playerStats)
      .sort((a, b) => b.points - a.points || b.wins - a.wins)
      .slice(0, parseInt(limit))
      .map((player, index) => ({
        ...player,
        rank: index + 1,
        winRatio: player.matches > 0 ? ((player.wins / player.matches) * 100).toFixed(1) : '0.0',
        avgScore: player.matches > 0 ? Math.round(player.totalScore / player.matches) : 0
      }));
    
    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo leaderboard de la fase',
      details: error.message
    });
  }
});

// GET /api/phases/:phaseId/matches - Partidas de una fase específica
router.get('/:phaseId/matches', async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const pageSize = parseInt(limit);
    const skip = (parseInt(page) - 1) * pageSize;
    
    const matches = await Match.find({ 
      phaseId: req.params.phaseId,
      status: 'completed' 
    })
      .sort({ date: -1 })
      .limit(pageSize)
      .skip(skip)
      .select('-__v');
    
    const total = await Match.countDocuments({ 
      phaseId: req.params.phaseId,
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
      error: 'Error obteniendo partidas de la fase',
      details: error.message
    });
  }
});

module.exports = router;