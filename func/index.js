const functions = require('firebase-functions');
var admin = require("firebase-admin");
var serviceAccount = require("./save-money-fe157-firebase-adminsdk-fjqx1-5b3c2b605f.json");
/*var fs = require ('fs');
var fc = require('fast-csv');
var write= fs.createWriteStream('test.csv');
var read = fs.createReadStream('test.csv');
*/
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://save-money-fe157.firebaseio.com/"
});

/*
fc.write([
    ["asdfg","asdfg"],
    ["dfghj","dfghj"]
],{Headers:true}).pipe(write);
*/

const db = admin.firestore();

/*
set up new User 
needs {
       "userName":req.body.userName,
        "uid":  req.body.uid, 
        "accType":req.body.accType,
      }
*/
exports.newUser =functions.https.onRequest((req,response)=>{ 
  var doc = {
    "userName":req.body.userName,
    "uid":  req.body.uid,
    "goal": 0,
    "income":0
  };
  var user={
        "uid":  req.body.uid,
        "accType":req.body.accType,
        "docId":""
  }
  db.collection('users').doc().set(user)
 .then((res)=>{
   var userId="";
   //to get docid of user
   db.collection('users').where('uid','==',user.uid).get()
   .then((snap)=>{
      userId=snap.docs[0].id;
      return userId;
   })
   .then((userId)=>{
     //set user documrnt in usertype
     db.collection(user.accType).doc().set(doc)
     .then(res=>{
       //get docid of acctype collection
        db.collection(user.accType).where('uid','==',user.uid).get()
        .then(res=>{
          console.log(res.docs[0].id);
          return (res.docs[0].id)
        })
        .then((docId)=>{
          //set docId of acctype in usrescollection
          db.collection('users').doc(userId).update({
            "docId":docId
          })
          .then((res)=>{
            console.log(res);
            return(response.status(200).send("created"));
          })
          .catch(err=>{
            response.send("unable to create");
            throw(err);
          });
          return(docId);
        })
        .catch(err=>{
          response.send("error");
          throw(err);
        })
        return(res);
      })
     .catch(err=>{
         response.send("unable to create");
         throw(err);
     });
     return(userId);
   })
   .catch(err=>{
    response.status(500).send("failed");
    throw err;
   });
   return(res);
 })
 .catch(err=>{
   response.status().send("cant set user");
   throw err;
 });
    
 });
  
/*
uploads sms data
need {
        "amt": req.body.amt,
        "date":  req.body.date,
        "merchant":  req.body.merchant,
        "category":  req.body.category,
        "type":  req.body.type,
        "uid":  req.body.uid,
        "availableBal":req.body.availableBal
    }
 */
exports.uploadsms =functions.https.onRequest((req,response)=>{ 
    var doc = {
        "amt": req.body.amt,
        "date":  req.body.date,
        "merchant":  req.body.merchant,
        "category":  req.body.category,
        "type":  req.body.type,
        "uid":  req.body.uid,
        "availableBal":req.body.availableBal
    };
    var user={
      accType:"",
      docId:""
    } 
    db.collection('users').where('uid','==',doc.uid).get()
    .then((snapshot)=>{
      snapshot.forEach((docs)=>{
        user.accType=docs.data().accType;
        user.docId=docs.data().docId;
      });        
      return(user);
    })
    .then((user)=>{
      db.collection(user.accType).doc(user.docId)
       .collection('smsData').doc()
       .set(doc)
       .then((res)=>{
          return(response.status(200).send("sms saved"))
        })
       .catch((err)=>{
          response.status(500).send("camt save sms");
          throw err;
        });
        return(user);
    })
    .catch(err=>{
      response.status(500).send("failed");
      throw err;
    });
//    category: grocery, food,shoppimg, travel,bills,loan,health, subaciption;     
    
 });
 
/*
get data of transactons at diifernt months  
needs uid 
returns array of 12*3 each index represents amount income, spend, availableBal(at end of each month) each month
 */
