// SERVER SETUP
// - import and setup express
const express = require("express")
const app = express()
const path = require("path")
const HTTP_PORT = process.env.PORT || 3000

// - setup sessions
const session = require('express-session')
app.use(session({
    secret: "the quick brown fox jumped over the lazy dog 1234567890",  // random string, used for configuring the session
    resave: false,
    saveUninitialized: true
}))


// - import and setup handlebars
const exphbs = require('express-handlebars');
app.engine('.hbs', exphbs.engine({
    extname: '.hbs',
    helpers: {
        json: (context) => { return JSON.stringify(context) }
    }
}));
app.set('view engine', '.hbs');

// - provide access to the public folder
app.use(express.static("public"))

// - import and setup the bodyparser middleware
const bodyParser = require("body-parser")
app.use(bodyParser.urlencoded({ extended: true }))

// - receive and send json data
app.use(express.json())


//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

// DATABASE SETUP
// - connect to a Mongo database
const mongoose = require("mongoose")
const { resolveSoa } = require("dns")
mongoose.connect("mongodb+srv://mads4012-project-g01:fullstackdevelopment@cluster0.p4cki2u.mongodb.net/?retryWrites=true&w=majority")

// - create new MongoDB documents
const Schema = mongoose.Schema
// -- Users document
const userSchema = new Schema({
    // require from UI on register page
    userEmail: String,
    userPwd: String,
})
const Users = mongoose.model("users", userSchema)

// -- Claases document
const classSchema = new Schema({
    classId: String, // given by developer
    // created by developers using MongoCompass
    classPhoto: String,
    className: String,
    classInstructor: String,
    classLength: Number,
    classPrice: Number
})
const Classes = mongoose.model("classes", classSchema)

// -- Carts document
const cartSchema = new Schema({
    userEmail: String,
    classesCart: [{
        classId: String,
        classPhoto: String,
        className: String,
        classInstructor: String,
        classLength: Number,
        classPrice: Number
    }]
})
const Carts = mongoose.model("carts", cartSchema)

// -- Orders document
const orderSchema = new Schema({
    orderId: Number,
    userEmail: String,
    userFirstName: String,
    userLastName: String,
    userMembership: String, // noMembership, monthly, yearly
    orderCreditCardNum: String,
    orderCreditCardExpiryYear: Number,
    orderCreditCardExpiryMonth: Number,
    orderClassesId: [], // array of classId's
    orderSubtotal: Number,
    orderTax: Number,
    orderTotal: Number
})
const Orders = mongoose.model("orders", orderSchema)

// -----------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

// ENDPOINTS
// CLIENT UI ENDPOINTS
// home page
app.get("/", (req, res) => {

    if (req.session.loggedInUserEmail !== undefined) {
        // authenticated user
        return res.render("home-page", {
            layout: "primary",
            cssFileName: "home-page.css",
            cartBtnVisible: "visible",
            loggedInUserEmail: req.session.loggedInUserEmail,
            logInOut: "Logout"
        })
    } else {
        return res.render("home-page", {
            layout: "primary",
            cssFileName: "home-page.css",
            logInOut: "Login"
        })
    }

})

// schedule page
app.get("/schedule", (req, res) => {

    // read classes from Classes in DB
    Classes.find().lean().exec()
        .then((dataFromDB) => {
            // no data returned => render error page
            if (dataFromDB.length === 0) {
                return res.render("error-page", {
                    errorToUI: { errorStatus: 204, errorMsg: "Currently we don't have any class. Please come back later" },
                    layout: "primary"
                })
            }
            // data returned => render schedule page
            else {
                if (req.session.loggedInUserEmail !== undefined) {
                    // authenticated user
                    return res.render("schedule-page", {
                        classArrayToUI: dataFromDB,
                        layout: "primary",
                        cssFileName: "schedule-page.css",
                        cartBtnVisible: "visible",
                        logInOut: "Logout",
                        loggedInUserEmail: req.session.loggedInUserEmail
                    })
                }
                // non-authenticated user
                return res.render("schedule-page", {
                    classArrayToUI: dataFromDB,
                    layout: "primary",
                    cssFileName: "schedule-page.css",
                    logInOut: "Login",
                })
            }
        })
        .catch((err) => {
            return res.send(err)
        })
})

// login page
app.get("/login", (req, res) => {
    if (req.session.loggedInUserEmail !== undefined) {
        req.session.loggedInUserEmail = undefined
    } else {
        return res.render("login-page", {
            layout: "primary",
            cssFileName: "login-page.css",
            logInOut: "Login"
        })
    }

})

// register page
app.get("/register", (req, res) => {
    if (req.session.loggedInUserEmail !== undefined) {
        req.session.loggedInUserEmail = undefined
    } else {
        return res.render("register-page", {
            layout: "primary",
            cssFileName: "login-page.css",
            logInOut: "Login"
        })
    }
})

