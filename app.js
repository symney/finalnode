const express = require("express")
const db = require("./db.js")
const mongo =require("mongodb").MongoClient
const app=express();
const cookieParser=require("cookie-parser")
const http = require("http").createServer(app)
module.exports.app=app
module.exports.http=http

app.use("/files",express.static(__dirname+"/files/"))
app.use("/data",express.static(__dirname+"/database/"))
app.use(express.json())
app.use(express.urlencoded({encoded: false,extended:true}))
app.use(cookieParser("Thisjlsnfglksgjklf94ur8925890hnr8u3hd8hf208fh"))

require("./passport.js")
require("./routes.js")
require("./socket_routes.js")

db.init((err)=>{
    if(err){console.log("fatal database error"+err); return}
    http.listen(80,()=>{
        console.log("Running")
    })
})

    

