import express from 'express';
// @ts-ignore
import Hyphenopoly from 'hyphenopoly';

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
        const subjects = (await Subject.find({})).map((parent) => {
            let parentJson = parent.toJSON();
            parentJson.children = parentJson.children.map(
                ({ id }: { _bsonType: 'ObjectID'; id: Buffer }) =>
                    id.toString('hex')
            );
            return parentJson;
        });

        // @ts-ignore
        res.hyphenateThenSend(subjects);
    } catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

contentRouter.get('/children/:id', async (req, res) => {
    try {
        let _id = req.params.id;

        // Get the `type` of object `id`.
        let { type } = (await BaseContent.find({ _id }))[0].toJSON();

        let childrenIds;
        switch (type) {
            case 'subject': {
                childrenIds = (await Subject.find({ _id }))[0].toJSON()
                    .children;
                break;
            }
            case 'folder': {
                childrenIds = (await Folder.find({ _id }))[0].toJSON().children;
                break;
            }
        }

        let children = await Promise.all(
            childrenIds.map(
                async ({ id }: { _bsonType: 'ObjectID'; id: Buffer }) => {
                    let _id = id.toString('hex');

                    // This object contains the _id and type of the child.
                    let base = (await BaseContent.find({ _id }))[0].toJSON();

                    // Depending on the type, return a document of that type.
                    switch (base.type) {
                        case 'folder': {
                            return (await Folder.find({ _id }))[0].toJSON();
                        }
                        case 'article': {
                            return (await Article.find({ _id }))[0].toJSON();
                        }
                    }
                }
            )
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
        const subject = (
            await Subject.find({ name: req.params.name })
        )[0].toJSON();

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
            title: req.body.title,
            content: req.body.content
        });
        res.status(201).json(await article.save());
    } catch (err) {
        console.error(err);
        res.status(400).end();
    }
});
