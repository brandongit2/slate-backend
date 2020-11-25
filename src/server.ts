import cors from 'cors';
import express, { Request, Response } from 'express';
// @ts-ignore
import Hyphenopoly from 'hyphenopoly';
import { ObjectID } from 'mongodb';

import * as db from './db';
import { apiUrl } from '../config.json';

const app = express();
const port = 3001;

app.use(cors());

const hyphenate = Hyphenopoly.config({
    require: ['en-us'],
    sync: true
});

function handleRoute(fn: (req: Request, res: Response) => Promise<any[]>) {
    return async (req: Request, res: Response) => {
        let data = await fn(req, res);

        // Provide a list of fields for which their values will by hyphenated.
        // ?hyphenateFields=<field>[,<field>...]
        if (req.query.hyphenateFields) {
            let hyphenateFields = (<string>req.query.hyphenateFields).split(
                ','
            );

            data = data.map((obj) => {
                hyphenateFields.forEach((field) => {
                    if (obj[field]) obj[field] = hyphenate(obj[field]);
                });

                return obj;
            });
        }

        res.json(data);
    };
}

// /list-subjects
app.get(
    `${apiUrl}list-subjects`,
    handleRoute((req, res) => db.listSubjects())
);

// /get-subject?name=<name>
app.get(
    apiUrl + 'get-subject',
    handleRoute((req, res) => db.getSubject(<string>req.query.name))
);

// /get-data?id=<id>
app.get(
    apiUrl + 'get-data',
    handleRoute((req, res) => db.getData(new ObjectID(<string>req.query.id)))
);

// /get-children?id=<id>
app.get(
    apiUrl + 'get-children',
    handleRoute((req, res) => db.getChildren(<string>req.query.id))
);

app.get(apiUrl, (req, res) => {
    res.send('Slate API');
});

app.listen(port, () => {
    console.log(`Slate backend listening at http://localhost:${port}`);
});
