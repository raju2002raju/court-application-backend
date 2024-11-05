const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

router.post('/update-prompts', async (req, res) => {
    try {
        const prompts = req.body;
        console.log('Received prompts:', prompts);

        const envFilePath = path.resolve(__dirname, '../.env');

        let envContent = fs.readFileSync(envFilePath, 'utf8');

        const promptKeys = Object.keys(prompts);
        const promptKeysSet = new Set(promptKeys.map(key => key.toUpperCase()));
        const updatedEnvLines = [];

        envContent.split('\n').forEach(line => {
            const [key] = line.split('=');
            if (key && !promptKeysSet.has(key.trim())) {
                updatedEnvLines.push(line);
            }
        });


        promptKeys.forEach(key => {
            updatedEnvLines.push(`${key.toUpperCase()}=${prompts[key]}`);
        });

        fs.writeFileSync(envFilePath, updatedEnvLines.join('\n'), 'utf8');

        res.status(200).json({ message: 'Prompts updated successfully', prompts });
    } catch (error) {
        console.error('Error updating prompts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
