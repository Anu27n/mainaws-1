// Import necessary modules
require('dotenv').config();
const express = require("express");
const app = express();
const AWS = require("aws-sdk");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs

// Initialize AWS SDK and clients
AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS(); // Initialize SNS client

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Parse JSON bodies

// Session and cookie middleware with expiration time
app.use(cookieParser());
app.use(session({
    secret: "your_secret_key", // Change this to a secret key for session encryption
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: true, // Set secure to true if using HTTPS
        maxAge: 10 * 60 * 1000 // 10 minutes in milliseconds
    }
}));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Function to fetch questions from DynamoDB
async function fetchQuestions() {
    const params = {
        TableName: "Questions"
    };

    try {
        const data = await dynamoDb.scan(params).promise();
        return data.Items;
    } catch (err) {
        console.error("Error fetching questions from DynamoDB:", err);
        return [];
    }
}

// Function to fetch answers from DynamoDB
async function fetchAnswers() {
    const params = {
        TableName: "Answers"
    };

    try {
        const data = await dynamoDb.scan(params).promise();
        return data.Items;
    } catch (err) {
        console.error("Error fetching answers from DynamoDB:", err);
        return [];
    }
}

// Function to insert data into DynamoDB with a specified primary key
async function insertIntoDynamoDB(tableName, primaryKey, data) {
    const params = {
        TableName: tableName,
        Item: {
            [primaryKey]: uuidv4(), // Generate a unique ID for the primary key
            ...data
        }
    };

    try {
        await dynamoDb.put(params).promise();
    } catch (err) {
        console.error(`Error inserting data into ${tableName}:`, err);
        throw err;
    }
}

// Function to publish a message to an SNS topic
async function publishToSns(message) {
    const params = {
        Message: message,
        TopicArn: process.env.SNS_TOPIC_ARN // Set your SNS Topic ARN in your environment variables
    };

    try {
        await sns.publish(params).promise();
        console.log("Message published to SNS:", message);
    } catch (err) {
        console.error("Error publishing message to SNS:", err);
    }
}

// Route to handle GET requests for fetching questions
app.get("/questions", async function(req, res) {
    try {
        const questions = await fetchQuestions();
        res.json(questions);
    } catch (err) {
        console.error("Error fetching questions:", err);
        res.status(500).send("Error fetching questions.");
    }
});

// Route to handle GET requests for fetching answers
app.get("/answers", async function(req, res) {
    try {
        const answers = await fetchAnswers();
        res.json(answers);
    } catch (err) {
        console.error("Error fetching answers:", err);
        res.status(500).send("Error fetching answers.");
    }
});

// Route to handle POST requests for submitting queries
app.post("/submitQuery", async function(req, res) {
    const { name, email, query } = req.body; // Extract data from the POST request

    try {
        // Insert the query into the "queries" table in DynamoDB with "queryid" as the primary key
        await insertIntoDynamoDB("Queries", "queryid", { name, email, query });
        console.log("Query inserted into 'queries' table successfully:", query);
        
        // Publish a notification to SNS
        await publishToSns(`New query submitted by ${name}: ${query}`);
        
        res.redirect("/"); // Redirect after successful submission
    } catch (err) {
        console.error("Error inserting query into 'queries' table:", err);
        res.status(500).send("Error submitting query.");
    }
});

// Route to handle POST requests for submitting questions with image URLs
app.post("/submitQuestion", async function(req, res) {
    const question = req.body.question; // Extract question from the POST request

    try {
        // Insert the question into the "questions" table in DynamoDB with "questionid" as the primary key
        await insertIntoDynamoDB("Questions", "questionid", { question: question });
        console.log("Question inserted into 'questions' table successfully:", question);
        
        // Optionally publish a notification to SNS
        await publishToSns(`New question submitted: ${question}`);
        
        res.redirect("/nn.html"); // Redirect after successful submission
    } catch (err) {
        console.error("Error inserting question into 'questions' table:", err);
        res.status(500).send("Error submitting question.");
    }
});

// Route to handle POST requests for submitting emails
app.post("/submitEmail", async function(req, res) {
    const email = req.body.email; // Extract email from the POST request
    console.log("Email:", email); // Print the email to the console

    try {
        // Insert the email into the "emails" table in DynamoDB with "emailid" as the primary key
        await insertIntoDynamoDB("Emails", "emailid", { email: email });
        console.log("Email inserted into 'emails' table successfully:", email);
        
        // Publish a notification to SNS
        await publishToSns(`New email submitted: ${email}`);
        
        res.redirect("/about"); // Redirect after email submission
    } catch (err) {
        console.error("Error inserting email into 'emails' table:", err);
        res.status(500).send("Error submitting email.");
    }
});

// Route to handle POST requests for submitting answers
app.post("/submitAnswer", async function(req, res) {
    const answer = req.body.answer; // Extract answer from the POST request

    try {
        // Insert the answer into the "answers" table in DynamoDB with "answerid" as the primary key
        await insertIntoDynamoDB("Answers", "answerid", { answer: answer });
        console.log("Answer inserted into 'answers' table successfully:", answer);
        
        // Optionally publish a notification to SNS
        await publishToSns(`New answer submitted: ${answer}`);
        
        res.redirect("/"); // Redirect after successful submission
    } catch (err) {
        console.error("Error inserting answer into 'answers' table:", err);
        res.status(500).send("Error submitting answer.");
    }
});

// Route to handle requests for "/another_page.html"
app.get("/another_page.html", function(req, res) {
    res.sendFile(path.join(__dirname, 'another_page.html'));
});

// Route to handle requests for "/"
app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to handle requests for "/nn.html"
app.get("/nn.html", function(req, res) {
    res.sendFile(path.join(__dirname, 'nn.html'));
});

// Route to handle requests for "/about"
app.get("/about", function(req, res) {
    res.sendFile(path.join(__dirname, "hom.html"));
});

// Route to handle requests for "/answers.html"
app.get("/answers.html", function(req, res) {
    res.sendFile(path.join(__dirname, 'answers.html'));
});

// Route to handle requests for "/contact.html"
app.get("/contact.html", function(req, res) {
    res.sendFile(path.join(__dirname, 'contact.html'));
});

// Start the server
app.listen(8080, '0.0.0.0', function() {
    console.log("Server listening on port 8080");
});
