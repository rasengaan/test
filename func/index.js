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
    "accType":req.accType,
    "income":0
  };
  var user={
        "uid":  req.uid,
        "docId":req.uid
  }
  return db.collection('users').doc(user.uid).set(doc)
     .then(res=>{
        return({"text":"user Created"});
      })
     .catch(err=>{
         throw(err);
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
  var i=0;
  var uid = req.uid;
  var len = req.length;
 
  var medical = req.medicals;
  var bills = req.bills;
  var subscription = req.subscription;
  var food = req.food;
  var shopping = req.shopping;
  var grocery = req.grocery;
  var travel = req.travel;
  var emi = req.emi;
  
  var date = req.date;
  var time = req.time;
  var bank = req.bank;
  var credit = req.credit;
  var debit = req.debit;
  var transacAmt = req.trxAmt;
  var availBal = req.availBal;
  var atm = req.atm;
  var netBank = req.netBanking;
  var merchant = req.merchant;
 console.log(req);
 console.log(len);

 
  while(i<len){
    let categ="";
    let dat=date[i];
    var tim=time[i];
    var day= parseInt((dat[0]+dat[1]),10);
    var month= parseInt((dat[3]+dat[4]),10)-1;
    var year= parseInt((dat[6]+dat[7]+dat[8]+dat[9]),10);
    var hour= parseInt((tim[0]+tim[1]),10);
    var min= parseInt((tim[3]+tim[4]),10);
    var sec= parseInt((tim[6]+tim[7]),10);
   
  var tstamp = new Date(Date.UTC(year,month,day,hour,min,sec));

    if(bills[i]){
      categ="BILLs"
    }else{
      if(food[i]){
        categ="FOOD"
      }else{
        if(subscription[i]){
          categ="SUBSCRIPTION"
        }else{
          if(medical[i]){
            categ="HEALTH"
          }else{
            if(shopping[i]){
              categ="SHOPPING"
            }else{
              if(grocery[i]){
                categ="GROCERY"
              }else{
                if(travel[i]){
                  categ="TRAVEL"
                }else{
                  categ="LOAN"
                }
              }
            }
          }
        }
      }
    }
    let doc={
      "uid":  uid,
      "amt": transacAmt[i],
      "date":  tstamp,
      "merchant":  merchant[i],
      "category":  categ,
      "type":  credit[i]===1?"credit":"debit",
      "bank":  bank[i],
      "mode":  atm[i]===1?'offline':"online",
      "netBank":  netBank[i],
      "availableBal":availBal[i]
    }
    console.log((doc.date));
    db.collection('users').doc(doc.uid)
      .collection('transactions').add(doc)
      .then((res)=>{
        db.collection('users').doc(doc.uid)
          .collection('transactions').doc(res.id).update({
           'tid':res.id
          });
        return ("dataSaved");
      })
      .catch(err=>{
        throw err;
      });
      console.log(i);
    i++;
  }
  return("dataSaved");
});

