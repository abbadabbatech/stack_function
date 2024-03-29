const functions = require("firebase-functions");

const admin = require("firebase-admin");

const express = require("express");
const cors = require("cors");

const app = express();

// Automatically allow cross-origin requests
app.use(cors({origin: true}));

// Add middleware to authenticate requests
// app.use(myMiddleware);

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

// build multiple CRUD interfaces:
app.get("/:id", (req, res) => {
  const stacks = [];
  db.collection("users").doc(req.params.id).collection("FavPlayers").get()
      .then((snapshot) => {
        snapshot.forEach((doc) => {
          const myplayer = doc.data().favplayer;
          db.collection("Stacks").get().then((stacksnap) => {
            stacksnap.forEach((stackdoc) => {
              const mystack = stackdoc.data().player;
              if (mystack == myplayer) {
                console.log("MATCH");
                stacks.push(stackdoc.id);
              }
              console.log("STACK: "+stackdoc.id);
            });
          });
          console.log("PLAYERDOC: "+doc.id);
        });
        res.json(stacks);
      })
      .catch((err) => {
        console.log("Error getting documents", err);
      });

  // Return a message to the main function to print a message on browser
  // notifying about the successful operation
  // response.send("Finished checking");
});
// app.post('/', (req, res) => res.send(Widgets.create()));
// app.put('/:id', (req, res) =>
// res.send(Widgets.update(req.params.id, req.body)));
// app.delete('/:id', (req, res) => res.send(Widgets.delete(req.params.id)));
// app.get('/', (req, res) => res.send(Widgets.list()));

exports.getStacks = functions.https.onRequest(app);

exports.pushMessageFromStack = functions
    .runWith({timeoutSeconds: 540})
    .firestore.document("Stacks/{id}")
    .onCreate((snap, context) => {
      const mystack = snap.data();
      const stackid = context.params.id;
      console.log("STACK: "+stackid);
      let sendusers = "/";
      const dateObj = new Date();
      db.collection("Players").doc(mystack.player.id)
          .get()
          .then((doc) => {
            const fans = doc.data().fans;
            console.log("FANS: "+fans.toString());
            for (let i = 0; i < fans.length; i++) {
              const myfan = fans[i].data().path;
              sendusers = sendusers + myfan +",/";
            }
            console.log("SENDUSERS: "+sendusers);
            console.log("STACK-ID: "+stackid);
            // const parmData = {"stackClick": "/Stacks/${mystack.id}"};
            const stackPath = `/Stacks/${stackid}`;
            console.log("STACKPATH: "+stackPath);
            const paramData = `{"stackClick":"${stackPath}"}`;
            const pushData = {
              "notification_title": "News Alert",
              "notification_text": mystack.title,
              "notification_image_url": mystack.thumbnail,
              "user_refs": sendusers,
              "initial_page_name": "Stack",
              "parameter_data": paramData,
              "timestamp": dateObj,
            };
            db.collection("ff_push_notifications").add(pushData);
          });
      return 0;
    });
