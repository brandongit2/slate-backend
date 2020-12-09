import express from 'express';
// @ts-ignore
import Hyphenopoly from 'hyphenopoly';
import { v4 as uuidv4 } from 'uuid';

import { BaseContent, Subject, Folder, Article, Root } from '../models/content';
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

contentRouter.get('/root', async (req, res) => {
    try {
        const root = await Root.findOne({}).lean();

        // @ts-ignore
        res.hyphenateThenSend(root);
    } catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

contentRouter.get('/root/*', async (req, res) => {
    try {
        console.log(req.params);
        const path = req.params[0].split('/');

        let result: any = await Subject.findOne({ name: path[0] }).lean();
        for (let folder of path.slice(1)) {
            let foundChild = false;
            for (let childUuid of result.children) {
                result = await BaseContent.findOne({ uuid: childUuid }).lean();
                if (result.type === 'folder') {
                    result = await Folder.findOne({ uuid: childUuid }).lean();
                } else if (result.type === 'article') {
                    result = await Article.findOne({ uuid: childUuid }).lean();
                }

                if (result.name === folder) {
                    foundChild = true;
                    break;
                }
            }

            if (!foundChild) throw new Error('Invalid path.');
        }

        // @ts-ignore
        res.hyphenateThenSend(result);
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
            case 'root': {
                // @ts-ignore
                childrenIds = (await Root.findOne({ uuid }).lean()).children;
                break;
            }
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
                    case 'subject': {
                        return await Subject.findOne({ uuid }).lean();
                    }
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

contentRouter.get('/:uuid', async (req, res) => {
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
            name: req.body.name,
            parent: req.params.location
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
            content: req.body.content,
            parent: req.params.location
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
