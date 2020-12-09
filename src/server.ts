import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';

import {contentRouter} from './routers/contentRouter';
import {apiUrl} from '../config.json';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

mongoose.connect('mongodb://127.0.0.1:27017/slate', {
    useUnifiedTopology: true,
    useNewUrlParser: true
});
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.on('open', () => console.log('Connected to database.'));

app.get(`${apiUrl}/`, (req, res) => {
    res.send('Slate API');
});

app.use(`${apiUrl}/content`, contentRouter);

app.listen(port, () => {
    console.log(`Slate backend listening at http://localhost:${port}`);
});
