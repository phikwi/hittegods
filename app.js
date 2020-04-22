const puppeteer = require('puppeteer');
const express = require('express');
let ejs = require('ejs');
const fetch = require('node-fetch');
const app = express();
let data;
let scrapedDocuments ;
const port = 3000;
const ejsLint = require('ejs-lint');
const mongoose = require('mongoose')
const DateOnly = require('mongoose-dateonly')(mongoose);
const   mongooseIntl = require('mongoose-intl')
const bodyParser =require("body-parser");
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const storage = multer.diskStorage({
        destination :function(req,file,cb){
           
                cb(null,'./uploads')
        },
        filename: function(req,file,cb){

                cb(null, file.originalname)
        }
})

const upload = multer({storage:storage, limits:{
fileSize: 1024 * 1024 * 5

}});
//config
app.set('view engine', 'ejs');
app.use(flash());
app.use(express.static("public"));
app.use('/uploads',express.static('uploads'));
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({ cookie: { maxAge: 60000 }, 
                  secret: 'woot',
                  resave: false, 
                  saveUninitialized: false}));
app.use(function(req, res, next){
    
        res.locals.error= req.flash("error");
         res.locals.success= req.flash("success");
        next();
    })

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
 

//get sl info 
app.get('/sl',(req,res)=>{

         let scrapedItems=[];
        /* scrape(2).then(results=>{
         scrapedItems = [...results]
         res.render("sl",{scrapedItems:scrapedItems});
        })*/
        
        scrapee().then(()=>{
               
             scrapedItems =[...scrapedDocuments];
             res.render("sl",{scrapedItems:scrapedItems});
           
        });

   })

 //post Item route
 app.post('/postItem',upload.single('itemImage'),(req,res)=>{
        const bodyContent = req.body.item;
        if( bodyContent.title !="" && bodyContent.location !="" &&  bodyContent.contact!="" && 
         
          bodyContent.date !="" &&  bodyContent.path !="" 
         
        ){
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

        }

        else{

            
                req.flash("error","Fyll i alla fält"); 
                res.redirect("/");     
                 
        }
      
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

//Scraper
async function scrape(p){

       // const browser = await puppeteer.launch({ headless: true});
        const browser = await puppeteer.launch({executablePath:'/usr/bin/google-chrome-stable',
                                                headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']});
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto(`https://www.mtrnordic.se/hittegods/sok-hittegods/?sl=1&sl=3&pageNumber=${p}`, {waitUntil: 'networkidle0'});
        let mainNode =  await page.$eval( '#sort-found-and-lost-table',  function(el){
        let results = [];
            for(let i=1;i<16;i++){
                    results.push({date:el.getElementsByTagName('tr')[i].getElementsByTagName('td')[0].textContent,name:el.getElementsByTagName('tr')[i].getElementsByTagName('td')[1].textContent,
                    place:el.getElementsByTagName('tr')[i].getElementsByTagName('td')[2].textContent
                  })
              }    
              return results;
    
         }
        );
         await browser.close();
         return mainNode
    }

   function  scrapee(){ 
        return fetch('https://www.mtrnordic.se/hittegods/sok-hittegods/?sl=1')
          .then(res => res.text())
          .then(pageBody=>{
              data= pageBody;
              const cheerio = require('cheerio');
              const $ = cheerio.load(data);
              let itemDateSelector ="";
              let itemNameSelector="";
              let  itemPlaceSelector="";
              let newItem ;
              scrapedDocuments=[];
            for(let i=1;i<13;i++){
                   itemDateSelector=$(`#sort-found-and-lost-table > tbody > tr:nth-child(${i}) > td:nth-child(1)`).text();
                   itemNameSelector=$(`#sort-found-and-lost-table > tbody > tr:nth-child(${i}) > td:nth-child(2)`).text();
                   itemPlaceSelector=$(`#sort-found-and-lost-table > tbody > tr:nth-child(${i}) > td:nth-child(3)`).text();
                   newItem = {date:itemDateSelector,name:itemNameSelector,place:itemPlaceSelector};
                 scrapedDocuments.push(newItem);
              }


            })   
}

//Server
app.listen(process.env.PORT || 5000)