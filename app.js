//Dependencies
const express = require('express');
let ejs = require('ejs');
const app = express();
const port = 3000;
const ejsLint = require('ejs-lint');
const mongoose = require('mongoose')
const DateOnly = require('mongoose-dateonly')(mongoose);
const   mongooseIntl = require('mongoose-intl')
const bodyParser =require("body-parser");
const multer = require('multer');
const storage = multer.diskStorage({

        destination :function(req,file,cb){
           
                cb(null,'./uploads/')

        },
        filename: function(req,file,cb){

                cb(null, Date.now() + file.originalname)


        }

})

const upload = multer({storage:storage, limits:{
fileSize: 1024 * 1024 * 5

}});

//config
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use('/uploads',express.static('uploads'));
app.use(bodyParser.urlencoded({extended: true}));

//mongo config
mongoose.connect('mongodb+srv://phikwi:Markspain1@cluster0-ieaz1.mongodb.net/test?retryWrites=true&w=majority', {useNewUrlParser: true, 
        useUnifiedTopology: true});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
 
  console.log("Connected to db");
});


//App DB 

const itemSchema = new mongoose.Schema({
       
        title:String,
        location:String,
        contactInfo:String,
        dateFound:DateOnly,
        imagePath:String
});

itemSchema.plugin(mongooseIntl, { languages: ['en', 'de', 'sv'], defaultLanguage: 'en' })

//item Model

const Item = mongoose.model('Item',itemSchema);


//Routes

//Home route
app.get('/', (req, res) =>  

       { 
               Item.find((err,foundItems)=>{
                
                if(err){
                        console.log(err);
                }
                
                else{
                        
                  res.render("home",{foundItems:foundItems});
                }

               })
       
         }
    
        );
 


 //post Item route
 
 app.post('/postItem',upload.single('itemImage'),(req,res)=>{


        const bodyContent = req.body.item;
         
        const itemToAdd = new Item({
         title:bodyContent.title,
         location:bodyContent.location,
         contactInfo:bodyContent.contact,
         dateFound:bodyContent.date ,
         imagePath:req.file.path  

        }) 

        itemToAdd.save(function(err){
             
                if(err){
                         console.log(err);
                }
                else
                {
                        res.redirect('/');
                }
   
        })
 });

app.post('/search',(req,res)=>{

        const  searchTitle= req.body.title;
        const searchLocation = req.body.location;  
      
        Item.find({"location":{ $regex: `${searchLocation}`, $options: 'i' },
                   "title":{ $regex: `${searchTitle}`, $options: 'i' }},(err,foundItems)=>{
                
                if(err){
                        console.log(err);
                }
              
                else{
                      
                  res.render("home",{foundItems:foundItems});
                }

               })

});


//Server
app.listen(process.env.PORT || 5000)