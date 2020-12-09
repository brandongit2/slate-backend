import mongoose, { Schema } from 'mongoose';

const options = {
    collection: 'content',
    discriminatorKey: 'type',
    versionKey: false
};

const baseContentSchema = new Schema(
    {
        uuid: { type: String, required: true },
        prevSibling: { type: String, required: true },
        nextSibling: { type: String, required: true }
    },
    options
);
export const BaseContent = mongoose.model('BaseContent', baseContentSchema);

export const Root = BaseContent.discriminator(
    'root',
    new Schema(
        {
            children: [String]
        },
        options
    )
);

export const Subject = BaseContent.discriminator(
    'subject',
    new Schema(
        {
            name: { type: String, required: true },
            description: { type: String, required: true },
            color: { type: String, required: true },
            children: [String],
            parent: { type: String, required: true }
        },
        options
    )
);

export const Folder = BaseContent.discriminator(
    'folder',
    new Schema(
        {
            name: { type: String, required: true },
            children: [String],
            parent: { type: String, required: true }
        },
        options
    )
);

export const Article = BaseContent.discriminator(
    'article',
    new Schema(
        {
            name: { type: String, required: true },
            author: { type: String, required: true },
            content: { type: String, required: true },
            parent: { type: String, required: true }
        },
        options
    )
);
