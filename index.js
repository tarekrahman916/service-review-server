const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
var jwt = require("jsonwebtoken");

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jdxzbss.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJwt(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      res.status(401).send({ message: "unauthorized" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const serviceCollection = client
      .db("johnsPhotography")
      .collection("services");
    const reviewCollection = client
      .db("johnsPhotography")
      .collection("reviews");

    //jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //services
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection
        .find(query)
        .sort({ borough: 1, _id: -1 });
      const services = await cursor.limit(3).toArray();
      res.send(services);
    });

    app.get("/all-services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    app.post("/services", async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      console.log(result);
      res.send(service);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const service = await serviceCollection.findOne(query);
      res.send(service);
    });

    //Reviews

    app.get("/all-reviews", async (req, res) => {
      let query = {};

      if (req.query.serviceId) {
        query = {
          service_id: req.query.serviceId,
        };
      }

      const cursor = reviewCollection.find(query).sort({ borough: 1, _id: -1 });
      const reviews = await cursor.toArray();
      res.send(reviews);
    });

    app.get("/reviews", verifyJwt, async (req, res) => {
      const decoded = req.decoded;

      if (decoded?.email !== req.query.email) {
        res.status(403).send({ message: "Unauthorized Access" });
      }

      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }
      const cursor = reviewCollection.find(query).sort({ borough: 1, _id: -1 });
      const reviews = await cursor.toArray();
      res.send(reviews);
    });

    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      console.log(result);
      res.send(result);
    });

    app.delete("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/review/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const review = req.body;
      const option = { upsert: true };

      const updatedUser = {
        $set: {
          text: review.text,
          ratings: review.ratings,
        },
      };
      const result = await reviewCollection.updateOne(
        filter,
        updatedUser,
        option
      );
      res.send(result);
    });

    app.get("/review/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const review = await reviewCollection.findOne(query);
      res.send(review);
    });
  } catch (error) {}
}

run().catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log("server is running on:", port);
});
