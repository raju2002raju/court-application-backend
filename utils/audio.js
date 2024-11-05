const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

// Main function to handle real-time audio processing
async function handleRealtimeAudio(audioBlob) {
    try {
        // Save audio blob to temporary file
        const tempFilePath = `temp-${Date.now()}.webm`;
        await saveAudioToFile(audioBlob, tempFilePath);

        // Process audio and get corrected transcript
        const result = await processAudioFile(tempFilePath);

        // Clean up temp file
        fs.unlink(tempFilePath, (err) => {
            if (err) console.error('Error deleting temp file:', err);
        });

        return result;
    } catch (error) {
        console.error('Error in handleRealtimeAudio:', error);
        throw error;
    }
}

// Save audio blob to file
function saveAudioToFile(audioBlob, filePath) {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(filePath);
        fileStream.write(Buffer.from(audioBlob));
        fileStream.end();
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
    });
}

async function processAudioFile(filePath) {
    try {
        // Get initial transcription
        const transcript = await transcribeAudio(filePath);
        console.log('Initial transcription:', transcript);

        // Get improved transcription
        const correctedText = await getChatCompletion(transcript);
        console.log('Corrected text:', correctedText);

        return {
            originalTranscript: transcript,
            correctedText: correctedText,
            success: true
        };
    } catch (error) {
        console.error('Error processing audio:', error);
        return {
            error: error.message,
            success: false
        };
    }
}

async function transcribeAudio(filePath) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...formData.getHeaders()
                }
            }
        );
        return response.data.text;
    } catch (error) {
        throw new Error(`Transcription failed: ${error.message}`);
    }
}

async function getChatCompletion(transcript, templateText) {
    try {
        // Check if transcript or templateText is undefined
        if (!transcript || !templateText) {
            throw new Error('Missing transcript or template text');
        }

        console.log('Received:', transcript);
        console.log('Template Text:', templateText);

        // Create messages for the API
        const messages = [
            {
                role: 'system',
                content: `You are a specialized text formatter that combines spoken numbers with templates.`
            },
            {
                role: 'user',
                content: `Please update this template: "${templateText}" using this text: "${transcript}".`
            }
        ];

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: messages,
                temperature: 0.1,
                max_tokens: 100
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('OpenAI Response:', response.data); // Log the entire response for debugging

        let correctedText = response.data.choices[0].message.content.trim();

        // Basic validation
        if (!correctedText) {
            throw new Error('Empty response from API');
        }

        return {
            success: true,
            originalTemplate: templateText,
            spokenText: transcript,
            mergedText: correctedText
        };

    } catch (error) {
        console.error('Error in getChatCompletion:', error.message);
        return {
            success: false,
            error: error.message || 'Unknown error occurred',
            originalTemplate: templateText || 'No template provided',
            spokenText: transcript || 'No transcript provided'
        };
    }
}



// Express route handler
async function handleTranscriptionRequest(req, res) {
    try {
        const { transcript, templateText } = req.body;

        console.log('Request body:', req.body); // Debug log

        if (!transcript || !templateText) {
            throw new Error('Missing required fields: transcript and/or templateText');
        }

        const result = await getChatCompletion(transcript, templateText);
        res.json(result);

    } catch (error) {
        console.error('Error in handleTranscriptionRequest:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    handleRealtimeAudio,
    processAudioFile,
    transcribeAudio,
    getChatCompletion,
    handleTranscriptionRequest
};