/*
get data of transactons at diifernt months  
needs uid 
returns array of 12*3 each index represents amount income, spend, cash, availableBal(at end of each month) each month
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
    return db.collection('users').doc(doc.uid)
      .collection('transactions').orderBy('date','asc').get()
      .then((snapshot)=>{
        var t=[1,2,3,4,5,6,7,8,9,10];
        var multi=[[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0],];
        snapshot.forEach((docs)=>{
          var d = new Date(0);
          d.setUTCSeconds(docs.data().date.seconds)
          var k= docs.data().type==="debit"?1:0;
          if(docs.data().type==='cash'){
            k=2;
          }
          multi[k][d.getMonth()] += docs.data().amt;
          if(docs.data().type!=='cash'){
            multi[3][d.getMonth()] = docs.data().availableBal;
          }
        });
        return ({
           'credit':multi[0],
           'debit':multi[1],
           'cash':multi[2],
           'availableBal':multi[3],
        });
      })
      .catch((err)=>{
        throw err;
      });
       
        
 });
 

/*
get data of transactons(online+cash) at diifernt categories entertainment,travel,etc 
needs uid and month as number(0-11)
returns array of 8 each index represents amount spend on bills,food,grocery,health,loan,shopping,subscription,travel in the same order
 */
 exports.getDataByCateg = functions.https.onCall((req,res)=>{  
    
  var doc = {
    "uid":  req.uid
    };
    var month = req.month;
    var pMonth=0;
    if(month!==0)
       pMonth = month-1;
    else
       pMonth = 11;
    var user={
      accType:"",
      docId:""
    } 
    return db.collection('users'). doc(doc.uid)
      .collection('transactions').where('mode','==','online').get()
        .then((snapshot)=>{
          var multi=[0,0,0,0,0,0,0,0];
          var pMulti=[0,0,0,0,0,0,0,0];
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
              if(d.getMonth()===pMonth){
                switch(docs.data().category) { 
                    case ("BILLS"): { 
                      pMulti[0] += docs.data().amt;
                      break; 
                    } 
                    case ("FOOD"): { 
                      pMulti[1] += docs.data().amt; 
                      break; 
                    } 
                    case ("GROCERY"): { 
                      pMulti[2] += docs.data().amt; 
                      break; 
                    } 
                    case ("HEALTH"): { 
                      pMulti[3] += docs.data().amt; 
                      break; 
                    } 
                    case ("LOAN"): { 
                      pMulti[4] += docs.data().amt;
                      break; 
                    } 
                    case ("SHOPPING"): { 
                      pMulti[5] += docs.data().amt; 
                      break; 
                    } 
                    case ("SUBSCRIPTION"): { 
                        multi[6] += docs.data().amt; 
                      break; 
                    } 
                    case ("TRAVEL"): { 
                      pMulti[7] += docs.data().amt; 
                      break; 
                    } 
                    
                } 
                  
              }
          });
          return ({
            'categoryData':multi,
            'categoryDataP':pMulti,
          });
        })
        .catch((err)=>{
             throw err;
        });     
 });


/*
get number of transactions online and offline 
needs uid and month as number(0-11)
returns array of 3*2 first index is for online[no. of transaction][TotalAmount] second is for offline[no. of transaction][TotalAmount] third is for cash[noOfTransactions][TotalAmount]
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
  return db.collection('users').doc(doc.uid)
      .collection('transactions').get()
        .then((res)=>{
           var arr=[[0,0],[0,0],[0,0]];
           res.forEach((docs)=>{
             var d = new Date(0);
             d.setUTCSeconds(docs.data().date.seconds)
             if(d.getMonth()===month){
               if(docs.data().mode==="online"){
                 ++arr[0][0];
                 arr[0][1]+=docs.data().amt;
               }
               if(docs.data().mode==="offline"){
                ++arr[1][0];
                 arr[1][1]+=docs.data().amt;
               }
               if(docs.data().mode==="cash"){
                ++arr[2][0];
                 arr[2][1]+=docs.data().amt;
               }
             }
           });
           return({
             'online':arr[0],
             'offline':arr[1],
             'cash':arr[2],
           });
        })
        .catch((err)=>{
          throw err;
        });     

   
 });



/*------------------------Recurring Essen-----------------------*/ 


exports.reccurMerch = functions.https.onCall((data,context)=>{
  var doc={
    'uid':data.uid,
  };
  console.log(doc);
  var merchants={
    
  };
  console.log("1");
  
  //var date= new Date().valueOf();
  var date =1588909215622-2678400;
  console.log(date);
  return db.collection('users').doc(doc.uid)
  .collection('transaction').where('date','>=',date)
  .orderBy('date','desc').get()
  .then((doc)=>{
    console.log("2");
    doc.forEach(val=>{
      console.log("3");
      merchants[val.data().merchant][val.data().date]+=1;
      console.log(merchants);
      console.log("3");
    });
    console.log("4");
    return 'merchants';
  })
  .then(dat=>{
    console.log("merch");
    return merchants;
  })
  .catch(err=>{
    console.log("err");
    throw err;
  });
  //console.log("last");
  
});










