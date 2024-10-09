import dotenv from 'dotenv';
import express from 'express';
import { getAndParseDayMenu, getAndParseWeeklyMenu } from './lunchMenu';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

import { Weekday } from './lunchMenu';

app.get('/api/lunch-menu/:day', async (req, res) => {
  try {
    const day = req.params.day.toLowerCase() as Weekday;
    const validWeekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    if (!validWeekdays.includes(day)) {
      return res.status(400).json({ error: 'Invalid weekday. Please use monday, tuesday, wednesday, thursday, or friday.' });
    }

    const dayMenu = await getAndParseDayMenu(day)

    res.json({ menu: dayMenu });
  } catch (error) {
    console.error(`Error fetching lunch menu for ${req.params.day}:`, error);
    res.status(500).json({ error: 'An error occurred while fetching the lunch menu.' });
  }
});

app.get('/api/lunch-menu', async (req, res) => {
  try {
    const weekMenu = await getAndParseWeeklyMenu();
    res.json(weekMenu);
  } catch (error) {
    console.error('Error fetching weekly lunch menu:', error);
    res.status(500).json({ error: 'An error occurred while fetching the lunch menu.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});