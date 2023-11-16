import 'dotenv/config';
import { db, run } from "./db.js";
import express from "express";
import multer from 'multer';
import multerS3 from 'multer-s3';
import AWS from 'aws-sdk';
import {ObjectId} from 'mongodb';

const PORT = process.env.PORT || 3001;
const app = express();

const bucket = process.env.S3_BUCKET;
const region = process.env.S3_REGION;

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: region,
});

const s3 = new AWS.S3();
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: bucket,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
            cb(null, Object.assign({}, req.body));
        },
        acl: 'public-read',
        key: function (req, file, cb) {
            cb(null, Date.now().toString())
        }
    })
})
const singleUpload = upload.single('img');

/*
    Tester API
 */

app.use(express.json());
app.get('/api/hello/', async (req, res) => {
    res.send("Hello");
})


/*
    Game Collection API
 */

app.get('/api/gamelist/', async (req, res) => {
    const game = await db.collection('gamelist').find({}).toArray();
    if (game){
        res.json(game);
    } else {
        res.sendStatus(404);
    }
})

app.get('/api/games/:id', async (req, res) => {
    const { id } = req.params;
    const game = await db.collection('gamelist').findOne({ id });
    if (game){
        res.json(game);
    } else {
        res.sendStatus(404);
    }
})

app.put('/api/games/:id/update', async (req, res) => {
    const gameLookup = { _id: new ObjectId(req.params.id) };
    const newGameInfo = {
        $set: {
            "name": req.body.name,
            "console": req.body.console,
            "condition": req.body.condition,
            "availability": req.body.availability,
            "notes": req.body.notes,
            "img": req.body.img
        }
    };
    const options = { upsert: true };
    const game = await db.collection('gamelist').findOne(gameLookup);
    const gameUpdated = await db.collection('gamelist').findOneAndUpdate(gameLookup, newGameInfo, options);
    if (game){
        res.json(gameUpdated);
    } else {
        res.sendStatus(404);
    }
})

app.delete('/api/games/:id/remove', async (req, res) => {
    const gameLookup = { _id: new ObjectId(req.params.id) };
    const removedGame = await db.collection("gamelist").deleteOne( gameLookup );
    console.log(removedGame);
    const data = await db.collection("gamelist").find({}).toArray();
    res.json(data);
});

app.post('/api/addGameImage/', async (req, res) => {
    singleUpload(req, res, function(err, some) {
        if (err) {
            return res.status(422).send({errors: [{title: 'Image Upload Error', detail: err.message}] });
        }
        return res.json({'imageLocation': req.file.location});
    })
})

app.post('/api/addgame/', async (req, res) => {

    const { name, console, img, condition, availability, notes } = req.body;

    let game = await db.collection('gamelist').insertOne({
        name, console, img, condition, availability, notes
    });
    let gameArray = await db.collection('gamelist').find({}).toArray();
    if (gameArray){
        res.json(gameArray);

    } else {
        res.sendStatus(404);
    }
})



run(()=>{
    app.listen(PORT, ()=>{
        console.log(`App is listening on port ` + PORT);
    });
}).catch(console.dir);