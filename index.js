const express = require("express");
const cors = require("cors");
const { User, firestore } = require("./fire");
const { FieldValue } = require("firebase-admin/firestore");
const app = express();
app.use(express.json());
app.use(cors());
// Use the specified port or default to 3000
const rand = () => Math.floor(26 * Math.random());
const gen = () => {
  let capitalLetters = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
  ];
  let x = "";
  for (let index = 0; index < 10; index++) {
    x = x + capitalLetters[rand()];
  }
  return x;
};
app.post("/createSTUS", async (req, res) => {
  const {
    accountType,
    createType,
    path,
    pinfo,
    random,
    email,
    password,
    IdToken,
  } = req.body;
  try {
    const admin = await User.verifyIdToken(IdToken);
    if (!admin) res.status(401).send({ e: "not allowed1" });
  } catch (e) {
    res.status(401).send({ e: "not a valied user" });
  }
  const r2 = gen();
  try {
    const info = {
      uid: email,
      password: password,
      email: email + "@" + r2 + ".com",
    };
    const currentUser = await User.createUser(info);
    const newinfo = {
      email: info.email,
      username: email,
      accountType: "student",
      Department_id: path.Department_id,
      University_id: path.University_id,
      College_id: path.College_id,
      uid: currentUser.uid,
      ...pinfo,
    };
    const p1 = firestore.doc(`users/${currentUser.uid}`).create(newinfo);
    const p2 = firestore
      .doc(`passwords/${currentUser.uid}`)
      .create({ password: password, ...path, accountType: "student" });
    const p3 = firestore
      .collection(`users/${path.Department_id}/students`)
      .add({ Student_id: currentUser.uid });
    await Promise.all([p1, p2, p3]);
    res.status(200).send({ uid: currentUser.uid });
  } catch (e) {
    res.status(400).send(e);
  }
});
app.post("/changedepartment", async (req, res) => {
  const { id, Department_id, IdToken } = req.body;
  try {
    const admin = await User.verifyIdToken(IdToken);
    if (!admin) res.status(401).send({ e: "not allowed1" });
    await firestore
      .doc(`passwords/${id}`)
      .set({ Department_id: Department_id }, { merge: true });
    res.sendStatus(200);
  } catch (e) {
    res.status(401).send({ errror: e });
  }
});
app.post("/changepassword", async (req, res) => {
  const { id, password, IdToken } = req.body;
  try {
    const admin = await User.verifyIdToken(IdToken);
    if (!admin) res.status(401).send({ e: "not allowed1" });
    const p1 = firestore
      .doc(`passwords/${id}`)
      .set({ password: password }, { merge: true });
    const p2 = User.updateUser(id, { password: password });
    res.sendStatus(200);
    prompt.all([p1, p2]);
  } catch (e) {
    res.status(401).send({ errror: e });
  }
});
app.post("/changeusername", async (req, res) => {
  const {
    id,
    password,
    username,
    College_id,
    University_id,
    Department_id,
    IdToken,
  } = req.body;
  try {
    const admin = await User.verifyIdToken(IdToken);
    if (!admin) res.status(401).send({ e: "not allowed1" });
    const userfile = await firestore.doc(`user/${id}`).get();
    const deleteauth = User.deleteUser(id);
    const user = await User.createUser({
      password: password,
      uid: username,
      email: username + "@" + gen() + ".com",
    });
    if (user) {
      const p1 = firestore.doc(`user/${id}`).delete();
      const p2 = firestore.doc(`passwords/${id}`).delete();
      await Promise.all([p1, p2, deleteauth]);
      const p3 = firestore.doc(`passwords/${user.uid}`).create({
        password: password,
        Department_id: Department_id,
        College_id: College_id,
        University_id: University_id,
      });
      const p4 = firestore
        .doc(`uses/${user.uid}`)
        .create({
          ...userfile,
          uid: user.uid,
          username: username,
          email: user.email,
        });
      await Promise.all([p3, p4]);
      res.sendStatus(200);
    } else res.status(400);
  } catch (e) {
    res.status(401).send({ errror: e });
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
    const r1=await check(gen());
    const r2=await check(gen());
  
    const info = {
      email:req.body.email+"@"+r2+".com",
      password: req.body.password,
      uid: req.body.email,
    };
    try {
      const currentUser = await User.createUser(info);
      const role = req.body.role ? req.body.role : "";
      if (role === "Proffessor") {
        const newinfo = {
          email: info.email,
          uid: currentUser.uid,
          username: req.body.email,
          role: req.body.role,
          ...req.body.pinfo,
          University_id: path.University_id,
          College_id: path.College_id,
          Department_id: path.Department_id,
        };

        const p1 = firestore.doc(`users/${currentUser.uid}`).create(newinfo);
        const p2 = firestore
          .doc(`passwords/${currentUser.uid}`)
          .create({ password: req.body.password });
        const p3 = firestore
          .doc(`users/${path.Department_id}`)
          .update({ professors: FieldValue.arrayUnion(currentUser.uid) });
        await Promise.all([p1, p2, p3]);
      } else {
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
      res.status(200).send({ uid: currentUser.uid });
    } catch (e) {
      res.status(401).send({ status: e.code });
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
      const role = req.body.role ? req.body.role : "";
      if (role === "Proffessor") {
        const newinfo = {
          ...info,
          role: req.body.role,
          ...req.body.pinfo,
          University_id: path.University_id,
          College_id: path.College_id,
          Department_id: path.Department_id,
        };
        const p1 = firestore.doc(`users/${currentUser.uid}`).create(newinfo);
        const p2 = firestore
          .doc(`passwords/${currentUser.uid}`)
          .create({ password: req.body.password });
        const p3 = firestore
          .doc(`users/${path.Department_id}`)
          .update({ professors: FieldValue.arrayUnion(currentUser.uid) });
        await Promise.all([p1, p2, p3]);
      } else await createcollection(info, path, uid);
      res.status(200).send({ uid: currentUser.uid });
    } catch (e) {
      res.status(400).send({ status: e });
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
const createcollection = async (info, path, uid) => {
  try {
    if (info.accountType === "University") {
      if (uid !== null) {
        await firestore.doc(`users/${uid}`).create({
          name: info.name,
          nametoLocaleLowerCase: info.name.toLocaleLowerCase(),
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

 const check=async(x)=>{
  const docsData=await firestore.collection("users").where("username","==",x).get();
  const length=docsData.docs[0]?1:0
  if(length===0)
  return x;
 
else{
  return check(gen()); 
}
}
app.listen(4000, () => console.log("Up & RUnning *4000"));