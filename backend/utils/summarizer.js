const axios = require('axios');
require('dotenv').config();

const cohereApiKey = process.env.COHERE_API_KEY;
const MIN_TEXT_LENGTH = 50; // Reduced minimum length
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Mock summarization function
async function summarizeText(text) {
    console.log('\n=== Starting Mock Summarization ===');
    console.log('Input text length:', text.length, 'characters');

    // Split text into sentences
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    
    // For short texts, return as is
    if (sentences.length <= 3) {
        console.log('Text is too short for summarization, returning as is');
        return text;
    }

    // Take first sentence as context
    let summary = sentences[0].trim();

    // Take a sentence from the middle for main points
    const middleIndex = Math.floor(sentences.length / 2);
    summary += '. ' + sentences[middleIndex].trim();

    // Take last sentence for conclusion
    summary += '. ' + sentences[sentences.length - 1].trim() + '.';

    console.log('Generated summary length:', summary.length, 'characters');
    return summary;
}

module.exports = { summarizeText };
