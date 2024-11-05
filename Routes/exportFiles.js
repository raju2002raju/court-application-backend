const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const docx = require('docx');
const { Document, Paragraph, TextRun, AlignmentType, Header, Footer, PageBreak, HeadingLevel, Spacing } = docx;

router.post('/export-pdf', async (req, res) => {
    try {
        const { content, title = 'Legal Document' } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=legal-document-${Date.now()}.pdf`);

        // Create PDF document
        const doc = new PDFDocument({
            margins: {
                top: 50,
                bottom: 50,
                left: 72,
                right: 72
            }
        });

        // Pipe the PDF directly to the response
        doc.pipe(res);

        // Add content to PDF
        doc.fontSize(16).text(title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(content, {
            align: 'left',
            lineGap: 5
        });

        // Finalize the PDF
        doc.end();

    } catch (error) {
        console.error('PDF Generation Error:', error);
        // Only send error response if headers haven't been sent
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate PDF' });
        }
    }
});

router.post('/export/docx', async (req, res) => {
    try {
        const { content, title = 'Legal Document' } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        // Split content into lines
        const lines = content.split('\n');
        
        // Create paragraphs array to store all document elements
        const paragraphs = [];

        // Process each line to maintain formatting
        lines.forEach((line) => {
            // Skip empty lines but maintain spacing
            if (!line.trim()) {
                paragraphs.push(
                    new Paragraph({
                        children: [new TextRun("")],
                        spacing: {
                            before: 200,
                            after: 200,
                        }
                    })
                );
                return;
            }

            // Determine formatting based on content
            let alignment = AlignmentType.LEFT;
            let isBold = false;
            let fontSize = 24; // Default size
            
            // Check if line is likely a heading or centered content
            if (line.trim().toUpperCase() === line.trim()) {
                // All uppercase lines are likely headings or centered content
                alignment = AlignmentType.CENTER;
                isBold = true;
                fontSize = 28;
            }

            // Check for specific sections that should be centered
            const centeredKeywords = ['VERSUS', 'AND', 'PRAYER', ];
            if (centeredKeywords.some(keyword => line.trim().includes(keyword))) {
                alignment = AlignmentType.CENTER;
                isBold = true;
            }

            // Add paragraph with appropriate formatting
            paragraphs.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: line.trim(),
                            bold: isBold,
                            size: fontSize,
                            font: 'Times New Roman'
                        })
                    ],
                    alignment: alignment,
                    spacing: {
                        after: 200,  // Add space after paragraph
                        line: 360,   // Line spacing (360 = 1.5 lines)
                    }
                })
            );
        });

        // Create document
        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: {
                            font: 'Times New Roman',
                            size: 24,
                        }
                    }
                }
            },
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 1440,  // 1 inch
                            right: 1440,
                            bottom: 1440,
                            left: 1440
                        }
                    }
                },
                children: paragraphs
            }]
        });

        // Generate buffer
        const buffer = await docx.Packer.toBuffer(doc);

        // Set headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=legal-document-${Date.now()}.docx`);
        res.setHeader('Content-Length', buffer.length);

        // Send response
        res.send(buffer);

    } catch (error) {
        console.error('DOCX Generation Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate DOCX' });
        }
    }
});

module.exports = router;