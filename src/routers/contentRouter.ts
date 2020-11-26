import express from 'express';

import { BaseContent, Subject, Folder, Article } from '../models/content';

export const contentRouter = express.Router();

contentRouter.get('/all-subjects', async (req, res) => {
    const subjects = (await Subject.find({})).map((parent) => {
        let parentJson = parent.toJSON();
        parentJson.children = parentJson.children.map(
            ({ id }: { _bsonType: 'ObjectID'; id: Buffer }) =>
                id.toString('hex')
        );
        return parentJson;
    });

    try {
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

contentRouter.get('/children/:id', async (req, res) => {
    let _id = req.params.id;

    // Get the `type` of object `id`.
    let { type } = (await BaseContent.find({ _id }))[0].toJSON();

    let childrenIds;
    switch (type) {
        case 'subject': {
            childrenIds = (await Subject.find({ _id }))[0].toJSON().children;
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

    res.json(children);
});

contentRouter.get('/subject/:name', async (req, res) => {
    const subject = (await Subject.find({ name: req.params.name }))[0].toJSON();

    try {
        res.json(subject);
    } catch (err) {
        console.error(err);
        res.status(404).json({
            message: `Can't find subject ${req.params.name}`
        });
    }
});

contentRouter.post('/subject', async (req, res) => {
    const subject = new Subject({
        name: req.body.name,
        description: req.body.description,
        color: req.body.color || 'ffffff'
    });

    try {
        res.status(201).json(await subject.save());
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

contentRouter.post('/folder', async (req, res) => {
    const folder = new Folder({
        name: req.body.name
    });

    try {
        res.status(201).json(await folder.save());
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

contentRouter.post('/article', async (req, res) => {
    const article = new Article({
        title: req.body.title,
        content: req.body.content
    });

    try {
        res.status(201).json(await article.save());
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});
