const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Ensure dotenv is loaded
require('dotenv').config();

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com/v2';

// Validate API key
if (!ASSEMBLYAI_API_KEY) {
    throw new Error('ASSEMBLYAI_API_KEY is not set in environment variables');
}

async function uploadAudioFile(filePath) {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`Audio file not found at path: ${filePath}`);
    }

    // Check file size (AssemblyAI has a 25MB limit)
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    if (fileSizeInMB > 25) {
        throw new Error(`Audio file is too large (${fileSizeInMB.toFixed(2)}MB). Maximum size is 25MB.`);
    }

    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    if (!['.mp3', '.wav', '.m4a', '.ogg'].includes(ext)) {
        throw new Error(`Unsupported file format: ${ext}. Supported formats: .mp3, .wav, .m4a, .ogg`);
    }

    const data = fs.readFileSync(filePath);
    const url = `${ASSEMBLYAI_BASE_URL}/upload`;

    try {
        console.log('Uploading audio file to AssemblyAI...');
        const response = await axios.post(url, data, {
            headers: {
                'authorization': ASSEMBLYAI_API_KEY,
                'content-type': 'application/octet-stream'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        console.log('Upload successful. URL:', response.data.upload_url);
        return response.data.upload_url;
    } catch (error) {
        if (error.response?.status === 400) {
            console.error('Bad Request Error:', {
                status: error.response.status,
                data: error.response.data,
                message: 'The request was malformed or the audio file was invalid'
            });
            throw new Error('Invalid audio file or request format. Please check the file format and size.');
        } else if (error.response?.status === 401) {
            console.error('Unauthorized Error:', {
                status: error.response.status,
                data: error.response.data,
                message: 'Invalid API key'
            });
            throw new Error('Invalid AssemblyAI API key. Please check your .env file.');
        } else {
            console.error('Error uploading to AssemblyAI:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            throw new Error('Failed to upload audio file to AssemblyAI');
        }
    }
}

async function transcribeAudio(filePath) {
    try {
        console.log('\n=== Starting Transcription Process ===');
        console.log('Audio file path:', filePath);
        
        // First upload the file
        console.log('Step 1: Uploading audio file to AssemblyAI...');
        const uploadUrl = await uploadAudioFile(filePath);
        console.log('Upload successful. URL:', uploadUrl);

        console.log('\nStep 2: Starting transcription...');
        // Start transcription
        const response = await axios.post(
            `${ASSEMBLYAI_BASE_URL}/transcript`,
            {
                audio_url: uploadUrl,
                language_detection: true,
                auto_chapters: true,  // Enable auto-chapters for better context
                punctuate: true,      // Ensure proper punctuation
                format_text: true     // Format the text properly
            },
            {
                headers: {
                    'authorization': ASSEMBLYAI_API_KEY,
                    'content-type': 'application/json'
                }
            }
        );

        const transcriptId = response.data.id;
        console.log('Transcription started. ID:', transcriptId);

        // Poll for completion
        let transcript = null;
        let attempts = 0;
        const maxAttempts = 30; // 1.5 minutes maximum (30 * 3 seconds)
        const pollingInterval = 1000; // 1 second instead of 3

        console.log('\nStep 3: Polling for transcription completion...');
        while (!transcript && attempts < maxAttempts) {
            attempts++;
            console.log(`Polling attempt ${attempts}/${maxAttempts}...`);

            try {
                const pollingResponse = await axios.get(
                    `${ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`,
                    {
                        headers: {
                            'authorization': ASSEMBLYAI_API_KEY
                        }
                    }
                );

                if (pollingResponse.data.status === 'completed') {
                    transcript = pollingResponse.data.text;
                    console.log('✅ Transcription completed successfully');
                    console.log('Transcription length:', transcript.length, 'characters');
                    console.log('Transcription content:', transcript);
                    
                    // Log additional transcription details
                    if (pollingResponse.data.words) {
                        console.log('Number of words:', pollingResponse.data.words.length);
                    }
                    if (pollingResponse.data.chapters) {
                        console.log('Number of chapters:', pollingResponse.data.chapters.length);
                    }
                    break;
                } else if (pollingResponse.data.status === 'error') {
                    console.error('❌ Transcription failed:', pollingResponse.data.error);
                    throw new Error('Transcription failed: ' + pollingResponse.data.error);
                } else {
                    console.log(`Status: ${pollingResponse.data.status}. Waiting ${pollingInterval/1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, pollingInterval));
                }
            } catch (error) {
                console.error('Error during polling:', error);
                throw error;
            }
        }

        if (!transcript) {
            console.error('❌ Transcription timed out after 1.5 minutes');
            throw new Error('Transcription timed out after 1.5 minutes');
        }

        // Ensure we have enough text for summarization
        if (transcript.length < 250) {
            console.warn('⚠️ Warning: Transcription is too short for summarization');
            console.warn('Current length:', transcript.length, 'characters');
            console.warn('Minimum required:', 250, 'characters');
        }

        console.log('\n=== Transcription Process Complete ===\n');
        return transcript;
    } catch (error) {
        console.error('\n❌ Transcription error:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
        throw error;
    }
}

module.exports = {
    transcribeAudio
};