exports.getChartData = functions.https.onRequest((req,response)=>{
     var doc = {
     "uid":  req.body.uid
     };
     var user={
      accType:"",
      docId:""
    } 
    db.collection('users').where('uid','==',doc.uid).get()
    .then((snapshot)=>{
      snapshot.forEach((docs)=>{
        user.accType=docs.data().accType;
        user.docId=docs.data().docId;
      });        
      return(user);
    })
   .then((user)=>{
      db.collection(user.accType).doc(user.docId)
       .collection('smsData').orderBy('date','asc').get()
            .then((snapshot)=>{
                var multi=[[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
                console.log(multi);
                snapshot.forEach((docs)=>{
                  console.log(docs.data());
                  var d = new Date(0);
                  d.setUTCSeconds(docs.data().date.seconds)
               //   console.log(d.getMonth());///gives array index of month
                  var k= docs.data().type==="debit"?1:0;
                  multi[d.getMonth()][k] += docs.data().amt;
                  multi[d.getMonth()][2] = docs.data().availableBal;
                  console.log(d.getMonth() + k +  multi[d.getMonth()][k]);
                  
        
                });
                return multi;
            })
            .then((arr)=>{
         
                return(response.status(200).send(arr))
             })
            .catch((err)=>{
                console.log(err);
                response.send("failed");
                throw err;
            });
            return(user);

    })
    .catch((err)=>{
            response.status(500).send("cant find userin the specified collection");
            throw(err);
    });     
    
 });

/*
get data of transactons at diifernt categories entertainment,travel,etc 
needs uid and month as number(0-11)
returns array of 8 each index represents amount spend on bills,food,grocery,health,loan,shopping,subscription,travel in the same order
 */
 exports.getDataByCateg = functions.https.onRequest((req,res)=>{  
    
  var doc = {
    "uid":  req.body.uid
    };
    var month = req.body.month;

    var user={
      accType:"",
      docId:""
    } 
    db.collection('users').where('uid','==',doc.uid).get()
    .then((snapshot)=>{
      snapshot.forEach((docs)=>{
        user.accType=docs.data().accType;
        user.docId=docs.data().docId;
      });        
      return(user);
    })
   .then((user)=>{
      db.collection(user.accType).doc(user.docId)
       .collection('smsData').get()
           .then((snapshot)=>{
            var multi=[0,0,0,0,0,0,0,0];
            console.log(multi);
            snapshot.forEach((docs)=>{
              var d = new Date(0);
              d.setUTCSeconds(docs.data().date.seconds)
              console.log(d.getMonth());///gives array index of month
               if(d.getMonth()===month){
                 switch(docs.data().category) { 
                     case ("BILLS"): { 
                         multi[0] += docs.data().amt;
                        break; 
                     } 
                     case ("FOOD"): { 
                         multi[1] += docs.data().amt; 
                        break; 
                     } 
                     case ("GROCERY"): { 
                         multi[2] += docs.data().amt; 
                        break; 
                     } 
                     case ("HEALTH"): { 
                         multi[3] += docs.data().amt; 
                        break; 
                     } 
                     case ("LOAN"): { 
                         multi[4] += docs.data().amt;
                        break; 
                     } 
                     case ("SHOPPING"): { 
                         multi[5] += docs.data().amt; 
                        break; 
                     } 
                     case ("SUBSCRIPTION"): { 
                         multi[6] += docs.data().amt; 
                        break; 
                     } 
                     case ("TRAVEL"): { 
                         multi[7] += docs.data().amt; 
                        break; 
                     } 
                      
                  } 
                   
               }
            });
            return multi;
            })
            .then((arr)=>{            
              return(res.status(200).send(arr))
            })
            .catch((err)=>{
              res.send(err);
                    throw err;
            });
      return(user);
       })
    .catch((err)=>{
       response.status(500).send("cant find userin the specified collection");
       throw(err);
    });     

     
 });


/*
get number of transactions online and offline 
needs uid and month as number(0-11)
returns array of two first index is for online second is for offline
 */
exports.getTransactionMode = functions.https.onRequest((req,res)=>{  
    var doc = {
      "uid":  req.body.uid
      };
    var month = req.body.month;
    var user={
      accType:"",
      docId:""
    } 
    db.collection('users').where('uid','==',doc.uid).get()
    .then((snapshot)=>{
      snapshot.forEach((docs)=>{
        user.accType=docs.data().accType;
        user.docId=docs.data().docId;
      });        
      return(user);
    })
   .then((user)=>{
      db.collection(user.accType).doc(user.docId)
       .collection('smsData').get()
          .then((res)=>{
            var arr=[0,0];
            res.forEach((docs)=>{
              var d = new Date(0);
              d.setUTCSeconds(docs.data().date.seconds)
              if(d.getMonth()===month){
                docs.data().mode==="online"?++arr[0]:++arr[1];
              }
            });
            return(arr);
          })
          .then(arr=>{
            return res.status(200).send(arr);
          })
          .catch((err)=>{
            res.status(500).send("try again");
            throw err;
          });
    return(user);
  })
  .catch((err)=>{
    res.status(500).send("cant find userin the specified collection");
    throw(err);
  });     

   
 });

 /*
 sets Saving goal of user
 needs uid and goal(amt) in json Format
 */
exports.setGoal =functions.https.onRequest((req,response)=>{ 
  var doc = {
    "uid":  req.body.uid
    };
    var user={
     accType:"",
     docId:""
   } 
   db.collection('users').where('uid','==',doc.uid).get()
   .then((snapshot)=>{
     snapshot.forEach((docs)=>{
       user.accType=docs.data().accType;
       user.docId=docs.data().docId;
     });        
     return(user);
   })
  .then((user)=>{
    var income;
    /*
     db.collection(user.accType).doc(user.docId).get()
     .then(res=>{
        income=res.data().income;
     })
     .catch(err=>{
       income=null;
       throw err;
     })
     */
     db.collection(user.accType).doc(user.docId)
    .update({
      "goal":req.body.goal
//      "goal":(req.body.goal*income)  //in percentage
    })
    .then(res=>{
      console.log(res);
      return(response.status().send("goal updated"));
    })
    .catch(err=>{
      response.status(500).send(err)
      throw err;
    });
    return(response.send("done"));
  })
  .catch(err=>{
    response.status(500).send(err);
    throw err;
  });
 });

 /*
 check Saving goal of user
 needs uid in json Format
 returns an object{
          'currentPercentage':(availableBal*100/income),
          'goalStatus':"Success/Failed"
        }
 */
exports.checkGoal =functions.https.onRequest((req,response)=>{ 
  var doc = {
    "uid":  req.body.uid,
    'income':0,
    'goal':0,
    };
    var user={
     accType:"",
     docId:""
   } 
   db.collection('users').where('uid','==',doc.uid).get()
   .then((snapshot)=>{
     snapshot.forEach((docs)=>{
       user.accType=docs.data().accType;
       user.docId=docs.data().docId;
     });        
     return(user);
   })
  .then((user)=>{
     db.collection(user.accType).doc(user.docId).get()
     .then(res=>{
       doc.income= res.data().income;
       doc.goal= res.data().goal;
      return doc;
     })
    .then(doc=>{
      db.collection(user.accType).doc(user.docId)
      .collection('smsData').orderBy('date','desc').limit(1).get()
      .then((data)=>{
       return(data.docs[0].data().availableBal);
      })
      .then(availableBal=>{
        if(!income){
          return(response.status(500).send("cant calculate without income"));
        }
        var percentage={
          'currentPercentage':(availableBal*100/income),
          'goalStatus':""
        };
       percentage.goalStatus = doc.goal>availableBal?"failed":"Success";
       return(response.status(200).send(percentage));
      })
      .catch(err=>{
        response.status(500).send(err);
        throw err;
       });
       return(doc);
    })
    .catch(err=>{
      response.send(err);
      throw err;
    });
    return(user);
  })
  .catch(err=>{
    response.send("Try again");
    throw err;
  });
 });

 /*
 Agressive Moderate orConservative Spender 
 needs uid 
 returns availableBal as perccentage of income 
 */
 exports.saverType = functions.https.onRequest((req,response)=>{
  var doc = {
    "uid":  req.body.uid
    };
    var user={
     accType:"",
     docId:""
   } 
   db.collection('users').where('uid','==',doc.uid).get()
  .then((snapshot)=>{
    snapshot.forEach((docs)=>{
      user.accType=docs.data().accType;
      user.docId=docs.data().docId;
    });        
    return(user);
  })
  .then((user)=>{
    var income;
    //getting income
    db.collection(user.accType).doc(user.docId).get()
    .then(res=>{
      console.log(res.data());
      income=res.data().income;
      return(income);
    })
    .catch(err=>{
      income=null;
      throw(err);
    });
    db.collection(user.accType).doc(user.docId)
    .collection('smsData').orderBy('date','desc').limit(1).get()
    .then((data)=>{
      console.log(data.docs[0].data().availableBal);
      return(data.docs[0].data().availableBal);
    })
    .then(availableBal=>{
      if(!income){
        return(response.status(500).send("no sms data"));
      }
      var percentage=(availableBal*100/income);
      return(response.status(200).send(percentage));
    })
    .catch(err=>{
      response.status(500).send(err);
      throw err;
      });      
      return(user);
  })
  .catch((err)=>{
    response.send(err);
    throw(err);
  });
});

 /*Agressive Moderate orConservative Spender 
 needs uid 
 returns availableBal as perccentage of income 
 */
 exports.emergencyCash = functions.https.onRequest((req,response)=>{
  var doc = {
    "uid":  req.body.uid,
    "savings":0
    };
    var user={
     accType:"",
     docId:""
   } 
   db.collection('users').where('uid','==',doc.uid).get()
  .then((snapshot)=>{
    snapshot.forEach((docs)=>{
      user.accType=docs.data().accType;
      user.docId=docs.data().docId;
    });        
    return(user);
  })
  .then((user)=>{
    db.collection(user.accType).doc(user.docId)
    .collection('smsData').orderBy('date','desc').limit(1).get()
    .then((data)=>{
      doc.savings = data.docs[0].data().availableBal;
      return(data.docs[0].data().availableBal);
    })
    .catch(err=>{
      response.status(500).send(err);
      throw err;
      });      
      var date =new Date();
      
    db.collection(user.accType).doc(user.docId)
    .collection('smsData').orderBy('date','desc').limit(1).get()
    .then((data)=>{
      console.log(data.docs[0].data().availableBal);
      return(data.docs[0].data().availableBal);
    })
    .then(availableBal=>{
      if(!income){
        return(response.status(500).send("no sms data"));
      }
      var percentage=(availableBal*100/income);
      return(response.status(200).send(percentage));
    })
    .catch(err=>{
      response.status(500).send(err);
      throw err;
      });   
      return(response.send("done"));   
  })
  .catch((err)=>{
    response.send(err);
    throw(err);
  });
});
