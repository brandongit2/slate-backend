import { Collection, MongoClient, ObjectID } from 'mongodb';

const mongo = new MongoClient('mongodb://127.0.0.1:27017', {
    useUnifiedTopology: true
});
let content: Collection<any>;

mongo.connect(() => {
    content = mongo.db('slate').collection('content');
});

export async function getData(id: ObjectID) {
    return (
        await content
            .find(
                { _id: new ObjectID(id) },
                { projection: { children: false } }
            )
            .toArray()
    )[0];
}

export async function getChildren(id: string) {
    let data = await content
        .find(
            { _id: new ObjectID(id) },
            { projection: { _id: false, children: true } }
        )
        .toArray();

    return Promise.all(data[0].children.map((id: ObjectID) => getData(id)));
}

export async function listSubjects() {
    return content
        .find({ type: 'subject' }, { projection: { type: true, name: true } })
        .toArray();
}
