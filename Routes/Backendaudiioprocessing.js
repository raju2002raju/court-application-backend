const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const axios = require('axios');
const FormData = require('form-data');
const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post('/process-audio', upload.single('audio'), async (req, res) => {
  try {
    const { fieldName } = req.body;
    const audioFile = req.file;

    if (!fieldName) {
      return res.status(400).json({ error: 'Field name is required' });
    }
    if (!audioFile) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    // Check file extension
    const allowedExtensions = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];
    const fileExtension = path.extname(audioFile.originalname).slice(1).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({ error: `Unsupported file format. Allowed formats: ${allowedExtensions.join(', ')}` });
    }

    const transcription = await convertAudioToText(audioFile.path);

    const promptKey = `PROMPT_${fieldName}`;
    const prompt = process.env[promptKey];

    console.log('Using prompt key:', promptKey);
    console.log('Prompt value:', prompt);

    if (!prompt) {
      return res.status(400).json({ error: `No prompt found for field: ${fieldName}` });
    }

    // Process the transcription with AI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: transcription }
      ],
    });

    const processedText = completion.choices[0].message.content;

    // Clean up: remove the temporary file
    fs.unlinkSync(audioFile.path);

    res.json({ transcription, processedText });
  } catch (error) {
    console.error('Error processing audio:', error);
    res.status(500).json({ error: 'Error processing audio', details: error.message });
  }
});

async function convertAudioToText(filePath) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
        filename: path.basename(filePath),
        contentType: 'audio/mpeg',  // Adjust this based on the actual file type
    });
    form.append('model', 'whisper-1');

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            form,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...form.getHeaders()
                }
            }
        );
        return response.data.text;
    } catch (error) {
        console.error('Error during transcription:', error.response ? error.response.data : error.message);
        throw new Error('Transcription failed: ' + (error.response ? error.response.data.error.message : error.message));
    }
}

module.exports= router;