const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());

// --------------------------------

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3wo76be.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // create a database for medicine collection

        const medicineCollection = client.db("mediMart").collection("medicine");
        const cartCollection = client.db("mediMart").collection("cart");
        const userCollection = client.db("mediMart").collection("user");
        const bannerCollection = client.db("mediMart").collection("banner");
        const paymentCollection = client.db("mediMart").collection("payments");


        // job related api
        app.post('/jwt', async (req, res) => {

            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            });
            res.send({ token });
        })

        // middleware
        const verifyToken = (req, res, next) => {
            console.log(req.headers);
            // next();
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'forbidden access' });
            }

            const token = req.headers.authorization.split('')[1];

            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) => {
                if (err) {
                    return res.status(401).send({ message: 'forbidden access' })
                }

                req.decoded = decoded;
                next();
            })
        }


        app.get('/medicine', async (req, res) => {
            const result = await medicineCollection.find().toArray();
            res.send(result);
        })

        app.post('/medicine', async (req, res) => {
            const p = req.body;
            // console.log(p);
            const result = await medicineCollection.insertOne(p);
            res.send(result);
        })

        app.delete('/medicine/:id', async (req, res) => {

            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await medicineCollection.deleteOne(query);
            res.send(result);

        })


        app.put('/medicine/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateMedicine = req.body;
            const medicine = {
                $set: {
                    category: updateMedicine.category,
                    name: updateMedicine.name,
                    image: updateMedicine.image,
                    price_per_unit: updateMedicine.price_per_unit,
                    company_name: updateMedicine.company_name,
                    description: updateMedicine.description,
                    dosage: updateMedicine.dosage


                }
            }

            const result = await medicineCollection.updateOne(filter, medicine, options);
            res.send(result);


        })

        // cart-----------------------------------------

        app.get('/cart', async (req, res) => {
            // const user = req.query;
            // // console.log(email);
            // const query = {email: user.email};
            // console.log(query);
            const result = await cartCollection.find().toArray();



            res.send(result);

        })


        app.post('/cart', async (req, res) => {
            const p = req.body;
            // console.log(p);
            const result = await cartCollection.insertOne(p);
            res.send(result);
        })


        app.delete('/cart/:id', async (req, res) => {

            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query);
            res.send(result);

        })

        const verifyAdmin = async (req, res, next) => {

            const email = req.decoded.email;
            const query = { email: email };

            const user = await userCollection.findOne(query);

            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            next();
        }

        // user related api 

        app.post('/user', async (req, res) => {
            const user = req.body;

            const query = { email: user.email }

            const existingUser = await userCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'user already exists', insertId: null })
            }
            // console.log(p);
            const result = await userCollection.insertOne(user);
            res.send(result);
        })



        app.get('/user', async (req, res) => {

            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.get('/user/admin/:email', async(req, res) =>{

            const email = req.params.email;
            // if(email !== req.decoded.email){
            //     return res.status(403).send({message: 'forbidden access'})
            // }

            const query = {email: email};
            const user = await userCollection.findOne(query);
            let admin = false;
            if(user) {
                admin = user?.role === "admin";
            }

            res.send({admin});



        })

        app.patch('/user/admin/:id', async (req, res) => {

            const id = req.params.id;

            const filter = { _id: new ObjectId(id) };

            const updatedDoc = {

                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result);

        })

        app.delete('/user/:id', async (req, res) => {

            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query);
            res.send(result);

        })



        // --------------------------------banner ----------------------------

        app.get('/banner', async (req, res) => {
            const result = await bannerCollection.find().toArray();
            res.send(result);
        })

        app.post('/banner', async (req, res) => {
            const p = req.body;
            // console.log(p);
            const result = await bannerCollection.insertOne(p);
            res.send(result);
        })



        // -------------------------------------------------------------------

// payment related api-----------------------------------------------------------

app.post('/create-payment-intent', async (req, res) =>{

    const {price} = req.body;
    const amount = parseInt(price * 100);

    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
    });

    res.send({
        clientSecret: paymentIntent.client_secret
    })
})

app.get('/payments/:email', async(req, res)=> {

    const query = { email: req.params.email }

    const result = await paymentCollection.find(query).toArray();
    res.send(result);
})


app.post('/payments', async(req, res) => {

    const payment = req.body;
    const paymentResult = await paymentCollection.insertOne(payment);
    // carefully delete each item from the cart
    console.log('payment info', payment);

    const query = {_id: {

        $in: payment.cartId.map(id => new ObjectId(id))
    }};
    
    const deleteResult = await cartCollection.deleteMany(query);
    res.send({paymentResult, deleteResult});
})





// --------------------------------------------------------------------------------





        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




// --------------------------------

app.get('/', (req, res) => {
    res.send('medi mart is ready');
})

app.listen(port, () => {
    console.log(`Medi mart is running on port ${port}`);
})