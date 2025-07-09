const mongoose = require('mongoose');

const playerMatchDataSchema = new mongoose.Schema({
  playerId: { 
    type: String, 
    required: true,
    ref: 'Player'
  },
  playerName: { 
    type: String, 
    required: true 
  },
  scores: {
    military: { type: Number, required: true, min: 0 },
    economy: { type: Number, required: true, min: 0 },
    technology: { type: Number, required: true, min: 0 },
    society: { type: Number, required: true, min: 0 }
  },
  totalScore: { type: Number, required: true, min: 0 },
  finalPosition: { type: Number, required: true, min: 1 },
  pointsEarned: { type: Number, required: true, min: 0 }
}, { _id: false });

const matchSchema = new mongoose.Schema({
  phaseId: {
    type: String,
    required: true,
    default: 'fase1'
  },
  date: { 
    type: Date, 
    required: true 
  },
  duration: { 
    type: Number, 
    required: true,
    min: 10,
    max: 300
  },
  map: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 50
  },
  gameMode: {
    type: String,
    enum: ['FFA', 'Team', 'Wonder'],
    default: 'FFA'
  },
  totalPlayers: { 
    type: Number, 
    required: true,
    min: 4,
    max: 8
  },
  players: [playerMatchDataSchema],
  winner: {
    playerId: { type: String, required: true },
    playerName: { type: String, required: true }
  },
  status: {
    type: String,
    enum: ['completed', 'disputed', 'cancelled'],
    default: 'completed'
  },
  notes: {
    type: String,
    maxlength: 500
  },
  createdBy: {
    type: String,
    default: 'system'
  },
  adminNotes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para obtener la duración formateada
matchSchema.virtual('formattedDuration').get(function() {
  return `${this.duration} min`;
});

// Virtual para obtener estadísticas de la partida
matchSchema.virtual('matchStats').get(function() {
  const scores = this.players.map(p => p.totalScore);
  return {
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    averageScore: scores.reduce((a, b) => a + b, 0) / scores.length
  };
});

// Índices para optimizar consultas
matchSchema.index({ date: -1 });
matchSchema.index({ 'players.playerId': 1 });
matchSchema.index({ status: 1 });
matchSchema.index({ createdAt: -1 });

// Middleware pre-save para validaciones
matchSchema.pre('save', function(next) {
  // Validar que el número de jugadores coincida
  if (this.players.length !== this.totalPlayers) {
    return next(new Error('El número de jugadores no coincide con totalPlayers'));
  }
  
  // Validar que las posiciones sean únicas y consecutivas
  const positions = this.players.map(p => p.finalPosition).sort((a, b) => a - b);
  for (let i = 0; i < positions.length; i++) {
    if (positions[i] !== i + 1) {
      return next(new Error('Las posiciones finales deben ser consecutivas del 1 al N'));
    }
  }
  
  // Establecer ganador
  const winner = this.players.find(p => p.finalPosition === 1);
  if (winner) {
    this.winner = {
      playerId: winner.playerId,
      playerName: winner.playerName
    };
  }
  
  next();
});

// Método estático para obtener estadísticas del torneo
matchSchema.statics.getTournamentStats = async function() {
  const totalMatches = await this.countDocuments({ status: 'completed' });
  
  const longestMatch = await this.findOne({ status: 'completed' })
    .sort({ duration: -1 })
    .limit(1);
    
  const shortestMatch = await this.findOne({ status: 'completed' })
    .sort({ duration: 1 })
    .limit(1);
  
  const avgDuration = await this.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
  ]);
  
  return {
    totalMatches,
    longestMatch,
    shortestMatch,
    averageDuration: avgDuration[0]?.avgDuration || 0
  };
};

module.exports = mongoose.model('Match', matchSchema);