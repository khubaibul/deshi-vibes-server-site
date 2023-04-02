const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require('colors');
require('dotenv').config();
const SSLCommerzPayment = require('sslcommerz-lts')
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// Middleware
app.use(cors());
app.use(express.json());

// SSLCommerz
const store_id = process.env.SSLCOMMERZ_STORE_ID
const store_passwd = process.env.SSLCOMMERZ_API_KEY
const is_live = false //true for live, false for sandbox


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
        const ordersCollection = client.db("deshi-vibes").collection("orders");



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


        // Get All Customer
        app.get("/all-customer", async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            const customer = users?.filter(user => !user.isAdmin);
            res.send(customer);
        })

        // Delete Customer By Email
        app.delete("/delete-customer/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = usersCollection.deleteOne(query);
            res.send(result);

        })


        // Add Product Into Database
        app.post("/add-product", async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result)
        })

        // Delete Product By Id
        app.delete("/delete-product/:_id", async (req, res) => {
            const _id = req.params._id;
            const filter = { _id: new ObjectId(_id) };
            const result = await productsCollection.deleteOne(filter);
            res.send(result);
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


        // Check IsAdmin
        app.get("/user/admin/:email", async (req, res) => {
            const email = req.params.email;

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user?.isAdmin === "Admin") {
                return res.send({ isAdmin: "Admin" })
            }
            else {
                res.send({ isAdmin: false })
            }
        })


        //sslcommerz init
        app.post('/ssl-commerz/payments', async (req, res) => {

            const orderDetails = req.body;
            if (!orderDetails) {
                return res.send({ error: "Please provide valid information." })
            }

            const products = orderDetails.products;
            const buyerEmail = orderDetails.buyerEmail;


            const ids = products?.map(product => product.productId);

            const transactionId = new ObjectId().toString();

            const data = {
                total_amount: orderDetails.price,
                currency: 'USD',
                tran_id: transactionId, // use unique tran_id for each api call
                success_url: `${process.env.SERVER_URL}/payment/success?transactionId=${transactionId}&buyerEmail=${buyerEmail}&ids=${ids}`,
                fail_url: `${process.env.SERVER_URL}/payment/fail?transactionId=${transactionId}&buyerEmail=${buyerEmail}`,
                cancel_url: `${process.env.SERVER_URL}/payment/fail?transactionId=${transactionId}&buyerEmail=${buyerEmail}`,
                ipn_url: 'http://localhost:3030/ipn',
                shipping_method: 'Courier',
                product_name: 'Fashion',
                product_category: 'Fashion',
                product_profile: 'general',
                cus_name: 'Customer Name',
                cus_email: orderDetails.buyerEmail,
                cus_add1: 'Dhaka',
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: '1000',
                cus_country: 'Bangladesh',
                cus_phone: '01711111111',
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
            };
            const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)

            sslcz.init(data).then(async (apiResponse) => {

                let GatewayPageURL = apiResponse.GatewayPageURL;
                ordersCollection.insertOne({
                    buyerEmail: orderDetails.buyerEmail,
                    ...orderDetails,
                    transactionId,
                    paid: false
                })

                res.send({ redirectURL: GatewayPageURL })
            });
        })


        // Payment Success API
        app.post("/payment/success", async (req, res) => {
            const { transactionId } = req.query;
            const { buyerEmail } = req.query;
            const { ids } = req.query;

            if (!transactionId || !buyerEmail || !ids) {
                return res.redirect(`${process.env.CLIENT_URL}/payment/fail`)
            }

            let productIds = ids.split(",");




            const query = { buyerEmail: buyerEmail, productId: { $in: productIds } };
            const cartProducts = await cartsCollection.deleteMany(query);
            console.log(cartProducts);
            const result = await ordersCollection.updateOne({ transactionId }, { $set: { paid: true, paidAt: new Date() } });

            if (result.modifiedCount > 0) {
                res.redirect(`${process.env.CLIENT_URL}/user-profile`);
            }
        })

        // Payment Fail API
        app.post("/payment/fail", async (req, res) => {
            const { transactionId, buyerEmail } = req.query;

            if (!transactionId || !buyerEmail) {
                return res.redirect(`${process.env.CLIENT_URL}/payment/fail`)
            }
            const query = { transactionId, buyerEmail }

            const result = await ordersCollection.deleteOne(query)
            if (result.deletedCount) {
                res.redirect(`${process.env.CLIENT_URL}/payment/fail`)
            }
        })


        // Get Specific User Order By Email
        app.get("/my-orders/:email", async (req, res) => {
            const email = req.params.email;
            const query = { buyerEmail: email, paid: true }
            const result = await ordersCollection.find(query).toArray();
            res.send(result);
        })


        app.get("/all-orders", async (req, res) => {
            const query = { paid: true };
            const result = await ordersCollection.find(query).toArray();
            res.send(result);
        })

        app.patch("/shipped-order/:_id", async (req, res) => {
            const { _id } = req.body;
            console.log(_id);
            const result = await ordersCollection.updateOne({ _id: new ObjectId(_id) }, { $set: { status: "Shipped" } }, { upsert: true });
            res.send(result)
        })

        app.patch("/canceled-order/:_id", async (req, res) => {
            const { _id } = req.body;
            console.log(_id);
            const result = await ordersCollection.updateOne({ _id: new ObjectId(_id) }, { $set: { status: "Canceled" } }, { upsert: true });
            res.send(result)
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