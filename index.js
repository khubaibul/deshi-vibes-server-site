const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require('colors');
require('dotenv').config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// Middleware
app.use(cors());
app.use(express.json());


// MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@mogodb-practice.uoisaxb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



// API
app.get("/", (req, res) => {
    res.send("Deshi Vibes Server Is Running...")
})


function verifyJWT(req, res, next) {
    // const token = req.headers.authorization;
    // console.log(token);
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send("UnAuthorized Access")
    }
    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "Forbidden" })
        }
        req.decoded = decoded;
        next();
    })
}


async function dataBase() {
    try {
        const usersCollection = client.db("deshi-vibes").collection("users");
        const productsCollection = client.db("deshi-vibes").collection("products");
        const cartsCollection = client.db("deshi-vibes").collection("carts");



        // Save User Info
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            // const userEmail = user.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: user,
            }

            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            const token = jwt.sign(user, process.env.JWT_ACCESS_TOKEN);
            res.send({ result, token });
        })


        // Add Product Into Database
        app.post("/add-product", async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result)
        })

        // Get All Products
        app.get("/products", async (req, res) => {
            const query = {};
            const products = await productsCollection.find(query).toArray();
            res.send(products)
        })


        // Get Products By ID
        app.get("/product/:_id", async (req, res) => {
            const _id = req.params._id;
            const filter = { _id: new ObjectId(_id) };
            const result = await productsCollection.findOne(filter);
            res.send(result)
        })


        // Add To Cart Product
        app.post("/add-to-cart", async (req, res) => {
            const addToCartInfo = req.body;
            const query = {};
            const cartCollections = await cartsCollection.find(query).toArray();
            const alreadyAdded = cartCollections.find(product => (product.productId === addToCartInfo.productId) && product.buyerEmail === addToCartInfo.buyerEmail);
            if (alreadyAdded) {
                res.send({ message: "Already in your cart" })
            }
            else {
                const result = await cartsCollection.insertOne(addToCartInfo);
                res.send(result);
            }
        })

        // Get Cart Product By Email
        app.get("/cart-product/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { buyerEmail: email };
            const cartProduct = await cartsCollection.find(filter).toArray();
            res.send(cartProduct);
        })

        // Delete Product From Cart By ProductId
        app.delete("/delete-cart-product/:productId", async (req, res) => {
            const productId = req.params.productId;
            const filter = { productId: productId };
            const result = await cartsCollection.deleteOne(filter);
            res.send(result);
        })



    }

    catch (err) {
        console.log(err.message.bgRed.bold)
        console.log(err.stack.bgBlue.bold)
    }
}

dataBase().catch(err => console.log(err.bold.bgRed));


// Listen
app.listen(port, () => console.log("Deshi Vibes Server Is Running..."))