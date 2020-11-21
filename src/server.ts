import express from 'express';
import { ObjectID } from 'mongodb';

import * as db from './db';

const app = express();
const port = 3001;

// /list-subjects
app.get('/list-subjects', async (req, res) => {
    res.send(await db.listSubjects());
});

// /get-data?id=<id>
app.get('/get-data', async (req, res) => {
    res.send(await db.getData(new ObjectID(<string>req.query.id)));
});

// /get-children?id=<id>
app.get('/get-children', async (req, res) => {
    res.send(await db.getChildren(<string>req.query.id));
});

app.listen(port, () => {
    console.log(`Slate backend listening at http://localhost:${port}`);
});