/*-----------------------cashTransactions-------------------------*/





/*
uploads cash Transaction
need {
        "uid":  req.body.uid,
        "amt": req.body.amt,
        "date":  req.body.date,
        "category":  req.body.category,
        "mode":  req.body.mode,
        "specifications":  req.body.specifications,
    }
 */
exports.uploadCashData =functions.https.onCall((req,response)=>{ 
    var doc = {
        "uid":  req.uid,
        "amt": req.amt,
        "date":  req.date,
        "category":  req.category,
        "merchant":  req.merchant,
        "mode":  req.mode,
        "description":  req.description,
        "remark":  req.remark,
    };
    var user={
      accType:"",
      docId:""
    } 
    return db.collection('users').doc(doc.uid)
      .collection('transactions').add(doc)
      .then((res)=>{
        return db.collection('users').doc(doc.uid)
        .collection('transactions').doc(res.id).update({
          'tid':res.id
        });
      })
      .catch((err)=>{
        throw err;
      });
    
//    category: grocery, food,shoppimg, travel,bills,loan,health, subaciption;     
    
 });




/*
updates cash Transaction
need {
        "tid":  req.tid,
        "uid":  req.uid,
        "amt": req.amt,
        "date":  req.date,
        "category":  req.category,
        "mode":  req.mode,
        "description":  req.description,
        "remark":  req.remark,
    }
 */
exports.updateCashData =functions.https.onCall((req,response)=>{ 
    var doc = {
      'tid':req.tid,
      "uid":  req.uid,
      "amt": req.amt,
      "date":  req.date,
      "category":  req.category,
      "merchant":  req.merchant,
      "mode":  req.mode,
      "description":  req.description,
      "remark":  req.remark,
    };
    var user={
      accType:"",
      docId:""
    } 
    return db.collection('users').doc(doc.uid)
      .collection('transactions').doc(doc.tid).update(doc)
      .then((res)=>{
        return("transaction saved")
      })
      .catch((err)=>{
        throw err;
      });
    
//    category: grocery, food,shoppimg, travel,bills,loan,health, subaciption;     
    
 });



/*
get details of cash Transaction by categories
need {
        "uid":  req.uid,
        "month":  req.month, (0 - 11)
    }

returns {
         'bills':bills[],
         'food':food[],
         'grocery':grocery[],
         'health':health[],
         'loan':loan[],
         'shopping':shopping[],
         'subscription':subscription[],
         'travel':travel[]
        }
 */

