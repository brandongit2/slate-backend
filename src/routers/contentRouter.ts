import express from 'express';
// @ts-ignore
import Hyphenopoly from 'hyphenopoly';
import { v4 as uuidv4 } from 'uuid';

import { BaseContent, Subject, Folder, Article } from '../models/content';
import { checkJwt } from '../util';

export const contentRouter = express.Router();

/*
 * Middleware for hyphenating specified fields in query.
 *
 * If the query has structure:
 * {
 *     name: string;
 *     description: string;
 *     color: string;
 * }
 *
 * and the query string (which is parsed as JSON) looks like:
 * ?hyphenate={name:1,description:1}
 *
 * this middleware will hyphenate only the `name` and `description` fields of the query and send it to the user.
 * The number 1 is used to specify that the field should be hyphenated. Also, this should be recursive, but I haven't
 * tested it out yet.
 */
contentRouter.use((req, res, next) => {
    const hyphenate = Hyphenopoly.config({
        require: ['en-us'],
        sync: true
    });

    // @ts-ignore
    res.hyphenateThenSend = (json: { [key: string]: any }) => {
        if (req.query.hyphenate) {
            let fieldsToHyphenate = JSON.parse(<string>req.query.hyphenate);

            console.log(fieldsToHyphenate);
            const hyphenateObj = (
                obj: { [key: string]: any },
                guide: { [key: string]: any }
            ) => {
                for (let entry of Object.entries(guide)) {
                    if (obj.hasOwnProperty(entry[0])) {
                        if (entry[1] === 1) {
                            obj[entry[0]] = hyphenate(obj[entry[0]]);
                        } else if (typeof entry[1] === 'object') {
                            hyphenateObj(obj[entry[0]], entry[1]);
                        }
                    }
                }
                return obj;
            };

            json = json.map((document: { [key: string]: any }) =>
                hyphenateObj(document, fieldsToHyphenate)
            );
            res.json(json);
        } else {
            res.json(json);
        }
    };

    next();
});

contentRouter.get('/all-subjects', async (req, res) => {
    try {
        const subjects = await Subject.find({}).lean();

        // @ts-ignore
        res.hyphenateThenSend(subjects);
    } catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

contentRouter.get('/children/:uuid', async (req, res) => {
    try {
        let uuid = req.params.uuid;

        // @ts-ignore
        let { type } = await BaseContent.findOne({ uuid }).lean();

        let childrenIds;
        switch (type) {
            case 'subject': {
                // @ts-ignore
                childrenIds = (await Subject.findOne({ uuid }).lean()).children;
                break;
            }
            case 'folder': {
                // @ts-ignore
                childrenIds = (await Folder.findOne({ uuid }).lean()).children;
                break;
            }
        }

        let children = await Promise.all(
            childrenIds.map(async (uuid: string) => {
                // @ts-ignore
                let { type } = (await BaseContent.findOne({
                    uuid
                }).lean()) as string;

                // Depending on the type, return a document of that type.
                switch (type) {
                    case 'folder': {
                        return await Folder.findOne({ uuid }).lean();
                    }
                    case 'article': {
                        return await Article.find({ uuid }).lean();
                    }
                }
            })
        );

        // @ts-ignore
        res.hyphenateThenSend(children);
    } catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

contentRouter.get('/subject/:name', async (req, res) => {
    try {
        const subject = await Subject.findOne({ name: req.params.name }).lean();

        // @ts-ignore
        res.hyphenateThenSend(subject);
    } catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

contentRouter.get('/test', checkJwt, (req, res) => {
    res.send('hello');
});

contentRouter.post('/subject', async (req, res) => {
    try {
        const subject = new Subject({
            uuid: uuidv4(),
            name: req.body.name,
            description: req.body.description,
            color: req.body.color || 'ffffff'
        });
        res.status(201).json(await subject.save());
    } catch (err) {
        console.error(err);
        res.status(400).end();
    }
});

contentRouter.post('/folder', async (req, res) => {
    try {
        const folder = new Folder({
            uuid: uuidv4(),
            name: req.body.name
        });
        res.status(201).json(await folder.save());
    } catch (err) {
        console.error(err);
        res.status(400).end();
    }
});

contentRouter.post('/article', async (req, res) => {
    try {
        const article = new Article({
            uuid: uuidv4(),
            title: req.body.title,
            content: req.body.content
        });
        res.status(201).json(await article.save());
    } catch (err) {
        console.error(err);
        res.status(400).end();
    }
});
