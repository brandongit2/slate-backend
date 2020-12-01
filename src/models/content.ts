import mongoose, { Schema } from 'mongoose';

const options = {
    collection: 'content',
    discriminatorKey: 'type',
    versionKey: false
};

const baseContentSchema = new Schema(
    { uuid: { type: String, required: true } },
    options
);
export const BaseContent = mongoose.model('BaseContent', baseContentSchema);

export const Subject = BaseContent.discriminator(
    'subject',
    new Schema(
        {
            name: { type: String, required: true },
            description: { type: String, required: true },
            color: { type: String, required: true },
            children: [baseContentSchema]
        },
        options
    )
);

export const Folder = BaseContent.discriminator(
    'folder',
    new Schema(
        {
            name: { type: String, required: true },
            children: [baseContentSchema]
        },
        options
    )
);

export const Article = BaseContent.discriminator(
    'article',
    new Schema(
        {
            title: { type: String, required: true }
        },
        options
    )
);