exports.getCashDataByCateg =functions.https.onCall((req,response)=>{ 
    var doc = {
        "uid":  req.uid,
        "month":  req.month
    };
    var user={
      accType:"",
      docId:""
    } 
    return db.collection('users').doc(doc.uid)
      .collection('transactions').where('mode','==','cash').get()
      .then((snapshot)=>{
        var bills=[];
        var food=[];
        var grocery=[];
        var health=[];
        var loan=[];
        var shopping=[];
        var subscription=[];
        var travel=[];
        snapshot.forEach((docs)=>{
          var d = new Date(0);
          d.setUTCSeconds(docs.data().date.seconds)
          // console.log(d.getMonth());///gives array index of month
            if(d.getMonth()===month){
              switch(docs.data().category) { 
                  case ("BILLS"): { 
                      bills.push( docs.data());
                    break; 
                  } 
                  case ("FOOD"): { 
                    food.push( docs.data()); 
                    break; 
                  } 
                  case ("GROCERY"): {
                    grocery.push( docs.data()); 
                    break; 
                  } 
                  case ("HEALTH"): { 
                    health.push(docs.data()); 
                    break; 
                  } 
                  case ("LOAN"): { 
                    loan.push( docs.data());
                    break; 
                  } 
                  case ("SHOPPING"): { 
                    shopping.push( docs.data()); 
                    break; 
                  } 
                  case ("SUBSCRIPTION"): { 
                     subscription.push( docs.data()); 
                    break; 
                  } 
                  case ("TRAVEL"): { 
                    travel.push( docs.data()); 
                    break; 
                  } 
                  
              } 
                
            }
        });
        return ({
         'bills':bills,
         'food':food,
         'grocery':grocery,
         'health':health,
         'loan':loan,
         'shopping':shopping,
         'subscription':subscription,
         'travel':travel
        })
      })
      .then((data)=>{
        return data ;
      })
      .catch((err)=>{
        throw err;
      });
    
//    category: grocery, food,shoppimg, travel,bills,loan,health, subaciption;     
    
 });



 /*
online Transaction Details of specific month
need {
        "uid":  req.uid,
        "month":  req.month, (0 - 11)
    }
 */


 exports.getOnlineDataByCateg = functions.https.onCall((req,res)=>{  
    
  var doc = {
    "uid":  req.uid
    };
    var month = req.month;

    var user={
      accType:"",
      docId:""
    } 
    return db.collection('users'). doc(doc.uid)
     .collection('transactions').where('mode','==','online').get()
      .then((snapshot)=>{
        var bills=[];
        var food=[];
        var grocery=[];
        var health=[];
        var loan=[];
        var shopping=[];
        var subscription=[];
        var travel=[];
        snapshot.forEach((docs)=>{
          var d = new Date(0);
          d.setUTCSeconds(docs.data().date.seconds)
          // console.log(d.getMonth());///gives array index of month
            if(d.getMonth()===month){
              switch(docs.data().category) { 
                  case ("BILLS"): { 
                      bills.push( docs.data());
                    break; 
                  } 
                  case ("FOOD"): { 
                    food.push( docs.data()); 
                    break; 
                  } 
                  case ("GROCERY"): {
                    grocery.push( docs.data()); 
                    break; 
                  } 
                  case ("HEALTH"): { 
                    health.push(docs.data()); 
                    break; 
                  } 
                  case ("LOAN"): { 
                    loan.push( docs.data());
                    break; 
                  } 
                  case ("SHOPPING"): { 
                    shopping.push( docs.data()); 
                    break; 
                  } 
                  case ("SUBSCRIPTION"): { 
                     subscription.push( docs.data()); 
                    break; 
                  } 
                  case ("TRAVEL"): { 
                    travel.push( docs.data()); 
                    break; 
                  } 
                  
              } 
                
            }
        });
        return ({
         'bills':bills,
         'food':food,
         'grocery':grocery,
         'health':health,
         'loan':loan,
         'shopping':shopping,
         'subscription':subscription,
         'travel':travel
        });
      })
      .catch((err)=>{
        throw err;
      });     
 });



/*
 All Transaction Details of specific month
need {
        "uid":  req.uid,
        "month":  req.month, (0 - 11)
    }
 */
exports.TransactionDetail =functions.https.onCall((req,response)=>{ 
    var doc = {
        "uid":  req.uid,
        "amt": req.amt,
        "date":  req.date,
        "category":  req.category,
        "type":  req.type,
        "specifications":  req.specifications,
    };
    var user={
      accType:"",
      docId:""
    } 
    return db.collection('users').doc(doc.uid)
      .collection('transactions').orderBy('date',"desc").get()
      .then((snapshot)=>{
        var multi=[];
        snapshot.forEach((docs)=>{
          var d = new Date(0);
          d.setUTCSeconds(docs.data().date.seconds)
          // console.log(d.getMonth());///gives array index of month
            if(d.getMonth()===month){
              multi.push(docs.data());                
            }
        });
        return multi;
      })
      .catch((err)=>{
        throw err;
      });
    
//    category: grocery, food,shoppimg, travel,bills,loan,health, subaciption;     
    
 });








 /*------------------------challenges----------------------*/


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
  var user =data.uid;
  var doc = {
    'cid':data.cid,
    'challengeName':data.challengeName,
    'challengeCategory':data.challengeCategory,
    'challengeDescription':data.challengeDescription,
    'challengeType':data.challengeType,
    'challengeCreator':data.challengeCreator,
    'challengeDuration':data.challengeDuration,    
    'challengeBegin':data.challengeBegin    
  }; 
  var d = new Date();
  if(d>doc.challengeBegin){
    return({"error":"can't Create chalenge of Past Date"})
  }
  if(doc.challengeDuration<259200000){
    return ({
      "error":"challenge duration less than 3 days"
    })
  }
  // console.log(d.getMonth());///gives array index of month
