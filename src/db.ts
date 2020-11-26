import { Collection, MongoClient, ObjectID } from 'mongodb';

const mongo = new MongoClient('mongodb://127.0.0.1:27017', {
    useUnifiedTopology: true
});
let content: Collection<any>;

mongo.connect(() => {
    content = mongo.db('slate').collection('content');
});

export async function getData(id: ObjectID) {
    return await content
        .find({ _id: new ObjectID(id) }, { projection: { children: false } })
        .toArray();
}

export async function getSubject(name: string, children: string) {
    let { _id } = (
        await content
            .find({ type: 'subject', name }, { projection: { _id: true } })
            .toArray()
    )[0];
    let subject = await content.find({ _id }).toArray();

    if (children && children === 'true') {
        subject[0].children = await getChildren(_id.toHexString());
    } else {
        delete subject[0].children;
    }

    return subject;
}

export async function getChildren(id: string) {
    let data = await content
        .find(
            { _id: new ObjectID(id) },
            { projection: { _id: false, children: true } }
        )
        .toArray();

    return Promise.all(
        data[0].children.map(async (id: ObjectID) => (await getData(id))[0])
    );
}

export async function listSubjects() {
    return content
        .find({ type: 'subject' }, { projection: { children: false } })
        .toArray();
}
