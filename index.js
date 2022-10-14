
const express = require('express');
const app = express();
const{v4: uuid} = require('uuid');
const path = require('path');

app.use(express.json({extended: false}));
app.use(express.static('./views'));
app.set('view engine','ejs');
app.set('views','./views');

const AWS = require('aws-sdk');
const config = new AWS.Config({
    accessKeyId:'AKIAZQSUZDZBWSTOK4WM',
    secretAccessKey:'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',
    region:'ap-southeast-1'
});

AWS.config = config;

const docClient = new AWS.DynamoDB.DocumentClient();
const tableName = 'BaoCaoSP';

const s3 = new AWS.S3({
    accessKeyId:'AKIAZQSUZDZBWSTOK4WM',
    secretAccessKey:'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',
});

const multer = require('multer');
// const { s3 } = require('aws-sdk');
    const storage = multer.memoryStorage({
        destination(req, file, callback) {
        callback(null, '');
        },
    });
    function  checkFileType(file, cb) {
        const fileType = /jpeg|jpg|png|gif/;
        const extname = fileType.test(path.extname(file.originalname).toLowerCase());
        const minetype = fileType.test(file.mimetype);
        if (extname && minetype) {
           return cb(null, true);
    }
    return cb("error: Image Only");
}
const upload = multer({
    storage,
    limits:{fileSize: 2000000},
    fileFilter(req, file, cb) {
            checkFileType(file, cb);
        },
});


app.get('/', (req, res) => {
    const params = {
        TableName: tableName,
    };
    docClient.scan(params,(err,data) => {
        if(err)
            console.log(err);
        else{
            
            return res.render('index', {data: data.Items});
        }

    });
});



// thêm hình
const CLOUND_FRONT_URL='https://du2ypgrh94i9c.cloudfront.net/';

app.post('/',upload.single('image') ,(req, res) => {
    const {stt,ten_baocao,ten_tacgia,chi_so, so_trang,nam_xb} = req.body;
    const image = req.file.originalname.split(".");
    const fileType = image[image.length - 1];
    const filePath = `${uuid() + Date.now().toString()}.${fileType}`;
    const params = {
       Bucket: "upload3-toturial-bucket",
       Key: filePath,
       Body: req.file.buffer
       
    }
    s3.upload(params,(error, data) => {
        if (error){
            console.log("error=", error);
            return res.send('internal server error');
        } else{
            const newItem ={
                TableName: tableName,
                Item:{
                    "stt":stt,
                    "ten_baocao":ten_baocao,
                    "ten_tacgia":ten_tacgia,
                    "chi_so":chi_so,
                    "so_trang":so_trang,
                    "nam_xb":nam_xb,
                    "image_url": `${CLOUND_FRONT_URL}${filePath}`  
                }
            }
            docClient.put(newItem,(err, data) =>{
         
                if(err ) {
                    console.log("error =", error); 
                    return  res.send("internal server error") 
                }      
                else{
                    // console.log(JSON.stringify(data));
                    return res.redirect('/');
                }
            });
       
        }
    })
});


app.post('/delete',upload.single('image') , (req, res) => {
    const listItems = Object.keys(req.body);
    if(listItems == 0)
        return res.redirect('/');
    function onDeleteItem(index){
        const params = {
            TableName: tableName,
            Key:{
                'ten_baocao':listItems[index]
            }
        }
        docClient.delete(params,(err,data) =>{
            if(err)
            console.log(err);
        else{
            if(index >0 )
                onDeleteItem(index-1);
            else
                return res.redirect('/');
        }

        });
    }
    onDeleteItem(listItems.length -1);
});

app.listen(3000, () => {
  console.log(`Example app listening on port `)
})