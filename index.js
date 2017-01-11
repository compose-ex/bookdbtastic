// Setting up the web engine

var express = require('express');
var expressHbs = require('express-handlebars');
var bodyParser = require('body-parser');

var app = express();

app.engine('hbs', expressHbs({
  extname: 'hbs',
  defaultLayout: 'main.hbs'
}));

app.set('view engine', 'hbs');
app.use(bodyParser.urlencoded({
  extended: false,
  limit: '50mb'
}));

// Setting up the datamodels

var mongoose = require("mongoose");
var mongoosastic=require("mongoosastic");

mongoose.Promise = global.Promise;

var bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  description: { type:String, es_indexed:true },
  content: { type:String, es_indexed:true }
});

mongoose.connect(process.env.COMPOSEMONGODBURL);
bookSchema.plugin(mongoosastic,{
  hosts: [ process.env.COMPOSEESURL ]
});

var Book = mongoose.model("Book", bookSchema);

Book.createMapping(function(err, mapping){
  if(err){
    console.log('error creating mapping (you can safely ignore this)');
    console.log(err);
  }else{
    console.log('mapping created!');
    console.log(mapping);
  }
});


// With the database going to be open as some point in the future, we can
// now set up our web server. First up we set it to server static pages
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
  res.render('index');
});

app.get('/all', function(req, res) {
  Book.find(function(err, allbooks, count) {
    res.render('all', {
      books: allbooks
    });
  });
});


app.get("/new", function(req, res) {
  res.render('book', {
    id: 0,
    title: "",
    author: "",
    description: "",
    action: "Add"
  });
});

app.get("/edit/:id", function(req, res) {
  Book.findById(req.params.id, function(err, book) {
    res.render('book', {
      id: book._id,
      title: book.title,
      author: book.author,
      description: book.description,
      content: book.content,
      action: "Update"
    });
  });
});

app.post('/update/:id', function(req, res) {
  if (req.params.id == 0) {
    var book = new Book({
      title: req.body.title,
      author: req.body.author,
      description: req.body.description,
      content: req.body.content
    });
    book.save(function(err) {
      res.redirect("/");
    });
  } else {
    Book.findById(req.params.id, function(err, book) {
      book.title = req.body.title;
      book.author = req.body.author;
      book.description = req.body.description;
      book.content = req.body.content;
      book.save(function(err, book, count) {
        res.redirect('/');
      });
    });
  }
});

app.get("/delete/:id", function(req, res) {
  Book.findById(req.params.id, function(err, book) {
    book.remove(function(err, book) {
      res.redirect('/');
    });
  });
});

app.get("/search/", function(req,res) {
  res.render("search");
});

app.post("/search/", function(req,res) {
  var terms=req.body.terms;
  Book.find({ 'title': new RegExp(terms, 'i') } , function(err,books,count) {
    res.render("search", { terms:terms, books:books })
  });
});

app.get("/esearch/", function(req,res) {
  res.render("esearch");
});

app.post("/esearch/", function(req,res) {
  var terms=req.body.terms;
  Book.search({ query_string: { query:terms } }, function(err,results) {
    res.render("esearch", { terms:terms, books:results.hits.hits })
  });
});

app.get("/hesearch/", function(req,res) {
  res.render("hesearch");
});

app.post("/hesearch/", function(req,res) {
  var terms=req.body.terms;
  Book.search({ query_string: { query:terms } }, { hydrate:true }, function(err,results) {
    res.render("hesearch", { terms:terms, books:results.hits.hits })
  });
});

console.log("Listening on localhost:3000")
app.listen(3000);
