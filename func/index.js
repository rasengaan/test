const functions = require('firebase-functions');
var admin = require("firebase-admin");
var serviceAccount = require("./save-money-fe157-firebase-adminsdk-fjqx1-5b3c2b605f.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://save-money-fe157.firebaseio.com/"
});

const db = admin.firestore();

/*
set up new User 
needs {
       "userName":req.body.userName,
        "uid":  req.body.uid, 
        "accType":req.body.accType,
      }
*/
exports.newUser =functions.https.onCall((req,response)=>{ 
  var doc = {
    "userName":req.userName,
    "uid":  req.uid,
    "goal": 0,
    "income":0
  };
  var user={
        "uid":  req.uid,
        "accType":req.accType,
        "docId":req.uid
  }
  return db.collection('users').doc(user.uid).set(user)
  .then((res)=>{
     //set user documrnt in usertype
    return db.collection(user.accType).doc(user.uid).set(doc)
     .then(res=>{
        return({"text":"user Created"});
      })
     .catch(err=>{
         throw(err);
     });
   })
   .catch(err=>{
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
exports.uploadsms =functions.https.onCall((req,response)=>{ 
    var doc = {
        "amt": req.amt,
        "date":  req.date,
        "merchant":  req.merchant,
        "category":  req.category,
        "type":  req.type,
        "uid":  req.uid,
        "availableBal":req.availableBal
    };
    var user={
      accType:"",
      docId:""
    } 
   return db.collection('users').where('uid','==',doc.uid).get()
    .then((snapshot)=>{
      snapshot.forEach((docs)=>{
        user.accType=docs.data().accType;
        user.docId=docs.data().docId;
      });        
      return db.collection(user.accType).doc(user.docId)
        .collection('smsData').doc()
        .set(doc)
        .then((res)=>{
          return("sms saved")
        })
        .catch((err)=>{
          throw err;
        });
    })
    .catch(err=>{
      throw err;
    });
//    category: grocery, food,shoppimg, travel,bills,loan,health, subaciption;     
    
 });
 
/*
get data of transactons at diifernt months  
needs uid 
returns array of 12*3 each index represents amount income, spend, availableBal(at end of each month) each month
 */
exports.getChartData = functions.https.onCall((req,response)=>{

  var doc = {
     "uid":  req.uid
     };
     var user={
      accType:"",
      docId:""
    };
    console.log("getChartData");
    return db.collection('users').where('uid','==',doc.uid).get()
    .then((snapshot)=>{
      snapshot.forEach((docs)=>{
        user.accType=docs.data().accType;
        user.docId=docs.data().docId;
      });        
      return  db.collection(user.accType).doc(user.docId)
      .collection('smsData').orderBy('date','asc').get()
      .then((snapshot)=>{
        var multi=[[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
        snapshot.forEach((docs)=>{
          var d = new Date(0);
          d.setUTCSeconds(docs.data().date.seconds)
          var k= docs.data().type==="debit"?1:0;
          multi[d.getMonth()][k] += docs.data().amt;
          multi[d.getMonth()][2] = docs.data().availableBal;
        });
        return (multi);
      })
      .then((multi)=>{
        return (multi);
      })
      .catch((err)=>{
        throw err;
      });
    })
    .catch((err)=>{ 
      throw err;
    });    
        
 });
 

/*
get data of transactons at diifernt categories entertainment,travel,etc 
needs uid and month as number(0-11)
returns array of 8 each index represents amount spend on bills,food,grocery,health,loan,shopping,subscription,travel in the same order
 */
 exports.getDataByCateg = functions.https.onCall((req,res)=>{  
    
  var doc = {
    "uid":  req.uid
    };
    var month = req.month;

    var user={
      accType:"",
      docId:""
    } 
    return db.collection('users').where('uid','==',doc.uid).get()
    .then((snapshot)=>{
      snapshot.forEach((docs)=>{
        user.accType=docs.data().accType;
        user.docId=docs.data().docId;
      });        
      return db.collection(user.accType).doc(user.docId)
      .collection('smsData').get()
        .then((snapshot)=>{
            var multi=[0,0,0,0,0,0,0,0];
            snapshot.forEach((docs)=>{
              var d = new Date(0);
              d.setUTCSeconds(docs.data().date.seconds)
              // console.log(d.getMonth());///gives array index of month
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
        .catch((err)=>{
             throw err;
        });
    })
    .catch((err)=>{
       throw(err);
    });     

     
 });


/*
get number of transactions online and offline 
needs uid and month as number(0-11)
returns array of 2*2 first index is for online[no. of transaction][TotalAmount] second is for offline[no. of transaction][TotalAmount]
 */
exports.getTransactionMode = functions.https.onCall((req,res)=>{  
    var doc = {
      "uid":  req.uid
      };
    var month = req.month;
    var user={
      accType:"",
      docId:""
    } 
  return db.collection('users').where('uid','==',doc.uid).get()
  .then((snapshot)=>{
      snapshot.forEach((docs)=>{
        user.accType=docs.data().accType;
        user.docId=docs.data().docId;
      });        
      return db.collection(user.accType).doc(user.docId)
      .collection('smsData').get()
         .then((res)=>{
           var arr=[[0,0],[0,0]];
           res.forEach((docs)=>{
             var d = new Date(0);
             d.setUTCSeconds(docs.data().date.seconds)
             if(d.getMonth()===month){
               docs.data().mode==="online"?++arr[0][0]:++arr[1][0];
               docs.data().mode==="online"?arr[0][1]+=docs.data().amt:arr[1][1]+=docs.data().amt;
             }
           });
           return(arr);
         })
         .catch((err)=>{
           throw err;
         });
  })
  .catch((err)=>{
    res.status(500).send("cant find userin the specified collection");
    throw(err);
  });     

   
 });

/*
input data ={
      'challengeName':name of challenge,
      'challengeCategory':under which category challenge is food travel bills etc,
      'challengeDescription':description of challenge,
      'challengeType':availability of challenge private/public,
      'challengeAmount':amount of challenge,
      'challengeCreator':creatorName
    }
string on success
*/
exports.newChallenge = functions.https.onCall((data,context)=>{
  var doc = {
    'challengeName':data.challengeName,
    'challengeCategory':data.challengeCategory,
    'challengeDescription':data.challengeDescription,
    'challengeType':data.challengeType,
    'challengeCreator':data.challengeCreator,
    'challengeDuration':data.challengeDuration,    
    'challengeBegin':data.challengeBegin    
  };
console.log(data);
  return db.collection('challenges').doc().set(doc)
    .then((snap)=>{
      console.log("snapped");
      return("challenge Created");    
    })
    .catch(err=>{
      throw err;  
    });
});


/*

*/
exports.acceptchallenge= functions.https.onCall((docs,context)=>{
  var doc={
    'uid':data.uid,
    'challengeId':data.challengeId,

  }
})






// doubts on goal goal in % or amount; 




 
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
