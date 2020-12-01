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
    res.hyphenateThenSend = (
        json: { [key: string]: any } | Array<{ [key: string]: any }>
    ) => {
        if (req.query.hyphenate) {
            let fieldsToHyphenate = JSON.parse(<string>req.query.hyphenate);

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

            if (Array.isArray(json)) {
                json = json.map((document: { [key: string]: any }) =>
                    hyphenateObj(document, fieldsToHyphenate)
                );
            } else {
                json = hyphenateObj(json, fieldsToHyphenate);
            }

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

contentRouter.get('/data/:uuid', async (req, res) => {
    try {
        let uuid = req.params.uuid;

        // @ts-ignore
        let { type } = await BaseContent.findOne({ uuid }).lean();

        let data;
        switch (type) {
            case 'subject': {
                data = await Subject.findOne({ uuid }).lean();
                break;
            }
            case 'folder': {
                data = await Folder.findOne({ uuid }).lean();
                break;
            }
            case 'article': {
                data = await Article.findOne({ uuid }).lean();
                break;
            }
        }

        // @ts-ignore
        res.hyphenateThenSend(data);
    } catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

contentRouter.get('/subject-children/:name', async (req, res) => {
    try {
        let name = req.params.name;

        // @ts-ignore
        let { type } = await BaseContent.findOne({ name }).lean();

        let childrenIds;
        switch (type) {
            case 'subject': {
                // @ts-ignore
                childrenIds = (await Subject.findOne({ name }).lean()).children;
                break;
            }
            case 'folder': {
                // @ts-ignore
                childrenIds = (await Folder.findOne({ name }).lean()).children;
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
                        return await Article.findOne({ uuid }).lean();
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
                        return await Article.findOne({ uuid }).lean();
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

contentRouter.post('/:location/folder', async (req, res) => {
    try {
        let childUuid = uuidv4();

        let newFolder = new Folder({
            uuid: childUuid,
            name: req.body.name
        }).save();
        let updateParent = async () => {
            // @ts-ignore
            let { type } = await BaseContent.findOne({
                uuid: req.params.location
            }).lean();

            if (type === 'subject') {
                await Subject.updateOne(
                    { uuid: req.params.location },
                    { $push: { children: childUuid } }
                );
            } else if (type === 'folder') {
                await Folder.updateOne(
                    { uuid: req.params.location },
                    { $push: { children: childUuid } }
                );
            }
        };

        await Promise.all([newFolder, updateParent()]);
        res.status(201).end();
    } catch (err) {
        console.error(err);
        res.status(400).end();
    }
});

contentRouter.post('/:location/article', async (req, res) => {
    try {
        let childUuid = uuidv4();

        let newArticle = new Article({
            uuid: childUuid,
            name: req.body.name,
            content: req.body.content
        }).save();
        let updateParent = async () => {
            // @ts-ignore
            let { type } = await BaseContent.findOne({
                uuid: req.params.location
            }).lean();

            if (type === 'subject') {
                await Subject.updateOne(
                    { uuid: req.params.location },
                    { $push: { children: childUuid } }
                );
            } else if (type === 'folder') {
                await Folder.updateOne(
                    { uuid: req.params.location },
                    { $push: { children: childUuid } }
                );
            }
        };

        await Promise.all([newArticle, updateParent()]);
        res.status(201).end();
    } catch (err) {
        console.error(err);
        res.status(400).end();
    }
});
