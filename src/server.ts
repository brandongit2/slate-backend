import cors from 'cors';
import express from 'express';
import { ObjectID } from 'mongodb';

import * as db from './db';
import { apiUrl } from '../config.json';

const app = express();
const port = 3001;

app.use(cors());

// /list-subjects
app.get(apiUrl + '/list-subjects', async (req, res) => {
    res.json(await db.listSubjects());
});

// /get-data?id=<id>
app.get(apiUrl + '/get-data', async (req, res) => {
    res.json(await db.getData(new ObjectID(<string>req.query.id)));
});

// /get-children?id=<id>
app.get(apiUrl + '/get-children', async (req, res) => {
    res.json(await db.getChildren(<string>req.query.id));
});

app.get(apiUrl, (req, res) => {
    res.send('Slate API');
});

app.listen(port, () => {
    console.log(`Slate backend listening at http://localhost:${port}`);
});
