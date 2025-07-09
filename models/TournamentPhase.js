const mongoose = require('mongoose');

const tournamentPhaseSchema = new mongoose.Schema({
  phaseId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  rules: {
    type: String,
    maxlength: 2000
  },
  maxPlayers: {
    type: Number,
    min: 4,
    max: 16
  },
  format: {
    type: String,
    enum: ['league', 'elimination', 'group_stage', 'finals'],
    default: 'league'
  },
  pointsMultiplier: {
    type: Number,
    default: 1,
    min: 0.5,
    max: 3
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para verificar si la fase está activa
tournamentPhaseSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.startDate <= now && 
         (!this.endDate || this.endDate >= now);
});

// Índices
tournamentPhaseSchema.index({ status: 1 });
tournamentPhaseSchema.index({ startDate: 1 });
tournamentPhaseSchema.index({ phaseId: 1 });

module.exports = mongoose.model('TournamentPhase', tournamentPhaseSchema);