// checkout page     // only authenticated can view this page
app.get("/checkout", (req, res) => {
    if (req.session.loggedInUserEmail !== undefined) {
        // authenticated user
        // render cart
        return res.render("checkout-page", {
            layout: "primary",
            cssFileName: "checkout-page.css",
            cartBtnVisible: "visible",
            logInOut: "Logout",
            loggedInUserEmail: req.session.loggedInUserEmail
        })
    }
    else {
        return res.render("error-page", {
            layout: "primary",
            error: {
                name: "ERROR 403", msg: "Forbidden",
                buttonName: "Login/Register", buttonHref: "/login"
            }
        })
    }
})

// confirmation page     
app.get("/confirm/:orderId", (req, res) => {
    if (req.session.loggedInUserEmail !== undefined) {
        // authenticated user
        // render cart
        return res.render("confirm-page", {
            layout: "primary",
            cssFileName: "confirm-page.css",
            cartBtnVisible: "visible",
            logInOut: "Logout",
            loggedInUserEmail: req.session.loggedInUserEmail,
            orderId: req.params.orderId
        })
    }
    else {
        return res.redirect("/login")
    }
})

// administration page
app.get("/admin", (req, res) => {

    // check if admin user is logged in
    if (req.session.loggedInUserEmail === "admin@fitness.ca") {
        Orders.find().lean().exec()
            .then((dataFromDB) => {
                // no data returned => render error page
                if (dataFromDB.length === 0) {
                    return res.render("error-page", {
                        error: {
                            name: "ERROR 204", msg: "We don't have any order history.",
                            buttonName: "Home", buttonHref: "/"
                        },
                        layout: "primary",
                        cartBtnVisible: "visible",
                        logInOut: "Logout"
                    })
                }
                // data returned => render admin page
                else {
                    return res.render("admin-page", {
                        classArrayToUI: dataFromDB,
                        layout: "primary",
                        cssFileName: "admin-page.css",
                        cartBtnVisible: "visible",
                        logInOut: "Logout",
                        loggedInUserEmail: req.session.loggedInUserEmail
                    })
                }
            })
            .catch((err) => {
                return res.send(err)
            })
    } else {
        // non-authenticated user
        return res.render("error-page", {
            layout: "primary",
            error: {
                name: "ERROR 403", msg: "Forbidden",
                buttonName: "Login/Register", buttonHref: "/login"
            }
        })
    }

})

// logout
app.get("/logout", (req, res) => {
    req.session.loggedInUserEmail = undefined
    return res.redirect("/")
})


//-------------------------------------------------------------------------------------------------------

// DB ENDPOINTS

// Class document
// - get all classes
app.get("/api/classes/all", (req, res) => {

    Classes.find({}).lean().exec()
        .then((results) => {
            return res.status(200).json(results)
        })
        .catch((err) => {
            return res.status(500).json(err)
        })
})

// Users document
// - login
app.post("/login", (req, res) => {
    // validation
    if (req.body.emailFromUI === undefined || req.body.pwdFromUI === undefined ||
        req.body.emailFromUI === "" || req.body.pwdFromUI === "") {
        return res.render("error-page", {
            layout: "primary",
            error: {
                name: "ERROR", msg: "Email and password cannot be blank.",
                buttonName: "Login/Register", buttonHref: "/login"
            }
        })
    }

    // check if this user already exist
    Users.findOne({ "userEmail": req.body.emailFromUI }).lean().exec()
        .then((result) => {
            if (result === null) {
                // no such email found => redirect to login
                return res.render("error-page", {
                    layout: "primary",
                    error: {
                        name: "ERROR", msg: "Sorry, such user email does not exist.",
                        buttonName: "Login/Register", buttonHref: "/login"
                    }
                })
            } else {
                // email found => validate pwd
                if (result.userPwd === req.body.pwdFromUI) {
                    req.session.loggedInUserEmail = req.body.emailFromUI
                    return res.render("error-page", {
                        layout: "primary",
                        error: {
                            name: "Successfully logged in!", msg: "",
                            buttonName: "Home", buttonHref: "/"
                        }
                    })
                } else {
                    // otherwise, redirect to login
                    return res.render("error-page", {
                        layout: "primary",
                        error: {
                            name: "INVALID EMAIL OR PASSWORD", msg: "Please try again.",
                            buttonName: "Login/Register", buttonHref: "/login"
                        }
                    })
                }
            }
        })
        .catch((err) => {
            // error => redirect to register
            return res.render("error-page", {
                layout: "primary",
                error: {
                    name: "ERROR", msg: err,
                    buttonName: "Login/Register", buttonHref: "/login"
                }
            })
        })
})

