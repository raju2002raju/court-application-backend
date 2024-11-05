const express = require('express');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const cors = require('cors');
const path = require('path');

const router = express.Router();

router.use(cors());
router.use(fileUpload({
    debug: true,
    createParentPath: true,
    limits: { 
        fileSize: 50 * 1024 * 1024
    },
}));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-openai-api-key';

router.post('/ai-audio-update', async (req, res) => {

    try {
        // Check if file exists in the request
        if (!req.files || !req.files.audio) {
            console.log('No files found in request:', req.files);
            return res.status(400).json({ 
                success: false, 
                message: 'No audio file provided',
                filesReceived: req.files 
            });
        }

        const audioFile = req.files.audio;
        console.log('Received audio file:', audioFile.name);

        // Create temp directory if it doesn't exist
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Save file to temp directory with unique name
        const filePath = path.join(tempDir, `${Date.now()}_${audioFile.name}`);
        console.log('Saving file to:', filePath);
        
        await audioFile.mv(filePath);
        console.log('File saved successfully');

        // Transcribe audio
        console.log('Starting transcription...');
        const transcript = await transcribeAudio(filePath);

        // Process with GPT-3.5
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `You are a specialized text formatter that combines spoken numbers with templates.`
                    },
                    {
                        role: 'user',
                        content: `Reply this text "${transcript}".`
                    }
                ],
                temperature: 0.7,
                max_tokens: 150
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const correctedText = response.data.choices[0].message.content.trim();
        console.log('Processing completed:', correctedText);

        // Clean up
        fs.unlinkSync(filePath);
        console.log('Temporary file cleaned up');

        res.json({ success: true, correctedText });

    } catch (error) {
        console.error('Error in /ai-audio-update:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Internal server error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

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
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    ...formData.getHeaders()
                }
            }
        );
        return response.data.text;
    } catch (error) {
        throw new Error(`Transcription failed: ${error.message}`);
    }
}

module.exports = router;


