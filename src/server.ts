import cors from 'cors';
import express, { Request, Response } from 'express';
// @ts-ignore
import Hyphenopoly from 'hyphenopoly';
import { ObjectID } from 'mongodb';
import mongoose from 'mongoose';

import { contentRouter } from './routers/contentRouter';
import { apiUrl } from '../config.json';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect('mongodb://127.0.0.1:27017/slate', {
    useUnifiedTopology: true,
    useNewUrlParser: true
});
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.on('open', () => console.log('Connected to database.'));

const hyphenate = Hyphenopoly.config({
    require: ['en-us'],
    sync: true
});

// function handleRoute(fn: (req: Request, res: Response) => Promise<any[]>) {
//     return async (req: Request, res: Response) => {
//         try {
//             var data = await fn(req, res);
//         } catch (error) {
//             console.log(error);
//             res.status(500).end();
//             return;
//         }

//         // Provide a list of fields for which their values will by hyphenated.
//         // ?hyphenateFields=<field>[,<field>...]
//         if (req.query.hyphenateFields) {
//             let hyphenateFields = (<string>req.query.hyphenateFields).split(
//                 ','
//             );

//             data = data.map((obj) => {
//                 hyphenateFields.forEach((field) => {
//                     if (obj[field]) obj[field] = hyphenate(obj[field]);
//                 });

//                 return obj;
//             });
//         }

//         res.json(data);
//     };
// }

app.get(`${apiUrl}/`, (req, res) => {
    res.send('Slate API');
});

app.use(`${apiUrl}/content`, contentRouter);

app.listen(port, () => {
    console.log(`Slate backend listening at http://localhost:${port}`);
});
