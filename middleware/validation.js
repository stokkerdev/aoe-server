const Joi = require('joi');

// Esquema de validación para jugadores
const playerSchema = Joi.object({
  playerId: Joi.string().alphanum().min(3).max(30).required(),
  name: Joi.string().min(2).max(50).required(),
  avatar: Joi.string().uri().allow(''),
  favoriteStrategy: Joi.string().max(100).allow(''),
  favoriteCivilization: Joi.string().max(50).allow(''),
  status: Joi.string().valid('active', 'inactive', 'suspended').default('active')
});

const playerUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  avatar: Joi.string().uri().allow(''),
  favoriteStrategy: Joi.string().max(100).allow(''),
  favoriteCivilization: Joi.string().max(50).allow(''),
  status: Joi.string().valid('active', 'inactive', 'suspended')
});

// Esquema de validación para partidas
const matchSchema = Joi.object({
  date: Joi.date().required(),
  duration: Joi.number().integer().min(10).max(300).required(),
  map: Joi.string().min(2).max(50).required(),
  gameMode: Joi.string().valid('FFA', 'Team', 'Wonder').default('FFA'),
  players: Joi.array().items(
    Joi.object({
      playerId: Joi.string().required(),
      playerName: Joi.string().required(),
      scores: Joi.object({
        military: Joi.number().integer().min(0).required(),
        economy: Joi.number().integer().min(0).required(),
        technology: Joi.number().integer().min(0).required(),
        society: Joi.number().integer().min(0).required()
      }).required(),
      totalScore: Joi.number().integer().min(0).required(),
      finalPosition: Joi.number().integer().min(1).required()
    })
  ).min(4).max(8).required(),
  notes: Joi.string().max(500).allow('')
});

// Middleware de validación
const validatePlayer = (req, res, next) => {
  const { error } = playerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Datos de jugador inválidos',
      details: error.details[0].message
    });
  }
  next();
};

const validatePlayerUpdate = (req, res, next) => {
  const { error } = playerUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Datos de actualización inválidos',
      details: error.details[0].message
    });
  }
  next();
};

const validateMatch = (req, res, next) => {
  const { error } = matchSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Datos de partida inválidos',
      details: error.details[0].message
    });
  }
  
  // Validaciones adicionales
  const { players } = req.body;
  
  // Verificar que las posiciones sean únicas
  const positions = players.map(p => p.finalPosition);
  const uniquePositions = [...new Set(positions)];
  if (positions.length !== uniquePositions.length) {
    return res.status(400).json({
      success: false,
      error: 'Las posiciones finales deben ser únicas'
    });
  }
  
  // Verificar que las posiciones sean consecutivas del 1 al N
  const sortedPositions = positions.sort((a, b) => a - b);
  for (let i = 0; i < sortedPositions.length; i++) {
    if (sortedPositions[i] !== i + 1) {
      return res.status(400).json({
        success: false,
        error: 'Las posiciones finales deben ser consecutivas del 1 al N'
      });
    }
  }
  
  // Verificar que totalScore coincida con la suma de scores
  for (const player of players) {
    const calculatedTotal = Object.values(player.scores).reduce((sum, score) => sum + score, 0);
    if (player.totalScore !== calculatedTotal) {
      return res.status(400).json({
        success: false,
        error: `El total de ${player.playerName} no coincide con la suma de sus puntuaciones`
      });
    }
  }
  
  next();
};

module.exports = {
  validatePlayer,
  validatePlayerUpdate,
  validateMatch
};