// - user register
app.post("/register", (req, res) => {
    // server side validation
    // validation
    if (req.body.emailFromUI === undefined || req.body.pwdFromUI === undefined ||
        req.body.emailFromUI === "" || req.body.pwdFromUI === "") {
        return res.render("error-page", {
            layout: "primary",
            error: {
                name: "ERROR", msg: "Email and password cannot be blank.",
                buttonName: "Login/Register", buttonHref: "/login"
            }
        })
    }

    const userToRegister = new Users({
        userEmail: req.body.emailFromUI,
        userPwd: req.body.pwdFromUI
    })

    // check if user alreay exists
    Users.find({ "userEmail": req.body.emailFromUI })
        .then((results) => {
            if (results.length === 0) {
                // no => create new user 
                userToRegister.save()
                    .then((createdUser) => {
                        if (createdUser !== null) {
                            // next step: create empty cart
                        }
                    })
                    .catch((err) => {
                        // error => redirect to register
                        return res.render("error-page", {
                            layout: "primary",
                            error: {
                                name: "ERROR", msg: err,
                                buttonName: "Login/Register", buttonHref: "/register"
                            }
                        })
                    })
            } else {
                // user already exists => redirect to login
                return res.render("error-page", {
                    layout: "primary",
                    error: {
                        name: "ERROR", msg: "User already registered. Please log in.",
                        buttonName: "Login/Register", buttonHref: "/login"
                    }
                })
            }
        })
        .catch((err) => {
            // error => redirect to register
            return res.render("error-page", {
                layout: "primary",
                error: {
                    name: "ERROR", msg: err,
                    buttonName: "Login/Register", buttonHref: "/register"
                }
            })
        })

    // create an empty cart for this user
    const cartToCreate = new Carts({
        userEmail: req.body.emailFromUI,
        classesCart: []
    })
    cartToCreate.save()
        .then((createdCart) => {
            if (createdCart !== null) {
                return res.render("error-page", {
                layout: "primary",
                error: {
                    name: "Successfully registered!", msg: "Please log in.",
                    buttonName: "Login/Register", buttonHref: "/login"
                }
            })
            }
        })
        .catch((err) => {
            res.status(500).json({ "msg": err })
        })
        
    

})

//-------------------------------------------------------------------------------------------------------

// Carts document

// - search cart from Carts document using userEmail
app.get("/api/carts/:userEmail", (req, res) => {

    Carts.findOne({ "userEmail": req.params.userEmail })
        .then((result) => {
            if (result === null) {
                return res.status(201).json({ "msg": "No cart of this userEmail" })
            } else {
                return res.status(200).json(result)
            }
        })
        .catch((err) => {
            return res.status(500).json(err)
        })
})


// - creating a new cart
app.post("/api/carts/add", (req, res) => {

    const cartToCreate = new Carts(req.body)

    cartToCreate.save()
        .then((createdCart) => {
            if (createdCart !== null) {
                return res.status(201).json({ "msg": "Cart created successfully" })
            }
        })
        .catch((err) => {
            return res.status(500).json({ "msg": err })
        })
})

// - updating a cart, by a new updated cart
app.put("/api/carts/:userEmail", (req, res) => {

    // TODO: fix udpate cart type issue
    Carts.findOneAndUpdate({ "userEmail": req.params.userEmail }, { "classesCart": req.body })
        .then((updatedCart) => {
            if (updatedCart !== null) {
                return res.status(201).json({ "msg": "Cart updated successfully" })
            }
        })
        .catch((err) => {
            return res.status(500).json({ "msg": err })
        })
})



// Orders API
// - creating an order
app.post("/api/orders/add", (req, res) => {

    const orderToCreate = new Orders(req.body)

    orderToCreate.save()
        .then((createdOrder) => {
            if (createdOrder !== null) {
                return res.status(201).json({ "msg": "Order created successfully" })
            }
        })
        .catch((err) => {
            return res.status(500).json({ "msg": err })
        })
})

// - getting all orders => return as an array
app.get("/api/orders/all", (req, res) => {

    Carts.find({ "userEmail": req.params.userEmail })
        .then((results) => {
            if (results.length == 0) {
                return res.status(201).json({ "msg": "No order placed yet." })
            } else {
                return res.status(200).json(results)
            }
        })
        .catch((err) => {
            return res.status(500).json(err)
        })
})

// - getting order object by userEmail
app.get("/api/orders/:userEmail", (req, res) => {

    Orders.findOne({ "userEmail": req.params.userEmail })
        .then((result) => {
            if (result === null) {
                return res.status(201).json({ "msg": "No order of this userEmail" })
            } else {
                return res.status(200).json(result)
            }
        })
        .catch((err) => {
            return res.status(500).json(err)
        })
})

//-------------------------------------------------------------------------------------------------------

// SEVER ERROR PAGE
app.use((req, res) => {
    // TODO: RENDER ERROR PAGE BY VARIABLE
    return res.render("error-page", {
        errorToUI: { errorStatus: 404, errorMsg: "Page does not exist." },
        layout: "primary"
    })
})
//-------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------
// SERVER STARTS
const onServerStart = () => {
    console.log("Express http server listening on: " + HTTP_PORT)
    console.log(`http://localhost:${HTTP_PORT}`)
}
app.listen(HTTP_PORT, onServerStart)