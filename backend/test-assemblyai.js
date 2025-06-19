require('dotenv').config();
const { transcribeAudio } = require('./utils/assemblyAI');
const path = require('path');
const fs = require('fs');

async function testTranscription() {
    try {
        // Test with a sample audio file
        const audioPath = path.join(__dirname, 'uploads', 'test-audio.mp3');
        
        console.log('\n=== Testing AssemblyAI Integration ===');
        console.log('Audio file path:', audioPath);
        console.log('API Key:', process.env.ASSEMBLYAI_API_KEY ? 'Present' : 'Missing');

        // Check if file exists
        if (!fs.existsSync(audioPath)) {
            console.error('\n❌ Error: Audio file not found at:', audioPath);
            console.log('Please place an audio file (MP3 or WAV) in the backend/uploads directory');
            return;
        }

        // Check file size
        const stats = fs.statSync(audioPath);
        const fileSizeInMB = stats.size / (1024 * 1024);
        console.log('\nFile Details:');
        console.log('- Size:', fileSizeInMB.toFixed(2), 'MB');
        console.log('- Format:', path.extname(audioPath));

        if (fileSizeInMB > 25) {
            console.error('\n❌ Error: File is too large. Maximum size is 25MB');
            return;
        }

        // Check file format
        const ext = path.extname(audioPath).toLowerCase();
        if (!['.mp3', '.wav', '.m4a', '.ogg'].includes(ext)) {
            console.error('\n❌ Error: Unsupported file format:', ext);
            console.log('Supported formats: .mp3, .wav, .m4a, .ogg');
            return;
        }

        console.log('\nStarting transcription...');
        const transcript = await transcribeAudio(audioPath);
        
        console.log('\n✅ Transcription Result:');
        console.log(transcript);
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('\nError Details:');
            console.error('- Status:', error.response.status);
            console.error('- Status Text:', error.response.statusText);
            console.error('- Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testTranscription(); 