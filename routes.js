const app = require("./app.js").app
const passport=require("./passport").passport
const jwt = require('jsonwebtoken')
const secret = require("./secret.js").secret.jwtsecret
const db= require("./db.js")
const ObjectID = require('mongodb').ObjectID;
const multer =require("multer")
const storageObject = require("./UploadDestinationsAndAuth.js").storageObject
const io = require("./socket_routes.js").io
var username=""

const storage=multer.diskStorage(storageObject);
  const upload=multer({
    storage:storage
  }).single("file");

/*-------------authentication routes---------------------*/

app.post("/login",(req,res)=>{
    //consider putting this in the passport js file
    passport.authenticate("local",{session:false},(err,user,info)=>{
        //no error check because by default success is false and the error has already been logged
        //so if there is an error it will appear in when user is null
        if(user){
            req.user=user
            console.log("hacking "+req.user.username)
            username=req.user.username
            let token=jwt.sign({username:req.user.username},secret)
            //if the req has a desktop cookie(which means its from desktop redirect it to the home page html)
            //else the request is mobile and redirect it to the api


            //if desktop
            if(req.cookies.desktop){
                console.log(info)
                res.cookie("token",token,{maxAge:1000*60*60})
                res.redirect("/home")
            }

            //if mobile
            else{
                var userObject=req.user
                userObject.jwt=token 
                res.end(JSON.stringify(userObject))
            }
        }
        else{
            if(req.cookies.desktop){
                res.redirect("/login")
            }
            else{
                res.end(JSON.stringify(info))
            }
        }
    })(req,res)
})

app.post("/create",(req,res)=>{
    upload(req,res,(err)=>{
        if(err){
            res.end(JSON.stringify({error:err}))
            return
        }
        else{
            console.log("photo upload successful")
            let token=jwt.sign({username:req.body.username},secret)
            //if the req has a desktop cookie(which means its from desktop redirect it to the home page html)
            //else the request is mobile and redirect it to the api
            if(req.cookies.desktop){
                res.cookie("token",token,{maxAge:1000*60*60})
                res.redirect("/home");
            }
            else{ 
                res.end(JSON.stringify({token:token}))
            }
            
        }
    })
})

/*-------------------web exclusive routes---------------*/

app.get("/login",(req,res)=>{
    //since only the desktop accesses the get page of the login we can set a desktop exclusive cookie that can determine whether or not
    //the request is from mobile or not
    res.cookie("desktop",true)
    res.sendFile(__dirname+"/files/html/index.html")
    
})

app.get("/create",(req,res)=>{
    //since only the desktop accesses the get page of the login we can set a desktop exclusive cookie that can determine whether or not
    //the request is from mobile or not

    //THIS IS NOT THE ACTUAL FILE NAME GE TTHE ACTUAL FILE NAME????????????????
    res.cookie("desktop",true);
    res.sendFile(__dirname+"/files/html/create.html")
    
})

app.get("/",(req,res)=>{res.redirect("/home")})
app.get("/home",passport.authenticate("jwt",{session:false,failureRedirect:"/login"}),(req,res)=>{
    //FIXME
    //change to actual file
    res.end(req.user.username);
})

/*-----------------api routes--------------------*/

//app.use("/api",passport.authenticate("jwt",{session:false,failureRedirect:"/login"}));
//FIXME
//IF THE API FAILS IT WILL AUTO MATICALLY GO BACK TO THE LOGIN GET WHICH
//WOULD NOT WORK FOR MOBILE CHANGE THIS SO IT CHECKS IF MOBILE

app.use("/api",(req,res,next)=>{
    console.log("GAY FOR DONALD")
    req.user={
        username:username
    }
    next()
})

app.get("/api/user",(req,res)=>{
    db.users.find({username:req.user.username}).toArray((err,user)=>{
        if(err){
            console.log("database error\n"+err)
            res.end(JSON.stringify({error:err}))
        }
        else if(user.length==0){
            console.log("an account that had a jwt payload username has reached the database but the account doesnt exist in the database")
            res.end(JSON.stringify({error:"trying to access an account that doesnt exist but it should exist??"}))
        }
        else{
            res.end(JSON.stringify(user[0]))
        }
    })
})

app.get("/api/chat",(req,res)=>{
    let query=req.query
    db.chats.find({_id:ObjectID(query.id),usersin:req.user.username}).toArray((err,chatObj)=>{
        if(err){
            console.log("database error\n"+err)
            res.end(JSON.stringify({error:err}))
        }
        else if(chatObj.length==0){
            res.end(JSON.stringify({error:"chat not found"}))
        }
        else{
            res.end(JSON.stringify(chatObj[0]))
        }
    })
})

app.get("/api/search",(req,res)=>{
    const search = req.query.search
    var check=search.replace(/\W/g,"");
    console.log("CHECK: "+check);
    var sr=new RegExp("^"+check+".*")
      db.users.find({username:sr}).toArray((err,results)=>{
        if(err){
          console.log(err);
          res.end(JSON.stringify({error:"having trouble finding users"}));
          //database error
        }
        else{
          if(results[0]){
            res.end(JSON.stringify({results:results}));
          }
          else{
            res.end(JSON.stringify({error:"no users found"}));
          }
        }
      })
})

app.post("/api/upload",(req,res)=>{
    upload(req,res,(err)=>{
        if(err){
            console.log(err);
            res.end(JSON.stringify({error:err+""}))
            //send object back so the user knows something went wrong;
        }
        else{
            console.log(req.file.filename)
            req.file.path="./data/uploads/chats/"+req.body.id+"/"+req.file.filename;
            req.file.sender=req.body.sender;
            req.file.time=Date.now()
            req.file.type=req.file.mimetype
            db.chats.updateOne({_id:ObjectID(req.body.id)},{$push:{log:req.file}},(err)=>{
                if(err){
                    console.log(err);
                    res.end(JSON.stringify({error:err+""}))
                }
                else{
                    io.emit(req.body.id,req.file);
                    res.end()
                }
            })
        }
    })  
})

app.post("/api/creategroup",(req,res)=>{
    upload(req,res,(err)=>{
        if(err){
            console.log(err)
            res.end(JSON.stringify({error:err+""}))
            //send object back so the user knows something went wrong;
        }
        else{
            const ws = require("./socket_routes.js").ws
            let chatid = req.file.path.split("/")[req.file.path.split("/").length-2]
            function async_loop(i,callback){
                if(i<req.body.chatwith.length){
                    db.users.updateOne({username:req.body.chatwith[i]},{$push:{chats:{name:req.body.name,id:chatid,pic:"/data/uploads/chats/"+chatid+"/chatpic.jpg"}}},(err)=>{
                        if(err){
                            callback(err)
                        }
                        else{
                            if(i==0){
                                ws.emit("createc",{name:req.body.name,id:chatid,pic:"/data/uploads/chats/"+chatid+"/chatpic.jpg",group:true})
                            }
                            else{
                                io.emit(req.body.chatwith[i],{name:req.body.name,id:chatid,pic:"/data/uploads/chats/"+chatid+"/chatpic.jpg",group:true})
                            }
                        }
                    })
                    async_loop(i+1,callback)
                }
                else{
                    callback(null)
                }
            }
            async_loop(0,(err)=>{
                if(err){
                    console.log(err)
                    res.json(err)
                }
                else{
                    res.end()
                }
            })
        }
    })  
})
