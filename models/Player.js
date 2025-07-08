const mongoose = require('mongoose');

const categoryStatsSchema = new mongoose.Schema({
  worst: { type: Number, default: 0 },
  average: { type: Number, default: 0 },
  best: { type: Number, default: 0 }
}, { _id: false });

const matchHistorySchema = new mongoose.Schema({
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
  date: { type: Date },
  map: { type: String },
  duration: { type: String },
  position: { type: Number },
  totalPlayers: { type: Number },
  scores: {
    military: { type: Number },
    economy: { type: Number },
    technology: { type: Number },
    society: { type: Number }
  },
  totalScore: { type: Number },
  opponents: [{ type: String }]
}, { _id: false });

const playerSchema = new mongoose.Schema({
  id: { // Cambiado de playerId a id
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  avatar: { type: String, default: '' },
  matches: { type: Number, default: 0, min: 0 },
  wins: { type: Number, default: 0, min: 0 },
  points: { type: Number, default: 0, min: 0 },
  joinDate: { type: String, default: '' }, // String para compatibilidad con data.json
  favoriteStrategy: { type: String, default: 'none', maxlength: 100 },
  favoriteCivilization: { type: String, default: 'none', maxlength: 50 },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  categoryStats: {
    military: { type: categoryStatsSchema, default: () => ({}) },
    economy: { type: categoryStatsSchema, default: () => ({}) },
    technology: { type: categoryStatsSchema, default: () => ({}) },
    society: { type: categoryStatsSchema, default: () => ({}) }
  },
  matchHistory: { type: Array, default: [] }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para calcular ratio de victorias
playerSchema.virtual('winRatio').get(function() {
  return this.matches > 0 ? (this.wins / this.matches * 100).toFixed(1) : '0.0';
});

// Virtual para calcular promedio total
playerSchema.virtual('totalAverage').get(function() {
  const stats = this.categoryStats;
  return (stats.military.average + stats.economy.average +
          stats.technology.average + stats.society.average) / 4;
});

// Índices para optimizar consultas
playerSchema.index({ points: -1 });
playerSchema.index({ id: 1 }); // Cambiado de playerId a id
playerSchema.index({ status: 1 });

// Middleware pre-save para validaciones
playerSchema.pre('save', function(next) {
  if (this.wins > this.matches) {
    this.wins = this.matches;
  }
  next();
});

// Método para actualizar estadísticas después de una partida
playerSchema.methods.updateStatsFromMatch = function(matchData) {
  this.matches += 1;
  Object.keys(matchData.scores).forEach(category => {
    const score = matchData.scores[category];
    const categoryStats = this.categoryStats[category];
    if (categoryStats.worst === 0 || score < categoryStats.worst) {
      categoryStats.worst = score;
    }
    if (score > categoryStats.best) {
      categoryStats.best = score;
    }
    const currentTotal = categoryStats.average * (this.matches - 1);
    categoryStats.average = (currentTotal + score) / this.matches;
  });
  const totalPlayers = matchData.totalPlayers;
  const points = totalPlayers - matchData.position;
  this.points += points;
  if (matchData.position === 1) {
    this.wins += 1;
  }
};

module.exports = mongoose.model('Player', playerSchema);