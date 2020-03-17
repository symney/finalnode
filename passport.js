const db =require("./db.js");
const bcrypt =require("bcrypt")
const JWTStrategy = require("passport-jwt").Strategy
const passport = require("passport");
const localStrategy = require("passport-local").Strategy
const secret = require("./secret.js").secret.jwtsecret



passport.use(new localStrategy((username,password,done)=>{
    db.users.find({username:username}).toArray((err,userObjArr)=>{
        if(err){
            console.log(" data base error when logging in passport js line 13\n"+err)
            done(err,false,{ message: "There was an internal error please try again later" });
            return
        }
        else if(userObjArr.length==0){
            console.log("no user with that username");
            done(null,false,{ message: "There is no user with that username" });
            return
        }
        else{
            if(userObjArr.length > 1){
                console.log("error user with more than one database entry loggin in anyway")
            }
            bcrypt.compare(password,userObjArr[0].password, function(err, res) {
                if(err){
                    console.log("bcrypt error on compare")
                    done(null,false,{ message: "bcrypt error beware?" })
                }
                else if(res){
                  console.log("done");
                    return done(null,userObjArr[0],{ message: "all good" });
                }
                else {
                  console.log("incorrect password");
                  return done(null,false,{ message: "Your Password is incorrect" });
                }
              })
        }

    })
}))


function getJwtFromWebToken(req){
    if(req.cookies.token){
        return req.cookies.token
    }
    else{
        return req.header.jwtauth
    }
}
passport.use(new JWTStrategy({jwtFromRequest: getJwtFromWebToken,secretOrKey:secret},(payload,done)=>{
//write an if statement to tell if there are cookies whuch will determine if it is desktop or mobile if no cookies then pull jwt from request header 
//Write expiration code
      return done (null,payload);
}))
passport.initialize()
module.exports.passport=passport

