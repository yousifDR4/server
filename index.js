const express = require("express");
const cors = require("cors");
const { User, firestore } = require("./fire");
const { FieldValue } = require("firebase-admin/firestore");
const app = express();
app.use(express.json());
app.use(cors());
// Use the specified port or default to 3000
app.post("/Add", async (req, res) => {
  try{const{uid,IdToken,email}=req.body;
  const user=await User.verifyIdToken(IdToken);
  if(user.uid!==uid) res.status(401).send("not allowd")
  
    const currentUser = await User.updateUser(uid, {
      email: email,
    });
    res.send(currentUser);
  } catch (e) {
    res.sendStatus(400);
  }
});
app.post("/create", async (req, res) => {
  const arr = ["Student", "Department", "College", "University"];
  const { IdToken, accountType, path } = req.body;
  try {
    const admin = await User.verifyIdToken(IdToken);
    if (!admin) res.status(401).send({ e: "not allowed1" });
  } catch (e) {
    res.status(401).send({ e: "not a valied user" });
  }

  ///path is obj of uids
  const UserCollection = firestore.collection("users");

  if (req.body.createType === "username") {
    const info = {
      email: req.body.email + "@username.com",
      password: req.body.password,
      uid: req.body.email,
    };
    try {
      const currentUser = await User.createUser(info);
      const role=req.body.role?req.body.role:""
      if (role === "Proffessor") {
        const newinfo = {
          email: req.body.email + "@username.com",
         uid: req.body.email,
         username:req.body.email,
          role: req.body.role,
          ...req.body.pinfo,
          University_id: path.University_id,
          College_id:path.College_id,
          Department_id:path.Department_id,
        };
    
        const p1= firestore.doc(`users/${currentUser.uid}`).create(newinfo);
        const p2= firestore.doc(`passwords/${currentUser.uid}`).create({password:req.body.password});
        const p3= firestore
        .doc(`users/${path.Department_id}`)
        .update({ professors: FieldValue.arrayUnion(currentUser.uid) });
       await Promise.all([p1,p2,p3])
     

      }else{
        const newinfo = {
          ...info,
          accountType: req.body.accountType,
          name: req.body.name,
        };
      await createcollection(newinfo, path, currentUser.uid);
      await firestore
        .doc(`users/${currentUser.uid}`)
        .set({ username: req.body.email }, { merge: true });
      }
      res.status(200).send({ uid:currentUser.uid});
   
    } catch (e) {
      res.status(400).send({ status: e.code });
    }
  } else if (req.body.createType === "emailandpassword") {
    try {
      const currentUser = await User.createUser({
        email: req.body.email,
        password: req.body.password,
      });
      const uid = currentUser.uid;
      const info = {
        email: req.body.email,
        uid: currentUser.uid,
        accountType: req.body.accountType,
        name: req.body.name,
      };
      if ((req.body.role = "Proffessor")) {
        const newinfo = {
          ...info,
          role: req.body.role,
          ...req.body.pinfo,
          University_id: path.University_id,
          College_id:path.College_id,
          Department_id:path.Department_id,
        };
        const p1= firestore.doc(`users/${currentUser.uid}`).create(newinfo);
        const p2= firestore.doc(`passwords/${currentUser.uid}`).create({password:req.body.password});
        const p3= firestore
        .doc(`users/${path.Department_id}`)
        .update({ professors: FieldValue.arrayUnion(currentUser.uid) });
       await Promise.all([p1,p2,p3])



      } else await createcollection(info, path, uid);
         res.status(200).send({uid:uid})
    } catch (e) {
      res.send({ status: e });
    }
  } else {
    const info = {
      email: req.body.email,
      name: req.body.name,
      accountType: req.body.accountType,
    };
    const q = await UserCollection.where("email", "==", info.email).get();
    const uid = null;
    if (q.empty) {
      const k = await createcollection(info, path, uid);

      res.status(200).send({ state: [k] });
    } else {
      res.status(400).send({ status: "wrong" });
    }
  }
});

//////////
const createcollection = async (info, path, uid, res) => {
  try {
    if (info.accountType === "University") {
      if (uid !== null) {
        await firestore.doc(`users/${uid}`).create({
          name: info.name,
          email: info.email,
          accountType: info.accountType,
          uid: uid,
        });
      } else
        await firestore.collection("users").add({
          name: info.name,
          email: info.email,
          accountType: info.accountType,
        });
    } else if (info.accountType === "College") {
      if (uid !== null) {
        try {
          await firestore.doc(`users/${uid}`).create({
            name: info.name,
            email: info.email,
            accountType: info.accountType,
            University_id: path.University_id,
            uid: uid,
          });
          await firestore
            .doc(`users/${path.University_id}`)
            .update({ Colleges_id: FieldValue.arrayUnion(uid) });
        } catch (e) {
          return e;
        }
      } else
        await firestore.collection("users").add({
          name: info.name,
          email: info.email,
          accountType: info.accountType,
          University_id: path.path.University_id,
        });
    } else if (info.accountType === "Department") {
      if (uid !== null) {
        await firestore.doc(`users/${uid}`).create({
          name: info.name,
          email: info.email,
          accountType: info.accountType,
          University_id: path.University_id,
          College_id: path.College_id,
          uid: uid,
        });

        await firestore
          .doc(`users/${path.College_id}`)
          .update({ Department_id: FieldValue.arrayUnion(uid) });
      } else
        await firestore.collection("users").add({
          name: info.name,
          email: info.email,
          accountType: info.accountType,
          University_id: path.path.University_id,
          College_id: path.College_id,
        });
    } else {
      if (uid !== null) {
        await firestore.doc(`users/${uid}`).create({
          name: info.name,
          email: info.email,
          accountType: info.accountType,
          University_id: path.University_id,
          College_id: path.College_id,
          Department_id: path.Department_id,
          uid: uid,
        });
        await firestore
          .doc(`users/${path.Department_id}`)
          .update({ Department_id: FieldValue.arrayUnion(uid) });
      } else {
        await firestore.collection(`users`).add({
          name: info.name,
          email: info.email,
          accountType: info.accountType,
          University_id: path.University_id,
          College_id: path.College_id,
          Department_id: path.Department_id,
        });
      }
    }
  } catch (e) {
    return "error";
  }
};
////////
////////////////////?//
app.listen(4000, () => console.log("Up & RUnning *4000"));