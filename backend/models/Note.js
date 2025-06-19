const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  audioUrl: {
    type: String
  },
  summary: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Note', noteSchema);
