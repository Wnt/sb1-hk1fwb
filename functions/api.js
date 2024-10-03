const express = require('express');
const serverless = require('serverless-http');
const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

const app = express();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function fetchLunchMenu() {
  try {
    const response = await axios.get('https://blanko.net/lounas');
    return response.data;
  } catch (error) {
    console.error('Error fetching lunch menu:', error);
    throw error;
  }
}

async function parseMenuWithChatGPT(htmlContent, weekday) {
  const prompt = `Here's a html page describing the lunch menu for this week. What's today's lunch offering? Today is ${weekday}. Names and descriptions should be in Finnish language and name needs to be shortened to max 24 characters. Use utf-8 special character "…" to shorten the name if necessary.`;

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant that parses HTML content and extracts lunch menu information." },
        { role: "user", content: prompt },
        { role: "user", content: htmlContent }
      ],
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error parsing menu with ChatGPT:', error);
    throw error;
  }
}

app.get('/api/lunch-menu', async (req, res) => {
  try {
    const htmlContent = await fetchLunchMenu();
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const weekMenu = {};

    for (const weekday of weekdays) {
      const parsedMenu = await parseMenuWithChatGPT(htmlContent, weekday);
      weekMenu[weekday.toLowerCase()] = parsedMenu;
    }

    res.json(weekMenu);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching the lunch menu.' });
  }
});

module.exports.handler = serverless(app);