console.log(data);
  return db.collection('challenges').add(doc)
    .then((snap)=>{
      //retuen a function to store challenge in the creatorrs acc
      return db.collection('challenges').doc(snap.id).update({"cid":snap.id})
      .then((res)=>{
        return db.collection('challenges').doc(snap.id)
          .collection('participants').doc(user).set({'amountSaved':0})
        .then((resp)=>{
          if(res.data().challengebegin>date){
            type="upcomingChallenge"
          }else
            type="activeChallenges";
    
          return db.collection('users').doc(doc.uid)
          .collection('challenges').doc(doc.cid).set({
            'cid':doc.cid,
            'amountSaved':0,
            'status':type
          });
        })
        .catch(er=>{
          throw err;
        });
      })
      .catch(err=>{
        throw err;
      });
    })
    .catch(err=>{
      throw err;  
    });
});


/*
Only to be called by upcoming or active challenges
sets uid to list of participants 
anf cid to user challenge list

*/
exports.acceptChallenge= functions.https.onCall((data,context)=>{
  var doc={
    'uid':data.uid,
    'cid':data.cid,
  };
  return db.collection('challenges').doc(doc.cid).
    collection('participants').doc(doc.uid).set({
      'amountSaved':0,
    })  
    .then((res)=>{
      console.log(res);
      var date=new Date().getTime();
      var type="";
        if(res.data().challengeBegin+res.data().challengeDuration<date){
          return("err:event is already over")
        }else{
          if(res.data().challengebegin>date){
            type="upcomingChallenge"
          }else
            type="activeChallenges";
        }

      return db.collection('users').doc(doc.uid)
        .collection('challenges').doc(doc.cid).set({
            'cid':doc.cid,
            'amountSaved':0,
            'status':type
          })
          .then(respo=>{
            return ("new challenge accepted")
          })
          .catch(err=>{
            throw err;
          });
        })      
    .catch(err=>{
      throw err;
    });
});

exports.getUpcomingChallenges=functions.https.onCall((data,context)=>{
  var upcomingChallenges=[];
  return db.collection('challenges').orderBy('challengeBegin','desc').get()
    .then(res=>{
      res.forEach((doc)=>{
        var d=new Date();
        upcomingChallenges.push(doc.data());

      });
      return({"upcomingChallenges":upcomingChallenges}) 
    })
    .catch(err=>{throw err;})
});
exports.getActiveChallenges=functions.https.onCall((data,context)=>{

});
exports.getExpiredChallenges=functions.https.onCall((data,context)=>{

});



//begin chatBox;;




// doubts on goal goal in % or amount; 




 
 /*
 sets Saving goal of user
 needs uid and goal(amt) in json Format
 */
exports.setGoal =functions.https.onRequest((req,response)=>{ 
  var doc = {
    "uid":  req.uid
    };
    var user={
     accType:"",
     docId:""
   } 
   return db.collection('users').doc(doc.uid)
    .update({
      "goal":req.body.goal
//      "goal":(req.body.goal*income)  //in percentage
    })
    .then(res=>{
      console.log(res);
      return("goal updated");
    })
    .catch(err=>{
      response.status(500).send(err)
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
