import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const port = 3001;

function cleanVerseText(text: string): string {
  // Remove cross-references like (A), (B), etc.
  text = text.replace(/\([A-Z]+\)/g, '');
  
  // Remove footnote references like [a], [b], etc.
  text = text.replace(/\[[a-z]\]/g, '');
  
  // Remove other annotations like [m], [n], [o], etc.
  text = text.replace(/\[[a-z0-9]+\]/g, '');
  
  // Remove section titles (usually in all caps)
  text = text.replace(/^[A-Z\s]+$/, '');
  
  // Remove extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

async function fetchBiblePassage(book: string, chapter: number, version: string = 'NKJV') {
  const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(book)}+${chapter}&version=${version}`;
  
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    const passageContent = $('.passage-text').first();
    const verses: { [key: number]: string } = {};
    let currentVerseNumber = 0;

    passageContent.find('.text').each((_, element) => {
      const verseNumElement = $(element).find('.versenum');
      const parsedVerseNumber = parseInt(verseNumElement.text(), 10);
      let verseText = $(element).text().trim();
      
      // Remove verse number and leading/trailing whitespace
      verseText = verseText.replace(verseNumElement.text(), '').trim();
      
      // Clean the verse text
      verseText = cleanVerseText(verseText);
      
      if (!isNaN(parsedVerseNumber)) {
        currentVerseNumber = parsedVerseNumber - 1; // Adjust verse number
      }
      
      if (currentVerseNumber > 0 && currentVerseNumber <= 58 && verseText.length > 0) {
        verses[currentVerseNumber] = verseText;
      }
    });

    return {
      book,
      chapter,
      version,
      verses
    };
  } catch (error) {
    console.error('Error fetching Bible passage:', error);
    return null;
  }
}

app.get('/api/passage/:book/:chapter', async (req, res) => {
  const { book, chapter } = req.params;
  const version = req.query.version as string || 'NKJV';

  try {
    const passage = await fetchBiblePassage(book, parseInt(chapter), version);
    if (passage) {
      res.json(passage);
    } else {
      res.status(404).json({ error: 'Passage not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching the passage' });
  }
});

app.listen(port, () => {
  console.log(`Bible API listening at http://localhost:${port}`);
});
