const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());

// --------------------------------

const { MongoClient, ServerApiVersion } = require('mongodb');
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



    app.get('/medicine', async(req, res)=>{
        const result = await medicineCollection.find().toArray();
        res.send(result);
    })

    // cart-----------------------------------------

    app.get('/cart', async (req, res) => {
        // const email = req.query.email;
        // // console.log(email);
        // const query = {email: email};
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

app.listen(port, ()=>{
    console.log(`Medi mart is running on port ${port}`);
})